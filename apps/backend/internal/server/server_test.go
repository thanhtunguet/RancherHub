package server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"rancher-hub-backend/internal/config"
	"rancher-hub-backend/internal/database"
	"rancher-hub-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/pquerna/otp/totp"
	"gorm.io/gorm"
)

type testApp struct {
	t      *testing.T
	router http.Handler
	db     *gorm.DB
	token  string
}

func newTestApp(t *testing.T) *testApp {
	return newTestAppWithLogin(t, true)
}

func newTestAppWithLogin(t *testing.T, autoLogin bool) *testApp {
	t.Helper()
	gin.SetMode(gin.TestMode)
	cfg := config.Config{
		Port:         "0",
		FrontendURL:  "http://localhost:5173",
		JWTSecret:    "test-secret",
		DatabaseType: "sqlite",
		DatabasePath: filepath.Join(t.TempDir(), "test.db"),
	}
	db, err := database.Open(cfg)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := database.Migrate(db); err != nil {
		t.Fatalf("migrate db: %v", err)
	}
	if err := database.SeedDefaultAdmin(db); err != nil {
		t.Fatalf("seed admin: %v", err)
	}
	if err := database.SeedDefaultMessageTemplates(db); err != nil {
		t.Fatalf("seed message templates: %v", err)
	}
	app := &testApp{t: t, router: New(cfg, db), db: db}
	if autoLogin {
		app.token = app.login()
	}
	if err := db.Model(&models.User{}).Where("username = ?", "admin").Update("twoFactorEnabled", true).Error; err != nil {
		t.Fatalf("enable admin 2fa flag: %v", err)
	}
	return app
}

func (a *testApp) login() string {
	resp := a.request(http.MethodPost, "/api/auth/login", "", map[string]any{
		"username": "admin",
		"password": "admin123",
	})
	if resp.Code != http.StatusOK {
		a.t.Fatalf("login status = %d body = %s", resp.Code, resp.Body.String())
	}
	var payload struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(resp.Body.Bytes(), &payload); err != nil {
		a.t.Fatalf("decode login: %v", err)
	}
	if payload.AccessToken == "" {
		a.t.Fatal("login did not return access_token")
	}
	return payload.AccessToken
}

func (a *testApp) request(method, path, token string, body any) *httptest.ResponseRecorder {
	var rawBody []byte
	if body != nil {
		var err error
		rawBody, err = json.Marshal(body)
		if err != nil {
			a.t.Fatalf("marshal body: %v", err)
		}
	}
	req := httptest.NewRequest(method, path, bytes.NewReader(rawBody))
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp := httptest.NewRecorder()
	a.router.ServeHTTP(resp, req)
	return resp
}

func decodeJSON[T any](t *testing.T, resp *httptest.ResponseRecorder) T {
	t.Helper()
	var out T
	if err := json.Unmarshal(resp.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode json: %v; body = %s", err, resp.Body.String())
	}
	return out
}

func adminTOTPToken(t *testing.T, app *testApp) string {
	t.Helper()
	secret := "JBSWY3DPEHPK3PXP"
	if err := app.db.Model(&models.User{}).
		Where("username = ?", "admin").
		Updates(map[string]any{"twoFactorEnabled": true, "twoFactorSecret": secret}).Error; err != nil {
		t.Fatalf("set admin 2fa secret: %v", err)
	}
	token, err := totp.GenerateCode(secret, time.Now())
	if err != nil {
		t.Fatalf("generate admin totp token: %v", err)
	}
	return token
}

func TestPublicHealthDocsAndLogin(t *testing.T) {
	app := newTestApp(t)

	if resp := app.request(http.MethodGet, "/health", "", nil); resp.Code != http.StatusOK {
		t.Fatalf("health status = %d body = %s", resp.Code, resp.Body.String())
	}
	if resp := app.request(http.MethodGet, "/api/docs", "", nil); resp.Code != http.StatusOK {
		t.Fatalf("docs status = %d body = %s", resp.Code, resp.Body.String())
	}
	if resp := app.request(http.MethodGet, "/api/docs-json", "", nil); resp.Code != http.StatusOK {
		t.Fatalf("docs-json status = %d body = %s", resp.Code, resp.Body.String())
	}
	if app.token == "" {
		t.Fatal("expected default admin login to succeed")
	}
}

func TestLoginReturnsPreUpdateFirstLoginFlag(t *testing.T) {
	app := newTestAppWithLogin(t, false)
	if err := app.db.Model(&models.User{}).Where("username = ?", "admin").Update("twoFactorEnabled", false).Error; err != nil {
		t.Fatalf("disable admin 2fa for login test: %v", err)
	}

	first := app.request(http.MethodPost, "/api/auth/login", "", map[string]any{
		"username": "admin",
		"password": "admin123",
	})
	if first.Code != http.StatusOK {
		t.Fatalf("first login status = %d body = %s", first.Code, first.Body.String())
	}
	firstPayload := decodeJSON[map[string]any](t, first)
	firstUser := firstPayload["user"].(map[string]any)
	if firstUser["isFirstLogin"] != true {
		t.Fatalf("first login user = %#v", firstUser)
	}

	second := app.request(http.MethodPost, "/api/auth/login", "", map[string]any{
		"username": "admin",
		"password": "admin123",
	})
	if second.Code != http.StatusOK {
		t.Fatalf("second login status = %d body = %s", second.Code, second.Body.String())
	}
	secondPayload := decodeJSON[map[string]any](t, second)
	secondUser := secondPayload["user"].(map[string]any)
	if secondUser["isFirstLogin"] != false {
		t.Fatalf("second login user = %#v", secondUser)
	}
}

func TestVerify2FAInvalidSixCharacterTokenReturnsSuccessFalse(t *testing.T) {
	app := newTestApp(t)

	setup := app.request(http.MethodPost, "/api/auth/setup-2fa", app.token, map[string]any{})
	if setup.Code != http.StatusOK {
		t.Fatalf("setup 2fa status = %d body = %s", setup.Code, setup.Body.String())
	}
	verify := app.request(http.MethodPost, "/api/auth/verify-2fa", app.token, map[string]any{"token": "abcdef"})
	if verify.Code != http.StatusOK {
		t.Fatalf("verify 2fa status = %d body = %s", verify.Code, verify.Body.String())
	}
	payload := decodeJSON[map[string]any](t, verify)
	if payload["success"] != false || payload["message"] != "Invalid token" {
		t.Fatalf("verify 2fa payload = %#v", payload)
	}
}

func TestOpenAPIDocumentIncludesRequestDTOSchemas(t *testing.T) {
	app := newTestAppWithLogin(t, false)

	resp := app.request(http.MethodGet, "/api/docs-json", "", nil)
	if resp.Code != http.StatusOK {
		t.Fatalf("docs-json status = %d body = %s", resp.Code, resp.Body.String())
	}
	doc := decodeJSON[map[string]any](t, resp)
	paths := doc["paths"].(map[string]any)
	loginPost := paths["/api/auth/login"].(map[string]any)["post"].(map[string]any)
	loginBody := loginPost["requestBody"].(map[string]any)
	loginContent := loginBody["content"].(map[string]any)["application/json"].(map[string]any)
	loginSchema := loginContent["schema"].(map[string]any)
	if loginSchema["$ref"] != "#/components/schemas/LoginDto" {
		t.Fatalf("login request schema ref = %#v", loginSchema["$ref"])
	}
	monitoringConfigPost := paths["/api/monitoring/config"].(map[string]any)["post"].(map[string]any)
	monitoringResponses := monitoringConfigPost["responses"].(map[string]any)
	if _, ok := monitoringResponses["201"]; !ok {
		t.Fatalf("monitoring config responses = %#v", monitoringResponses)
	}
	messageTemplateDelete := paths["/api/message-templates/{id}"].(map[string]any)["delete"].(map[string]any)
	deleteResponses := messageTemplateDelete["responses"].(map[string]any)
	if _, ok := deleteResponses["204"]; !ok {
		t.Fatalf("message template delete responses = %#v", deleteResponses)
	}

	components := doc["components"].(map[string]any)
	schemas := components["schemas"].(map[string]any)
	appInstance := schemas["CreateAppInstanceDto"].(map[string]any)
	required := appInstance["required"].([]any)
	if !containsString(required, "clusterType") || !containsString(required, "environmentId") {
		t.Fatalf("CreateAppInstanceDto required fields = %#v", required)
	}
	props := appInstance["properties"].(map[string]any)
	clusterType := props["clusterType"].(map[string]any)
	enum := clusterType["enum"].([]any)
	if !containsString(enum, "rancher") || !containsString(enum, "generic") {
		t.Fatalf("CreateAppInstanceDto clusterType enum = %#v", enum)
	}
}

