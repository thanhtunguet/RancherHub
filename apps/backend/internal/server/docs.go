package server

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func registerDocs(router *gin.Engine) {
	routes := router.Routes()

	router.GET("/api/docs", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, swaggerHTML)
	})
	router.GET("/api/docs-json", func(c *gin.Context) {
		c.JSON(http.StatusOK, openAPIDocument(routes))
	})
}

func openAPIDocument(routes gin.RoutesInfo) gin.H {
	paths := gin.H{}
	for _, route := range routes {
		if strings.HasPrefix(route.Path, "/api/docs") {
			continue
		}
		path := openAPIPath(route.Path)
		item, _ := paths[path].(gin.H)
		if item == nil {
			item = gin.H{}
			paths[path] = item
		}
		operation := gin.H{
			"summary":     route.Method + " " + route.Path,
			"operationId": openAPIOperationID(route),
			"parameters":  openAPIParameters(route),
			"responses": gin.H{
				openAPIResponseStatus(route): gin.H{"description": "Successful response"},
			},
		}
		if schemaName, ok := openAPIRequestSchemas()[route.Method+" "+route.Path]; ok {
			operation["requestBody"] = gin.H{
				"required": true,
				"content": gin.H{
					"application/json": gin.H{"schema": openAPIRef(schemaName)},
				},
			}
		}
		if strings.HasPrefix(route.Path, "/api/") && route.Path != "/api/auth/login" && route.Path != "/api/auth/register" {
			operation["security"] = []gin.H{{"bearer": []string{}}}
		}
		item[strings.ToLower(route.Method)] = operation
	}

	return gin.H{
		"openapi": "3.0.0",
		"info": gin.H{
			"title":       "Rancher Hub API",
			"description": "API for managing Rancher services across environments",
			"version":     "1.0",
		},
		"tags": []gin.H{
			{"name": "sites"},
			{"name": "environments"},
			{"name": "app-instances"},
			{"name": "services"},
			{"name": "sync"},
		},
		"components": gin.H{
			"securitySchemes": gin.H{
				"bearer": gin.H{
					"type":         "http",
					"scheme":       "bearer",
					"bearerFormat": "JWT",
				},
			},
			"schemas": openAPISchemas(),
		},
		"paths": paths,
	}
}

func openAPIRequestSchemas() map[string]string {
	return map[string]string{
		"POST /api/auth/login":                      "LoginDto",
		"POST /api/auth/register":                   "RegisterDto",
		"POST /api/auth/verify-2fa":                 "Verify2FADto",
		"POST /api/auth/disable-2fa":                "Disable2FADto",
		"POST /api/auth/change-password":            "ChangePasswordDto",
		"POST /api/sites":                           "CreateSiteDto",
		"PATCH /api/sites/:id":                      "UpdateSiteDto",
		"POST /api/generic-clusters":                "CreateGenericClusterSiteDto",
		"PUT /api/generic-clusters/:id":             "UpdateGenericClusterSiteDto",
		"POST /api/generic-clusters/:id/set-active": "SetActiveDto",
		"POST /api/environments":                    "CreateEnvironmentDto",
		"PATCH /api/environments/:id":               "UpdateEnvironmentDto",
		"POST /api/app-instances":                   "CreateAppInstanceDto",
		"PATCH /api/app-instances/:id":              "UpdateAppInstanceDto",
		"POST /api/harbor-sites":                    "CreateHarborSiteDto",
		"PATCH /api/harbor-sites/:id":               "UpdateHarborSiteDto",
		"POST /api/harbor-sites/test-connection":    "TestHarborConnectionDto",
		"POST /api/services/sync":                   "SyncServicesDto",
		"PUT /api/services/:serviceId/update-image": "UpdateServiceImageDto",
		"POST /api/configmaps/sync-key":             "SyncConfigMapKeyDto",
		"POST /api/configmaps/sync-keys":            "SyncConfigMapKeysDto",
		"POST /api/secrets/sync-key":                "SyncSecretKeyDto",
		"POST /api/secrets/sync-keys":               "SyncSecretKeysDto",
		"POST /api/monitoring/config":               "CreateMonitoringConfigDto",
		"PUT /api/monitoring/config":                "UpdateMonitoringConfigDto",
		"POST /api/monitoring/config/test-telegram": "TestTelegramConnectionDto",
		"POST /api/monitoring/instances":            "CreateMonitoredInstanceDto",
		"PUT /api/monitoring/instances/:id":         "UpdateMonitoredInstanceDto",
		"POST /api/users":                           "CreateUserDto",
		"PATCH /api/users/:id":                      "UpdateUserDto",
		"DELETE /api/users/:id":                     "DeleteUserDto",
		"POST /api/message-templates":               "CreateMessageTemplateDto",
		"PUT /api/message-templates/:id":            "UpdateMessageTemplateDto",
		"POST /api/message-templates/preview":       "PreviewTemplateDto",
	}
}

