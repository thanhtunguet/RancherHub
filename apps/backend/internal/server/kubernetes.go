package server

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"reflect"
	"regexp"
	"sort"
	"strings"
	"time"

	"rancher-hub-backend/internal/models"

	"github.com/gin-gonic/gin"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

type configMapData struct {
	ID                string            `json:"id"`
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Data              map[string]string `json:"data"`
	BinaryData        map[string][]byte `json:"binaryData"`
	Labels            map[string]string `json:"labels"`
	Annotations       map[string]string `json:"annotations"`
	CreationTimestamp string            `json:"creationTimestamp"`
	ResourceVersion   string            `json:"resourceVersion"`
	DataKeys          []string          `json:"dataKeys"`
	DataSize          int               `json:"dataSize"`
	AppInstanceID     string            `json:"appInstanceId"`
}

type secretData struct {
	ID                string            `json:"id"`
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Type              string            `json:"type"`
	Data              map[string]string `json:"data,omitempty"`
	DataKeys          []string          `json:"dataKeys"`
	DataSize          int               `json:"dataSize"`
	Labels            map[string]string `json:"labels"`
	Annotations       map[string]string `json:"annotations"`
	CreationTimestamp string            `json:"creationTimestamp"`
	ResourceVersion   string            `json:"resourceVersion"`
	AppInstanceID     string            `json:"appInstanceId"`
}

type syncConfigMapKeyDTO struct {
	SourceAppInstanceID string `json:"sourceAppInstanceId" binding:"required,uuid"`
	TargetAppInstanceID string `json:"targetAppInstanceId" binding:"required,uuid"`
	ConfigMapName       string `json:"configMapName" binding:"required"`
	Key                 string `json:"key" binding:"required,max=253"`
	Value               string `json:"value" binding:"max=1048576"`
}

type syncConfigMapKeysDTO struct {
	SourceAppInstanceID string            `json:"sourceAppInstanceId" binding:"required,uuid"`
	TargetAppInstanceID string            `json:"targetAppInstanceId" binding:"required,uuid"`
	ConfigMapName       string            `json:"configMapName" binding:"required"`
	Keys                map[string]string `json:"keys" binding:"required"`
}

type syncSecretKeyDTO struct {
	SourceAppInstanceID string `json:"sourceAppInstanceId" binding:"required,uuid"`
	TargetAppInstanceID string `json:"targetAppInstanceId" binding:"required,uuid"`
	SecretName          string `json:"secretName" binding:"required"`
	Key                 string `json:"key" binding:"required,max=253"`
	Value               string `json:"value" binding:"max=1048576"`
}

type syncSecretKeysDTO struct {
	SourceAppInstanceID string            `json:"sourceAppInstanceId" binding:"required,uuid"`
	TargetAppInstanceID string            `json:"targetAppInstanceId" binding:"required,uuid"`
	SecretName          string            `json:"secretName" binding:"required"`
	Keys                map[string]string `json:"keys" binding:"required"`
}

var k8sResourceNamePattern = regexp.MustCompile(`^[a-z0-9]([a-z0-9\-.]{0,251}[a-z0-9])?$`)

func validateKubernetesResourceName(c *gin.Context, label, value string) bool {
	if k8sResourceNamePattern.MatchString(value) {
		return true
	}
	abort(c, http.StatusBadRequest, fmt.Sprintf("%s must be a valid Kubernetes resource name (lowercase alphanumeric, hyphens, dots)", label))
	return false
}

func parseKubeconfigMetadata(kubeconfig string) (string, string, error) {
	config, err := clientcmd.Load([]byte(kubeconfig))
	if err != nil {
		return "", "", err
	}
	if config.CurrentContext == "" {
		return "", "", fmt.Errorf("kubeconfig must have a current-context")
	}
	contextConfig, ok := config.Contexts[config.CurrentContext]
	if !ok || contextConfig == nil {
		return "", "", fmt.Errorf("current context %q not found", config.CurrentContext)
	}
	clusterName := contextConfig.Cluster
	clusterConfig, ok := config.Clusters[clusterName]
	if !ok || clusterConfig == nil {
		return "", "", fmt.Errorf("cluster %q not found in kubeconfig", clusterName)
	}
	if clusterConfig.Server == "" {
		return "", "", fmt.Errorf("cluster must have a server URL")
	}
	return clusterName, clusterConfig.Server, nil
}

func genericKubernetesClient(kubeconfig string) (*kubernetes.Clientset, error) {
	restConfig, err := clientcmd.RESTConfigFromKubeConfig([]byte(kubeconfig))
	if err != nil {
		return nil, err
	}
	return kubernetes.NewForConfig(restConfig)
}