func TestMessageTemplateConflictDeleteAndPreviewParity(t *testing.T) {
	app := newTestApp(t)

	duplicate := app.request(http.MethodPost, "/api/message-templates", app.token, map[string]any{
		"templateType":    "test_connection",
		"templateName":    "Duplicate Test Connection",
		"messageTemplate": "Hello {{timestamp}}",
	})
	if duplicate.Code != http.StatusConflict {
		t.Fatalf("duplicate template status = %d body = %s", duplicate.Code, duplicate.Body.String())
	}
	duplicatePayload := decodeJSON[map[string]any](t, duplicate)
	if duplicatePayload["message"] != "Template with type 'test_connection' already exists" {
		t.Fatalf("duplicate template payload = %#v", duplicatePayload)
	}

	list := app.request(http.MethodGet, "/api/message-templates", app.token, nil)
	if list.Code != http.StatusOK {
		t.Fatalf("list templates status = %d body = %s", list.Code, list.Body.String())
	}
	templates := decodeJSON[[]map[string]any](t, list)
	if len(templates) == 0 {
		t.Fatal("expected seeded message templates")
	}
	deleteDefault := app.request(http.MethodDelete, "/api/message-templates/"+fmt.Sprint(templates[0]["id"]), app.token, nil)
	if deleteDefault.Code != http.StatusBadRequest {
		t.Fatalf("delete default status = %d body = %s", deleteDefault.Code, deleteDefault.Body.String())
	}
	deletePayload := decodeJSON[map[string]any](t, deleteDefault)
	if deletePayload["message"] != "Cannot delete default system template. Use restore instead." {
		t.Fatalf("delete default payload = %#v", deletePayload)
	}

	preview := app.request(http.MethodPost, "/api/message-templates/preview", app.token, map[string]any{
		"templateType":    "daily_health_check",
		"messageTemplate": "Report {{date}} {{missing}}",
	})
	if preview.Code != http.StatusOK {
		t.Fatalf("preview status = %d body = %s", preview.Code, preview.Body.String())
	}
	previewPayload := decodeJSON[map[string]any](t, preview)
	if !strings.Contains(fmt.Sprint(previewPayload["renderedMessage"]), "Report ") {
		t.Fatalf("preview payload = %#v", previewPayload)
	}
	if _, ok := previewPayload["sampleData"]; ok {
		t.Fatalf("preview should omit sampleData when not supplied: %#v", previewPayload)
	}

	customPreview := app.request(http.MethodPost, "/api/message-templates/preview", app.token, map[string]any{
		"templateType":    "daily_health_check",
		"messageTemplate": "Report {{date}}",
		"sampleData":      map[string]any{"date": "2026-05-20"},
	})
	if customPreview.Code != http.StatusOK {
		t.Fatalf("custom preview status = %d body = %s", customPreview.Code, customPreview.Body.String())
	}
	customPayload := decodeJSON[map[string]any](t, customPreview)
	if customPayload["renderedMessage"] != "Report 2026-05-20" {
		t.Fatalf("custom preview payload = %#v", customPayload)
	}
	if _, ok := customPayload["sampleData"]; !ok {
		t.Fatalf("custom preview should include supplied sampleData: %#v", customPayload)
	}
}

func TestMutationRequestsRequireJSONContentType(t *testing.T) {
	app := newTestApp(t)
	req := httptest.NewRequest(http.MethodPost, "/api/environments", bytes.NewBufferString(`{"name":"dev"}`))
	req.Header.Set("Authorization", "Bearer "+app.token)
	resp := httptest.NewRecorder()
	app.router.ServeHTTP(resp, req)
	if resp.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("status = %d body = %s", resp.Code, resp.Body.String())
	}
}

func TestNestControllerStatusCodeParity(t *testing.T) {
	app := newTestApp(t)

	syncResp := app.request(http.MethodPost, "/api/services/sync", app.token, map[string]any{
		"sourceEnvironmentId":  "env-source",
		"targetEnvironmentId":  "env-target",
		"serviceIds":           []string{"service-1"},
		"targetAppInstanceIds": []string{"app-1"},
	})
	if syncResp.Code != http.StatusOK {
		t.Fatalf("services sync status = %d body = %s", syncResp.Code, syncResp.Body.String())
	}

	monitoringResp := app.request(http.MethodPost, "/api/monitoring/config", app.token, map[string]any{
		"monitoringEnabled":    true,
		"alertThreshold":       3,
		"notificationSchedule": "daily",
	})
	if monitoringResp.Code != http.StatusCreated {
		t.Fatalf("monitoring config status = %d body = %s", monitoringResp.Code, monitoringResp.Body.String())
	}

	cluster := models.GenericClusterSite{Name: "Cluster", Kubeconfig: "apiVersion: v1", Active: true}
	if err := app.db.Create(&cluster).Error; err != nil {
		t.Fatalf("create generic cluster: %v", err)
	}
	deleteResp := app.request(http.MethodDelete, "/api/generic-clusters/"+cluster.ID, app.token, nil)
	if deleteResp.Code != http.StatusOK {
		t.Fatalf("generic cluster delete status = %d body = %s", deleteResp.Code, deleteResp.Body.String())
	}
}

func TestGenericClusterSetActiveDeactivatesOtherClusters(t *testing.T) {
	app := newTestApp(t)
	first := models.GenericClusterSite{Name: "Cluster A", Kubeconfig: "apiVersion: v1", Active: true}
	second := models.GenericClusterSite{Name: "Cluster B", Kubeconfig: "apiVersion: v1", Active: true}
	if err := app.db.Create(&first).Error; err != nil {
		t.Fatalf("create first generic cluster: %v", err)
	}
	if err := app.db.Create(&second).Error; err != nil {
		t.Fatalf("create second generic cluster: %v", err)
	}

	resp := app.request(http.MethodPost, "/api/generic-clusters/"+second.ID+"/set-active", app.token, map[string]any{"active": true})
	if resp.Code != http.StatusOK {
		t.Fatalf("set active status = %d body = %s", resp.Code, resp.Body.String())
	}

	var refreshedFirst, refreshedSecond models.GenericClusterSite
	app.db.First(&refreshedFirst, "id = ?", first.ID)
	app.db.First(&refreshedSecond, "id = ?", second.ID)
	if refreshedFirst.Active {
		t.Fatalf("expected first generic cluster to be deactivated")
	}
	if !refreshedSecond.Active {
		t.Fatalf("expected second generic cluster to remain active")
	}
}

func TestGenericClusterSetInactiveOnlyUpdatesSelectedCluster(t *testing.T) {
	app := newTestApp(t)
	first := models.GenericClusterSite{Name: "Cluster A", Kubeconfig: "apiVersion: v1", Active: true}
	second := models.GenericClusterSite{Name: "Cluster B", Kubeconfig: "apiVersion: v1", Active: true}
	if err := app.db.Create(&first).Error; err != nil {
		t.Fatalf("create first generic cluster: %v", err)
	}
	if err := app.db.Create(&second).Error; err != nil {
		t.Fatalf("create second generic cluster: %v", err)
	}

	resp := app.request(http.MethodPost, "/api/generic-clusters/"+first.ID+"/set-active", app.token, map[string]any{"active": false})
	if resp.Code != http.StatusOK {
		t.Fatalf("set inactive status = %d body = %s", resp.Code, resp.Body.String())
	}

	var refreshedFirst, refreshedSecond models.GenericClusterSite
	app.db.First(&refreshedFirst, "id = ?", first.ID)
	app.db.First(&refreshedSecond, "id = ?", second.ID)
	if refreshedFirst.Active {
		t.Fatalf("expected first generic cluster to be deactivated")
	}
	if !refreshedSecond.Active {
		t.Fatalf("expected second generic cluster to stay active")
	}
}

func TestGenericClusterTestConnectionResponseMatchesNest(t *testing.T) {
	app := newTestApp(t)
	kube := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/namespaces" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"kind":"NamespaceList","apiVersion":"v1","items":[]}`))
	}))
	t.Cleanup(kube.Close)

	clusterName := "test-cluster"
	kubeconfig := fmt.Sprintf(`apiVersion: v1
kind: Config
clusters:
- name: %[1]s
  cluster:
    server: %[2]s
contexts:
- name: test-context
  context:
    cluster: %[1]s
    user: test-user
current-context: test-context
users:
- name: test-user
  user: {}
`, clusterName, kube.URL)
	cluster := models.GenericClusterSite{Name: "Cluster", Kubeconfig: kubeconfig, ClusterName: &clusterName, Active: true}
	if err := app.db.Create(&cluster).Error; err != nil {
		t.Fatalf("create generic cluster: %v", err)
	}

	resp := app.request(http.MethodPost, "/api/generic-clusters/"+cluster.ID+"/test", app.token, map[string]any{})
	if resp.Code != http.StatusOK {
		t.Fatalf("test connection status = %d body = %s", resp.Code, resp.Body.String())
	}
	payload := decodeJSON[map[string]any](t, resp)
	if payload["success"] != true || payload["message"] != "Connection successful" {
		t.Fatalf("payload = %#v", payload)
	}
	data := payload["data"].(map[string]any)
	if data["serverVersion"] != "v1" || data["clusterName"] != clusterName {
		t.Fatalf("data = %#v", data)
	}
	if _, ok := data["namespacesCount"]; ok {
		t.Fatalf("data should not include namespacesCount: %#v", data)
	}
	if _, ok := data["kubernetesVersion"]; ok {
		t.Fatalf("data should not include kubernetesVersion: %#v", data)
	}
}