func openAPIResponseStatus(route gin.RouteInfo) string {
	statuses := map[string]string{
		"POST /api/auth/register":              "201",
		"POST /api/sites":                      "201",
		"DELETE /api/sites/:id":                "204",
		"POST /api/generic-clusters":           "201",
		"POST /api/environments":               "201",
		"DELETE /api/environments/:id":         "204",
		"POST /api/app-instances":              "201",
		"DELETE /api/app-instances/:id":        "204",
		"POST /api/harbor-sites":               "201",
		"DELETE /api/harbor-sites/:id":         "204",
		"POST /api/monitoring/config":          "201",
		"POST /api/monitoring/instances":       "201",
		"DELETE /api/monitoring/instances/:id": "204",
		"POST /api/users":                      "201",
		"POST /api/message-templates":          "201",
		"DELETE /api/message-templates/:id":    "204",
	}
	if status, ok := statuses[route.Method+" "+route.Path]; ok {
		return status
	}
	return "200"
}

func openAPIPath(path string) string {
	parts := strings.Split(path, "/")
	for i, part := range parts {
		if strings.HasPrefix(part, ":") {
			parts[i] = "{" + strings.TrimPrefix(part, ":") + "}"
		}
	}
	return strings.Join(parts, "/")
}

func openAPIParameters(route gin.RouteInfo) []gin.H {
	params := []gin.H{}
	for _, part := range strings.Split(route.Path, "/") {
		if strings.HasPrefix(part, ":") {
			params = append(params, gin.H{
				"name":     strings.TrimPrefix(part, ":"),
				"in":       "path",
				"required": true,
				"schema":   gin.H{"type": "string"},
			})
		}
	}
	if queryParams, ok := openAPIQueryParameters()[route.Method+" "+route.Path]; ok {
		params = append(params, queryParams...)
	}
	return params
}

func openAPIQueryParameters() map[string][]gin.H {
	return map[string][]gin.H{
		"GET /api/sites/:id/namespaces":             {queryParameter("clusterId", "string", false)},
		"GET /api/app-instances":                    {queryParameter("env", "string", false)},
		"GET /api/harbor-sites/:id/test-image-size": {queryParameter("imageTag", "string", true)},
		"GET /api/services":                         {queryParameter("env", "string", true), queryParameter("type", "string", false), queryParameter("search", "string", false)},
		"GET /api/services/workload-types":          {queryParameter("env", "string", true)},
		"GET /api/services/sync/history":            {queryParameter("env", "string", false)},
		"GET /api/services/sync/history/detailed":   {queryParameter("env", "string", false)},
		"GET /api/services/compare":                 {queryParameter("source", "string", true), queryParameter("target", "string", true)},
		"GET /api/services/compare/by-instance":     {queryParameter("source", "string", true), queryParameter("target", "string", true)},
		"GET /api/configmaps/compare/by-instance":   {queryParameter("source", "string", true), queryParameter("target", "string", true)},
		"GET /api/secrets/compare/by-instance":      {queryParameter("source", "string", true), queryParameter("target", "string", true)},
		"GET /api/monitoring/history":               {queryParameter("instanceId", "string", false), queryParameter("days", "integer", false)},
		"GET /api/monitoring/alerts":                {queryParameter("instanceId", "string", false), queryParameter("resolved", "boolean", false)},
		"GET /api/users":                            {queryParameter("search", "string", false), queryParameter("active", "boolean", false), queryParameter("page", "integer", false), queryParameter("limit", "integer", false)},
	}
}