func genericKubernetesNamespaces(kubeconfig string) ([]gin.H, error) {
	clusterName, _, _ := parseKubeconfigMetadata(kubeconfig)
	client, err := genericKubernetesClient(kubeconfig)
	if err != nil {
		return nil, err
	}
	list, err := client.CoreV1().Namespaces().List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	out := make([]gin.H, 0, len(list.Items))
	for _, ns := range list.Items {
		out = append(out, gin.H{
			"id":        firstNonEmpty(string(ns.UID), ns.Name),
			"name":      ns.Name,
			"state":     firstNonEmpty(string(ns.Status.Phase), "Active"),
			"created":   ns.CreationTimestamp.Time,
			"projectId": "",
			"clusterId": clusterName,
		})
	}
	return out, nil
}

func (s *Server) configMapsByAppInstance(appInstanceID string) ([]configMapData, error) {
	app, err := s.loadAppInstance(appInstanceID)
	if err != nil {
		return nil, err
	}
	var configMaps []configMapData
	if app.ClusterType == "generic" {
		if app.GenericClusterSite == nil {
			return nil, fmt.Errorf("generic cluster site not found")
		}
		configMaps, err = genericConfigMaps(app.GenericClusterSite.Kubeconfig, app.Namespace)
	} else {
		if app.RancherSite == nil {
			return nil, fmt.Errorf("rancher site not found")
		}
		configMaps, err = rancherConfigMaps(*app.RancherSite, app.Cluster, app.Namespace)
	}
	if err != nil {
		return nil, err
	}
	for i := range configMaps {
		configMaps[i].AppInstanceID = appInstanceID
	}
	return configMaps, nil
}

func (s *Server) secretsByAppInstance(appInstanceID string) ([]secretData, error) {
	app, err := s.loadAppInstance(appInstanceID)
	if err != nil {
		return nil, err
	}
	var secrets []secretData
	if app.ClusterType == "generic" {
		if app.GenericClusterSite == nil {
			return nil, fmt.Errorf("generic cluster site not found")
		}
		secrets, err = genericSecrets(app.GenericClusterSite.Kubeconfig, app.Namespace)
	} else {
		if app.RancherSite == nil {
			return nil, fmt.Errorf("rancher site not found")
		}
		secrets, err = rancherSecrets(*app.RancherSite, app.Cluster, app.Namespace)
	}
	if err != nil {
		return nil, err
	}
	for i := range secrets {
		secrets[i].AppInstanceID = appInstanceID
	}
	return secrets, nil
}

func (s *Server) loadAppInstance(id string) (models.AppInstance, error) {
	var app models.AppInstance
	err := s.db.Preload("RancherSite").
		Preload("GenericClusterSite").
		Preload("Environment").
		First(&app, "id = ?", id).Error
	if err != nil {
		return app, err
	}
	return app, nil
}

func genericConfigMaps(kubeconfig, namespace string) ([]configMapData, error) {
	client, err := genericKubernetesClient(kubeconfig)
	if err != nil {
		return nil, err
	}
	list, err := client.CoreV1().ConfigMaps(namespace).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	out := make([]configMapData, 0, len(list.Items))
	for _, item := range list.Items {
		out = append(out, configMapFromK8s(item, namespace))
	}
	return out, nil
}

func genericSecrets(kubeconfig, namespace string) ([]secretData, error) {
	client, err := genericKubernetesClient(kubeconfig)
	if err != nil {
		return nil, err
	}
	list, err := client.CoreV1().Secrets(namespace).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	out := make([]secretData, 0, len(list.Items))
	for _, item := range list.Items {
		if isSystemSecret(item.Name, string(item.Type)) {
			continue
		}
		out = append(out, secretFromK8s(item, namespace))
	}
	return out, nil
}

func rancherConfigMaps(site models.RancherSite, clusterID, namespace string) ([]configMapData, error) {
	var payload map[string]any
	endpoint := "/v1/configmaps?exclude=metadata.managedFields&namespace=" + url.QueryEscape(namespace)
	if err := rancherK8sRequest(site, clusterID, http.MethodGet, endpoint, nil, &payload); err != nil {
		return nil, err
	}
	items := arrayFromPayload(payload)
	out := make([]configMapData, 0, len(items))
	for _, item := range items {
		if metadataNamespace(item) != namespace {
			continue
		}
		out = append(out, configMapFromMap(item, namespace))
	}
	return out, nil
}

func rancherSecrets(site models.RancherSite, clusterID, namespace string) ([]secretData, error) {
	var payload map[string]any
	endpoint := "/v1/secrets?exclude=metadata.managedFields&namespace=" + url.QueryEscape(namespace)
	if err := rancherK8sRequest(site, clusterID, http.MethodGet, endpoint, nil, &payload); err != nil {
		return nil, err
	}
	items := arrayFromPayload(payload)
	out := make([]secretData, 0, len(items))
	for _, item := range items {
		if metadataNamespace(item) != namespace {
			continue
		}
		name := metadataName(item)
		typ := firstNonEmpty(valueString(item["type"]), "Opaque")
		if isSystemSecret(name, typ) {
			continue
		}
		out = append(out, secretFromMap(item, namespace))
	}
	return out, nil
}