func TestHarborActivateDeactivatesOtherSites(t *testing.T) {
	app := newTestApp(t)
	first := models.HarborSite{Name: "Harbor A", URL: "https://harbor-a.example.com", Username: "user", Password: "pass", Active: true}
	second := models.HarborSite{Name: "Harbor B", URL: "https://harbor-b.example.com", Username: "user", Password: "pass", Active: true}
	if err := app.db.Create(&first).Error; err != nil {
		t.Fatalf("create first harbor site: %v", err)
	}
	if err := app.db.Create(&second).Error; err != nil {
		t.Fatalf("create second harbor site: %v", err)
	}

	resp := app.request(http.MethodPost, "/api/harbor-sites/"+second.ID+"/activate", app.token, map[string]any{})
	if resp.Code != http.StatusOK {
		t.Fatalf("activate status = %d body = %s", resp.Code, resp.Body.String())
	}

	var refreshedFirst, refreshedSecond models.HarborSite
	app.db.First(&refreshedFirst, "id = ?", first.ID)
	app.db.First(&refreshedSecond, "id = ?", second.ID)
	if refreshedFirst.Active {
		t.Fatalf("expected first harbor site to be deactivated")
	}
	if !refreshedSecond.Active {
		t.Fatalf("expected second harbor site to remain active")
	}
}

func TestHarborDeactivateOnlyUpdatesSelectedSite(t *testing.T) {
	app := newTestApp(t)
	first := models.HarborSite{Name: "Harbor A", URL: "https://harbor-a.example.com", Username: "user", Password: "pass", Active: true}
	second := models.HarborSite{Name: "Harbor B", URL: "https://harbor-b.example.com", Username: "user", Password: "pass", Active: true}
	if err := app.db.Create(&first).Error; err != nil {
		t.Fatalf("create first harbor site: %v", err)
	}
	if err := app.db.Create(&second).Error; err != nil {
		t.Fatalf("create second harbor site: %v", err)
	}

	resp := app.request(http.MethodPost, "/api/harbor-sites/"+first.ID+"/deactivate", app.token, map[string]any{})
	if resp.Code != http.StatusOK {
		t.Fatalf("deactivate status = %d body = %s", resp.Code, resp.Body.String())
	}

	var refreshedFirst, refreshedSecond models.HarborSite
	app.db.First(&refreshedFirst, "id = ?", first.ID)
	app.db.First(&refreshedSecond, "id = ?", second.ID)
	if refreshedFirst.Active {
		t.Fatalf("expected first harbor site to be deactivated")
	}
	if !refreshedSecond.Active {
		t.Fatalf("expected second harbor site to stay active")
	}
}

func containsString(values []any, want string) bool {
	for _, value := range values {
		if value == want {
			return true
		}
	}
	return false
}

func TestGlobalRateLimit(t *testing.T) {
	app := newTestAppWithLogin(t, false)

	for i := 0; i < 120; i++ {
		resp := app.request(http.MethodGet, "/health", "", nil)
		if resp.Code != http.StatusOK {
			t.Fatalf("request %d status = %d body = %s", i+1, resp.Code, resp.Body.String())
		}
	}
	resp := app.request(http.MethodGet, "/health", "", nil)
	if resp.Code != http.StatusTooManyRequests {
		t.Fatalf("over-limit status = %d body = %s", resp.Code, resp.Body.String())
	}
}

func TestLoginRateLimitOverride(t *testing.T) {
	app := newTestAppWithLogin(t, false)
	body := map[string]any{"username": "missing", "password": "wrong"}

	for i := 0; i < 10; i++ {
		resp := app.request(http.MethodPost, "/api/auth/login", "", body)
		if resp.Code != http.StatusUnauthorized {
			t.Fatalf("request %d status = %d body = %s", i+1, resp.Code, resp.Body.String())
		}
	}
	resp := app.request(http.MethodPost, "/api/auth/login", "", body)
	if resp.Code != http.StatusTooManyRequests {
		t.Fatalf("over-limit status = %d body = %s", resp.Code, resp.Body.String())
	}
}

func TestEnvironmentColorValidationMatchesNestDTO(t *testing.T) {
	app := newTestApp(t)

	for _, color := range []string{"#fff", "1890ff", "#12345g"} {
		resp := app.request(http.MethodPost, "/api/environments", app.token, map[string]any{"name": "Invalid " + color, "color": color})
		if resp.Code != http.StatusBadRequest {
			t.Fatalf("color %q status = %d body = %s", color, resp.Code, resp.Body.String())
		}
		payload := decodeJSON[map[string]any](t, resp)
		if !strings.Contains(fmt.Sprint(payload["message"]), "valid hex color code") {
			t.Fatalf("color %q payload = %#v", color, payload)
		}
	}

	created := app.request(http.MethodPost, "/api/environments", app.token, map[string]any{"name": "Valid", "color": "#4CAF50"})
	if created.Code != http.StatusCreated {
		t.Fatalf("valid color status = %d body = %s", created.Code, created.Body.String())
	}
	env := decodeJSON[map[string]any](t, created)

	update := app.request(http.MethodPatch, "/api/environments/"+fmt.Sprint(env["id"]), app.token, map[string]any{"color": "#abc"})
	if update.Code != http.StatusBadRequest {
		t.Fatalf("update invalid color status = %d body = %s", update.Code, update.Body.String())
	}
}

func TestAppInstanceValidationAndDuplicateParity(t *testing.T) {
	app := newTestApp(t)

	envResp := app.request(http.MethodPost, "/api/environments", app.token, map[string]any{"name": "Smoke", "color": "#1890ff"})
	if envResp.Code != http.StatusCreated {
		t.Fatalf("create environment status = %d body = %s", envResp.Code, envResp.Body.String())
	}
	env := decodeJSON[map[string]any](t, envResp)

	siteResp := app.request(http.MethodPost, "/api/sites", app.token, map[string]any{
		"name":  "Rancher",
		"url":   "https://rancher.example.com/path?query=1",
		"token": "token-abc",
	})
	if siteResp.Code != http.StatusCreated {
		t.Fatalf("create site status = %d body = %s", siteResp.Code, siteResp.Body.String())
	}
	site := decodeJSON[map[string]any](t, siteResp)
	if site["url"] != "https://rancher.example.com" {
		t.Fatalf("site url was not normalized: %#v", site["url"])
	}

	missingSite := app.request(http.MethodPost, "/api/app-instances", app.token, map[string]any{
		"name":          "App",
		"cluster":       "c-1",
		"namespace":     "default",
		"clusterType":   "rancher",
		"environmentId": env["id"],
	})
	if missingSite.Code != http.StatusBadRequest {
		t.Fatalf("missing rancherSiteId status = %d body = %s", missingSite.Code, missingSite.Body.String())
	}

	validBody := map[string]any{
		"name":                 "App",
		"cluster":              "c-1",
		"namespace":            "default",
		"clusterType":          "rancher",
		"rancherSiteId":        site["id"],
		"genericClusterSiteId": "550e8400-e29b-41d4-a716-446655440000",
		"environmentId":        env["id"],
	}
	valid := app.request(http.MethodPost, "/api/app-instances", app.token, validBody)
	if valid.Code != http.StatusCreated {
		t.Fatalf("create app instance status = %d body = %s", valid.Code, valid.Body.String())
	}
	created := decodeJSON[map[string]any](t, valid)
	if created["genericClusterSiteId"] != nil {
		t.Fatalf("genericClusterSiteId should be cleared for rancher app instances: %#v", created["genericClusterSiteId"])
	}

	duplicate := app.request(http.MethodPost, "/api/app-instances", app.token, map[string]any{
		"name":          "App copy",
		"cluster":       "c-1",
		"namespace":     "default",
		"clusterType":   "rancher",
		"rancherSiteId": site["id"],
		"environmentId": env["id"],
	})
	if duplicate.Code != http.StatusBadRequest {
		t.Fatalf("duplicate app instance status = %d body = %s", duplicate.Code, duplicate.Body.String())
	}
}