func queryParameter(name, typ string, required bool) gin.H {
	return gin.H{
		"name":     name,
		"in":       "query",
		"required": required,
		"schema":   gin.H{"type": typ},
	}
}

func openAPIOperationID(route gin.RouteInfo) string {
	name := strings.TrimPrefix(route.Path, "/")
	name = strings.NewReplacer("/", "_", "-", "_", ":", "").Replace(name)
	if name == "" {
		name = "root"
	}
	return strings.ToLower(route.Method) + "_" + name
}

func openAPIRef(name string) gin.H {
	return gin.H{"$ref": "#/components/schemas/" + name}
}

func openAPISchemas() gin.H {
	return gin.H{
		"LoginDto": objectSchema([]string{"username", "password"}, gin.H{
			"username":          stringSchema("Username or email"),
			"password":          stringSchema("Password"),
			"twoFactorToken":    stringSchemaWith("2FA token (6 digits)", gin.H{"minLength": 6, "maxLength": 6}),
			"deviceFingerprint": stringSchema("Device fingerprint for trusted device check"),
			"deviceName":        stringSchema("Device name"),
			"userAgent":         stringSchema("User agent string"),
			"trustDevice":       booleanSchema("Trust this device for 30 days"),
		}),
		"RegisterDto": objectSchema([]string{"username", "email", "password"}, gin.H{
			"username": stringSchemaWith("Username", gin.H{"minLength": 3}),
			"email":    stringSchemaWith("Email address", gin.H{"format": "email"}),
			"password": stringSchemaWith("Password", gin.H{"minLength": 8}),
		}),
		"Verify2FADto":  objectSchema([]string{"token"}, tokenProperties("6-digit 2FA token from authenticator app")),
		"Disable2FADto": objectSchema([]string{"token"}, tokenProperties("6-digit 2FA token from authenticator app to confirm disabling")),
		"ChangePasswordDto": objectSchema([]string{"currentPassword", "newPassword"}, gin.H{
			"currentPassword": stringSchema("Current password"),
			"newPassword":     stringSchemaWith("New password", gin.H{"minLength": 6}),
		}),
		"CreateSiteDto":               objectSchema([]string{"name", "url", "token"}, siteSchemaProperties()),
		"UpdateSiteDto":               objectSchema(nil, siteSchemaProperties()),
		"CreateGenericClusterSiteDto": objectSchema([]string{"name", "kubeconfig"}, genericClusterSchemaProperties()),
		"UpdateGenericClusterSiteDto": objectSchema(nil, genericClusterSchemaProperties()),
		"SetActiveDto":                objectSchema([]string{"active"}, gin.H{"active": booleanSchema("Whether the site or cluster is active")}),
		"CreateEnvironmentDto":        objectSchema([]string{"name"}, environmentSchemaProperties()),
		"UpdateEnvironmentDto":        objectSchema(nil, environmentSchemaProperties()),
		"CreateAppInstanceDto":        objectSchema([]string{"name", "cluster", "namespace", "clusterType", "environmentId"}, appInstanceSchemaProperties()),
		"UpdateAppInstanceDto":        objectSchema(nil, appInstanceSchemaProperties()),
		"CreateHarborSiteDto":         objectSchema([]string{"name", "url", "username", "password"}, harborSiteSchemaProperties()),
		"UpdateHarborSiteDto":         objectSchema(nil, harborSiteSchemaProperties()),
		"TestHarborConnectionDto":     harborConnectionSchema(),
		"SyncServicesDto":             syncServicesSchema(),
		"UpdateServiceImageDto":       objectSchema([]string{"tag"}, gin.H{"tag": stringSchema("Image tag")}),
		"SyncConfigMapKeyDto":         syncKubernetesKeySchema("configMapName", "ConfigMap name (Kubernetes DNS subdomain)", "ConfigMap data key", "Value to set for the key"),
		"SyncConfigMapKeysDto":        syncKubernetesKeysSchema("configMapName", "ConfigMap name (Kubernetes DNS subdomain)", "Map of key-value pairs to sync into the ConfigMap"),
		"SyncSecretKeyDto":            syncKubernetesKeySchema("secretName", "Secret name (Kubernetes DNS subdomain)", "Secret data key", "Base64-encoded value to set for the key"),
		"SyncSecretKeysDto":           syncKubernetesKeysSchema("secretName", "Secret name (Kubernetes DNS subdomain)", "Map of key-value pairs to sync into the Secret"),
		"CreateMonitoringConfigDto":   monitoringConfigSchema([]string{"monitoringEnabled", "alertThreshold", "notificationSchedule"}),
		"UpdateMonitoringConfigDto":   monitoringConfigSchema(nil),
		"TestTelegramConnectionDto":   telegramConnectionSchema(),
		"CreateMonitoredInstanceDto":  objectSchema([]string{"appInstanceId", "monitoringEnabled", "checkIntervalMinutes"}, monitoredInstanceSchemaProperties()),
		"UpdateMonitoredInstanceDto":  objectSchema(nil, monitoredInstanceSchemaProperties()),
		"CreateUserDto": objectSchema([]string{"username", "email", "password", "adminTwoFactorToken"}, gin.H{
			"username":            stringSchema("Username for the new user"),
			"email":               stringSchemaWith("Email address", gin.H{"format": "email"}),
			"password":            stringSchemaWith("User password", gin.H{"minLength": 8}),
			"adminTwoFactorToken": stringSchema("2FA token from admin authenticator app"),
		}),
		"UpdateUserDto": objectSchema([]string{"adminTwoFactorToken"}, gin.H{
			"username":            stringSchema("Username"),
			"email":               stringSchemaWith("Email address", gin.H{"format": "email"}),
			"password":            stringSchemaWith("New password", gin.H{"minLength": 8}),
			"active":              booleanSchema("Active status"),
			"adminTwoFactorToken": stringSchema("2FA token from admin authenticator app"),
		}),
		"DeleteUserDto": objectSchema([]string{"adminTwoFactorToken"}, gin.H{
			"adminTwoFactorToken": stringSchema("2FA token from admin authenticator app"),
		}),
		"CreateMessageTemplateDto": messageTemplateSchema([]string{"templateType", "templateName", "messageTemplate"}, true),
		"UpdateMessageTemplateDto": messageTemplateUpdateSchema(),
		"PreviewTemplateDto": objectSchema([]string{"templateType", "messageTemplate"}, gin.H{
			"templateType":    stringSchema("Template type for getting sample data"),
			"messageTemplate": stringSchema("Message template to preview"),
			"sampleData":      objectAdditionalSchema("Optional custom sample data for preview", gin.H{}),
		}),
	}
}