func (s *Server) syncConfigMap(sourceID, targetID, name string, keys map[string]string, initiatedBy string) (gin.H, error) {
	source, err := s.loadAppInstance(sourceID)
	if err != nil {
		return nil, err
	}
	target, err := s.loadAppInstance(targetID)
	if err != nil {
		return nil, err
	}
	op, err := s.createResourceSyncOperation(source, target, nil, initiatedBy)
	if err != nil {
		return nil, err
	}
	start := time.Now()
	configChanges := gin.H{"configMapName": name, "keys": keys, "keysCount": len(keys)}
	err = s.updateTargetConfigMap(target, name, keys)
	status := "success"
	var errMsg *string
	if err != nil {
		status = "failed"
		msg := err.Error()
		errMsg = &msg
	}
	_ = s.recordResourceSyncHistory(op.ID, "configmap", name, source, target, configChanges, status, errMsg, time.Since(start), initiatedBy)
	s.finishSyncOperation(&op, status)
	if err != nil {
		return nil, err
	}
	return gin.H{"success": true, "syncOperationId": op.ID}, nil
}

func (s *Server) syncSecret(sourceID, targetID, name string, keys map[string]string, initiatedBy string) (gin.H, error) {
	source, err := s.loadAppInstance(sourceID)
	if err != nil {
		return nil, err
	}
	target, err := s.loadAppInstance(targetID)
	if err != nil {
		return nil, err
	}
	serviceIDs := []string{name}
	op, err := s.createResourceSyncOperation(source, target, serviceIDs, initiatedBy)
	if err != nil {
		return nil, err
	}
	start := time.Now()
	configChanges := gin.H{"secretName": name, "keys": sortedMapKeys(keys), "keysCount": len(keys)}
	err = s.updateTargetSecret(target, name, keys)
	status := "success"
	var errMsg *string
	if err != nil {
		status = "failed"
		msg := err.Error()
		errMsg = &msg
	}
	_ = s.recordResourceSyncHistory(op.ID, "secret", name, source, target, configChanges, status, errMsg, time.Since(start), initiatedBy)
	s.finishSyncOperation(&op, status)
	if err != nil {
		return nil, err
	}
	return gin.H{"success": true, "syncOperationId": op.ID}, nil
}

func (s *Server) updateTargetConfigMap(target models.AppInstance, name string, keys map[string]string) error {
	if target.ClusterType == "generic" {
		if target.GenericClusterSite == nil {
			return fmt.Errorf("generic cluster site not found")
		}
		return genericUpdateConfigMap(target.GenericClusterSite.Kubeconfig, target.Namespace, name, keys)
	}
	if target.RancherSite == nil {
		return fmt.Errorf("rancher site not found")
	}
	return rancherUpdateConfigMap(*target.RancherSite, target.Cluster, target.Namespace, name, keys)
}

func (s *Server) updateTargetSecret(target models.AppInstance, name string, keys map[string]string) error {
	if target.ClusterType == "generic" {
		if target.GenericClusterSite == nil {
			return fmt.Errorf("generic cluster site not found")
		}
		return genericUpdateSecret(target.GenericClusterSite.Kubeconfig, target.Namespace, name, keys)
	}
	if target.RancherSite == nil {
		return fmt.Errorf("rancher site not found")
	}
	return rancherUpdateSecret(*target.RancherSite, target.Cluster, target.Namespace, name, keys)
}

func genericUpdateConfigMap(kubeconfig, namespace, name string, keys map[string]string) error {
	client, err := genericKubernetesClient(kubeconfig)
	if err != nil {
		return err
	}
	api := client.CoreV1().ConfigMaps(namespace)
	configMap, err := api.Get(context.Background(), name, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		_, err = api.Create(context.Background(), &corev1.ConfigMap{
			TypeMeta:   metav1.TypeMeta{APIVersion: "v1", Kind: "ConfigMap"},
			ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
			Data:       cloneStringMap(keys),
		}, metav1.CreateOptions{})
		return err
	}
	if err != nil {
		return err
	}
	if configMap.Data == nil {
		configMap.Data = map[string]string{}
	}
	for key, value := range keys {
		configMap.Data[key] = value
	}
	_, err = api.Update(context.Background(), configMap, metav1.UpdateOptions{})
	return err
}