func TestMonitoredInstanceRejectsDuplicateAppInstance(t *testing.T) {
	app := newTestApp(t)
	envResp := app.request(http.MethodPost, "/api/environments", app.token, map[string]any{"name": "Smoke", "color": "#1890ff"})
	env := decodeJSON[map[string]any](t, envResp)
	siteResp := app.request(http.MethodPost, "/api/sites", app.token, map[string]any{"name": "Rancher", "url": "https://rancher.example.com", "token": "token-abc"})
	site := decodeJSON[map[string]any](t, siteResp)
	appInstanceResp := app.request(http.MethodPost, "/api/app-instances", app.token, map[string]any{
		"name":          "App",
		"cluster":       "c-1",
		"namespace":     "default",
		"clusterType":   "rancher",
		"rancherSiteId": site["id"],
		"environmentId": env["id"],
	})
	if appInstanceResp.Code != http.StatusCreated {
		t.Fatalf("create app instance status = %d body = %s", appInstanceResp.Code, appInstanceResp.Body.String())
	}
	appInstance := decodeJSON[map[string]any](t, appInstanceResp)

	first := app.request(http.MethodPost, "/api/monitoring/instances", app.token, map[string]any{"appInstanceId": appInstance["id"]})
	if first.Code != http.StatusCreated {
		t.Fatalf("create monitored instance status = %d body = %s", first.Code, first.Body.String())
	}
	second := app.request(http.MethodPost, "/api/monitoring/instances", app.token, map[string]any{"appInstanceId": appInstance["id"]})
	if second.Code != http.StatusBadRequest {
		t.Fatalf("duplicate monitored instance status = %d body = %s", second.Code, second.Body.String())
	}
}

func TestServiceSyncUpdatesTargetAndRecordsHistory(t *testing.T) {
	app := newTestApp(t)

	var gotPut bool
	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer token-abc" {
			t.Fatalf("authorization header = %q", r.Header.Get("Authorization"))
		}
		wantPath := "/k8s/clusters/c-1/apis/apps/v1/namespaces/default/deployments/web"
		if r.URL.Path != wantPath {
			t.Fatalf("path = %q, want %q", r.URL.Path, wantPath)
		}
		w.Header().Set("Content-Type", "application/json")
		switch r.Method {
		case http.MethodGet:
			w.Write([]byte(`{"spec":{"template":{"spec":{"containers":[{"name":"web","image":"repo/web:v1"}]}}}}`))
		case http.MethodPut:
			gotPut = true
			var payload map[string]any
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Fatalf("decode put payload: %v", err)
			}
			if !firstContainerImageEquals(payload, "repo/web:v2") {
				t.Fatalf("put payload image was not updated: %#v", payload)
			}
			w.Write([]byte(`{"updated":true}`))
		default:
			t.Fatalf("unexpected method %s", r.Method)
		}
	}))
	t.Cleanup(mock.Close)

	sourceEnv := models.Environment{Name: "Source"}
	targetEnv := models.Environment{Name: "Target"}
	if err := app.db.Create(&sourceEnv).Error; err != nil {
		t.Fatalf("create source env: %v", err)
	}
	if err := app.db.Create(&targetEnv).Error; err != nil {
		t.Fatalf("create target env: %v", err)
	}
	site := models.RancherSite{Name: "Rancher", URL: mock.URL, Token: "token-abc", Active: true}
	if err := app.db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}
	sourceApp := models.AppInstance{Name: "Source App", Cluster: "c-1", Namespace: "default", ClusterType: "rancher", RancherSiteID: &site.ID, EnvironmentID: sourceEnv.ID}
	targetApp := models.AppInstance{Name: "Target App", Cluster: "c-1", Namespace: "default", ClusterType: "rancher", RancherSiteID: &site.ID, EnvironmentID: targetEnv.ID}
	if err := app.db.Create(&sourceApp).Error; err != nil {
		t.Fatalf("create source app: %v", err)
	}
	if err := app.db.Create(&targetApp).Error; err != nil {
		t.Fatalf("create target app: %v", err)
	}
	oldImage := "repo/web:v1"
	newImage := "repo/web:v2"
	sourceService := models.Service{Name: "web", AppInstanceID: sourceApp.ID, Status: "active", Replicas: 2, AvailableReplicas: 2, ImageTag: &newImage, WorkloadType: "Deployment"}
	targetService := models.Service{Name: "web", AppInstanceID: targetApp.ID, Status: "active", Replicas: 2, AvailableReplicas: 2, ImageTag: &oldImage, WorkloadType: "Deployment"}
	if err := app.db.Create(&sourceService).Error; err != nil {
		t.Fatalf("create source service: %v", err)
	}
	if err := app.db.Create(&targetService).Error; err != nil {
		t.Fatalf("create target service: %v", err)
	}

	resp := app.request(http.MethodPost, "/api/services/sync", app.token, map[string]any{
		"sourceEnvironmentId":  sourceEnv.ID,
		"targetEnvironmentId":  targetEnv.ID,
		"serviceIds":           []string{sourceService.ID},
		"targetAppInstanceIds": []string{targetApp.ID},
	})
	if resp.Code != http.StatusOK {
		t.Fatalf("sync status = %d body = %s", resp.Code, resp.Body.String())
	}
	payload := decodeJSON[map[string]any](t, resp)
	if payload["status"] != "completed" {
		t.Fatalf("sync payload = %#v", payload)
	}
	if !gotPut {
		t.Fatal("expected Rancher workload update PUT")
	}

	var reloaded models.Service
	if err := app.db.First(&reloaded, "id = ?", targetService.ID).Error; err != nil {
		t.Fatalf("reload target service: %v", err)
	}
	if reloaded.ImageTag == nil || *reloaded.ImageTag != newImage || reloaded.Status != "synced" || reloaded.WorkloadType != "deployment" {
		t.Fatalf("target service after sync = %#v", reloaded)
	}
	var historyCount int64
	app.db.Model(&models.SyncHistory{}).Where("service_id = ? AND target_app_instance_id = ? AND status = ?", sourceService.ID, targetApp.ID, "success").Count(&historyCount)
	if historyCount != 1 {
		t.Fatalf("success history count = %d, want 1", historyCount)
	}
}

func TestServiceSyncPartialFailureRecordsFailedHistory(t *testing.T) {
	app := newTestApp(t)
	env := models.Environment{Name: "Source"}
	targetEnv := models.Environment{Name: "Target"}
	if err := app.db.Create(&env).Error; err != nil {
		t.Fatalf("create source env: %v", err)
	}
	if err := app.db.Create(&targetEnv).Error; err != nil {
		t.Fatalf("create target env: %v", err)
	}
	sourceApp := models.AppInstance{Name: "Source App", Cluster: "c-1", Namespace: "default", ClusterType: "rancher", EnvironmentID: env.ID}
	targetApp := models.AppInstance{Name: "Target App", Cluster: "c-1", Namespace: "default", ClusterType: "rancher", EnvironmentID: targetEnv.ID}
	if err := app.db.Create(&sourceApp).Error; err != nil {
		t.Fatalf("create source app: %v", err)
	}
	if err := app.db.Create(&targetApp).Error; err != nil {
		t.Fatalf("create target app: %v", err)
	}
	image := "repo/web:v2"
	sourceService := models.Service{Name: "web", AppInstanceID: sourceApp.ID, Status: "active", ImageTag: &image, WorkloadType: "Deployment"}
	if err := app.db.Create(&sourceService).Error; err != nil {
		t.Fatalf("create source service: %v", err)
	}

	resp := app.request(http.MethodPost, "/api/services/sync", app.token, map[string]any{
		"sourceEnvironmentId":  env.ID,
		"targetEnvironmentId":  targetEnv.ID,
		"serviceIds":           []string{sourceService.ID},
		"targetAppInstanceIds": []string{targetApp.ID},
	})
	if resp.Code != http.StatusOK {
		t.Fatalf("sync status = %d body = %s", resp.Code, resp.Body.String())
	}
	payload := decodeJSON[map[string]any](t, resp)
	if payload["status"] != "partial" {
		t.Fatalf("sync payload = %#v", payload)
	}
	var op models.SyncOperation
	if err := app.db.First(&op, "id = ?", payload["id"]).Error; err != nil {
		t.Fatalf("load sync operation: %v", err)
	}
	if op.Status != "partial" || op.EndTime == nil {
		t.Fatalf("sync operation = %#v", op)
	}
	var history models.SyncHistory
	if err := app.db.First(&history, "sync_operation_id = ? AND status = ?", op.ID, "failed").Error; err != nil {
		t.Fatalf("load failed history: %v", err)
	}
	if history.TargetAppInstanceID != targetApp.ID || history.Error == nil || !strings.Contains(*history.Error, "rancher site not found") {
		t.Fatalf("failed history = %#v", history)
	}
}