func objectSchema(required []string, properties gin.H) gin.H {
	schema := gin.H{"type": "object", "properties": properties}
	if len(required) > 0 {
		schema["required"] = required
	}
	return schema
}

func stringSchema(description string) gin.H {
	return stringSchemaWith(description, nil)
}

func stringSchemaWith(description string, extra gin.H) gin.H {
	prop := gin.H{"type": "string", "description": description}
	for key, value := range extra {
		prop[key] = value
	}
	return prop
}

func uuidSchema(description string) gin.H {
	return stringSchemaWith(description, gin.H{"format": "uuid"})
}

func booleanSchema(description string) gin.H {
	return booleanSchemaWith(description, nil)
}

func booleanSchemaWith(description string, extra gin.H) gin.H {
	prop := gin.H{"type": "boolean", "description": description}
	for key, value := range extra {
		prop[key] = value
	}
	return prop
}

func integerSchemaWith(description string, extra gin.H) gin.H {
	prop := gin.H{"type": "integer", "description": description}
	for key, value := range extra {
		prop[key] = value
	}
	return prop
}

func arrayStringSchema(description string) gin.H {
	return gin.H{"type": "array", "description": description, "items": gin.H{"type": "string"}}
}

func objectAdditionalSchema(description string, additional gin.H) gin.H {
	return gin.H{"type": "object", "description": description, "additionalProperties": additional}
}