func genericUpdateSecret(kubeconfig, namespace, name string, keys map[string]string) error {
	client, err := genericKubernetesClient(kubeconfig)
	if err != nil {
		return err
	}
	api := client.CoreV1().Secrets(namespace)
	secret, err := api.Get(context.Background(), name, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		_, err = api.Create(context.Background(), &corev1.Secret{
			TypeMeta:   metav1.TypeMeta{APIVersion: "v1", Kind: "Secret"},
			ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
			Type:       corev1.SecretTypeOpaque,
			Data:       stringMapToBytes(keys),
		}, metav1.CreateOptions{})
		return err
	}
	if err != nil {
		return err
	}
	if secret.Data == nil {
		secret.Data = map[string][]byte{}
	}
	for key, value := range keys {
		secret.Data[key] = []byte(value)
	}
	_, err = api.Update(context.Background(), secret, metav1.UpdateOptions{})
	return err
}

func rancherUpdateConfigMap(site models.RancherSite, clusterID, namespace, name string, keys map[string]string) error {
	endpoint := "/v1/configmaps/" + url.PathEscape(namespace) + "/" + url.PathEscape(name)
	var configMap map[string]any
	err := rancherK8sRequest(site, clusterID, http.MethodGet, endpoint, nil, &configMap)
	if isHTTPNotFound(err) {
		body := gin.H{
			"apiVersion": "v1",
			"kind":       "ConfigMap",
			"metadata":   gin.H{"name": name, "namespace": namespace},
			"data":       cloneStringMap(keys),
		}
		return rancherK8sRequest(site, clusterID, http.MethodPost, "/v1/configmaps/"+url.PathEscape(namespace), body, nil)
	}
	if err != nil {
		return err
	}
	data, _ := configMap["data"].(map[string]any)
	if data == nil {
		data = map[string]any{}
	}
	for key, value := range keys {
		data[key] = value
	}
	configMap["data"] = data
	return rancherK8sRequest(site, clusterID, http.MethodPut, endpoint, configMap, nil)
}

func rancherUpdateSecret(site models.RancherSite, clusterID, namespace, name string, keys map[string]string) error {
	endpoint := "/v1/secrets/" + url.PathEscape(namespace) + "/" + url.PathEscape(name)
	var secret map[string]any
	err := rancherK8sRequest(site, clusterID, http.MethodGet, endpoint, nil, &secret)
	if isHTTPNotFound(err) {
		body := gin.H{
			"apiVersion": "v1",
			"kind":       "Secret",
			"type":       "Opaque",
			"metadata":   gin.H{"name": name, "namespace": namespace},
			"data":       cloneStringMap(keys),
		}
		return rancherK8sRequest(site, clusterID, http.MethodPost, "/v1/secrets/"+url.PathEscape(namespace), body, nil)
	}
	if err != nil {
		return err
	}
	data, _ := secret["data"].(map[string]any)
	if data == nil {
		data = map[string]any{}
	}
	for key, value := range keys {
		data[key] = value
	}
	secret["data"] = data
	return rancherK8sRequest(site, clusterID, http.MethodPut, endpoint, secret, nil)
}

func rancherK8sRequest(site models.RancherSite, clusterID, method, endpoint string, body any, out any) error {
	var reader *bytes.Reader
	if body == nil {
		reader = bytes.NewReader(nil)
	} else {
		payload, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(payload)
	}
	reqURL := stringsTrimRightSlash(site.URL) + "/k8s/clusters/" + url.PathEscape(clusterID) + "/" + stringsTrimLeftSlash(endpoint)
	req, err := http.NewRequest(method, reqURL, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+site.Token)
	req.Header.Set("Content-Type", "application/json")
	return doJSON(req, 30*time.Second, out)
}

func (s *Server) createResourceSyncOperation(source, target models.AppInstance, serviceIDs []string, initiatedBy string) (models.SyncOperation, error) {
	if serviceIDs == nil {
		serviceIDs = []string{}
	}
	op := models.SyncOperation{
		SourceEnvironmentID: source.EnvironmentID,
		TargetEnvironmentID: target.EnvironmentID,
		ServiceIDs:          serviceIDs,
		Status:              "pending",
		StartTime:           time.Now(),
		InitiatedBy:         initiatedBy,
	}
	err := s.db.Create(&op).Error
	return op, err
}

func (s *Server) finishSyncOperation(op *models.SyncOperation, status string) {
	end := time.Now()
	op.EndTime = &end
	if status == "success" {
		op.Status = "completed"
	} else {
		op.Status = "failed"
	}
	s.db.Save(op)
}