func TestServiceFiltersAndComparisonResponseMatchNestShape(t *testing.T) {
	app := newTestApp(t)
	sourceEnv := models.Environment{Name: "Source"}
	targetEnv := models.Environment{Name: "Target"}
	if err := app.db.Create(&sourceEnv).Error; err != nil {
		t.Fatalf("create source env: %v", err)
	}
	if err := app.db.Create(&targetEnv).Error; err != nil {
		t.Fatalf("create target env: %v", err)
	}
	sourceApp := models.AppInstance{Name: "Source App", Cluster: "c-1", Namespace: "default", ClusterType: "rancher", EnvironmentID: sourceEnv.ID}
	targetApp := models.AppInstance{Name: "Target App", Cluster: "c-1", Namespace: "default", ClusterType: "rancher", EnvironmentID: targetEnv.ID}
	if err := app.db.Create(&sourceApp).Error; err != nil {
		t.Fatalf("create source app: %v", err)
	}
	if err := app.db.Create(&targetApp).Error; err != nil {
		t.Fatalf("create target app: %v", err)
	}
	apiV1 := "registry.local/api:v1"
	apiV2 := "registry.local/api:v2"
	worker := "registry.local/worker:specialtag"
	sourceOnly := "registry.local/source-only:v1"
	targetOnly := "registry.local/target-only:v1"
	services := []models.Service{
		{Name: "api", AppInstanceID: sourceApp.ID, Status: "active", Replicas: 2, AvailableReplicas: 2, ImageTag: &apiV1, WorkloadType: "Deployment"},
		{Name: "worker", AppInstanceID: sourceApp.ID, Status: "active", Replicas: 1, AvailableReplicas: 1, ImageTag: &worker, WorkloadType: "Deployment"},
		{Name: "source-only", AppInstanceID: sourceApp.ID, Status: "active", Replicas: 1, AvailableReplicas: 1, ImageTag: &sourceOnly, WorkloadType: "StatefulSet"},
		{Name: "api", AppInstanceID: targetApp.ID, Status: "active", Replicas: 2, AvailableReplicas: 2, ImageTag: &apiV2, WorkloadType: "Deployment"},
		{Name: "worker", AppInstanceID: targetApp.ID, Status: "active", Replicas: 1, AvailableReplicas: 1, ImageTag: &worker, WorkloadType: "Deployment"},
		{Name: "target-only", AppInstanceID: targetApp.ID, Status: "active", Replicas: 1, AvailableReplicas: 1, ImageTag: &targetOnly, WorkloadType: "Deployment"},
	}
	for i := range services {
		if err := app.db.Create(&services[i]).Error; err != nil {
			t.Fatalf("create service %s: %v", services[i].Name, err)
		}
	}

	filtered := app.request(http.MethodGet, "/api/services?env="+sourceEnv.ID+"&type=deployment&search=specialtag", app.token, nil)
	if filtered.Code != http.StatusOK {
		t.Fatalf("filtered services status = %d body = %s", filtered.Code, filtered.Body.String())
	}
	filteredPayload := decodeJSON[[]map[string]any](t, filtered)
	if len(filteredPayload) != 1 || filteredPayload[0]["name"] != "worker" {
		t.Fatalf("filtered services payload = %#v", filteredPayload)
	}

	compare := app.request(http.MethodGet, "/api/services/compare?source="+sourceEnv.ID+"&target="+targetEnv.ID, app.token, nil)
	if compare.Code != http.StatusOK {
		t.Fatalf("compare status = %d body = %s", compare.Code, compare.Body.String())
	}
	payload := decodeJSON[map[string]any](t, compare)
	if payload["sourceEnvironmentId"] != sourceEnv.ID || payload["targetEnvironmentId"] != targetEnv.ID || payload["services"] != nil {
		t.Fatalf("compare top-level shape = %#v", payload)
	}
	summary := payload["summary"].(map[string]any)
	if summary["totalServices"] != float64(4) || summary["identical"] != float64(1) || summary["different"] != float64(1) || summary["missingInSource"] != float64(1) || summary["missingInTarget"] != float64(1) {
		t.Fatalf("compare summary = %#v", summary)
	}
	comparisons := payload["comparisons"].([]any)
	byName := map[string]map[string]any{}
	for _, raw := range comparisons {
		item := raw.(map[string]any)
		byName[item["serviceName"].(string)] = item
	}
	if byName["api"]["status"] != "different" || byName["api"]["differenceType"] != "different" {
		t.Fatalf("api comparison = %#v", byName["api"])
	}
	if byName["worker"]["status"] != "identical" || byName["worker"]["differenceType"] != "identical" {
		t.Fatalf("worker comparison = %#v", byName["worker"])
	}
	if byName["target-only"]["differenceType"] != "missing_in_source" || byName["source-only"]["differenceType"] != "missing_in_target" {
		t.Fatalf("missing comparisons = %#v", byName)
	}

	instanceCompare := app.request(http.MethodGet, "/api/services/compare/by-instance?source="+sourceApp.ID+"&target="+targetApp.ID, app.token, nil)
	if instanceCompare.Code != http.StatusOK {
		t.Fatalf("instance compare status = %d body = %s", instanceCompare.Code, instanceCompare.Body.String())
	}
	instancePayload := decodeJSON[map[string]any](t, instanceCompare)
	if instancePayload["sourceAppInstanceId"] != sourceApp.ID || instancePayload["targetAppInstanceId"] != targetApp.ID {
		t.Fatalf("instance compare top-level shape = %#v", instancePayload)
	}
}

func TestConfigMapSyncKeyUpdatesRancherResourceAndHistory(t *testing.T) {
	app := newTestApp(t)

	var gotPut bool
	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer token-abc" {
			t.Fatalf("authorization header = %q", r.Header.Get("Authorization"))
		}
		wantPath := "/k8s/clusters/c-1/v1/configmaps/default/app-config"
		if r.URL.Path != wantPath {
			t.Fatalf("path = %q, want %q", r.URL.Path, wantPath)
		}
		w.Header().Set("Content-Type", "application/json")
		switch r.Method {
		case http.MethodGet:
			w.Write([]byte(`{"metadata":{"name":"app-config","namespace":"default"},"data":{"FOO":"old","KEEP":"yes"}}`))
		case http.MethodPut:
			gotPut = true
			var payload map[string]any
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Fatalf("decode put payload: %v", err)
			}
			data := payload["data"].(map[string]any)
			if data["FOO"] != "new" || data["KEEP"] != "yes" {
				t.Fatalf("configmap data = %#v", data)
			}
			w.Write([]byte(`{"updated":true}`))
		default:
			t.Fatalf("unexpected method %s", r.Method)
		}
	}))
	t.Cleanup(mock.Close)
	sourceApp, targetApp := createRancherSyncApps(t, app, mock.URL)

	resp := app.request(http.MethodPost, "/api/configmaps/sync-key", app.token, map[string]any{
		"sourceAppInstanceId": sourceApp.ID,
		"targetAppInstanceId": targetApp.ID,
		"configMapName":       "app-config",
		"key":                 "FOO",
		"value":               "new",
	})
	if resp.Code != http.StatusOK {
		t.Fatalf("sync configmap key status = %d body = %s", resp.Code, resp.Body.String())
	}
	payload := decodeJSON[map[string]any](t, resp)
	if payload["success"] != true || payload["syncedKey"] != "FOO" || payload["syncedValue"] != "new" {
		t.Fatalf("sync configmap key payload = %#v", payload)
	}
	if !gotPut {
		t.Fatal("expected Rancher ConfigMap PUT")
	}
	var history models.SyncHistory
	if err := app.db.First(&history, "service_id = ? AND target_app_instance_id = ? AND status = ?", "app-config", targetApp.ID, "success").Error; err != nil {
		t.Fatalf("load configmap sync history: %v", err)
	}
	if history.WorkloadType == nil || *history.WorkloadType != "configmap" || history.ConfigChanges == nil || !strings.Contains(*history.ConfigChanges, `"FOO":"new"`) {
		t.Fatalf("configmap sync history = %#v", history)
	}
}

func TestConfigMapSyncKeysCreatesMissingRancherResource(t *testing.T) {
	app := newTestApp(t)

	var gotPost bool
	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer token-abc" {
			t.Fatalf("authorization header = %q", r.Header.Get("Authorization"))
		}
		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.Method == http.MethodGet && r.URL.Path == "/k8s/clusters/c-1/v1/configmaps/default/app-config":
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte(`{"message":"not found"}`))
		case r.Method == http.MethodPost && r.URL.Path == "/k8s/clusters/c-1/v1/configmaps/default":
			gotPost = true
			var payload map[string]any
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Fatalf("decode post payload: %v", err)
			}
			if payload["kind"] != "ConfigMap" {
				t.Fatalf("post kind = %#v", payload["kind"])
			}
			metadata := payload["metadata"].(map[string]any)
			data := payload["data"].(map[string]any)
			if metadata["name"] != "app-config" || metadata["namespace"] != "default" || data["A"] != "1" || data["B"] != "2" {
				t.Fatalf("post payload = %#v", payload)
			}
			w.Write([]byte(`{"created":true}`))
		default:
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
	}))
	t.Cleanup(mock.Close)
	sourceApp, targetApp := createRancherSyncApps(t, app, mock.URL)

	resp := app.request(http.MethodPost, "/api/configmaps/sync-keys", app.token, map[string]any{
		"sourceAppInstanceId": sourceApp.ID,
		"targetAppInstanceId": targetApp.ID,
		"configMapName":       "app-config",
		"keys":                map[string]any{"A": "1", "B": "2"},
	})
	if resp.Code != http.StatusOK {
		t.Fatalf("sync configmap keys status = %d body = %s", resp.Code, resp.Body.String())
	}
	payload := decodeJSON[map[string]any](t, resp)
	if payload["success"] != true || payload["syncedCount"] != float64(2) {
		t.Fatalf("sync configmap keys payload = %#v", payload)
	}
	if !gotPost {
		t.Fatal("expected Rancher ConfigMap POST")
	}
}

