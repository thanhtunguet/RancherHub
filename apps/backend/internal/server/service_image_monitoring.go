package server

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"rancher-hub-backend/internal/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/net/proxy"
	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type updateServiceImageDTO struct {
	Tag string `json:"tag" binding:"required"`
}

type telegramTestDTO struct {
	TelegramBotToken *string  `json:"telegramBotToken"`
	TelegramChatID   *string  `json:"telegramChatId"`
	ProxyHost        *string  `json:"proxyHost"`
	ProxyPort        *int     `json:"proxyPort"`
	ProxyUsername    *string  `json:"proxyUsername"`
	ProxyPassword    *string  `json:"proxyPassword"`
	TaggedUsers      []string `json:"taggedUsers"`
}

type telegramRequestConfig struct {
	ProxyHost     string
	ProxyPort     *int
	ProxyUsername string
	ProxyPassword string
}

var telegramAPIBaseURL = "https://api.telegram.org"

func (s *Server) findServiceForImageOperation(serviceID string) (models.Service, bool, bool) {
	var service models.Service
	if isUUID(serviceID) {
		err := s.db.Preload("AppInstance").
			Preload("AppInstance.RancherSite").
			Preload("AppInstance.GenericClusterSite").
			First(&service, "id = ?", serviceID).Error
		return service, true, err == nil
	}
	appInstanceID, serviceName, ok := parseCompositeServiceID(serviceID)
	if !ok {
		return service, false, false
	}
	err := s.db.Preload("AppInstance").
		Preload("AppInstance.RancherSite").
		Preload("AppInstance.GenericClusterSite").
		Where("name = ? AND app_instance_id = ?", serviceName, appInstanceID).
		First(&service).Error
	if err == nil {
		return service, true, true
	}
	app, err := s.loadAppInstance(appInstanceID)
	if err != nil {
		return service, false, false
	}
	workloads, err := s.workloadsForAppInstance(app)
	if err != nil {
		return service, false, false
	}
	for _, workload := range workloads {
		if workload.Name == serviceName {
			image := workload.Image
			service = models.Service{
				ID:                serviceID,
				Name:              workload.Name,
				AppInstanceID:     app.ID,
				Status:            workload.State,
				Replicas:          workload.Scale,
				AvailableReplicas: workload.AvailableReplicas,
				ImageTag:          &image,
				WorkloadType:      workload.Type,
				AppInstance:       &app,
			}
			return service, false, true
		}
	}
	return service, false, false
}

type workloadInfo struct {
	Name              string
	Type              string
	State             string
	Image             string
	Scale             int
	AvailableReplicas int
}

func (s *Server) workloadsForAppInstance(app models.AppInstance) ([]workloadInfo, error) {
	if app.ClusterType == "generic" {
		if app.GenericClusterSite == nil {
			return nil, fmt.Errorf("generic cluster site not found")
		}
		return genericWorkloads(app.GenericClusterSite.Kubeconfig, app.Namespace)
	}
	if app.RancherSite == nil {
		return nil, fmt.Errorf("rancher site not found")
	}
	return rancherWorkloads(*app.RancherSite, app.Cluster, app.Namespace)
}