func (s *Server) recordResourceSyncHistory(operationID, resourceType, resourceName string, source, target models.AppInstance, configChanges any, status string, errMsg *string, duration time.Duration, initiatedBy string) error {
	changes, _ := json.Marshal(configChanges)
	durationMS := int(duration.Milliseconds())
	history := models.SyncHistory{
		SyncOperationID:       operationID,
		ServiceID:             resourceName,
		ServiceName:           strPtr(resourceName),
		WorkloadType:          strPtr(resourceType),
		SourceAppInstanceID:   source.ID,
		SourceEnvironmentName: envName(source),
		SourceCluster:         nullableString(source.Cluster),
		SourceNamespace:       nullableString(source.Namespace),
		TargetAppInstanceID:   target.ID,
		TargetEnvironmentName: envName(target),
		TargetCluster:         nullableString(target.Cluster),
		TargetNamespace:       nullableString(target.Namespace),
		ConfigChanges:         strPtr(string(changes)),
		Status:                status,
		Error:                 errMsg,
		DurationMS:            &durationMS,
		InitiatedBy:           &initiatedBy,
		Timestamp:             time.Now(),
	}
	return s.db.Create(&history).Error
}

func compareConfigMaps(sourceID, targetID string, source, target []configMapData) gin.H {
	sourceMap := map[string]configMapData{}
	targetMap := map[string]configMapData{}
	names := map[string]bool{}
	for _, item := range source {
		sourceMap[item.Name] = item
		names[item.Name] = true
	}
	for _, item := range target {
		targetMap[item.Name] = item
		names[item.Name] = true
	}
	comparisons := make([]gin.H, 0, len(names))
	for name := range names {
		src, srcOK := sourceMap[name]
		tgt, tgtOK := targetMap[name]
		comparisons = append(comparisons, configMapComparison(name, src, srcOK, tgt, tgtOK))
	}
	sort.Slice(comparisons, func(i, j int) bool {
		order := map[string]int{"missing_in_source": 0, "missing_in_target": 1, "different": 2, "identical": 3}
		left := valueString(comparisons[i]["differenceType"])
		right := valueString(comparisons[j]["differenceType"])
		if left != right {
			return order[left] < order[right]
		}
		return valueString(comparisons[i]["configMapName"]) < valueString(comparisons[j]["configMapName"])
	})
	return gin.H{"sourceAppInstanceId": sourceID, "targetAppInstanceId": targetID, "summary": comparisonSummary(comparisons, "configmap"), "comparisons": comparisons}
}

func configMapComparison(name string, source configMapData, sourceOK bool, target configMapData, targetOK bool) gin.H {
	diff := configMapDifferences(source, sourceOK, target, targetOK)
	differenceType := "identical"
	status := "identical"
	if !sourceOK && targetOK {
		differenceType = "missing_in_source"
		status = "missing"
	} else if sourceOK && !targetOK {
		differenceType = "missing_in_target"
		status = "missing"
	} else if diff["data"].(bool) || diff["labels"].(bool) || diff["annotations"].(bool) {
		differenceType = "different"
		status = "different"
	}
	return gin.H{"configMapName": name, "source": nullableConfigMap(source, sourceOK), "target": nullableConfigMap(target, targetOK), "differences": diff, "status": status, "differenceType": differenceType}
}

func configMapDifferences(source configMapData, sourceOK bool, target configMapData, targetOK bool) gin.H {
	if !sourceOK || !targetOK {
		return gin.H{"existence": true, "data": false, "labels": false, "annotations": false, "dataKeys": []string{}, "changedKeys": []string{}}
	}
	sourceKeys := stringSet(source.DataKeys)
	targetKeys := stringSet(target.DataKeys)
	allKeys := unionKeys(sourceKeys, targetKeys)
	dataKeys := []string{}
	changedKeys := []string{}
	for _, key := range allKeys {
		if !sourceKeys[key] || !targetKeys[key] {
			dataKeys = append(dataKeys, key)
			continue
		}
		if source.Data[key] != target.Data[key] {
			changedKeys = append(changedKeys, key)
		}
	}
	return gin.H{"existence": false, "data": len(changedKeys) > 0 || len(dataKeys) > 0, "labels": !reflect.DeepEqual(source.Labels, target.Labels), "annotations": !reflect.DeepEqual(source.Annotations, target.Annotations), "dataKeys": dataKeys, "changedKeys": changedKeys}
}