func TestSecretSyncKeyUpdatesRancherResourceAndHistory(t *testing.T) {
	app := newTestApp(t)

	var gotPut bool
	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer token-abc" {
			t.Fatalf("authorization header = %q", r.Header.Get("Authorization"))
		}
		wantPath := "/k8s/clusters/c-1/v1/secrets/default/app-secret"
		if r.URL.Path != wantPath {
			t.Fatalf("path = %q, want %q", r.URL.Path, wantPath)
		}
		w.Header().Set("Content-Type", "application/json")
		switch r.Method {
		case http.MethodGet:
			w.Write([]byte(`{"metadata":{"name":"app-secret","namespace":"default"},"type":"Opaque","data":{"TOKEN":"old","KEEP":"yes"}}`))
		case http.MethodPut:
			gotPut = true
			var payload map[string]any
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Fatalf("decode put payload: %v", err)
			}
			data := payload["data"].(map[string]any)
			if data["TOKEN"] != "bmV3" || data["KEEP"] != "yes" {
				t.Fatalf("secret data = %#v", data)
			}
			w.Write([]byte(`{"updated":true}`))
		default:
			t.Fatalf("unexpected method %s", r.Method)
		}
	}))
	t.Cleanup(mock.Close)
	sourceApp, targetApp := createRancherSyncApps(t, app, mock.URL)

	resp := app.request(http.MethodPost, "/api/secrets/sync-key", app.token, map[string]any{
		"sourceAppInstanceId": sourceApp.ID,
		"targetAppInstanceId": targetApp.ID,
		"secretName":          "app-secret",
		"key":                 "TOKEN",
		"value":               "bmV3",
	})
	if resp.Code != http.StatusOK {
		t.Fatalf("sync secret key status = %d body = %s", resp.Code, resp.Body.String())
	}
	payload := decodeJSON[map[string]any](t, resp)
	if payload["success"] != true || payload["message"] != "Secret key synced successfully" {
		t.Fatalf("sync secret key payload = %#v", payload)
	}
	if !gotPut {
		t.Fatal("expected Rancher Secret PUT")
	}
	var history models.SyncHistory
	if err := app.db.First(&history, "service_id = ? AND target_app_instance_id = ? AND status = ?", "app-secret", targetApp.ID, "success").Error; err != nil {
		t.Fatalf("load secret sync history: %v", err)
	}
	if history.WorkloadType == nil || *history.WorkloadType != "secret" || history.ConfigChanges == nil || !strings.Contains(*history.ConfigChanges, `"TOKEN"`) {
		t.Fatalf("secret sync history = %#v", history)
	}
}

func TestKubernetesSyncDTORejectsInvalidResourceNames(t *testing.T) {
	app := newTestApp(t)
	sourceID := "11111111-1111-1111-1111-111111111111"
	targetID := "22222222-2222-2222-2222-222222222222"

	cases := []struct {
		name string
		path string
		body map[string]any
	}{
		{
			name: "configmap single key",
			path: "/api/configmaps/sync-key",
			body: map[string]any{
				"sourceAppInstanceId": sourceID,
				"targetAppInstanceId": targetID,
				"configMapName":       "Invalid_Name",
				"key":                 "FOO",
				"value":               "bar",
			},
		},
		{
			name: "configmap multiple keys",
			path: "/api/configmaps/sync-keys",
			body: map[string]any{
				"sourceAppInstanceId": sourceID,
				"targetAppInstanceId": targetID,
				"configMapName":       "-invalid",
				"keys":                map[string]any{"FOO": "bar"},
			},
		},
		{
			name: "secret single key",
			path: "/api/secrets/sync-key",
			body: map[string]any{
				"sourceAppInstanceId": sourceID,
				"targetAppInstanceId": targetID,
				"secretName":          "Invalid_Name",
				"key":                 "TOKEN",
				"value":               "dmFsdWU=",
			},
		},
		{
			name: "secret multiple keys",
			path: "/api/secrets/sync-keys",
			body: map[string]any{
				"sourceAppInstanceId": sourceID,
				"targetAppInstanceId": targetID,
				"secretName":          "invalid-",
				"keys":                map[string]any{"TOKEN": "dmFsdWU="},
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			resp := app.request(http.MethodPost, tc.path, app.token, tc.body)
			if resp.Code != http.StatusBadRequest {
				t.Fatalf("status = %d body = %s", resp.Code, resp.Body.String())
			}
			payload := decodeJSON[map[string]any](t, resp)
			if !strings.Contains(fmt.Sprint(payload["message"]), "valid Kubernetes resource name") {
				t.Fatalf("payload = %#v", payload)
			}
		})
	}
}

func TestUserManagementDuplicateChecksMatchNestBehavior(t *testing.T) {
	app := newTestApp(t)
	adminToken := adminTOTPToken(t, app)

	duplicateAdmin := app.request(http.MethodPost, "/api/users", app.token, map[string]any{
		"username":            "admin",
		"email":               "new-admin@example.com",
		"password":            "Password123",
		"adminTwoFactorToken": adminToken,
	})
	if duplicateAdmin.Code != http.StatusBadRequest {
		t.Fatalf("duplicate admin status = %d body = %s", duplicateAdmin.Code, duplicateAdmin.Body.String())
	}
	payload := decodeJSON[map[string]any](t, duplicateAdmin)
	if payload["message"] != "User with this username or email already exists" {
		t.Fatalf("duplicate admin payload = %#v", payload)
	}

	alice := app.request(http.MethodPost, "/api/users", app.token, map[string]any{
		"username":            "alice",
		"email":               "alice@example.com",
		"password":            "Password123",
		"adminTwoFactorToken": adminToken,
	})
	if alice.Code != http.StatusCreated {
		t.Fatalf("create alice status = %d body = %s", alice.Code, alice.Body.String())
	}
	bob := app.request(http.MethodPost, "/api/users", app.token, map[string]any{
		"username":            "bob",
		"email":               "bob@example.com",
		"password":            "Password123",
		"adminTwoFactorToken": adminToken,
	})
	if bob.Code != http.StatusCreated {
		t.Fatalf("create bob status = %d body = %s", bob.Code, bob.Body.String())
	}
	bobPayload := decodeJSON[map[string]any](t, bob)

	duplicateUpdate := app.request(http.MethodPatch, "/api/users/"+fmt.Sprint(bobPayload["id"]), app.token, map[string]any{
		"username":            "alice",
		"adminTwoFactorToken": adminToken,
	})
	if duplicateUpdate.Code != http.StatusBadRequest {
		t.Fatalf("duplicate update status = %d body = %s", duplicateUpdate.Code, duplicateUpdate.Body.String())
	}
	payload = decodeJSON[map[string]any](t, duplicateUpdate)
	if payload["message"] != "Username or email already exists" {
		t.Fatalf("duplicate update payload = %#v", payload)
	}
}

func TestTrustedDeviceLimitAndExpiredCleanup(t *testing.T) {
	app := newTestApp(t)
	var admin models.User
	if err := app.db.First(&admin, "username = ?", "admin").Error; err != nil {
		t.Fatalf("load admin: %v", err)
	}

	now := time.Now()
	for i := 0; i < 4; i++ {
		created := now.Add(time.Duration(i) * time.Second)
		device := models.TrustedDevice{
			UserID:            admin.ID,
			DeviceFingerprint: string(rune('a' + i)),
			DeviceName:        "Device",
			LastUsedAt:        created,
			ExpiresAt:         now.Add(30 * 24 * time.Hour),
			CreatedAt:         created,
			UpdatedAt:         created,
		}
		if err := app.db.Create(&device).Error; err != nil {
			t.Fatalf("create trusted device: %v", err)
		}
	}
	app.db.Where("user_id = ? AND device_fingerprint = ?", admin.ID, "d").Delete(&models.TrustedDevice{})
	srv := &Server{db: app.db}
	srv.trustDevice(admin.ID, "d", "Device D", nil, nil)

	var count int64
	app.db.Model(&models.TrustedDevice{}).Where("user_id = ?", admin.ID).Count(&count)
	if count != 3 {
		t.Fatalf("trusted device count = %d, want 3", count)
	}
	var oldest models.TrustedDevice
	if err := app.db.First(&oldest, "user_id = ? AND device_fingerprint = ?", admin.ID, "a").Error; err == nil {
		t.Fatalf("oldest trusted device was not pruned: %#v", oldest)
	}

	expired := models.TrustedDevice{
		UserID:            admin.ID,
		DeviceFingerprint: "expired",
		DeviceName:        "Expired",
		LastUsedAt:        now.Add(-48 * time.Hour),
		ExpiresAt:         now.Add(-24 * time.Hour),
	}
	if err := app.db.Create(&expired).Error; err != nil {
		t.Fatalf("create expired device: %v", err)
	}
	if err := srv.cleanupExpiredTrustedDevices(); err != nil {
		t.Fatalf("cleanup expired devices: %v", err)
	}
	app.db.Model(&models.TrustedDevice{}).Where("user_id = ? AND device_fingerprint = ?", admin.ID, "expired").Count(&count)
	if count != 0 {
		t.Fatalf("expired trusted device was not removed")
	}
}