func genericWorkloads(kubeconfig, namespace string) ([]workloadInfo, error) {
	client, err := genericKubernetesClient(kubeconfig)
	if err != nil {
		return nil, err
	}
	ctx := context.Background()
	out := []workloadInfo{}
	deployments, err := client.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	for _, item := range deployments.Items {
		out = append(out, workloadFromDeployment(item, namespace))
	}
	daemonSets, err := client.AppsV1().DaemonSets(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	for _, item := range daemonSets.Items {
		image := ""
		if len(item.Spec.Template.Spec.Containers) > 0 {
			image = item.Spec.Template.Spec.Containers[0].Image
		}
		state := "inactive"
		if item.Status.NumberReady == item.Status.DesiredNumberScheduled {
			state = "active"
		}
		out = append(out, workloadInfo{Name: item.Name, Type: "daemonset", State: state, Image: image, Scale: int(item.Status.DesiredNumberScheduled), AvailableReplicas: int(item.Status.NumberReady)})
	}
	statefulSets, err := client.AppsV1().StatefulSets(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	for _, item := range statefulSets.Items {
		image := ""
		if len(item.Spec.Template.Spec.Containers) > 0 {
			image = item.Spec.Template.Spec.Containers[0].Image
		}
		scale := int32(0)
		if item.Spec.Replicas != nil {
			scale = *item.Spec.Replicas
		}
		state := "inactive"
		if item.Status.ReadyReplicas == scale {
			state = "active"
		}
		out = append(out, workloadInfo{Name: item.Name, Type: "statefulset", State: state, Image: image, Scale: int(scale), AvailableReplicas: int(item.Status.ReadyReplicas)})
	}
	return out, nil
}

func workloadFromDeployment(item appsv1.Deployment, namespace string) workloadInfo {
	image := ""
	if len(item.Spec.Template.Spec.Containers) > 0 {
		image = item.Spec.Template.Spec.Containers[0].Image
	}
	state := "inactive"
	for _, condition := range item.Status.Conditions {
		if condition.Type == appsv1.DeploymentAvailable && condition.Status == "True" {
			state = "active"
			break
		}
	}
	scale := int32(1)
	if item.Spec.Replicas != nil {
		scale = *item.Spec.Replicas
	}
	return workloadInfo{Name: item.Name, Type: "deployment", State: state, Image: image, Scale: int(scale), AvailableReplicas: int(item.Status.AvailableReplicas)}
}

func rancherWorkloads(site models.RancherSite, clusterID, namespace string) ([]workloadInfo, error) {
	var out []workloadInfo
	for _, item := range []struct {
		typ       string
		endpoints []string
	}{
		{"deployment", []string{"/apis/apps/v1/namespaces/" + url.PathEscape(namespace) + "/deployments", "/v1/apps.deployments?exclude=metadata.managedFields&namespace=" + url.QueryEscape(namespace)}},
		{"daemonset", []string{"/apis/apps/v1/namespaces/" + url.PathEscape(namespace) + "/daemonsets"}},
		{"statefulset", []string{"/apis/apps/v1/namespaces/" + url.PathEscape(namespace) + "/statefulsets"}},
	} {
		for _, endpoint := range item.endpoints {
			var payload map[string]any
			if err := rancherK8sRequest(site, clusterID, http.MethodGet, endpoint, nil, &payload); err != nil {
				continue
			}
			for _, raw := range arrayFromPayload(payload) {
				if metadataNamespace(raw) != "" && metadataNamespace(raw) != namespace {
					continue
				}
				out = append(out, workloadFromMap(raw, item.typ, namespace))
			}
			break
		}
	}
	return out, nil
}

func workloadFromMap(item map[string]any, typ, namespace string) workloadInfo {
	spec, _ := item["spec"].(map[string]any)
	status, _ := item["status"].(map[string]any)
	template, _ := spec["template"].(map[string]any)
	templateSpec, _ := template["spec"].(map[string]any)
	containers, _ := templateSpec["containers"].([]any)
	image := ""
	if len(containers) > 0 {
		if first, ok := containers[0].(map[string]any); ok {
			image = valueString(first["image"])
		}
	}
	scale := int(int64FromValue(spec["replicas"]))
	if scale == 0 {
		scale = int(int64FromValue(status["desiredNumberScheduled"]))
	}
	available := int(int64FromValue(status["availableReplicas"]))
	if available == 0 {
		available = int(int64FromValue(status["readyReplicas"]))
	}
	if available == 0 {
		available = int(int64FromValue(status["numberReady"]))
	}
	state := "inactive"
	if available >= scale || valueString(item["state"]) == "active" {
		state = "active"
	}
	return workloadInfo{Name: metadataName(item), Type: typ, State: state, Image: image, Scale: scale, AvailableReplicas: available}
}

func (s *Server) updateWorkloadImage(app models.AppInstance, workloadName, workloadType, newImageTag string) error {
	if app.ClusterType == "generic" {
		if app.GenericClusterSite == nil {
			return fmt.Errorf("generic cluster site not found")
		}
		return genericUpdateWorkloadImage(app.GenericClusterSite.Kubeconfig, app.Namespace, workloadName, workloadType, newImageTag)
	}
	if app.RancherSite == nil {
		return fmt.Errorf("rancher site not found")
	}
	return rancherUpdateWorkloadImage(*app.RancherSite, app.Cluster, app.Namespace, workloadName, workloadType, newImageTag)
}

func genericUpdateWorkloadImage(kubeconfig, namespace, workloadName, workloadType, newImageTag string) error {
	client, err := genericKubernetesClient(kubeconfig)
	if err != nil {
		return err
	}
	ctx := context.Background()
	switch normalizeWorkloadType(workloadType) {
	case "deployment":
		obj, err := client.AppsV1().Deployments(namespace).Get(ctx, workloadName, metav1.GetOptions{})
		if err != nil {
			return err
		}
		if len(obj.Spec.Template.Spec.Containers) == 0 {
			return fmt.Errorf("no containers found in %s %s", workloadType, workloadName)
		}
		obj.Spec.Template.Spec.Containers[0].Image = newImageTag
		_, err = client.AppsV1().Deployments(namespace).Update(ctx, obj, metav1.UpdateOptions{})
		return err
	case "daemonset":
		obj, err := client.AppsV1().DaemonSets(namespace).Get(ctx, workloadName, metav1.GetOptions{})
		if err != nil {
			return err
		}
		if len(obj.Spec.Template.Spec.Containers) == 0 {
			return fmt.Errorf("no containers found in %s %s", workloadType, workloadName)
		}
		obj.Spec.Template.Spec.Containers[0].Image = newImageTag
		_, err = client.AppsV1().DaemonSets(namespace).Update(ctx, obj, metav1.UpdateOptions{})
		return err
	case "statefulset":
		obj, err := client.AppsV1().StatefulSets(namespace).Get(ctx, workloadName, metav1.GetOptions{})
		if err != nil {
			return err
		}
		if len(obj.Spec.Template.Spec.Containers) == 0 {
			return fmt.Errorf("no containers found in %s %s", workloadType, workloadName)
		}
		obj.Spec.Template.Spec.Containers[0].Image = newImageTag
		_, err = client.AppsV1().StatefulSets(namespace).Update(ctx, obj, metav1.UpdateOptions{})
		return err
	default:
		return fmt.Errorf("unsupported workload type: %s", workloadType)
	}
}

func rancherUpdateWorkloadImage(site models.RancherSite, clusterID, namespace, workloadName, workloadType, newImageTag string) error {
	typ := normalizeWorkloadType(workloadType)
	if typ == "replicaset" {
		typ = "replicasets"
	} else {
		typ += "s"
	}
	endpoint := "/apis/apps/v1/namespaces/" + url.PathEscape(namespace) + "/" + typ + "/" + url.PathEscape(workloadName)
	var workload map[string]any
	if err := rancherK8sRequest(site, clusterID, http.MethodGet, endpoint, nil, &workload); err != nil {
		return err
	}
	if !setFirstContainerImage(workload, newImageTag) {
		return fmt.Errorf("no containers found in %s %s", workloadType, workloadName)
	}
	return rancherK8sRequest(site, clusterID, http.MethodPut, endpoint, workload, nil)
}

func setFirstContainerImage(workload map[string]any, image string) bool {
	spec, _ := workload["spec"].(map[string]any)
	template, _ := spec["template"].(map[string]any)
	templateSpec, _ := template["spec"].(map[string]any)
	containers, _ := templateSpec["containers"].([]any)
	if len(containers) == 0 {
		return false
	}
	first, _ := containers[0].(map[string]any)
	if first == nil {
		return false
	}
	first["image"] = image
	containers[0] = first
	templateSpec["containers"] = containers
	template["spec"] = templateSpec
	spec["template"] = template
	workload["spec"] = spec
	return true
}

func (s *Server) imageTagsForImage(image string) ([]gin.H, error) {
	if isHarborImage(image) {
		site, err := s.harborSiteForImage(image)
		if err != nil {
			return nil, err
		}
		projectName, repositoryName, _ := parseHarborImageTag(image, site.URL)
		artifacts, err := harborArtifacts(site, projectName, repositoryName)
		if err != nil {
			return nil, err
		}
		return tagsFromHarborArtifacts(artifacts), nil
	}
	namespace, repository, _ := parseDockerHubImageTag(image)
	return dockerHubTags(namespace, repository)
}

func (s *Server) harborSiteForImage(image string) (models.HarborSite, error) {
	host := strings.Split(image, "/")[0]
	var sites []models.HarborSite
	s.db.Find(&sites)
	for _, site := range sites {
		siteHost := strings.TrimPrefix(strings.TrimPrefix(strings.TrimRight(site.URL, "/"), "https://"), "http://")
		if strings.EqualFold(siteHost, host) {
			return site, nil
		}
	}
	var active models.HarborSite
	if err := s.db.First(&active, "active = ?", true).Error; err == nil {
		return active, nil
	}
	return models.HarborSite{}, fmt.Errorf("no Harbor site configured for image %s", image)
}

func harborArtifacts(site models.HarborSite, projectName, repositoryName string) ([]map[string]any, error) {
	query := url.Values{
		"with_tag":              []string{"true"},
		"with_label":            []string{"false"},
		"with_scan_overview":    []string{"false"},
		"with_signature":        []string{"false"},
		"with_immutable_status": []string{"false"},
		"with_accessory":        []string{"false"},
	}
	var artifacts []map[string]any
	err := harborRequest(site, "/projects/"+url.PathEscape(projectName)+"/repositories/"+encodeHarborRepository(repositoryName)+"/artifacts", query, &artifacts)
	return artifacts, err
}

func tagsFromHarborArtifacts(artifacts []map[string]any) []gin.H {
	byName := map[string]gin.H{}
	for _, artifact := range artifacts {
		tags, _ := artifact["tags"].([]any)
		for _, raw := range tags {
			tag, _ := raw.(map[string]any)
			if tag == nil {
				continue
			}
			name := valueString(tag["name"])
			size := int64FromValue(artifact["size"])
			item := gin.H{"name": name, "pushedAt": valueString(tag["push_time"]), "size": size, "sizeFormatted": formatBytes(size)}
			existing, ok := byName[name]
			if !ok || valueString(item["pushedAt"]) >= valueString(existing["pushedAt"]) {
				byName[name] = item
			}
		}
	}
	names := sortedMapKeys(byName)
	out := make([]gin.H, 0, len(names))
	for _, name := range names {
		out = append(out, byName[name])
	}
	sort.Slice(out, func(i, j int) bool { return valueString(out[i]["pushedAt"]) > valueString(out[j]["pushedAt"]) })
	return out
}

func dockerHubTags(namespace, repository string) ([]gin.H, error) {
	endpoint := "https://hub.docker.com/v2/repositories/" + url.PathEscape(namespace) + "/" + url.PathEscape(repository) + "/tags?page_size=100"
	var payload map[string]any
	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	if err := doJSON(req, 20*time.Second, &payload); err != nil {
		return nil, err
	}
	results, _ := payload["results"].([]any)
	out := make([]gin.H, 0, len(results))
	for _, raw := range results {
		item, _ := raw.(map[string]any)
		if item == nil {
			continue
		}
		size := int64FromValue(item["full_size"])
		out = append(out, gin.H{"name": valueString(item["name"]), "pushedAt": valueString(item["tag_last_pushed"]), "size": size, "sizeFormatted": formatBytes(size)})
	}
	return out, nil
}

func parseDockerHubImageTag(image string) (string, string, string) {
	imagePart := image
	tag := "latest"
	if idx := strings.LastIndex(image, ":"); idx >= 0 {
		candidate := image[idx+1:]
		if !strings.Contains(candidate, "/") {
			imagePart = image[:idx]
			tag = candidate
		}
	}
	if strings.Contains(imagePart, "/") {
		parts := strings.Split(imagePart, "/")
		return parts[0], strings.Join(parts[1:], "/"), tag
	}
	return "library", imagePart, tag
}

func normalizeWorkloadType(value string) string {
	normalized := strings.ToLower(value)
	return strings.TrimSuffix(normalized, "s")
}

func isHarborImage(image string) bool {
	return strings.Contains(image, ".") && strings.Contains(image, "/")
}

func imageNameWithoutTag(image string) string {
	if idx := strings.LastIndex(image, ":"); idx >= 0 {
		candidate := image[idx+1:]
		if !strings.Contains(candidate, "/") {
			return image[:idx]
		}
	}
	return image
}

func imageTagOnly(image string) string {
	if idx := strings.LastIndex(image, ":"); idx >= 0 {
		candidate := image[idx+1:]
		if !strings.Contains(candidate, "/") {
			return candidate
		}
	}
	return "latest"
}

func parseCompositeServiceID(serviceID string) (string, string, bool) {
	parts := strings.Split(serviceID, "-")
	for i := 1; i < len(parts); i++ {
		candidate := strings.Join(parts[:i], "-")
		if isUUID(candidate) {
			return candidate, strings.Join(parts[i:], "-"), true
		}
	}
	return "", "", false
}

func isUUID(value string) bool {
	return regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`).MatchString(value)
}

func sendTelegramMessage(token, chatID, message string) error {
	return sendTelegramMessageWithConfig(token, chatID, message, telegramRequestConfig{})
}

func sendTelegramMessageWithConfig(token, chatID, message string, cfg telegramRequestConfig) error {
	form := url.Values{"chat_id": []string{chatID}, "text": []string{message}, "parse_mode": []string{"Markdown"}}
	req, err := http.NewRequest(http.MethodPost, strings.TrimRight(telegramAPIBaseURL, "/")+"/bot"+token+"/sendMessage", strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	client, err := telegramHTTPClient(cfg)
	if err != nil {
		return err
	}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("Telegram connection failed: %s", err.Error())
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= http.StatusOK && resp.StatusCode < http.StatusMultipleChoices {
		return nil
	}
	var payload map[string]any
	if json.Unmarshal(body, &payload) == nil {
		if desc := valueString(payload["description"]); desc != "" {
			return fmt.Errorf("Telegram API error (%v): %s", payload["error_code"], desc)
		}
	}
	return fmt.Errorf("Telegram API error (%d): %s", resp.StatusCode, string(body))
}

func telegramHTTPClient(cfg telegramRequestConfig) (*http.Client, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	if strings.TrimSpace(cfg.ProxyHost) == "" || cfg.ProxyPort == nil {
		return client, nil
	}
	auth := &proxy.Auth{}
	if cfg.ProxyUsername != "" || cfg.ProxyPassword != "" {
		auth.User = cfg.ProxyUsername
		auth.Password = cfg.ProxyPassword
	} else {
		auth = nil
	}
	dialer, err := proxy.SOCKS5("tcp", net.JoinHostPort(cfg.ProxyHost, strconv.Itoa(*cfg.ProxyPort)), auth, proxy.Direct)
	if err != nil {
		return nil, err
	}
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.DialContext = func(ctx context.Context, network, address string) (net.Conn, error) {
		return dialer.Dial(network, address)
	}
	client.Transport = transport
	return client, nil
}

func (s *Server) runDailyHealthCheck() error {
	config, err := s.latestMonitoringConfig()
	if err != nil || !config.MonitoringEnabled {
		return nil
	}
	var instances []models.MonitoredInstance
	s.db.Preload("AppInstance").
		Preload("AppInstance.Environment").
		Preload("AppInstance.RancherSite").
		Preload("AppInstance.GenericClusterSite").
		Where("monitoring_enabled = ?", true).
		Find(&instances)
	results := make([]gin.H, 0, len(instances))
	for _, instance := range instances {
		results = append(results, s.performHealthCheck(instance))
	}
	if config.TelegramBotToken != nil && config.TelegramChatID != nil {
		message := s.renderTemplateByType("daily_health_check", map[string]any{
			"date":              time.Now().Format("2006-01-02"),
			"time":              time.Now().Format("15:04:05"),
			"visual_summary":    visualSummary(results),
			"avg_response_time": "0.0",
			"tagged_users":      formatTaggedUsers(config.TaggedUsers),
		})
		_ = sendTelegramMessageWithConfig(*config.TelegramBotToken, *config.TelegramChatID, message, telegramConfigFromMonitoring(config))
		if config.NotificationSchedule == "immediate" {
			for _, result := range results {
				if result["status"] == "critical" {
					_ = s.sendCriticalAlert(result, config)
				}
			}
		}
	}
	return nil
}

func (s *Server) runHourlyHealthCheck() error {
	config, err := s.latestMonitoringConfig()
	if err != nil || !config.MonitoringEnabled {
		return nil
	}
	var instances []models.MonitoredInstance
	s.db.Preload("AppInstance").
		Preload("AppInstance.Environment").
		Preload("AppInstance.RancherSite").
		Preload("AppInstance.GenericClusterSite").
		Where("monitoring_enabled = ? AND check_interval_minutes <= ?", true, 60).
		Find(&instances)
	for _, instance := range instances {
		if shouldCheckMonitoredInstance(instance) {
			result := s.performHealthCheck(instance)
			if result["status"] == "critical" && config.NotificationSchedule == "immediate" {
				_ = s.sendCriticalAlert(result, config)
			}
		}
	}
	return nil
}

func (s *Server) runFrequentHealthCheck() error {
	config, err := s.latestMonitoringConfig()
	if err != nil || !config.MonitoringEnabled {
		return nil
	}
	var instances []models.MonitoredInstance
	s.db.Preload("AppInstance").
		Preload("AppInstance.Environment").
		Preload("AppInstance.RancherSite").
		Preload("AppInstance.GenericClusterSite").
		Where("monitoring_enabled = ? AND check_interval_minutes <= ?", true, 3).
		Find(&instances)
	for _, instance := range instances {
		if shouldCheckMonitoredInstance(instance) {
			result := s.performHealthCheck(instance)
			if result["failedServices"] != 0 && (result["status"] == "critical" || result["status"] == "warning") {
				_ = s.sendCriticalAlert(result, config)
			}
		}
	}
	return nil
}

func (s *Server) performHealthCheck(instance models.MonitoredInstance) gin.H {
	start := time.Now()
	status := "healthy"
	servicesCount := 0
	healthyServices := 0
	failedServices := 0
	pausedServices := 0
	appInstanceName := "Unknown"
	environmentName := "Unknown"
	cluster := "unknown"
	namespace := "unknown"
	if instance.AppInstance != nil {
		app := *instance.AppInstance
		if app.RancherSite == nil || app.GenericClusterSite == nil || app.Environment == nil {
			_ = s.db.Preload("RancherSite").
				Preload("GenericClusterSite").
				Preload("Environment").
				First(&app, "id = ?", app.ID).Error
		}
		appInstanceName = app.Name
		cluster = app.Cluster
		namespace = app.Namespace
		if app.Environment != nil {
			environmentName = app.Environment.Name
		}
		workloads, err := s.workloadsForAppInstance(app)
		if err != nil {
			return s.recordHealthCheckError(instance, appInstanceName, environmentName, time.Since(start), err)
		}
		servicesCount = len(workloads)
		detailsWorkloads := make([]gin.H, 0, len(workloads))
		for _, workload := range workloads {
			isPaused := workload.Scale == 0
			isHealthy := isWorkloadHealthy(workload)
			workloadStatus := "failed"
			if isPaused {
				pausedServices++
				workloadStatus = "paused"
			} else if isHealthy {
				healthyServices++
				workloadStatus = "healthy"
			} else {
				failedServices++
			}
			detailsWorkloads = append(detailsWorkloads, gin.H{
				"name":              workload.Name,
				"type":              workload.Type,
				"status":            workloadStatus,
				"state":             workload.State,
				"scale":             workload.Scale,
				"availableReplicas": workload.AvailableReplicas,
				"image":             workload.Image,
			})
		}
		details := gin.H{
			"workloads": detailsWorkloads,
			"cluster":   cluster,
			"namespace": namespace,
			"checkTime": time.Now().Format(time.RFC3339Nano),
		}
		detailsJSON, _ := json.Marshal(details)
		detailsText := string(detailsJSON)
		responseTimeMS := int(time.Since(start).Milliseconds())
		now := time.Now()
		history := models.MonitoringHistory{
			MonitoredInstanceID: instance.ID,
			CheckTime:           now,
			Status:              status,
			ResponseTimeMS:      &responseTimeMS,
			ServicesCount:       &servicesCount,
			HealthyServices:     &healthyServices,
			FailedServices:      &failedServices,
			PausedServices:      &pausedServices,
			Details:             &detailsText,
		}
		if failedServices > 0 {
			if failedServices*2 >= servicesCount {
				status = "critical"
			} else {
				status = "warning"
			}
			history.Status = status
		}
		_ = s.db.Create(&history).Error
		return s.finalizeHealthCheck(instance, appInstanceName, environmentName, now, status, servicesCount, healthyServices, failedServices, pausedServices, details, "")
	}

	now := time.Now()
	responseTimeMS := int(time.Since(start).Milliseconds())
	history := models.MonitoringHistory{
		MonitoredInstanceID: instance.ID,
		CheckTime:           now,
		Status:              status,
		ResponseTimeMS:      &responseTimeMS,
		ServicesCount:       &servicesCount,
		HealthyServices:     &healthyServices,
		FailedServices:      &failedServices,
		PausedServices:      &pausedServices,
	}
	_ = s.db.Create(&history).Error
	return s.finalizeHealthCheck(instance, appInstanceName, environmentName, now, status, servicesCount, healthyServices, failedServices, pausedServices, nil, "")
}

func isWorkloadHealthy(workload workloadInfo) bool {
	if workload.Scale == 0 {
		return true
	}
	if strings.EqualFold(workload.State, "active") {
		return workload.AvailableReplicas >= workload.Scale
	}
	switch strings.ToLower(workload.Type) {
	case "deployment", "statefulset":
		return strings.EqualFold(workload.State, "active") && workload.AvailableReplicas >= workload.Scale
	case "daemonset":
		return strings.EqualFold(workload.State, "active") && workload.AvailableReplicas > 0
	default:
		return strings.EqualFold(workload.State, "active") && workload.AvailableReplicas > 0
	}
}

func (s *Server) recordHealthCheckError(instance models.MonitoredInstance, appInstanceName, environmentName string, elapsed time.Duration, err error) gin.H {
	now := time.Now()
	responseTimeMS := int(elapsed.Milliseconds())
	message := err.Error()
	_ = s.db.Create(&models.MonitoringHistory{
		MonitoredInstanceID: instance.ID,
		CheckTime:           now,
		Status:              "error",
		ResponseTimeMS:      &responseTimeMS,
		Error:               &message,
	}).Error
	consecutiveFailures := instance.ConsecutiveFailures + 1
	s.db.Model(&models.MonitoredInstance{}).Where("id = ?", instance.ID).Updates(map[string]any{
		"last_check_time":      now,
		"last_status":          "error",
		"consecutive_failures": consecutiveFailures,
		"alert_sent":           consecutiveFailures >= 3,
	})
	return gin.H{
		"monitoredInstanceId": instance.ID,
		"appInstanceName":     appInstanceName,
		"environmentName":     environmentName,
		"status":              "error",
		"servicesCount":       0,
		"healthyServices":     0,
		"failedServices":      0,
		"pausedServices":      0,
		"error":               message,
	}
}

func (s *Server) finalizeHealthCheck(instance models.MonitoredInstance, appInstanceName, environmentName string, now time.Time, status string, servicesCount, healthyServices, failedServices, pausedServices int, details gin.H, errorMessage string) gin.H {
	updates := map[string]any{"last_check_time": now, "last_status": status}
	newConsecutiveFailures := 0
	if status != "healthy" {
		newConsecutiveFailures = instance.ConsecutiveFailures + 1
		updates["consecutive_failures"] = newConsecutiveFailures
		updates["alert_sent"] = newConsecutiveFailures >= 3
	} else {
		updates["consecutive_failures"] = 0
		updates["alert_sent"] = false
	}
	s.db.Model(&models.MonitoredInstance{}).Where("id = ?", instance.ID).Updates(updates)
	if newConsecutiveFailures >= 3 && !instance.AlertSent {
		alertType := "performance_degradation"
		if failedServices > 0 {
			alertType = "service_failure"
		}
		severity := "warning"
		if status == "critical" {
			severity = "critical"
		}
		message := fmt.Sprintf("Health check failed for %s in %s", appInstanceName, environmentName)
		if failedServices > 0 {
			message += fmt.Sprintf(". %d/%d workloads are failing.", failedServices, servicesCount)
		}
		_ = s.db.Create(&models.AlertHistory{MonitoredInstanceID: instance.ID, AlertType: alertType, Severity: severity, Message: message}).Error
	}
	result := gin.H{
		"monitoredInstanceId": instance.ID,
		"appInstanceName":     appInstanceName,
		"environmentName":     environmentName,
		"status":              status,
		"servicesCount":       servicesCount,
		"healthyServices":     healthyServices,
		"failedServices":      failedServices,
		"pausedServices":      pausedServices,
	}
	if details != nil {
		result["details"] = details
	}
	if errorMessage != "" {
		result["error"] = errorMessage
	}
	return result
}

func (s *Server) sendCriticalAlert(result gin.H, config models.MonitoringConfig) error {
	if config.TelegramBotToken == nil || config.TelegramChatID == nil {
		return nil
	}
	details := fmt.Sprintf("%v/%v services failed", result["failedServices"], result["servicesCount"])
	message := s.renderTemplateByType("critical_alert", map[string]any{
		"date":         time.Now().Format("2006-01-02"),
		"time":         time.Now().Format("15:04:05"),
		"visual_alert": fmt.Sprintf("Application: %s\nEnvironment: %s\nStatus: %s\nDetails: %s", valueString(result["appInstanceName"]), valueString(result["environmentName"]), valueString(result["status"]), details),
		"tagged_users": formatTaggedUsers(config.TaggedUsers),
	})
	return sendTelegramMessageWithConfig(*config.TelegramBotToken, *config.TelegramChatID, message, telegramConfigFromMonitoring(config))
}

func shouldCheckMonitoredInstance(instance models.MonitoredInstance) bool {
	if instance.LastCheckTime == nil {
		return true
	}
	return time.Since(*instance.LastCheckTime) >= time.Duration(instance.CheckIntervalMinutes)*time.Minute
}

func (s *Server) latestMonitoringConfig() (models.MonitoringConfig, error) {
	var config models.MonitoringConfig
	err := s.db.Order("createdAt DESC").First(&config).Error
	return config, err
}

func (s *Server) renderTemplateByType(templateType string, data map[string]any) string {
	var tmpl models.MessageTemplate
	if err := s.db.First(&tmpl, "template_type = ? AND is_active = ?", templateType, true).Error; err != nil {
		defaultTmpl, _ := defaultMessageTemplate(templateType)
		tmpl = defaultTmpl
	}
	rendered := tmpl.MessageTemplate
	for key, value := range data {
		rendered = strings.ReplaceAll(rendered, "{{"+key+"}}", fmt.Sprint(value))
	}
	rendered = templatePlaceholderPattern.ReplaceAllString(rendered, "")
	return strings.TrimSpace(rendered)
}

func visualSummary(results []gin.H) string {
	total := len(results)
	healthy := 0
	for _, result := range results {
		if result["status"] == "healthy" {
			healthy++
		}
	}
	return fmt.Sprintf("Overall Status: %d/%d instances healthy", healthy, total)
}

func formatTaggedUsers(users []string) string {
	out := []string{}
	for _, user := range users {
		user = strings.TrimSpace(strings.TrimPrefix(user, "@"))
		if user != "" {
			out = append(out, "@"+user)
		}
	}
	return strings.Join(out, " ")
}

func ptrString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func trimPtr(value *string) string {
	return strings.TrimSpace(ptrString(value))
}

func firstNonNilStringSlice(primary []string, fallback []string) []string {
	if primary != nil {
		return primary
	}
	return fallback
}

func firstNonNilInt(primary *int, fallback *int) *int {
	if primary != nil {
		return primary
	}
	return fallback
}

func telegramConfigFromMonitoring(config models.MonitoringConfig) telegramRequestConfig {
	return telegramRequestConfig{
		ProxyHost:     ptrString(config.ProxyHost),
		ProxyPort:     config.ProxyPort,
		ProxyUsername: ptrString(config.ProxyUsername),
		ProxyPassword: ptrString(config.ProxyPassword),
	}
}