func configMapDetails(name, sourceID, targetID string, source, target []configMapData) (gin.H, bool) {
	src, srcOK := findConfigMap(source, name)
	tgt, tgtOK := findConfigMap(target, name)
	if !srcOK && !tgtOK {
		return nil, false
	}
	keys := unionKeys(stringSet(src.DataKeys), stringSet(tgt.DataKeys))
	keyComparisons := make([]gin.H, 0, len(keys))
	for _, key := range keys {
		sourceValue, targetValue := src.Data[key], tgt.Data[key]
		sourceExists, targetExists := srcOK && mapHasKey(src.Data, key), tgtOK && mapHasKey(tgt.Data, key)
		keyComparisons = append(keyComparisons, gin.H{"key": key, "sourceValue": nullableValue(sourceValue, sourceExists), "targetValue": nullableValue(targetValue, targetExists), "isDifferent": sourceValue != targetValue, "missingInSource": !sourceExists && targetExists, "missingInTarget": sourceExists && !targetExists, "identical": sourceExists && targetExists && sourceValue == targetValue})
	}
	return gin.H{"configMapName": name, "sourceAppInstanceId": sourceID, "targetAppInstanceId": targetID, "sourceConfigMap": nullableConfigMap(src, srcOK), "targetConfigMap": nullableConfigMap(tgt, tgtOK), "keyComparisons": keyComparisons, "summary": keyComparisonSummary(keyComparisons)}, true
}

func compareSecrets(sourceID, targetID string, source, target []secretData) gin.H {
	sourceMap := map[string]secretData{}
	targetMap := map[string]secretData{}
	names := map[string]bool{}
	for _, item := range source {
		sourceMap[item.Name] = item
		names[item.Name] = true
	}
	for _, item := range target {
		targetMap[item.Name] = item
		names[item.Name] = true
	}
	comparisons := make([]gin.H, 0, len(names))
	for name := range names {
		src, srcOK := sourceMap[name]
		tgt, tgtOK := targetMap[name]
		comparisons = append(comparisons, secretComparison(name, src, srcOK, tgt, tgtOK))
	}
	return gin.H{"sourceAppInstanceId": sourceID, "targetAppInstanceId": targetID, "summary": comparisonSummary(comparisons, "secret"), "comparisons": comparisons}
}

func secretComparison(name string, source secretData, sourceOK bool, target secretData, targetOK bool) gin.H {
	diff := secretDifferences(source, sourceOK, target, targetOK)
	status := "different"
	differenceType := "data-different"
	if !sourceOK {
		status = "missing"
		differenceType = "missing-in-source"
	} else if !targetOK {
		status = "missing"
		differenceType = "missing-in-target"
	} else if len(diff["keys"].(gin.H)["onlyInSource"].([]string)) == 0 && len(diff["keys"].(gin.H)["onlyInTarget"].([]string)) == 0 && len(diff["keys"].(gin.H)["different"].([]string)) == 0 {
		status = "identical"
		differenceType = "identical"
	}
	return gin.H{"secretName": name, "source": nullableSecret(source, sourceOK), "target": nullableSecret(target, targetOK), "status": status, "differenceType": differenceType, "differences": diff}
}

func secretDifferences(source secretData, sourceOK bool, target secretData, targetOK bool) gin.H {
	if !sourceOK || !targetOK {
		existing := source
		if targetOK {
			existing = target
		}
		return gin.H{"keys": gin.H{"onlyInSource": conditionalKeys(sourceOK, existing.DataKeys), "onlyInTarget": conditionalKeys(targetOK, existing.DataKeys), "different": []string{}, "identical": []string{}}, "metadata": gin.H{"labels": existing.Labels, "annotations": existing.Annotations}}
	}
	sourceKeys := stringSet(source.DataKeys)
	targetKeys := stringSet(target.DataKeys)
	onlyInSource := diffKeys(sourceKeys, targetKeys)
	onlyInTarget := diffKeys(targetKeys, sourceKeys)
	common := intersectKeys(sourceKeys, targetKeys)
	different := []string{}
	identical := []string{}
	for _, key := range common {
		if source.Data[key] != target.Data[key] {
			different = append(different, key)
		} else {
			identical = append(identical, key)
		}
	}
	return gin.H{"keys": gin.H{"onlyInSource": onlyInSource, "onlyInTarget": onlyInTarget, "different": different, "identical": identical}, "metadata": gin.H{"labels": gin.H{"source": source.Labels, "target": target.Labels}, "annotations": gin.H{"source": source.Annotations, "target": target.Annotations}}}
}

func secretDetails(name, sourceID, targetID string, source, target []secretData) (gin.H, bool) {
	src, srcOK := findSecret(source, name)
	tgt, tgtOK := findSecret(target, name)
	if !srcOK && !tgtOK {
		return nil, false
	}
	keys := unionKeys(stringSet(src.DataKeys), stringSet(tgt.DataKeys))
	keyComparisons := make([]gin.H, 0, len(keys))
	for _, key := range keys {
		sourceExists, targetExists := srcOK && mapHasKey(src.Data, key), tgtOK && mapHasKey(tgt.Data, key)
		isDifferent := sourceExists && targetExists && src.Data[key] != tgt.Data[key]
		keyComparisons = append(keyComparisons, gin.H{"key": key, "sourceExists": sourceExists, "targetExists": targetExists, "isDifferent": isDifferent, "missingInSource": !sourceExists && targetExists, "missingInTarget": sourceExists && !targetExists, "identical": sourceExists && targetExists && src.Data[key] == tgt.Data[key]})
	}
	return gin.H{"secretName": name, "sourceAppInstanceId": sourceID, "targetAppInstanceId": targetID, "source": nullableSecret(src, srcOK), "target": nullableSecret(tgt, tgtOK), "keyComparisons": keyComparisons, "summary": keyComparisonSummary(keyComparisons)}, true
}