func firstContainerImageEquals(payload map[string]any, want string) bool {
	spec, _ := payload["spec"].(map[string]any)
	template, _ := spec["template"].(map[string]any)
	templateSpec, _ := template["spec"].(map[string]any)
	containers, _ := templateSpec["containers"].([]any)
	if len(containers) == 0 {
		return false
	}
	first, _ := containers[0].(map[string]any)
	return first["image"] == want
}

func createRancherSyncApps(t *testing.T, app *testApp, rancherURL string) (models.AppInstance, models.AppInstance) {
	t.Helper()
	sourceEnv := models.Environment{Name: "Source"}
	targetEnv := models.Environment{Name: "Target"}
	if err := app.db.Create(&sourceEnv).Error; err != nil {
		t.Fatalf("create source env: %v", err)
	}
	if err := app.db.Create(&targetEnv).Error; err != nil {
		t.Fatalf("create target env: %v", err)
	}
	site := models.RancherSite{Name: "Rancher", URL: rancherURL, Token: "token-abc", Active: true}
	if err := app.db.Create(&site).Error; err != nil {
		t.Fatalf("create site: %v", err)
	}
	sourceApp := models.AppInstance{Name: "Source App", Cluster: "c-1", Namespace: "default", ClusterType: "rancher", RancherSiteID: &site.ID, EnvironmentID: sourceEnv.ID}
	targetApp := models.AppInstance{Name: "Target App", Cluster: "c-1", Namespace: "default", ClusterType: "rancher", RancherSiteID: &site.ID, EnvironmentID: targetEnv.ID}
	if err := app.db.Create(&sourceApp).Error; err != nil {
		t.Fatalf("create source app: %v", err)
	}
	if err := app.db.Create(&targetApp).Error; err != nil {
		t.Fatalf("create target app: %v", err)
	}
	return sourceApp, targetApp
}

func TestRancherAPIHelpersAgainstMockServer(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/v3/", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer token-abc" {
			t.Fatalf("authorization header = %q", r.Header.Get("Authorization"))
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"rancherVersion":"2.8.0","serverVersion":"v1.28.1"}`))
	})
	mux.HandleFunc("/v3/clusters", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer token-abc" {
			t.Fatalf("authorization header = %q", r.Header.Get("Authorization"))
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"data":[{"id":"c-1","name":"prod","state":"active","description":"main"}]}`))
	})
	mux.HandleFunc("/v3/namespaces", func(w http.ResponseWriter, r *http.Request) {
		if got := r.URL.Query().Get("clusterId"); got != "c-1" {
			t.Fatalf("clusterId query = %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"data":[{"id":"ns-1","name":"default","projectId":"p-1","clusterId":"c-1"}]}`))
	})
	mock := httptest.NewServer(mux)
	t.Cleanup(mock.Close)

	site := models.RancherSite{URL: mock.URL, Token: "token-abc"}
	var payload map[string]any
	if err := rancherRequest(site, "/", nil, &payload); err != nil {
		t.Fatalf("rancher root request: %v", err)
	}
	if payload["rancherVersion"] != "2.8.0" {
		t.Fatalf("rancherVersion = %#v", payload["rancherVersion"])
	}

	clusters, err := rancherClusters(site)
	if err != nil {
		t.Fatalf("rancher clusters: %v", err)
	}
	if len(clusters) != 1 || clusters[0]["id"] != "c-1" || clusters[0]["state"] != "active" {
		t.Fatalf("clusters = %#v", clusters)
	}

	namespaces, err := rancherNamespaces(site, "c-1")
	if err != nil {
		t.Fatalf("rancher namespaces: %v", err)
	}
	if len(namespaces) != 1 || namespaces[0]["name"] != "default" || namespaces[0]["projectId"] != "p-1" {
		t.Fatalf("namespaces = %#v", namespaces)
	}
}

func TestHarborAPIHelpersAgainstMockServer(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v2.0/users/current", func(w http.ResponseWriter, r *http.Request) {
		user, password, ok := r.BasicAuth()
		if !ok || user != "harbor-user" || password != "harbor-pass" {
			t.Fatalf("basic auth = %q/%q ok=%v", user, password, ok)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"username":"harbor-user","email":"user@example.com","realname":"Harbor User","sysadmin_flag":true}`))
	})
	mux.HandleFunc("/api/v2.0/projects", func(w http.ResponseWriter, r *http.Request) {
		user, password, ok := r.BasicAuth()
		if !ok || user != "harbor-user" || password != "harbor-pass" {
			t.Fatalf("basic auth = %q/%q ok=%v", user, password, ok)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`[{"name":"library"},{"name":"platform"}]`))
	})
	mux.HandleFunc("/api/v2.0/projects/proj/repositories/repo/artifacts/v1", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("with_tag") != "true" || r.URL.Query().Get("with_scan_overview") != "false" {
			t.Fatalf("artifact query = %s", r.URL.RawQuery)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"size":2048}`))
	})
	mock := httptest.NewServer(mux)
	t.Cleanup(mock.Close)

	site := models.HarborSite{URL: mock.URL, Username: "harbor-user", Password: "harbor-pass"}
	result := harborConnectionResult(site)
	if result["success"] != true {
		t.Fatalf("connection result = %#v", result)
	}
	if result["message"] != "Connection successful - Authenticated as harbor-user" {
		t.Fatalf("connection message = %#v", result["message"])
	}
	data := result["data"].(gin.H)
	if data["projectCount"] != 2 || data["harborUrl"] != mock.URL {
		t.Fatalf("connection data = %#v", data)
	}
	user := data["user"].(gin.H)
	if user["username"] != "harbor-user" || user["admin"] != true {
		t.Fatalf("connection user = %#v", user)
	}

	size, err := harborImageSize(site, mock.Listener.Addr().String()+"/proj/repo:v1")
	if err != nil {
		t.Fatalf("harbor image size: %v", err)
	}
	if size["compressedSize"] != int64(2048) || size["size"] != int64(5120) {
		t.Fatalf("image size = %#v", size)
	}
}

func TestTelegramConnectionUsesStoredConfigAndTemplate(t *testing.T) {
	app := newTestApp(t)

	oldBaseURL := telegramAPIBaseURL
	var seenPath string
	var seenForm map[string]string
	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seenPath = r.URL.Path
		if r.Method != http.MethodPost {
			t.Fatalf("method = %s", r.Method)
		}
		if got := r.Header.Get("Content-Type"); !strings.HasPrefix(got, "application/x-www-form-urlencoded") {
			t.Fatalf("content-type = %q", got)
		}
		if err := r.ParseForm(); err != nil {
			t.Fatalf("parse form: %v", err)
		}
		seenForm = map[string]string{
			"chat_id":    r.PostForm.Get("chat_id"),
			"text":       r.PostForm.Get("text"),
			"parse_mode": r.PostForm.Get("parse_mode"),
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"ok":true,"result":{"message_id":123}}`))
	}))
	t.Cleanup(func() {
		telegramAPIBaseURL = oldBaseURL
		mock.Close()
	})
	telegramAPIBaseURL = mock.URL

	token := "stored-token"
	chatID := "stored-chat"
	config := models.MonitoringConfig{
		TelegramBotToken:     &token,
		TelegramChatID:       &chatID,
		MonitoringEnabled:    true,
		AlertThreshold:       3,
		NotificationSchedule: "daily",
		TaggedUsers:          []string{"alice", "@bob"},
	}
	if err := app.db.Create(&config).Error; err != nil {
		t.Fatalf("create monitoring config: %v", err)
	}

	resp := app.request(http.MethodPost, "/api/monitoring/config/test-telegram", app.token, map[string]any{})
	if resp.Code != http.StatusOK {
		t.Fatalf("test telegram status = %d body = %s", resp.Code, resp.Body.String())
	}
	payload := decodeJSON[map[string]any](t, resp)
	if payload["success"] != true || payload["message"] != "Telegram connection test successful" {
		t.Fatalf("test telegram payload = %#v", payload)
	}
	if seenPath != "/botstored-token/sendMessage" {
		t.Fatalf("telegram path = %q", seenPath)
	}
	if seenForm["chat_id"] != "stored-chat" || seenForm["parse_mode"] != "Markdown" {
		t.Fatalf("telegram form = %#v", seenForm)
	}
	if !strings.Contains(seenForm["text"], "@alice @bob") {
		t.Fatalf("telegram text missing tagged users: %q", seenForm["text"])
	}
}

func TestTelegramConnectionReportsAPIError(t *testing.T) {
	app := newTestApp(t)

	oldBaseURL := telegramAPIBaseURL
	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"ok":false,"error_code":400,"description":"chat not found"}`))
	}))
	t.Cleanup(func() {
		telegramAPIBaseURL = oldBaseURL
		mock.Close()
	})
	telegramAPIBaseURL = mock.URL

	resp := app.request(http.MethodPost, "/api/monitoring/config/test-telegram", app.token, map[string]any{
		"telegramBotToken": "bad-token",
		"telegramChatId":   "missing-chat",
	})
	if resp.Code != http.StatusOK {
		t.Fatalf("test telegram status = %d body = %s", resp.Code, resp.Body.String())
	}
	payload := decodeJSON[map[string]any](t, resp)
	if payload["success"] != false || !strings.Contains(fmt.Sprint(payload["message"]), "Telegram API error (400): chat not found") {
		t.Fatalf("test telegram error payload = %#v", payload)
	}
}