func tokenProperties(description string) gin.H {
	return gin.H{"token": stringSchemaWith(description, gin.H{"minLength": 6, "maxLength": 6, "pattern": "^\\d{6}$"})}
}

func siteSchemaProperties() gin.H {
	return gin.H{
		"name":  stringSchemaWith("Display name for the Rancher site", gin.H{"minLength": 1, "example": "Production Rancher"}),
		"url":   stringSchemaWith("Rancher server URL", gin.H{"format": "uri", "example": "https://rancher.example.com"}),
		"token": stringSchemaWith("Rancher API token", gin.H{"example": "token-abc123:xyz789"}),
	}
}

func genericClusterSchemaProperties() gin.H {
	return gin.H{
		"name":       stringSchemaWith("Display name for the generic Kubernetes cluster", gin.H{"minLength": 1}),
		"kubeconfig": stringSchema("Kubeconfig file content in YAML format"),
	}
}

func environmentSchemaProperties() gin.H {
	return gin.H{
		"name":        stringSchema("Environment name"),
		"description": stringSchema("Optional description"),
		"color":       stringSchemaWith("Color code for UI display", gin.H{"pattern": "^#[0-9A-Fa-f]{6}$", "default": "#1890ff"}),
	}
}

func appInstanceSchemaProperties() gin.H {
	return gin.H{
		"name":                 stringSchema("Display name for the app instance"),
		"cluster":              stringSchema("Cluster ID or cluster name"),
		"namespace":            stringSchema("Kubernetes namespace"),
		"clusterType":          stringSchemaWith("Type of cluster", gin.H{"enum": []string{"rancher", "generic"}}),
		"rancherSiteId":        uuidSchema("ID of the associated Rancher site"),
		"genericClusterSiteId": uuidSchema("ID of the associated generic cluster site"),
		"environmentId":        uuidSchema("ID of the associated environment"),
	}
}

func harborSiteSchemaProperties() gin.H {
	return gin.H{
		"name":     stringSchema("Name of the Harbor site"),
		"url":      stringSchemaWith("Harbor registry URL", gin.H{"format": "uri"}),
		"username": stringSchema("Harbor username"),
		"password": stringSchema("Harbor password"),
		"active":   booleanSchemaWith("Whether the site is active", gin.H{"default": true}),
	}
}

func monitoredInstanceSchemaProperties() gin.H {
	return gin.H{
		"appInstanceId":        stringSchema("ID of the app instance to monitor"),
		"monitoringEnabled":    booleanSchemaWith("Enable or disable monitoring for this instance", gin.H{"default": true}),
		"checkIntervalMinutes": integerSchemaWith("Interval in minutes between health checks", gin.H{"default": 60}),
	}
}

func harborConnectionSchema() gin.H {
	return objectSchema([]string{"url", "username", "password"}, gin.H{
		"url":      stringSchemaWith("Harbor registry URL", gin.H{"format": "uri"}),
		"username": stringSchema("Harbor username"),
		"password": stringSchema("Harbor password"),
	})
}

func syncServicesSchema() gin.H {
	return objectSchema([]string{"sourceEnvironmentId", "targetEnvironmentId", "serviceIds", "targetAppInstanceIds"}, gin.H{
		"sourceEnvironmentId":  stringSchema("Source environment ID"),
		"targetEnvironmentId":  stringSchema("Target environment ID"),
		"serviceIds":           arrayStringSchema("Array of service IDs to synchronize"),
		"targetAppInstanceIds": arrayStringSchema("Array of target app instance IDs"),
	})
}