func configMapFromK8s(item corev1.ConfigMap, namespace string) configMapData {
	return configMapData{ID: firstNonEmpty(string(item.UID), item.Name), Name: item.Name, Namespace: firstNonEmpty(item.Namespace, namespace), Data: ensureStringMap(item.Data), BinaryData: item.BinaryData, Labels: ensureStringMap(item.Labels), Annotations: ensureStringMap(item.Annotations), CreationTimestamp: item.CreationTimestamp.Time.Format(time.RFC3339), ResourceVersion: item.ResourceVersion, DataKeys: sortedMapKeys(item.Data), DataSize: len(item.Data)}
}

func secretFromK8s(item corev1.Secret, namespace string) secretData {
	data := map[string]string{}
	for key, value := range item.Data {
		data[key] = base64.StdEncoding.EncodeToString(value)
	}
	return secretData{ID: firstNonEmpty(string(item.UID), item.Name), Name: item.Name, Namespace: firstNonEmpty(item.Namespace, namespace), Type: firstNonEmpty(string(item.Type), "Opaque"), Data: data, DataKeys: sortedMapKeys(data), DataSize: len(data), Labels: ensureStringMap(item.Labels), Annotations: ensureStringMap(item.Annotations), CreationTimestamp: item.CreationTimestamp.Time.Format(time.RFC3339), ResourceVersion: item.ResourceVersion}
}

func configMapFromMap(item map[string]any, namespace string) configMapData {
	return configMapData{ID: firstNonEmpty(metadataString(item, "uid"), metadataName(item)), Name: metadataName(item), Namespace: firstNonEmpty(metadataNamespace(item), namespace), Data: stringMapFromAny(item["data"]), BinaryData: mapStringBytesFromAny(item["binaryData"]), Labels: stringMapFromAny(metadataMap(item, "labels")), Annotations: stringMapFromAny(metadataMap(item, "annotations")), CreationTimestamp: valueString(metadataMap(item, "creationTimestamp")), ResourceVersion: metadataString(item, "resourceVersion"), DataKeys: sortedMapKeys(stringMapFromAny(item["data"])), DataSize: len(stringMapFromAny(item["data"]))}
}

func secretFromMap(item map[string]any, namespace string) secretData {
	data := stringMapFromAny(item["data"])
	return secretData{ID: firstNonEmpty(metadataString(item, "uid"), metadataName(item)), Name: metadataName(item), Namespace: firstNonEmpty(metadataNamespace(item), namespace), Type: firstNonEmpty(valueString(item["type"]), "Opaque"), Data: data, DataKeys: sortedMapKeys(data), DataSize: len(data), Labels: stringMapFromAny(metadataMap(item, "labels")), Annotations: stringMapFromAny(metadataMap(item, "annotations")), CreationTimestamp: valueString(metadataMap(item, "creationTimestamp")), ResourceVersion: metadataString(item, "resourceVersion")}
}

func abortResourceError(c *gin.Context, err error) {
	if err == nil {
		return
	}
	if apierrors.IsNotFound(err) || err.Error() == "record not found" {
		abort(c, http.StatusNotFound, err.Error())
		return
	}
	abort(c, http.StatusBadGateway, err.Error())
}

func comparisonSummary(comparisons []gin.H, kind string) gin.H {
	summary := gin.H{"identical": 0, "different": 0, "missingInSource": 0, "missingInTarget": 0}
	totalKey := "totalConfigMaps"
	if kind == "secret" {
		totalKey = "totalSecrets"
	}
	summary[totalKey] = len(comparisons)
	for _, item := range comparisons {
		switch item["differenceType"] {
		case "identical":
			summary["identical"] = summary["identical"].(int) + 1
		case "different", "data-different":
			summary["different"] = summary["different"].(int) + 1
		case "missing_in_source", "missing-in-source":
			summary["missingInSource"] = summary["missingInSource"].(int) + 1
		case "missing_in_target", "missing-in-target":
			summary["missingInTarget"] = summary["missingInTarget"].(int) + 1
		}
	}
	return summary
}