func TestMonitoringHealthCheckStatusAndAlertThresholdParity(t *testing.T) {
	app := newTestApp(t)
	instance := createMonitoredInstanceWithServices(t, app, []models.Service{
		{Name: "api", Status: "active", Replicas: 1, AvailableReplicas: 1},
		{Name: "worker", Status: "active", Replicas: 1, AvailableReplicas: 1},
		{Name: "jobs", Status: "failed", Replicas: 1, AvailableReplicas: 0},
	}, 0, false)

	srv := &Server{db: app.db}
	result := srv.performHealthCheck(instance)
	if result["status"] != "warning" {
		t.Fatalf("health status = %#v, want warning", result["status"])
	}
	var alertCount int64
	app.db.Model(&models.AlertHistory{}).Where("monitored_instance_id = ?", instance.ID).Count(&alertCount)
	if alertCount != 0 {
		t.Fatalf("alert count = %d, want 0 before third consecutive failure", alertCount)
	}
	var reloaded models.MonitoredInstance
	if err := app.db.First(&reloaded, "id = ?", instance.ID).Error; err != nil {
		t.Fatalf("reload monitored instance: %v", err)
	}
	if reloaded.ConsecutiveFailures != 1 || reloaded.AlertSent {
		t.Fatalf("monitored instance after warning = %#v", reloaded)
	}

	thresholdInstance := createMonitoredInstanceWithServices(t, app, []models.Service{
		{Name: "api", Status: "failed", Replicas: 1, AvailableReplicas: 0},
	}, 2, false)
	thresholdResult := srv.performHealthCheck(thresholdInstance)
	if thresholdResult["status"] != "critical" {
		t.Fatalf("threshold status = %#v, want critical", thresholdResult["status"])
	}
	var alert models.AlertHistory
	if err := app.db.First(&alert, "monitored_instance_id = ?", thresholdInstance.ID).Error; err != nil {
		t.Fatalf("load threshold alert: %v", err)
	}
	if alert.Severity != "critical" || alert.AlertType != "service_failure" {
		t.Fatalf("threshold alert = %#v", alert)
	}
	var thresholdReloaded models.MonitoredInstance
	if err := app.db.First(&thresholdReloaded, "id = ?", thresholdInstance.ID).Error; err != nil {
		t.Fatalf("reload threshold monitored instance: %v", err)
	}
	if thresholdReloaded.ConsecutiveFailures != 3 || !thresholdReloaded.AlertSent {
		t.Fatalf("threshold monitored instance = %#v", thresholdReloaded)
	}
}

func TestDailyMonitoringTriggerSendsTelegramSummaryAndImmediateAlert(t *testing.T) {
	app := newTestApp(t)

	oldBaseURL := telegramAPIBaseURL
	messages := []string{}
	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/botbot-token/sendMessage" {
			t.Fatalf("telegram path = %q", r.URL.Path)
		}
		if err := r.ParseForm(); err != nil {
			t.Fatalf("parse telegram form: %v", err)
		}
		if r.PostForm.Get("chat_id") != "chat-id" || r.PostForm.Get("parse_mode") != "Markdown" {
			t.Fatalf("telegram form = %#v", r.PostForm)
		}
		messages = append(messages, r.PostForm.Get("text"))
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"ok":true,"result":{"message_id":123}}`))
	}))
	t.Cleanup(func() {
		telegramAPIBaseURL = oldBaseURL
		mock.Close()
	})
	telegramAPIBaseURL = mock.URL

	token := "bot-token"
	chatID := "chat-id"
	config := models.MonitoringConfig{
		TelegramBotToken:     &token,
		TelegramChatID:       &chatID,
		MonitoringEnabled:    true,
		AlertThreshold:       3,
		NotificationSchedule: "immediate",
		TaggedUsers:          []string{"devops"},
	}
	if err := app.db.Create(&config).Error; err != nil {
		t.Fatalf("create monitoring config: %v", err)
	}
	createMonitoredInstanceWithServices(t, app, []models.Service{
		{Name: "api", Status: "failed", Replicas: 1, AvailableReplicas: 0},
	}, 0, false)

	resp := app.request(http.MethodPost, "/api/monitoring/trigger/daily-check", app.token, map[string]any{})
	if resp.Code != http.StatusOK {
		t.Fatalf("trigger daily status = %d body = %s", resp.Code, resp.Body.String())
	}
	if len(messages) != 2 {
		t.Fatalf("telegram messages = %#v, want summary and critical alert", messages)
	}
	if !strings.Contains(messages[0], "Overall Status") || !strings.Contains(messages[1], "CRITICAL") {
		t.Fatalf("telegram messages = %#v", messages)
	}
}

func createMonitoredInstanceWithServices(t *testing.T, app *testApp, services []models.Service, consecutiveFailures int, alertSent bool) models.MonitoredInstance {
	t.Helper()
	env := models.Environment{Name: "Monitoring"}
	if err := app.db.Create(&env).Error; err != nil {
		t.Fatalf("create monitoring env: %v", err)
	}
	mockRancher := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case strings.Contains(r.URL.Path, "/deployments"):
			items := make([]map[string]any, 0, len(services))
			for _, service := range services {
				image := "registry.local/" + service.Name + ":latest"
				if service.ImageTag != nil {
					image = *service.ImageTag
				}
				items = append(items, map[string]any{
					"metadata": map[string]any{"name": service.Name, "namespace": "default"},
					"spec": map[string]any{
						"replicas": service.Replicas,
						"template": map[string]any{"spec": map[string]any{"containers": []map[string]any{{"image": image}}}},
					},
					"status": map[string]any{"availableReplicas": service.AvailableReplicas},
					"state":  service.Status,
				})
			}
			json.NewEncoder(w).Encode(map[string]any{"items": items})
		case strings.Contains(r.URL.Path, "/daemonsets"), strings.Contains(r.URL.Path, "/statefulsets"):
			json.NewEncoder(w).Encode(map[string]any{"items": []any{}})
		default:
			t.Fatalf("unexpected Rancher workload path: %s", r.URL.Path)
		}
	}))
	t.Cleanup(mockRancher.Close)
	site := models.RancherSite{Name: "Monitoring Rancher", URL: mockRancher.URL, Token: "token-abc", Active: true}
	if err := app.db.Create(&site).Error; err != nil {
		t.Fatalf("create monitoring rancher site: %v", err)
	}
	appInstance := models.AppInstance{Name: "Monitored App", Cluster: "c-1", Namespace: "default", ClusterType: "rancher", RancherSiteID: &site.ID, EnvironmentID: env.ID}
	if err := app.db.Create(&appInstance).Error; err != nil {
		t.Fatalf("create monitored app instance: %v", err)
	}
	for i := range services {
		services[i].AppInstanceID = appInstance.ID
		if services[i].WorkloadType == "" {
			services[i].WorkloadType = "deployment"
		}
		if err := app.db.Create(&services[i]).Error; err != nil {
			t.Fatalf("create monitored service: %v", err)
		}
	}
	instance := models.MonitoredInstance{
		AppInstanceID:        appInstance.ID,
		MonitoringEnabled:    true,
		CheckIntervalMinutes: 60,
		ConsecutiveFailures:  consecutiveFailures,
		AlertSent:            alertSent,
	}
	if err := app.db.Create(&instance).Error; err != nil {
		t.Fatalf("create monitored instance: %v", err)
	}
	instance.AppInstance = &appInstance
	instance.AppInstance.Environment = &env
	instance.AppInstance.RancherSite = &site
	return instance
}