func syncKubernetesKeySchema(resourceNameField, resourceDescription, keyDescription, valueDescription string) gin.H {
	return objectSchema([]string{"sourceAppInstanceId", "targetAppInstanceId", resourceNameField, "key"}, gin.H{
		"sourceAppInstanceId": uuidSchema("Source app instance ID"),
		"targetAppInstanceId": uuidSchema("Target app instance ID"),
		resourceNameField:     stringSchemaWith(resourceDescription, gin.H{"pattern": "^[a-z0-9]([a-z0-9\\-.]{0,251}[a-z0-9])?$"}),
		"key":                 stringSchemaWith(keyDescription, gin.H{"maxLength": 253}),
		"value":               stringSchemaWith(valueDescription, gin.H{"maxLength": 1048576}),
	})
}

func syncKubernetesKeysSchema(resourceNameField, resourceDescription, keysDescription string) gin.H {
	return objectSchema([]string{"sourceAppInstanceId", "targetAppInstanceId", resourceNameField, "keys"}, gin.H{
		"sourceAppInstanceId": uuidSchema("Source app instance ID"),
		"targetAppInstanceId": uuidSchema("Target app instance ID"),
		resourceNameField:     stringSchemaWith(resourceDescription, gin.H{"pattern": "^[a-z0-9]([a-z0-9\\-.]{0,251}[a-z0-9])?$"}),
		"keys":                objectAdditionalSchema(keysDescription, gin.H{"type": "string"}),
	})
}

func monitoringConfigSchema(required []string) gin.H {
	return objectSchema(required, gin.H{
		"telegramBotToken":     stringSchema("Telegram bot token for notifications"),
		"telegramChatId":       stringSchema("Telegram chat ID to send notifications to"),
		"proxyHost":            stringSchema("SOCKS5 proxy host for Telegram API access"),
		"proxyPort":            integerSchemaWith("SOCKS5 proxy port", nil),
		"proxyUsername":        stringSchema("Proxy username for authentication"),
		"proxyPassword":        stringSchema("Proxy password for authentication"),
		"monitoringEnabled":    booleanSchemaWith("Enable or disable monitoring", gin.H{"default": true}),
		"alertThreshold":       integerSchemaWith("Number of consecutive failures before triggering alert", gin.H{"default": 3}),
		"notificationSchedule": stringSchemaWith("Notification schedule frequency", gin.H{"enum": []string{"immediate", "hourly", "daily"}, "default": "daily"}),
		"taggedUsers":          arrayStringSchema("List of usernames to tag in Telegram messages"),
	})
}

func telegramConnectionSchema() gin.H {
	return objectSchema(nil, gin.H{
		"telegramBotToken": stringSchema("Telegram bot token for testing"),
		"telegramChatId":   stringSchema("Telegram chat ID for testing"),
		"proxyHost":        stringSchema("SOCKS5 proxy host for testing"),
		"proxyPort":        integerSchemaWith("SOCKS5 proxy port for testing", nil),
		"proxyUsername":    stringSchema("Proxy username for testing"),
		"proxyPassword":    stringSchema("Proxy password for testing"),
		"taggedUsers":      arrayStringSchema("List of usernames to tag in test message"),
	})
}

func messageTemplateSchema(required []string, includeType bool) gin.H {
	properties := gin.H{
		"templateName":    stringSchema("Display name for the template"),
		"messageTemplate": stringSchema("Message template with placeholders"),
		"description":     stringSchema("Description of what this template is used for"),
	}
	if includeType {
		properties["templateType"] = stringSchemaWith("Template type", gin.H{"enum": []string{"test_connection", "daily_health_check", "critical_alert"}})
	}
	return objectSchema(required, properties)
}

func messageTemplateUpdateSchema() gin.H {
	schema := messageTemplateSchema(nil, false)
	schema["properties"].(gin.H)["isActive"] = booleanSchema("Whether this template is active")
	return schema
}

const swaggerHTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Rancher Hub API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: "/api/docs-json",
        dom_id: "#swagger-ui"
      });
    };
  </script>
</body>
</html>`