func keyComparisonSummary(items []gin.H) gin.H {
	return gin.H{"totalKeys": len(items), "identical": countBool(items, "identical"), "different": countBool(items, "isDifferent"), "missingInSource": countBool(items, "missingInSource"), "missingInTarget": countBool(items, "missingInTarget")}
}

func countBool(items []gin.H, key string) int {
	count := 0
	for _, item := range items {
		if value, _ := item[key].(bool); value {
			count++
		}
	}
	return count
}

func isSystemSecret(name, typ string) bool {
	return typ == "kubernetes.io/service-account-token" || typ == "kubernetes.io/dockercfg" || typ == "kubernetes.io/dockerconfigjson" || stringsHasPrefix(name, "default-token-") || stringsContains(name, ".dockercfg") || stringsContains(name, ".dockerconfigjson")
}

func isHTTPNotFound(err error) bool {
	var statusErr httpStatusError
	return err != nil && errorsAs(err, &statusErr) && statusErr.status == http.StatusNotFound
}

func envName(app models.AppInstance) *string {
	if app.Environment == nil || app.Environment.Name == "" {
		return nil
	}
	return &app.Environment.Name
}

func nullableString(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func strPtr(value string) *string { return &value }

func cloneStringMap(input map[string]string) map[string]string {
	output := map[string]string{}
	for key, value := range input {
		output[key] = value
	}
	return output
}

func stringMapToBytes(input map[string]string) map[string][]byte {
	output := map[string][]byte{}
	for key, value := range input {
		output[key] = []byte(value)
	}
	return output
}

func ensureStringMap(input map[string]string) map[string]string {
	if input == nil {
		return map[string]string{}
	}
	return input
}

func stringMapFromAny(input any) map[string]string {
	output := map[string]string{}
	mapped, _ := input.(map[string]any)
	for key, value := range mapped {
		output[key] = valueString(value)
	}
	return output
}

func mapStringBytesFromAny(input any) map[string][]byte {
	output := map[string][]byte{}
	mapped, _ := input.(map[string]any)
	for key, value := range mapped {
		output[key] = []byte(valueString(value))
	}
	return output
}

func metadata(item map[string]any) map[string]any {
	mapped, _ := item["metadata"].(map[string]any)
	if mapped == nil {
		return map[string]any{}
	}
	return mapped
}

func metadataName(item map[string]any) string      { return metadataString(item, "name") }
func metadataNamespace(item map[string]any) string { return metadataString(item, "namespace") }
func metadataString(item map[string]any, key string) string {
	return valueString(metadata(item)[key])
}
func metadataMap(item map[string]any, key string) any { return metadata(item)[key] }

func sortedMapKeys[V any](input map[string]V) []string {
	keys := make([]string, 0, len(input))
	for key := range input {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func stringSet(values []string) map[string]bool {
	set := map[string]bool{}
	for _, value := range values {
		set[value] = true
	}
	return set
}

func unionKeys(a, b map[string]bool) []string {
	out := map[string]bool{}
	for key := range a {
		out[key] = true
	}
	for key := range b {
		out[key] = true
	}
	return sortedMapKeys(out)
}

func diffKeys(left, right map[string]bool) []string {
	out := []string{}
	for key := range left {
		if !right[key] {
			out = append(out, key)
		}
	}
	sort.Strings(out)
	return out
}

func intersectKeys(left, right map[string]bool) []string {
	out := []string{}
	for key := range left {
		if right[key] {
			out = append(out, key)
		}
	}
	sort.Strings(out)
	return out
}

func mapHasKey[V any](input map[string]V, key string) bool {
	_, ok := input[key]
	return ok
}

func conditionalKeys(condition bool, keys []string) []string {
	if condition {
		return keys
	}
	return []string{}
}

func nullableValue(value string, exists bool) any {
	if exists {
		return value
	}
	return nil
}

func nullableConfigMap(value configMapData, exists bool) any {
	if exists {
		return value
	}
	return nil
}

func nullableSecret(value secretData, exists bool) any {
	if exists {
		return value
	}
	return nil
}

func findConfigMap(items []configMapData, name string) (configMapData, bool) {
	for _, item := range items {
		if item.Name == name {
			return item, true
		}
	}
	return configMapData{}, false
}

func findSecret(items []secretData, name string) (secretData, bool) {
	for _, item := range items {
		if item.Name == name {
			return item, true
		}
	}
	return secretData{}, false
}

func stringsTrimRightSlash(value string) string  { return strings.TrimRight(value, "/") }
func stringsTrimLeftSlash(value string) string   { return strings.TrimLeft(value, "/") }
func stringsHasPrefix(value, prefix string) bool { return strings.HasPrefix(value, prefix) }
func stringsContains(value, substr string) bool  { return strings.Contains(value, substr) }
func errorsAs(err error, target any) bool        { return errors.As(err, target) }
