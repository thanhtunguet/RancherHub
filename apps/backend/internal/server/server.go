package server

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"image/png"
	"io"
	"math"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"rancher-hub-backend/internal/config"
	"rancher-hub-backend/internal/models"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Server struct {
	cfg config.Config
	db  *gorm.DB
}

var templatePlaceholderPattern = regexp.MustCompile(`{{[^}]+}}`)
var environmentColorPattern = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

func New(cfg config.Config, db *gorm.DB) *gin.Engine {
	gin.EnableJsonDecoderDisallowUnknownFields()
	s := &Server{cfg: cfg, db: db}

	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery(), jsonContentTypeGuard())
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.FrontendURL},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	router.Use(rateLimitMiddleware())

	router.GET("/", func(c *gin.Context) {
		c.String(http.StatusOK, "Rancher Hub API is running!")
	})
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"timestamp": time.Now().Format(time.RFC3339Nano),
			"service":   "Rancher Hub Backend",
			"version":   "1.0.0",
		})
	})

	api := router.Group("/api")
	auth := api.Group("/auth")
	auth.POST("/login", s.login)
	auth.POST("/register", s.register)
	auth.POST("/setup-2fa", s.authRequired(false, true), s.setup2FA)
	auth.POST("/verify-2fa", s.authRequired(false, true), s.verify2FA)
	auth.POST("/disable-2fa", s.authRequired(false, true), s.disable2FA)
	auth.POST("/change-password", s.authRequired(false, true), s.changePassword)
	auth.GET("/profile", s.authRequired(false, true), s.profile)

	twoFactor := s.authRequired(true, false)
	jwtOnly := s.authRequired(false, false)

	sites := api.Group("/sites", twoFactor)
	sites.POST("", s.createSite)
	sites.GET("", s.listSites)
	sites.GET("/active", s.activeSite)
	sites.GET("/:id", s.getSite)
	sites.PATCH("/:id", s.updateSite)
	sites.DELETE("/:id", s.deleteSite)
	sites.POST("/:id/test", s.testRancherConnection)
	sites.POST("/:id/activate", s.setSiteActive(true))
	sites.POST("/:id/deactivate", s.setSiteActive(false))
	sites.GET("/:id/clusters", s.getRancherClusters)
	sites.GET("/:id/namespaces", s.getRancherNamespaces)

	genericClusters := api.Group("/generic-clusters", jwtOnly)
	genericClusters.POST("", s.createGenericCluster)
	genericClusters.GET("", s.listGenericClusters)
	genericClusters.GET("/:id", s.getGenericCluster)
	genericClusters.PUT("/:id", s.updateGenericCluster)
	genericClusters.DELETE("/:id", s.deleteGenericCluster)
	genericClusters.POST("/:id/test", s.testGenericClusterConnection)
	genericClusters.POST("/:id/set-active", s.setGenericClusterActive)
	genericClusters.GET("/:id/namespaces", s.getGenericClusterNamespaces)

	envs := api.Group("/environments", twoFactor)
	envs.POST("", s.createEnvironment)
	envs.GET("", s.listEnvironments)
	envs.GET("/:id", s.getEnvironment)
	envs.GET("/:id/with-instances", s.getEnvironmentWithInstances)
	envs.PATCH("/:id", s.updateEnvironment)
	envs.DELETE("/:id", s.deleteEnvironment)

	instances := api.Group("/app-instances", twoFactor)
	instances.POST("", s.createAppInstance)
	instances.GET("", s.listAppInstances)
	instances.GET("/by-environment/:environmentId", s.appInstancesByEnvironment)
	instances.GET("/by-site/:siteId", s.appInstancesBySite)
	instances.GET("/:id", s.getAppInstance)
	instances.PATCH("/:id", s.updateAppInstance)
	instances.DELETE("/:id", s.deleteAppInstance)

	harbor := api.Group("/harbor-sites", twoFactor)
	harbor.POST("", s.createHarborSite)
	harbor.GET("", s.listHarborSites)
	harbor.GET("/active", s.activeHarborSite)
	harbor.POST("/test-connection", s.testHarborConnection)
	harbor.GET("/:id", s.getHarborSite)
	harbor.PATCH("/:id", s.updateHarborSite)
	harbor.DELETE("/:id", s.deleteHarborSite)
	harbor.POST("/:id/test", s.testStoredHarborConnection)
	harbor.POST("/:id/activate", s.setHarborActive(true))
	harbor.POST("/:id/deactivate", s.setHarborActive(false))
	harbor.GET("/:id/projects", s.getHarborProjects)
	harbor.GET("/:id/repositories/:projectName", s.getHarborRepositories)
	harbor.GET("/:id/artifacts/:projectName/:repositoryName", s.getHarborArtifacts)
	harbor.GET("/:id/tag-detail/:projectName/:repositoryName/:tag", s.getHarborTagDetail)
	harbor.GET("/:id/test-image-size", s.testHarborImageSize)

	services := api.Group("/services", twoFactor)
	services.GET("", s.listServices)
	services.GET("/workload-types", s.workloadTypes)
	services.GET("/by-app-instance/:appInstanceId", s.servicesByAppInstance)
	services.GET("/with-image-sizes/:appInstanceId", s.servicesWithImageSizes)
	services.GET("/app-instances/tree", s.appInstanceTree)
	services.GET("/test-api/:siteId", s.testRancherAPIEndpoint)
	services.GET("/test-structure/:siteId", s.testRancherAPIEndpoint)
	services.POST("/sync", s.createSyncOperation)
	services.GET("/sync/history", s.syncHistory)
	services.GET("/sync/history/detailed", s.syncHistory)
	services.GET("/compare", s.compareServices)
	services.GET("/compare/by-instance", s.compareServicesByInstance)
	services.GET("/debug/app-instances/:environmentId", s.debugAppInstances)
	services.GET("/debug/clusters/:siteId", s.debugRancherClusters)
	services.GET("/:serviceId/debug-image-info", s.debugImageInfo)
	services.GET("/:serviceId/image-tags", s.getImageTags)
	services.PUT("/:serviceId/update-image", s.updateServiceImage)

	configMaps := api.Group("/configmaps", twoFactor)
	configMaps.GET("/by-app-instance/:appInstanceId", s.getConfigMapsByAppInstance)
	configMaps.GET("/compare/by-instance", s.compareConfigMapsByInstance)
	configMaps.GET("/:configMapName/details", s.getConfigMapDetails)
	configMaps.POST("/sync-key", s.syncConfigMapKey)
	configMaps.POST("/sync-keys", s.syncConfigMapKeys)

	secrets := api.Group("/secrets", twoFactor)
	secrets.GET("/by-app-instance/:appInstanceId", s.getSecretsByAppInstance)
	secrets.GET("/compare/by-instance", s.compareSecretsByInstance)
	secrets.GET("/:secretName/details", s.getSecretDetails)
	secrets.POST("/sync-key", s.syncSecretKey)
	secrets.POST("/sync-keys", s.syncSecretKeys)

	monitoring := api.Group("/monitoring", twoFactor)
	monitoring.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Monitoring controller works"})
	})
	monitoring.GET("/config", s.getMonitoringConfig)
	monitoring.POST("/config", s.upsertMonitoringConfig)
	monitoring.PUT("/config", s.updateMonitoringConfig)
	monitoring.POST("/config/test-telegram", s.testTelegramConnection)
	monitoring.GET("/instances", s.listMonitoredInstances)
	monitoring.GET("/instances/:id", s.getMonitoredInstance)
	monitoring.POST("/instances", s.createMonitoredInstance)
	monitoring.PUT("/instances/:id", s.updateMonitoredInstance)
	monitoring.DELETE("/instances/:id", s.deleteMonitoredInstance)
	monitoring.GET("/history", s.monitoringHistory)
	monitoring.GET("/alerts", s.alertHistory)
	monitoring.PUT("/alerts/:id/resolve", s.resolveAlert)
	monitoring.POST("/trigger/daily-check", s.triggerDailyCheck)
	monitoring.POST("/trigger/hourly-check", s.triggerHourlyCheck)

	users := api.Group("/users", twoFactor)
	users.POST("", s.createUser)
	users.GET("", s.listUsers)
	users.GET("/stats", s.userStats)
	users.GET("/:id", s.getUser)
	users.PATCH("/:id", s.updateUser)
	users.DELETE("/:id", s.deleteUser)

	templates := api.Group("/message-templates", twoFactor)
	templates.GET("", s.listMessageTemplates)
	templates.GET("/type/:type", s.getMessageTemplateByType)
	templates.POST("/preview", s.previewMessageTemplate)
	templates.GET("/:id", s.getMessageTemplate)
	templates.POST("", s.createMessageTemplate)
	templates.PUT("/:id", s.updateMessageTemplate)
	templates.DELETE("/:id", s.deleteMessageTemplate)
	templates.POST("/:id/restore", s.restoreMessageTemplate)

	devices := api.Group("/trusted-devices", jwtOnly)
	devices.GET("", s.listTrustedDevices)
	devices.DELETE("/:id", s.revokeTrustedDevice)
	devices.DELETE("", s.revokeAllTrustedDevices)

	registerDocs(router)
	s.startMonitoringScheduler()

	return router
}

func jsonContentTypeGuard() gin.HandlerFunc {
	return func(c *gin.Context) {
		switch c.Request.Method {
		case http.MethodPost, http.MethodPut, http.MethodPatch:
			if !strings.HasPrefix(c.GetHeader("Content-Type"), "application/json") {
				c.AbortWithStatusJSON(http.StatusUnsupportedMediaType, gin.H{
					"statusCode": http.StatusUnsupportedMediaType,
					"message":    "Unsupported Media Type: Content-Type must be application/json",
				})
				return
			}
		}
		c.Next()
	}
}

func (s *Server) authRequired(require2FA bool, allowTemp bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") {
			abort(c, http.StatusUnauthorized, "Unauthorized")
			return
		}

		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(strings.TrimPrefix(auth, "Bearer "), claims, func(*jwt.Token) (any, error) {
			return []byte(s.cfg.JWTSecret), nil
		})
		if err != nil || !token.Valid {
			abort(c, http.StatusUnauthorized, "Unauthorized")
			return
		}

		userID, _ := claims["sub"].(string)
		username, _ := claims["username"].(string)
		if userID == "" {
			abort(c, http.StatusUnauthorized, "Unauthorized")
			return
		}
		isTemp, _ := claims["temp"].(bool)
		if isTemp && !allowTemp {
			abort(c, http.StatusUnauthorized, "Unauthorized")
			return
		}

		var user models.User
		if !isTemp || require2FA {
			if err := s.db.First(&user, "id = ? AND active = ?", userID, true).Error; err != nil {
				abort(c, http.StatusUnauthorized, "Unauthorized")
				return
			}
			if require2FA && !user.TwoFactorEnabled {
				abort(c, http.StatusForbidden, "Two-factor authentication is required to access this resource. Please enable 2FA in your account settings.")
				return
			}
		}

		c.Set("userID", userID)
		c.Set("username", username)
		c.Next()
	}
}

func (s *Server) login(c *gin.Context) {
	var dto loginDTO
	if !bind(c, &dto) {
		return
	}

	var user models.User
	err := s.db.Where("username = ? OR email = ?", dto.Username, dto.Username).First(&user).Error
	if err != nil || bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(dto.Password)) != nil {
		abort(c, http.StatusUnauthorized, "Invalid credentials")
		return
	}
	if !user.Active {
		abort(c, http.StatusUnauthorized, "Account is disabled")
		return
	}

	deviceTrusted := false
	if user.TwoFactorEnabled && dto.DeviceFingerprint != nil {
		deviceTrusted = s.isDeviceTrusted(user.ID, *dto.DeviceFingerprint)
		if deviceTrusted {
			now := time.Now()
			s.db.Model(&models.TrustedDevice{}).
				Where("user_id = ? AND device_fingerprint = ?", user.ID, *dto.DeviceFingerprint).
				Update("last_used_at", now)
		}
	}

	if user.TwoFactorEnabled && !deviceTrusted && dto.TwoFactorToken == nil {
		temp, err := s.signJWT(user, true, 5*time.Minute)
		if err != nil {
			abort(c, http.StatusInternalServerError, "Failed to create token")
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"requiresTwoFactor": true,
			"message":           "Please enter your 2FA token to complete login",
			"tempToken":         temp,
		})
		return
	}

	if user.TwoFactorEnabled && !deviceTrusted && dto.TwoFactorToken != nil {
		if user.TwoFactorSecret == nil || !validTOTP(*dto.TwoFactorToken, *user.TwoFactorSecret) {
			abort(c, http.StatusUnauthorized, "Invalid 2FA token. Please check the code from your authenticator app and try again.")
			return
		}
		if dto.TrustDevice != nil && *dto.TrustDevice && dto.DeviceFingerprint != nil && dto.DeviceName != nil {
			s.trustDevice(user.ID, *dto.DeviceFingerprint, *dto.DeviceName, dto.UserAgent, clientIP(c))
		}
	}

	wasFirstLogin := user.IsFirstLogin
	now := time.Now()
	user.LastLoginAt = &now
	user.IsFirstLogin = false
	s.db.Save(&user)

	token, err := s.signJWT(user, false, 24*time.Hour)
	if err != nil {
		abort(c, http.StatusInternalServerError, "Failed to create token")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"access_token": token,
		"user": gin.H{
			"id":               user.ID,
			"username":         user.Username,
			"email":            user.Email,
			"twoFactorEnabled": user.TwoFactorEnabled,
			"isFirstLogin":     wasFirstLogin,
		},
	})
}

func (s *Server) register(c *gin.Context) {
	var dto registerDTO
	if !bind(c, &dto) {
		return
	}
	var count int64
	s.db.Model(&models.User{}).Where("username = ? OR email = ?", dto.Username, dto.Email).Count(&count)
	if count > 0 {
		abort(c, http.StatusBadRequest, "User already exists")
		return
	}
	password, err := bcrypt.GenerateFromPassword([]byte(dto.Password), 12)
	if err != nil {
		abort(c, http.StatusInternalServerError, "Failed to hash password")
		return
	}
	user := models.User{
		Username:     dto.Username,
		Email:        dto.Email,
		Password:     string(password),
		Active:       true,
		IsFirstLogin: true,
	}
	if err := s.db.Create(&user).Error; err != nil {
		abort(c, http.StatusBadRequest, err.Error())
		return
	}
	c.JSON(http.StatusCreated, userResponse(user))
}

func (s *Server) setup2FA(c *gin.Context) {
	var user models.User
	if err := s.db.First(&user, "id = ?", userID(c)).Error; err != nil {
		abort(c, http.StatusUnauthorized, "User not found")
		return
	}
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "Rancher Hub",
		AccountName: fmt.Sprintf("RancherHub (%s)", user.Username),
	})
	if err != nil {
		abort(c, http.StatusInternalServerError, "Failed to generate 2FA secret")
		return
	}
	secret := key.Secret()
	s.db.Model(&user).Update("twoFactorSecret", secret)
	img, err := key.Image(256, 256)
	if err != nil {
		abort(c, http.StatusInternalServerError, "Failed to generate QR code")
		return
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		abort(c, http.StatusInternalServerError, "Failed to encode QR code")
		return
	}
	c.JSON(http.StatusOK, gin.H{"secret": secret, "qrCode": "data:image/png;base64," + base64.StdEncoding.EncodeToString(buf.Bytes())})
}

func (s *Server) verify2FA(c *gin.Context) {
	var dto verifyTokenDTO
	if !bind(c, &dto) {
		return
	}
	var user models.User
	if err := s.db.First(&user, "id = ?", userID(c)).Error; err != nil || user.TwoFactorSecret == nil {
		abort(c, http.StatusBadRequest, "2FA not set up")
		return
	}
	ok := validTOTP(dto.Token, *user.TwoFactorSecret)
	if ok {
		s.db.Model(&user).Update("twoFactorEnabled", true)
	}
	c.JSON(http.StatusOK, gin.H{"success": ok, "message": map[bool]string{true: "2FA enabled successfully", false: "Invalid token"}[ok]})
}

func (s *Server) disable2FA(c *gin.Context) {
	var dto tokenDTO
	if !bind(c, &dto) {
		return
	}
	var user models.User
	if err := s.db.First(&user, "id = ?", userID(c)).Error; err != nil {
		abort(c, http.StatusUnauthorized, "User not found")
		return
	}
	if !user.TwoFactorEnabled || user.TwoFactorSecret == nil {
		abort(c, http.StatusBadRequest, "2FA is not enabled for this account")
		return
	}
	if !validTOTP(dto.Token, *user.TwoFactorSecret) {
		abort(c, http.StatusUnauthorized, "Invalid 2FA token. Please enter the correct code from your authenticator app.")
		return
	}
	s.db.Model(&user).Updates(map[string]any{"twoFactorEnabled": false, "twoFactorSecret": nil})
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "2FA disabled successfully"})
}

func (s *Server) changePassword(c *gin.Context) {
	var dto changePasswordDTO
	if !bind(c, &dto) {
		return
	}
	var user models.User
	if err := s.db.First(&user, "id = ?", userID(c)).Error; err != nil {
		abort(c, http.StatusUnauthorized, "User not found")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(dto.CurrentPassword)) != nil {
		abort(c, http.StatusUnauthorized, "Current password is incorrect")
		return
	}
	password, err := bcrypt.GenerateFromPassword([]byte(dto.NewPassword), 12)
	if err != nil {
		abort(c, http.StatusInternalServerError, "Failed to hash password")
		return
	}
	s.db.Model(&user).Update("password", string(password))
	s.db.Where("user_id = ?", user.ID).Delete(&models.TrustedDevice{})
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Password changed successfully"})
}

func (s *Server) profile(c *gin.Context) {
	var user models.User
	if err := s.db.First(&user, "id = ?", userID(c)).Error; err != nil {
		c.JSON(http.StatusOK, nil)
		return
	}
	c.JSON(http.StatusOK, userResponse(user))
}

func (s *Server) createSite(c *gin.Context) {
	var dto siteDTO
	if !bind(c, &dto) {
		return
	}
	safeURL, err := parseSafeBaseURL(dto.URL)
	if err != nil {
		abort(c, http.StatusBadRequest, err.Error())
		return
	}
	site := models.RancherSite{Name: dto.Name, URL: safeURL, Token: dto.Token, Active: true}
	if err := s.db.Create(&site).Error; err != nil {
		abort(c, http.StatusBadRequest, err.Error())
		return
	}
	c.JSON(http.StatusCreated, siteResponse(site))
}

func (s *Server) listSites(c *gin.Context) {
	var rows []models.RancherSite
	s.db.Order("createdAt DESC").Find(&rows)
	c.JSON(http.StatusOK, mapSlice(rows, siteResponse))
}

func (s *Server) activeSite(c *gin.Context) {
	var site models.RancherSite
	if err := s.db.First(&site, "active = ?", true).Error; err != nil {
		c.JSON(http.StatusOK, nil)
		return
	}
	c.JSON(http.StatusOK, siteResponse(site))
}

func (s *Server) getSite(c *gin.Context) {
	var site models.RancherSite
	if !first(c, s.db.First(&site, "id = ?", c.Param("id")), "Site") {
		return
	}
	c.JSON(http.StatusOK, siteResponse(site))
}

func (s *Server) updateSite(c *gin.Context) {
	var dto siteUpdateDTO
	if !bind(c, &dto) {
		return
	}
	var site models.RancherSite
	if !first(c, s.db.First(&site, "id = ?", c.Param("id")), "Site") {
		return
	}
	updates := map[string]any{}
	if dto.Name != nil {
		updates["name"] = *dto.Name
	}
	if dto.URL != nil {
		safeURL, err := parseSafeBaseURL(*dto.URL)
		if err != nil {
			abort(c, http.StatusBadRequest, err.Error())
			return
		}
		updates["url"] = safeURL
	}
	if dto.Token != nil {
		updates["token"] = *dto.Token
	}
	s.db.Model(&site).Updates(updates)
	s.db.First(&site, "id = ?", site.ID)
	c.JSON(http.StatusOK, siteResponse(site))
}

func (s *Server) deleteSite(c *gin.Context) {
	deleteByID[models.RancherSite](c, s.db, "Site")
}

func (s *Server) testRancherConnection(c *gin.Context) {
	var site models.RancherSite
	if !first(c, s.db.First(&site, "id = ?", c.Param("id")), "Site") {
		return
	}

	var payload map[string]any
	err := rancherRequest(site, "/", nil, &payload)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": rancherErrorMessage(err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Connection successful",
		"data": gin.H{
			"rancherVersion": stringFromMap(payload, "rancherVersion", "Unknown"),
			"serverVersion":  stringFromMap(payload, "serverVersion", "Unknown"),
		},
	})
}

func (s *Server) getRancherClusters(c *gin.Context) {
	var site models.RancherSite
	if !first(c, s.db.First(&site, "id = ?", c.Param("id")), "Site") {
		return
	}

	clusters, err := rancherClusters(site)
	if err != nil {
		abort(c, http.StatusBadGateway, err.Error())
		return
	}
	c.JSON(http.StatusOK, clusters)
}

func (s *Server) getRancherNamespaces(c *gin.Context) {
	var site models.RancherSite
	if !first(c, s.db.First(&site, "id = ?", c.Param("id")), "Site") {
		return
	}

	namespaces, err := rancherNamespaces(site, c.Query("clusterId"))
	if err != nil {
		abort(c, http.StatusBadGateway, err.Error())
		return
	}
	c.JSON(http.StatusOK, namespaces)
}

func (s *Server) setSiteActive(active bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var site models.RancherSite
		if !first(c, s.db.First(&site, "id = ?", c.Param("id")), "Site") {
			return
		}
		s.db.Model(&site).Update("active", active)
		site.Active = active
		c.JSON(http.StatusOK, siteResponse(site))
	}
}

func (s *Server) createGenericCluster(c *gin.Context) {
	var dto genericClusterDTO
	if !bind(c, &dto) {
		return
	}
	clusterName, serverURL, err := parseKubeconfigMetadata(dto.Kubeconfig)
	if err != nil {
		abort(c, http.StatusBadRequest, "Invalid kubeconfig: "+err.Error())
		return
	}
	if _, err := genericKubernetesNamespaces(dto.Kubeconfig); err != nil {
		abort(c, http.StatusBadRequest, "Failed to connect to cluster: "+err.Error())
		return
	}
	row := models.GenericClusterSite{Name: dto.Name, Kubeconfig: dto.Kubeconfig, ClusterName: &clusterName, ServerURL: &serverURL, Active: true}
	if err := s.db.Create(&row).Error; err != nil {
		abort(c, http.StatusBadRequest, err.Error())
		return
	}
	c.JSON(http.StatusCreated, genericClusterResponse(row))
}

func (s *Server) listGenericClusters(c *gin.Context) {
	var rows []models.GenericClusterSite
	s.db.Order("createdAt DESC").Find(&rows)
	c.JSON(http.StatusOK, mapSlice(rows, genericClusterResponse))
}

func (s *Server) getGenericCluster(c *gin.Context) {
	var row models.GenericClusterSite
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "Cluster") {
		return
	}
	c.JSON(http.StatusOK, genericClusterResponse(row))
}

func (s *Server) updateGenericCluster(c *gin.Context) {
	var dto genericClusterUpdateDTO
	if !bind(c, &dto) {
		return
	}
	var row models.GenericClusterSite
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "Cluster") {
		return
	}
	updates := map[string]any{}
	if dto.Name != nil {
		updates["name"] = *dto.Name
	}
	if dto.Kubeconfig != nil {
		clusterName, serverURL, err := parseKubeconfigMetadata(*dto.Kubeconfig)
		if err != nil {
			abort(c, http.StatusBadRequest, "Invalid kubeconfig: "+err.Error())
			return
		}
		if _, err := genericKubernetesNamespaces(*dto.Kubeconfig); err != nil {
			abort(c, http.StatusBadRequest, "Failed to connect to cluster: "+err.Error())
			return
		}
		updates["kubeconfig"] = *dto.Kubeconfig
		updates["clusterName"] = clusterName
		updates["serverUrl"] = serverURL
	}
	s.db.Model(&row).Updates(updates)
	s.db.First(&row, "id = ?", row.ID)
	c.JSON(http.StatusOK, genericClusterResponse(row))
}

func (s *Server) deleteGenericCluster(c *gin.Context) {
	var row models.GenericClusterSite
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "Cluster") {
		return
	}
	s.db.Delete(&row)
	c.Status(http.StatusOK)
}

func (s *Server) setGenericClusterActive(c *gin.Context) {
	var dto activeDTO
	if !bind(c, &dto) {
		return
	}
	var row models.GenericClusterSite
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "Cluster") {
		return
	}
	if dto.Active {
		s.db.Model(&models.GenericClusterSite{}).Where("active = ?", true).Update("active", false)
	}
	s.db.Model(&row).Update("active", dto.Active)
	row.Active = dto.Active
	c.JSON(http.StatusOK, genericClusterResponse(row))
}

func (s *Server) testGenericClusterConnection(c *gin.Context) {
	var row models.GenericClusterSite
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "Cluster") {
		return
	}
	_, err := genericKubernetesNamespaces(row.Kubeconfig)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Connection failed: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Connection successful",
		"data": gin.H{
			"serverVersion": "v1",
			"clusterName":   row.ClusterName,
		},
	})
}

func (s *Server) getGenericClusterNamespaces(c *gin.Context) {
	var row models.GenericClusterSite
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "Cluster") {
		return
	}
	namespaces, err := genericKubernetesNamespaces(row.Kubeconfig)
	if err != nil {
		abort(c, http.StatusBadRequest, "Failed to fetch namespaces: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, namespaces)
}

func (s *Server) createEnvironment(c *gin.Context) {
	var dto environmentDTO
	if !bind(c, &dto) {
		return
	}
	color := "#1890ff"
	if dto.Color != nil {
		if !validateEnvironmentColor(c, *dto.Color) {
			return
		}
		color = *dto.Color
	}
	row := models.Environment{Name: dto.Name, Description: dto.Description, Color: color}
	if err := s.db.Create(&row).Error; err != nil {
		abort(c, http.StatusBadRequest, err.Error())
		return
	}
	c.JSON(http.StatusCreated, row)
}

func (s *Server) listEnvironments(c *gin.Context) {
	var rows []models.Environment
	s.db.Preload("AppInstances").Order("createdAt ASC").Find(&rows)
	c.JSON(http.StatusOK, rows)
}

func (s *Server) getEnvironment(c *gin.Context) {
	var row models.Environment
	if !first(c, s.db.Preload("AppInstances").Preload("AppInstances.RancherSite").First(&row, "id = ?", c.Param("id")), "Environment") {
		return
	}
	c.JSON(http.StatusOK, row)
}

func (s *Server) getEnvironmentWithInstances(c *gin.Context) {
	var row models.Environment
	if !first(c, s.db.Preload("AppInstances").Preload("AppInstances.RancherSite").Preload("AppInstances.Services").First(&row, "id = ?", c.Param("id")), "Environment") {
		return
	}
	c.JSON(http.StatusOK, row)
}

func (s *Server) updateEnvironment(c *gin.Context) {
	var dto environmentUpdateDTO
	if !bind(c, &dto) {
		return
	}
	var row models.Environment
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "Environment") {
		return
	}
	updates := map[string]any{}
	if dto.Name != nil {
		updates["name"] = *dto.Name
	}
	if dto.Description != nil {
		updates["description"] = *dto.Description
	}
	if dto.Color != nil {
		if !validateEnvironmentColor(c, *dto.Color) {
			return
		}
		updates["color"] = *dto.Color
	}
	s.db.Model(&row).Updates(updates)
	s.db.First(&row, "id = ?", row.ID)
	c.JSON(http.StatusOK, row)
}

func (s *Server) deleteEnvironment(c *gin.Context) {
	deleteByID[models.Environment](c, s.db, "Environment")
}

func validateEnvironmentColor(c *gin.Context, color string) bool {
	if environmentColorPattern.MatchString(color) {
		return true
	}
	abort(c, http.StatusBadRequest, "Color must be a valid hex color code (e.g., #4CAF50)")
	return false
}

func (s *Server) createAppInstance(c *gin.Context) {
	var dto appInstanceDTO
	if !bind(c, &dto) {
		return
	}
	rancherSiteID, genericClusterSiteID, ok := s.validateAppInstanceCreate(c, dto)
	if !ok {
		return
	}
	row := models.AppInstance{
		Name:                 dto.Name,
		Cluster:              dto.Cluster,
		Namespace:            dto.Namespace,
		ClusterType:          dto.ClusterType,
		RancherSiteID:        rancherSiteID,
		GenericClusterSiteID: genericClusterSiteID,
		EnvironmentID:        dto.EnvironmentID,
	}
	if s.appInstanceDuplicateExists(row, "") {
		abort(c, http.StatusBadRequest, "App instance already exists for this site, cluster, namespace, and environment combination")
		return
	}
	if err := s.db.Create(&row).Error; err != nil {
		abort(c, http.StatusBadRequest, err.Error())
		return
	}
	s.db.Preload("RancherSite").Preload("GenericClusterSite").Preload("Environment").Preload("Services").First(&row, "id = ?", row.ID)
	c.JSON(http.StatusCreated, row)
}

func (s *Server) listAppInstances(c *gin.Context) {
	q := s.db.Preload("RancherSite").Preload("GenericClusterSite").Preload("Environment").Preload("Services").Order("createdAt DESC")
	if env := c.Query("env"); env != "" {
		q = q.Where("environment_id = ?", env)
	}
	var rows []models.AppInstance
	q.Find(&rows)
	c.JSON(http.StatusOK, rows)
}

func (s *Server) appInstancesByEnvironment(c *gin.Context) {
	var rows []models.AppInstance
	s.db.Preload("RancherSite").Preload("GenericClusterSite").Preload("Environment").Preload("Services").
		Where("environment_id = ?", c.Param("environmentId")).Order("createdAt ASC").Find(&rows)
	c.JSON(http.StatusOK, rows)
}

func (s *Server) appInstancesBySite(c *gin.Context) {
	var rows []models.AppInstance
	s.db.Preload("RancherSite").Preload("GenericClusterSite").Preload("Environment").Preload("Services").
		Where("rancher_site_id = ?", c.Param("siteId")).Order("createdAt ASC").Find(&rows)
	c.JSON(http.StatusOK, rows)
}

func (s *Server) getAppInstance(c *gin.Context) {
	var row models.AppInstance
	if !first(c, s.db.Preload("RancherSite").Preload("GenericClusterSite").Preload("Environment").Preload("Services").First(&row, "id = ?", c.Param("id")), "App instance") {
		return
	}
	c.JSON(http.StatusOK, row)
}

func (s *Server) updateAppInstance(c *gin.Context) {
	var dto appInstanceUpdateDTO
	if !bind(c, &dto) {
		return
	}
	var row models.AppInstance
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "App instance") {
		return
	}
	updates, ok := s.validateAppInstanceUpdate(c, row, dto)
	if !ok {
		return
	}
	if dto.Name != nil {
		updates["name"] = *dto.Name
	}
	if dto.Cluster != nil {
		updates["cluster"] = *dto.Cluster
	}
	if dto.Namespace != nil {
		updates["namespace"] = *dto.Namespace
	}
	s.db.Model(&row).Updates(updates)
	s.db.Preload("RancherSite").Preload("GenericClusterSite").Preload("Environment").Preload("Services").First(&row, "id = ?", row.ID)
	c.JSON(http.StatusOK, row)
}

func (s *Server) deleteAppInstance(c *gin.Context) {
	deleteByID[models.AppInstance](c, s.db, "App instance")
}

func (s *Server) validateAppInstanceCreate(c *gin.Context, dto appInstanceDTO) (*string, *string, bool) {
	if !s.recordExists(&models.Environment{}, dto.EnvironmentID) {
		abort(c, http.StatusBadRequest, "Environment not found")
		return nil, nil, false
	}
	switch dto.ClusterType {
	case "rancher":
		if dto.RancherSiteID == nil || strings.TrimSpace(*dto.RancherSiteID) == "" {
			abort(c, http.StatusBadRequest, "Rancher site ID is required for rancher cluster type")
			return nil, nil, false
		}
		if !s.recordExists(&models.RancherSite{}, *dto.RancherSiteID) {
			abort(c, http.StatusBadRequest, "Rancher site not found")
			return nil, nil, false
		}
		return dto.RancherSiteID, nil, true
	case "generic":
		if dto.GenericClusterSiteID == nil || strings.TrimSpace(*dto.GenericClusterSiteID) == "" {
			abort(c, http.StatusBadRequest, "Generic cluster site ID is required for generic cluster type")
			return nil, nil, false
		}
		if !s.recordExists(&models.GenericClusterSite{}, *dto.GenericClusterSiteID) {
			abort(c, http.StatusBadRequest, "Generic cluster site not found")
			return nil, nil, false
		}
		return nil, dto.GenericClusterSiteID, true
	default:
		abort(c, http.StatusBadRequest, "clusterType must be one of rancher, generic")
		return nil, nil, false
	}
}

func (s *Server) validateAppInstanceUpdate(c *gin.Context, row models.AppInstance, dto appInstanceUpdateDTO) (map[string]any, bool) {
	updates := map[string]any{}
	if dto.EnvironmentID != nil {
		if !s.recordExists(&models.Environment{}, *dto.EnvironmentID) {
			abort(c, http.StatusBadRequest, "Environment not found")
			return nil, false
		}
		updates["environment_id"] = *dto.EnvironmentID
	}

	if dto.ClusterType == nil && dto.RancherSiteID == nil && dto.GenericClusterSiteID == nil {
		return updates, true
	}

	clusterType := row.ClusterType
	if dto.ClusterType != nil {
		clusterType = *dto.ClusterType
		updates["cluster_type"] = clusterType
	}

	switch clusterType {
	case "rancher":
		rancherSiteID := row.RancherSiteID
		if dto.RancherSiteID != nil {
			rancherSiteID = dto.RancherSiteID
		}
		if rancherSiteID == nil || strings.TrimSpace(*rancherSiteID) == "" {
			abort(c, http.StatusBadRequest, "Rancher site ID is required for rancher cluster type")
			return nil, false
		}
		if !s.recordExists(&models.RancherSite{}, *rancherSiteID) {
			abort(c, http.StatusBadRequest, "Rancher site not found")
			return nil, false
		}
		updates["rancher_site_id"] = *rancherSiteID
		if dto.ClusterType != nil || dto.GenericClusterSiteID != nil {
			updates["generic_cluster_site_id"] = nil
		}
	case "generic":
		genericSiteID := row.GenericClusterSiteID
		if dto.GenericClusterSiteID != nil {
			genericSiteID = dto.GenericClusterSiteID
		}
		if genericSiteID == nil || strings.TrimSpace(*genericSiteID) == "" {
			abort(c, http.StatusBadRequest, "Generic cluster site ID is required for generic cluster type")
			return nil, false
		}
		if !s.recordExists(&models.GenericClusterSite{}, *genericSiteID) {
			abort(c, http.StatusBadRequest, "Generic cluster site not found")
			return nil, false
		}
		updates["generic_cluster_site_id"] = *genericSiteID
		if dto.ClusterType != nil || dto.RancherSiteID != nil {
			updates["rancher_site_id"] = nil
		}
	default:
		abort(c, http.StatusBadRequest, "clusterType must be one of rancher, generic")
		return nil, false
	}
	return updates, true
}

func (s *Server) appInstanceDuplicateExists(row models.AppInstance, excludeID string) bool {
	q := s.db.Model(&models.AppInstance{}).
		Where("cluster = ? AND namespace = ? AND environment_id = ?", row.Cluster, row.Namespace, row.EnvironmentID)
	if row.ClusterType == "rancher" {
		q = q.Where("rancher_site_id = ?", *row.RancherSiteID)
	} else {
		q = q.Where("generic_cluster_site_id = ?", *row.GenericClusterSiteID)
	}
	if excludeID != "" {
		q = q.Where("id <> ?", excludeID)
	}
	var count int64
	q.Count(&count)
	return count > 0
}

func (s *Server) recordExists(model any, id string) bool {
	var count int64
	s.db.Model(model).Where("id = ?", id).Count(&count)
	return count > 0
}

func (s *Server) createHarborSite(c *gin.Context) {
	var dto harborSiteDTO
	if !bind(c, &dto) {
		return
	}
	active := true
	if dto.Active != nil {
		active = *dto.Active
	}
	row := models.HarborSite{Name: dto.Name, URL: dto.URL, Username: dto.Username, Password: dto.Password, Active: active}
	if err := s.db.Create(&row).Error; err != nil {
		abort(c, http.StatusBadRequest, err.Error())
		return
	}
	c.JSON(http.StatusCreated, harborSiteResponse(row))
}

func (s *Server) listHarborSites(c *gin.Context) {
	var rows []models.HarborSite
	s.db.Order("createdAt DESC").Find(&rows)
	c.JSON(http.StatusOK, mapSlice(rows, harborSiteResponse))
}

func (s *Server) activeHarborSite(c *gin.Context) {
	var row models.HarborSite
	if err := s.db.First(&row, "active = ?", true).Error; err != nil {
		c.JSON(http.StatusOK, nil)
		return
	}
	c.JSON(http.StatusOK, harborSiteResponse(row))
}

func (s *Server) getHarborSite(c *gin.Context) {
	var row models.HarborSite
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "Harbor site") {
		return
	}
	c.JSON(http.StatusOK, harborSiteResponse(row))
}

func (s *Server) updateHarborSite(c *gin.Context) {
	var dto harborSiteUpdateDTO
	if !bind(c, &dto) {
		return
	}
	var row models.HarborSite
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "Harbor site") {
		return
	}
	updates := map[string]any{}
	if dto.Name != nil {
		updates["name"] = *dto.Name
	}
	if dto.URL != nil {
		updates["url"] = *dto.URL
	}
	if dto.Username != nil {
		updates["username"] = *dto.Username
	}
	if dto.Password != nil {
		updates["password"] = *dto.Password
	}
	if dto.Active != nil {
		updates["active"] = *dto.Active
	}
	s.db.Model(&row).Updates(updates)
	s.db.First(&row, "id = ?", row.ID)
	c.JSON(http.StatusOK, harborSiteResponse(row))
}

func (s *Server) deleteHarborSite(c *gin.Context) {
	deleteByID[models.HarborSite](c, s.db, "Harbor site")
}

func (s *Server) testHarborConnection(c *gin.Context) {
	var dto harborConnectionDTO
	if !bind(c, &dto) {
		return
	}
	site := models.HarborSite{ID: dto.URL, Name: dto.URL, URL: dto.URL, Username: dto.Username, Password: dto.Password}
	c.JSON(http.StatusOK, harborConnectionResult(site))
}

func (s *Server) testStoredHarborConnection(c *gin.Context) {
	var row models.HarborSite
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "Harbor site") {
		return
	}
	c.JSON(http.StatusOK, harborConnectionResult(row))
}

func (s *Server) setHarborActive(active bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var row models.HarborSite
		if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "Harbor site") {
			return
		}
		if active {
			s.db.Model(&models.HarborSite{}).Where("active = ?", true).Update("active", false)
		}
		s.db.Model(&row).Update("active", active)
		row.Active = active
		c.JSON(http.StatusOK, harborSiteResponse(row))
	}
}

func (s *Server) getHarborProjects(c *gin.Context) {
	site, ok := s.harborSite(c)
	if !ok {
		return
	}
	var out []map[string]any
	if err := harborRequest(site, "/projects", nil, &out); err != nil {
		abort(c, http.StatusBadGateway, err.Error())
		return
	}
	c.JSON(http.StatusOK, out)
}

func (s *Server) getHarborRepositories(c *gin.Context) {
	site, ok := s.harborSite(c)
	if !ok {
		return
	}
	projectName := pathParam(c, "projectName")
	var out []map[string]any
	if err := harborRequest(site, "/projects/"+url.PathEscape(projectName)+"/repositories", nil, &out); err != nil {
		abort(c, http.StatusBadGateway, err.Error())
		return
	}
	c.JSON(http.StatusOK, out)
}

func (s *Server) getHarborArtifacts(c *gin.Context) {
	site, ok := s.harborSite(c)
	if !ok {
		return
	}
	projectName := pathParam(c, "projectName")
	repositoryName := normalizeHarborRepository(pathParam(c, "repositoryName"), projectName)
	query := url.Values{
		"with_tag":              []string{"true"},
		"with_label":            []string{"false"},
		"with_scan_overview":    []string{"false"},
		"with_signature":        []string{"false"},
		"with_immutable_status": []string{"false"},
		"with_accessory":        []string{"false"},
	}
	var out []map[string]any
	err := harborRequest(site, "/projects/"+url.PathEscape(projectName)+"/repositories/"+encodeHarborRepository(repositoryName)+"/artifacts", query, &out)
	if err != nil {
		abort(c, http.StatusBadGateway, err.Error())
		return
	}
	c.JSON(http.StatusOK, out)
}

func (s *Server) getHarborTagDetail(c *gin.Context) {
	site, ok := s.harborSite(c)
	if !ok {
		return
	}
	projectName := pathParam(c, "projectName")
	repositoryName := normalizeHarborRepository(pathParam(c, "repositoryName"), projectName)
	tag := pathParam(c, "tag")
	artifact, err := harborArtifactByTag(site, projectName, repositoryName, tag)
	if err != nil {
		abort(c, http.StatusBadGateway, err.Error())
		return
	}
	if artifact == nil {
		abort(c, http.StatusNotFound, fmt.Sprintf("Harbor tag not found: %s/%s:%s", projectName, repositoryName, tag))
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"name":              tag,
		"digest":            artifact["digest"],
		"size":              artifact["size"],
		"pushedAt":          artifact["push_time"],
		"pulledAt":          artifact["pull_time"],
		"mediaType":         artifact["media_type"],
		"manifestMediaType": artifact["manifest_media_type"],
		"annotations":       artifact["annotations"],
		"labels":            artifact["labels"],
		"raw":               artifact,
	})
}

func (s *Server) testHarborImageSize(c *gin.Context) {
	site, ok := s.harborSite(c)
	if !ok {
		return
	}
	imageTag := c.Query("imageTag")
	if imageTag == "" {
		c.JSON(http.StatusOK, gin.H{"error": "imageTag query parameter is required"})
		return
	}
	result, err := harborImageSize(site, imageTag)
	if err != nil {
		abort(c, http.StatusBadGateway, err.Error())
		return
	}
	c.JSON(http.StatusOK, result)
}

func (s *Server) harborSite(c *gin.Context) (models.HarborSite, bool) {
	var row models.HarborSite
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "Harbor site") {
		return row, false
	}
	return row, true
}

func (s *Server) listServices(c *gin.Context) {
	var rows []models.Service
	if env := c.Query("env"); env != "" {
		rows = s.servicesForEnvironment(env)
	} else {
		s.db.Model(&models.Service{}).Preload("AppInstance").Order("services.name ASC").Find(&rows)
	}
	rows = filterServices(rows, c.Query("type"), c.Query("search"))
	c.JSON(http.StatusOK, rows)
}

func (s *Server) workloadTypes(c *gin.Context) {
	services := s.servicesForEnvironment(c.Query("env"))
	typeSet := map[string]bool{}
	for _, service := range services {
		if service.WorkloadType != "" {
			typeSet[service.WorkloadType] = true
		}
	}
	types := make([]string, 0, len(typeSet))
	for typ := range typeSet {
		types = append(types, typ)
	}
	sort.Strings(types)
	c.JSON(http.StatusOK, gin.H{"types": types})
}

func (s *Server) servicesByAppInstance(c *gin.Context) {
	rows, ok := s.servicesForAppInstanceParam(c, c.Param("appInstanceId"))
	if !ok {
		return
	}
	rows = filterServices(rows, c.Query("type"), c.Query("search"))
	c.JSON(http.StatusOK, rows)
}

func filterServices(rows []models.Service, workloadType, search string) []models.Service {
	filtered := rows[:0]
	workloadType = strings.ToLower(workloadType)
	search = strings.ToLower(search)
	for _, row := range rows {
		if workloadType != "" && strings.ToLower(row.WorkloadType) != workloadType {
			continue
		}
		if search != "" && !strings.Contains(strings.ToLower(row.Name), search) && !strings.Contains(strings.ToLower(stringPtrValue(row.ImageTag)), search) {
			continue
		}
		filtered = append(filtered, row)
	}
	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].Name < filtered[j].Name
	})
	return filtered
}

func (s *Server) servicesForEnvironment(environmentID string) []models.Service {
	if environmentID == "" {
		return []models.Service{}
	}
	var apps []models.AppInstance
	s.db.Preload("RancherSite").
		Preload("GenericClusterSite").
		Where("environment_id = ?", environmentID).
		Find(&apps)
	services := []models.Service{}
	for _, app := range apps {
		services = append(services, s.refreshServicesForAppInstance(app)...)
	}
	return services
}

func (s *Server) servicesForAppInstanceParam(c *gin.Context, appInstanceID string) ([]models.Service, bool) {
	if !isUUID(appInstanceID) {
		abort(c, http.StatusBadRequest, fmt.Sprintf("Invalid app instance ID format. Expected UUID, got: %s", appInstanceID))
		return nil, false
	}
	var app models.AppInstance
	if !first(c, s.db.Preload("RancherSite").Preload("GenericClusterSite").First(&app, "id = ?", appInstanceID), "App instance") {
		return nil, false
	}
	return s.refreshServicesForAppInstance(app), true
}

func (s *Server) refreshServicesForAppInstance(app models.AppInstance) []models.Service {
	workloads, err := s.workloadsForAppInstance(app)
	if err != nil {
		var cached []models.Service
		s.db.Preload("AppInstance").Where("app_instance_id = ?", app.ID).Find(&cached)
		return cached
	}
	serviceIDs := make([]string, 0, len(workloads))
	for _, workload := range workloads {
		image := workload.Image
		var service models.Service
		err := s.db.Where("name = ? AND app_instance_id = ?", workload.Name, app.ID).First(&service).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			service = models.Service{
				Name:              workload.Name,
				AppInstanceID:     app.ID,
				Status:            workload.State,
				Replicas:          workload.Scale,
				AvailableReplicas: workload.AvailableReplicas,
				ImageTag:          &image,
				WorkloadType:      workload.Type,
			}
			if createErr := s.db.Create(&service).Error; createErr != nil {
				continue
			}
		} else if err == nil {
			s.db.Model(&service).Updates(map[string]any{
				"status":             workload.State,
				"replicas":           workload.Scale,
				"available_replicas": workload.AvailableReplicas,
				"image_tag":          image,
				"workload_type":      workload.Type,
			})
		} else {
			continue
		}
		serviceIDs = append(serviceIDs, service.ID)
	}
	if len(serviceIDs) == 0 {
		return []models.Service{}
	}
	var services []models.Service
	s.db.Preload("AppInstance").Where("id IN ?", serviceIDs).Find(&services)
	return services
}

func (s *Server) servicesWithImageSizes(c *gin.Context) {
	var rows []models.Service
	s.db.Where("app_instance_id = ?", c.Param("appInstanceId")).Order("name ASC").Find(&rows)
	out := make([]gin.H, 0, len(rows))
	for _, row := range rows {
		out = append(out, gin.H{"service": row, "imageSize": nil})
	}
	c.JSON(http.StatusOK, out)
}

func (s *Server) appInstanceTree(c *gin.Context) {
	var envs []models.Environment
	s.db.Preload("AppInstances").Preload("AppInstances.Services").Order("createdAt ASC").Find(&envs)
	c.JSON(http.StatusOK, envs)
}

func (s *Server) testRancherAPIEndpoint(c *gin.Context) {
	var site models.RancherSite
	if !first(c, s.db.First(&site, "id = ?", c.Param("siteId")), "Site") {
		return
	}

	var payload any
	if err := rancherRequest(site, "/", nil, &payload); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "API endpoint test failed: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "API endpoint reachable",
		"data":    gin.H{"responseData": payload},
	})
}

func (s *Server) debugRancherClusters(c *gin.Context) {
	var site models.RancherSite
	if !first(c, s.db.First(&site, "id = ?", c.Param("siteId")), "Site") {
		return
	}
	clusters, err := rancherClusters(site)
	if err != nil {
		abort(c, http.StatusBadGateway, err.Error())
		return
	}
	c.JSON(http.StatusOK, clusters)
}

func (s *Server) createSyncOperation(c *gin.Context) {
	var dto syncServicesDTO
	if !bind(c, &dto) {
		return
	}
	result, err := s.syncServices(dto, username(c))
	if err != nil {
		abort(c, http.StatusBadRequest, err.Error())
		return
	}
	c.JSON(http.StatusOK, result)
}

func (s *Server) syncServices(dto syncServicesDTO, initiatedBy string) (gin.H, error) {
	if initiatedBy == "" {
		initiatedBy = "system"
	}
	now := time.Now()
	op := models.SyncOperation{
		SourceEnvironmentID: dto.SourceEnvironmentID,
		TargetEnvironmentID: dto.TargetEnvironmentID,
		ServiceIDs:          dto.ServiceIDs,
		Status:              "pending",
		StartTime:           now,
		InitiatedBy:         initiatedBy,
	}
	if err := s.db.Create(&op).Error; err != nil {
		return nil, err
	}

	results := []gin.H{}
	hasErrors := false
	for _, serviceID := range dto.ServiceIDs {
		for _, targetAppInstanceID := range dto.TargetAppInstanceIDs {
			result, err := s.syncSingleService(serviceID, targetAppInstanceID, op.ID, initiatedBy)
			if err != nil {
				hasErrors = true
				errMsg := err.Error()
				results = append(results, gin.H{
					"serviceId":           serviceID,
					"targetAppInstanceId": targetAppInstanceID,
					"status":              "failed",
					"error":               errMsg,
				})
				_ = s.recordFailedServiceSync(op.ID, serviceID, targetAppInstanceID, errMsg, initiatedBy)
				continue
			}
			results = append(results, result)
		}
	}

	end := time.Now()
	status := "completed"
	if hasErrors {
		status = "partial"
	}
	op.Status = status
	op.EndTime = &end
	if err := s.db.Save(&op).Error; err != nil {
		op.Status = "failed"
		op.EndTime = &end
		_ = s.db.Save(&op).Error
		return nil, err
	}

	return gin.H{
		"id":        op.ID,
		"status":    op.Status,
		"startTime": op.StartTime,
		"endTime":   op.EndTime,
		"results":   results,
	}, nil
}

func (s *Server) syncSingleService(serviceID, targetAppInstanceID, syncOperationID, initiatedBy string) (gin.H, error) {
	start := time.Now()
	sourceService, err := s.serviceForSync(serviceID)
	if err != nil {
		return nil, fmt.Errorf("Source service not found: %s", serviceID)
	}
	if sourceService.AppInstance == nil {
		return nil, fmt.Errorf("Source service not found: %s", serviceID)
	}
	if sourceService.ImageTag == nil || *sourceService.ImageTag == "" {
		return nil, fmt.Errorf("Source service does not have an image tag: %s", serviceID)
	}

	var targetApp models.AppInstance
	if err := s.db.Preload("RancherSite").Preload("GenericClusterSite").Preload("Environment").First(&targetApp, "id = ?", targetAppInstanceID).Error; err != nil {
		return nil, fmt.Errorf("Target app instance not found: %s", targetAppInstanceID)
	}

	var targetService models.Service
	targetExists := s.db.First(&targetService, "name = ? AND app_instance_id = ?", sourceService.Name, targetAppInstanceID).Error == nil
	previousImageTag := ""
	if targetExists && targetService.ImageTag != nil {
		previousImageTag = *targetService.ImageTag
	}

	normalizedWorkloadType := normalizeWorkloadType(sourceService.WorkloadType)
	if normalizedWorkloadType == "" {
		normalizedWorkloadType = "deployment"
	}
	if err := s.updateWorkloadImage(targetApp, sourceService.Name, normalizedWorkloadType, *sourceService.ImageTag); err != nil {
		return nil, fmt.Errorf("Cluster API update failed: %s", err.Error())
	}

	syncedAt := time.Now()
	if targetExists {
		targetService.ImageTag = sourceService.ImageTag
		targetService.WorkloadType = normalizedWorkloadType
		targetService.Status = "synced"
		targetService.LastSynced = &syncedAt
		if err := s.db.Save(&targetService).Error; err != nil {
			return nil, err
		}
	} else {
		targetService = models.Service{
			Name:              sourceService.Name,
			AppInstanceID:     targetAppInstanceID,
			Status:            "synced",
			Replicas:          sourceService.Replicas,
			AvailableReplicas: 0,
			ImageTag:          sourceService.ImageTag,
			WorkloadType:      normalizedWorkloadType,
			LastSynced:        &syncedAt,
		}
		if err := s.db.Create(&targetService).Error; err != nil {
			return nil, err
		}
	}

	if err := s.recordServiceSyncHistory(syncOperationID, serviceID, sourceService, targetApp, previousImageTag, *sourceService.ImageTag, normalizedWorkloadType, time.Since(start), initiatedBy); err != nil {
		return nil, err
	}
	return gin.H{
		"serviceId":           serviceID,
		"targetAppInstanceId": targetAppInstanceID,
		"previousImageTag":    previousImageTag,
		"newImageTag":         *sourceService.ImageTag,
		"status":              "success",
	}, nil
}

func (s *Server) serviceForSync(serviceID string) (models.Service, error) {
	var service models.Service
	if isUUID(serviceID) {
		err := s.db.Preload("AppInstance").Preload("AppInstance.RancherSite").Preload("AppInstance.GenericClusterSite").Preload("AppInstance.Environment").First(&service, "id = ?", serviceID).Error
		return service, err
	}
	service, _, ok := s.findServiceForImageOperation(serviceID)
	if !ok {
		return service, gorm.ErrRecordNotFound
	}
	if service.AppInstance != nil {
		var app models.AppInstance
		if err := s.db.Preload("RancherSite").Preload("GenericClusterSite").Preload("Environment").First(&app, "id = ?", service.AppInstanceID).Error; err == nil {
			service.AppInstance = &app
		}
	}
	return service, nil
}

func (s *Server) recordServiceSyncHistory(operationID, serviceID string, sourceService models.Service, targetApp models.AppInstance, previousImageTag, newImageTag, workloadType string, duration time.Duration, initiatedBy string) error {
	configChanges, _ := json.Marshal(gin.H{"imageTag": gin.H{"from": previousImageTag, "to": newImageTag}})
	durationMS := int(duration.Milliseconds())
	history := models.SyncHistory{
		SyncOperationID:       operationID,
		ServiceID:             serviceID,
		ServiceName:           strPtr(sourceService.Name),
		WorkloadType:          strPtr(workloadType),
		SourceAppInstanceID:   sourceService.AppInstanceID,
		SourceEnvironmentName: envNamePtr(sourceService.AppInstance),
		SourceCluster:         appClusterPtr(sourceService.AppInstance),
		SourceNamespace:       appNamespacePtr(sourceService.AppInstance),
		TargetAppInstanceID:   targetApp.ID,
		TargetEnvironmentName: envName(targetApp),
		TargetCluster:         nullableString(targetApp.Cluster),
		TargetNamespace:       nullableString(targetApp.Namespace),
		PreviousImageTag:      strPtr(previousImageTag),
		NewImageTag:           strPtr(newImageTag),
		ContainerName:         strPtr(sourceService.Name),
		ConfigChanges:         strPtr(string(configChanges)),
		Status:                "success",
		DurationMS:            &durationMS,
		InitiatedBy:           &initiatedBy,
		Timestamp:             time.Now(),
	}
	return s.db.Create(&history).Error
}

func (s *Server) recordFailedServiceSync(operationID, serviceID, targetAppInstanceID, errMsg, initiatedBy string) error {
	history := models.SyncHistory{
		SyncOperationID:     operationID,
		ServiceID:           serviceID,
		SourceAppInstanceID: "",
		TargetAppInstanceID: targetAppInstanceID,
		PreviousImageTag:    strPtr(""),
		NewImageTag:         strPtr(""),
		Status:              "failed",
		Error:               &errMsg,
		InitiatedBy:         &initiatedBy,
		Timestamp:           time.Now(),
	}
	return s.db.Create(&history).Error
}

func envNamePtr(app *models.AppInstance) *string {
	if app == nil {
		return nil
	}
	return envName(*app)
}

func appClusterPtr(app *models.AppInstance) *string {
	if app == nil {
		return nil
	}
	return nullableString(app.Cluster)
}

func appNamespacePtr(app *models.AppInstance) *string {
	if app == nil {
		return nil
	}
	return nullableString(app.Namespace)
}

func (s *Server) getConfigMapsByAppInstance(c *gin.Context) {
	configMaps, err := s.configMapsByAppInstance(c.Param("appInstanceId"))
	if err != nil {
		abortResourceError(c, err)
		return
	}
	c.JSON(http.StatusOK, configMaps)
}

func (s *Server) compareConfigMapsByInstance(c *gin.Context) {
	sourceID := c.Query("source")
	targetID := c.Query("target")
	source, err := s.configMapsByAppInstance(sourceID)
	if err != nil {
		abortResourceError(c, err)
		return
	}
	target, err := s.configMapsByAppInstance(targetID)
	if err != nil {
		abortResourceError(c, err)
		return
	}
	c.JSON(http.StatusOK, compareConfigMaps(sourceID, targetID, source, target))
}

func (s *Server) getConfigMapDetails(c *gin.Context) {
	sourceID := c.Query("source")
	targetID := c.Query("target")
	name := c.Param("configMapName")
	source, err := s.configMapsByAppInstance(sourceID)
	if err != nil {
		abortResourceError(c, err)
		return
	}
	target, err := s.configMapsByAppInstance(targetID)
	if err != nil {
		abortResourceError(c, err)
		return
	}
	details, ok := configMapDetails(name, sourceID, targetID, source, target)
	if !ok {
		abort(c, http.StatusNotFound, fmt.Sprintf("ConfigMap '%s' not found in either app instance", name))
		return
	}
	c.JSON(http.StatusOK, details)
}

func (s *Server) syncConfigMapKey(c *gin.Context) {
	var dto syncConfigMapKeyDTO
	if !bind(c, &dto) {
		return
	}
	if !validateKubernetesResourceName(c, "configMapName", dto.ConfigMapName) {
		return
	}
	result, err := s.syncConfigMap(dto.SourceAppInstanceID, dto.TargetAppInstanceID, dto.ConfigMapName, map[string]string{dto.Key: dto.Value}, username(c))
	if err != nil {
		abortResourceError(c, err)
		return
	}
	result["syncedKey"] = dto.Key
	result["syncedValue"] = dto.Value
	result["message"] = fmt.Sprintf("Successfully synced key '%s' in ConfigMap '%s'", dto.Key, dto.ConfigMapName)
	c.JSON(http.StatusOK, result)
}

func (s *Server) syncConfigMapKeys(c *gin.Context) {
	var dto syncConfigMapKeysDTO
	if !bind(c, &dto) {
		return
	}
	if !validateKubernetesResourceName(c, "configMapName", dto.ConfigMapName) {
		return
	}
	result, err := s.syncConfigMap(dto.SourceAppInstanceID, dto.TargetAppInstanceID, dto.ConfigMapName, dto.Keys, username(c))
	if err != nil {
		abortResourceError(c, err)
		return
	}
	keys := sortedMapKeys(dto.Keys)
	result["syncedKeys"] = keys
	result["syncedCount"] = len(keys)
	result["message"] = fmt.Sprintf("Successfully synced %d keys in ConfigMap '%s'", len(keys), dto.ConfigMapName)
	c.JSON(http.StatusOK, result)
}

func (s *Server) getSecretsByAppInstance(c *gin.Context) {
	secrets, err := s.secretsByAppInstance(c.Param("appInstanceId"))
	if err != nil {
		abortResourceError(c, err)
		return
	}
	c.JSON(http.StatusOK, secrets)
}

func (s *Server) compareSecretsByInstance(c *gin.Context) {
	sourceID := c.Query("source")
	targetID := c.Query("target")
	source, err := s.secretsByAppInstance(sourceID)
	if err != nil {
		abortResourceError(c, err)
		return
	}
	target, err := s.secretsByAppInstance(targetID)
	if err != nil {
		abortResourceError(c, err)
		return
	}
	c.JSON(http.StatusOK, compareSecrets(sourceID, targetID, source, target))
}

func (s *Server) getSecretDetails(c *gin.Context) {
	sourceID := c.Query("source")
	targetID := c.Query("target")
	name := c.Param("secretName")
	source, err := s.secretsByAppInstance(sourceID)
	if err != nil {
		abortResourceError(c, err)
		return
	}
	target, err := s.secretsByAppInstance(targetID)
	if err != nil {
		abortResourceError(c, err)
		return
	}
	details, ok := secretDetails(name, sourceID, targetID, source, target)
	if !ok {
		abort(c, http.StatusNotFound, fmt.Sprintf("Secret %s not found in either instance", name))
		return
	}
	c.JSON(http.StatusOK, details)
}

func (s *Server) syncSecretKey(c *gin.Context) {
	var dto syncSecretKeyDTO
	if !bind(c, &dto) {
		return
	}
	if !validateKubernetesResourceName(c, "secretName", dto.SecretName) {
		return
	}
	result, err := s.syncSecret(dto.SourceAppInstanceID, dto.TargetAppInstanceID, dto.SecretName, map[string]string{dto.Key: dto.Value}, username(c))
	if err != nil {
		abortResourceError(c, err)
		return
	}
	result["message"] = "Secret key synced successfully"
	c.JSON(http.StatusOK, result)
}

func (s *Server) syncSecretKeys(c *gin.Context) {
	var dto syncSecretKeysDTO
	if !bind(c, &dto) {
		return
	}
	if !validateKubernetesResourceName(c, "secretName", dto.SecretName) {
		return
	}
	result, err := s.syncSecret(dto.SourceAppInstanceID, dto.TargetAppInstanceID, dto.SecretName, dto.Keys, username(c))
	if err != nil {
		abortResourceError(c, err)
		return
	}
	result["message"] = "Secret keys synced successfully"
	c.JSON(http.StatusOK, result)
}

func (s *Server) debugImageInfo(c *gin.Context) {
	service, _, ok := s.findServiceForImageOperation(c.Param("serviceId"))
	if !ok {
		c.JSON(http.StatusOK, gin.H{"error": "Service not found"})
		return
	}
	imageTag := ""
	if service.ImageTag != nil {
		imageTag = *service.ImageTag
	}
	firstPart := ""
	parts := []string{}
	if imageTag != "" {
		parts = strings.Split(imageTag, "/")
		firstPart = parts[0]
	}
	c.JSON(http.StatusOK, gin.H{
		"service": gin.H{"id": service.ID, "name": service.Name, "imageTag": service.ImageTag},
		"analysis": gin.H{
			"isHarborImage": strings.Contains(imageTag, ".") && strings.Contains(imageTag, "/"),
			"firstPart":     firstPart,
			"hasPort":       strings.Contains(firstPart, ":"),
			"hasDot":        strings.Contains(firstPart, "."),
			"parts":         parts,
		},
	})
}

func (s *Server) getImageTags(c *gin.Context) {
	service, _, ok := s.findServiceForImageOperation(c.Param("serviceId"))
	if !ok {
		abort(c, http.StatusNotFound, fmt.Sprintf("Service with ID %s not found", c.Param("serviceId")))
		return
	}
	if service.ImageTag == nil || *service.ImageTag == "" {
		abort(c, http.StatusBadRequest, fmt.Sprintf("Service %s does not have an image tag", service.Name))
		return
	}
	tags, err := s.imageTagsForImage(*service.ImageTag)
	if err != nil {
		abort(c, http.StatusBadRequest, "Failed to fetch image tags: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, tags)
}

func (s *Server) updateServiceImage(c *gin.Context) {
	var dto updateServiceImageDTO
	if !bind(c, &dto) {
		return
	}
	service, isPersisted, ok := s.findServiceForImageOperation(c.Param("serviceId"))
	if !ok {
		abort(c, http.StatusNotFound, fmt.Sprintf("Service with ID %s not found", c.Param("serviceId")))
		return
	}
	if service.AppInstance == nil {
		abort(c, http.StatusBadRequest, fmt.Sprintf("Service %s does not have an associated app instance", service.Name))
		return
	}
	if service.ImageTag == nil || *service.ImageTag == "" {
		abort(c, http.StatusBadRequest, fmt.Sprintf("Service %s does not have an image tag", service.Name))
		return
	}
	imageName := imageNameWithoutTag(*service.ImageTag)
	newImageTag := imageName + ":" + dto.Tag
	if err := s.updateWorkloadImage(*service.AppInstance, service.Name, service.WorkloadType, newImageTag); err != nil {
		abort(c, http.StatusBadRequest, "Failed to update deployment image: "+err.Error())
		return
	}
	oldTag := imageTagOnly(*service.ImageTag)
	if isPersisted {
		s.db.Model(&models.Service{}).Where("id = ?", service.ID).Updates(map[string]any{"image_tag": newImageTag, "status": "updating"})
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Successfully updated %s to %s", service.Name, dto.Tag),
		"service": gin.H{
			"id":              service.ID,
			"name":            service.Name,
			"oldImageTag":     oldTag,
			"newImageTag":     dto.Tag,
			"fullNewImageTag": newImageTag,
		},
		"rancherResponse": gin.H{"updated": true},
	})
}

func (s *Server) syncHistory(c *gin.Context) {
	q := s.db.Order("createdAt DESC")
	if env := c.Query("env"); env != "" {
		q = q.Where("source_environment_id = ? OR target_environment_id = ?", env, env)
	}
	var rows []models.SyncOperation
	q.Find(&rows)
	c.JSON(http.StatusOK, rows)
}

func (s *Server) compareServices(c *gin.Context) {
	source := c.Query("source")
	target := c.Query("target")
	c.JSON(http.StatusOK, s.compareServiceSets("environment", source, target, "sourceEnvironmentId", "targetEnvironmentId"))
}

func (s *Server) compareServicesByInstance(c *gin.Context) {
	source := c.Query("source")
	target := c.Query("target")
	sourceServices, ok := s.servicesForAppInstanceParam(c, source)
	if !ok {
		return
	}
	targetServices, ok := s.servicesForAppInstanceParam(c, target)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, serviceComparisonResponse(sourceServices, targetServices, source, target, "sourceAppInstanceId", "targetAppInstanceId", "appInstanceId"))
}

func (s *Server) debugAppInstances(c *gin.Context) {
	var rows []models.AppInstance
	s.db.Preload("RancherSite").Preload("GenericClusterSite").Where("environment_id = ?", c.Param("environmentId")).Find(&rows)
	c.JSON(http.StatusOK, rows)
}

func (s *Server) getMonitoringConfig(c *gin.Context) {
	var row models.MonitoringConfig
	if err := s.db.Order("createdAt DESC").First(&row).Error; err != nil {
		c.JSON(http.StatusOK, nil)
		return
	}
	c.JSON(http.StatusOK, monitoringConfigResponse(row))
}

func (s *Server) upsertMonitoringConfig(c *gin.Context) {
	var dto monitoringConfigDTO
	if !bind(c, &dto) {
		return
	}
	var row models.MonitoringConfig
	err := s.db.Order("createdAt DESC").First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		row = models.MonitoringConfig{MonitoringEnabled: true, AlertThreshold: 3, NotificationSchedule: "daily"}
	}
	applyMonitoringConfig(&row, dto)
	if err := s.db.Save(&row).Error; err != nil {
		abort(c, http.StatusBadRequest, err.Error())
		return
	}
	c.JSON(http.StatusCreated, monitoringConfigResponse(row))
}

func (s *Server) updateMonitoringConfig(c *gin.Context) {
	var dto monitoringConfigDTO
	if !bind(c, &dto) {
		return
	}
	var row models.MonitoringConfig
	if !first(c, s.db.Order("createdAt DESC").First(&row), "Monitoring configuration") {
		return
	}
	applyMonitoringConfig(&row, dto)
	s.db.Save(&row)
	c.JSON(http.StatusOK, monitoringConfigResponse(row))
}

func (s *Server) testTelegramConnection(c *gin.Context) {
	var dto telegramTestDTO
	if !bind(c, &dto) {
		return
	}
	config, _ := s.latestMonitoringConfig()
	token := firstNonEmpty(trimPtr(dto.TelegramBotToken), ptrString(config.TelegramBotToken))
	chatID := firstNonEmpty(trimPtr(dto.TelegramChatID), ptrString(config.TelegramChatID))
	proxyCfg := telegramRequestConfig{
		ProxyHost:     firstNonEmpty(trimPtr(dto.ProxyHost), ptrString(config.ProxyHost)),
		ProxyPort:     firstNonNilInt(dto.ProxyPort, config.ProxyPort),
		ProxyUsername: firstNonEmpty(trimPtr(dto.ProxyUsername), ptrString(config.ProxyUsername)),
		ProxyPassword: firstNonEmpty(trimPtr(dto.ProxyPassword), ptrString(config.ProxyPassword)),
	}
	if token == "" || chatID == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "Telegram bot token and chat ID are required. Configure monitoring settings first."})
		return
	}
	message := s.renderTemplateByType("test_connection", map[string]any{
		"timestamp":    time.Now().Format(time.RFC3339Nano),
		"tagged_users": formatTaggedUsers(firstNonNilStringSlice(dto.TaggedUsers, config.TaggedUsers)),
	})
	if err := sendTelegramMessageWithConfig(token, chatID, message, proxyCfg); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Telegram connection test successful"})
}

func (s *Server) listMonitoredInstances(c *gin.Context) {
	var rows []models.MonitoredInstance
	s.db.Preload("AppInstance").Preload("AppInstance.Environment").Order("createdAt DESC").Find(&rows)
	c.JSON(http.StatusOK, rows)
}

func (s *Server) getMonitoredInstance(c *gin.Context) {
	var row models.MonitoredInstance
	if !first(c, s.db.Preload("AppInstance").Preload("AppInstance.Environment").First(&row, "id = ?", c.Param("id")), "Monitored instance") {
		return
	}
	c.JSON(http.StatusOK, row)
}

func (s *Server) createMonitoredInstance(c *gin.Context) {
	var dto monitoredInstanceDTO
	if !bind(c, &dto) {
		return
	}
	var app models.AppInstance
	if !first(c, s.db.First(&app, "id = ?", dto.AppInstanceID), "App instance") {
		return
	}
	var existing models.MonitoredInstance
	if err := s.db.First(&existing, "app_instance_id = ?", dto.AppInstanceID).Error; err == nil {
		abort(c, http.StatusBadRequest, "App instance is already being monitored")
		return
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		abort(c, http.StatusInternalServerError, err.Error())
		return
	}
	row := models.MonitoredInstance{AppInstanceID: dto.AppInstanceID, MonitoringEnabled: true, CheckIntervalMinutes: 60}
	if dto.MonitoringEnabled != nil {
		row.MonitoringEnabled = *dto.MonitoringEnabled
	}
	if dto.CheckIntervalMinutes != nil {
		row.CheckIntervalMinutes = *dto.CheckIntervalMinutes
	}
	if err := s.db.Create(&row).Error; err != nil {
		abort(c, http.StatusBadRequest, err.Error())
		return
	}
	s.db.Preload("AppInstance").Preload("AppInstance.Environment").First(&row, "id = ?", row.ID)
	c.JSON(http.StatusCreated, row)
}

func (s *Server) updateMonitoredInstance(c *gin.Context) {
	var dto monitoredInstanceUpdateDTO
	if !bind(c, &dto) {
		return
	}
	var row models.MonitoredInstance
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "Monitored instance") {
		return
	}
	updates := map[string]any{}
	if dto.AppInstanceID != nil {
		var app models.AppInstance
		if !first(c, s.db.First(&app, "id = ?", *dto.AppInstanceID), "App instance") {
			return
		}
		updates["app_instance_id"] = *dto.AppInstanceID
	}
	if dto.MonitoringEnabled != nil {
		updates["monitoring_enabled"] = *dto.MonitoringEnabled
	}
	if dto.CheckIntervalMinutes != nil {
		updates["check_interval_minutes"] = *dto.CheckIntervalMinutes
	}
	s.db.Model(&row).Updates(updates)
	s.db.Preload("AppInstance").Preload("AppInstance.Environment").First(&row, "id = ?", row.ID)
	c.JSON(http.StatusOK, row)
}

func (s *Server) deleteMonitoredInstance(c *gin.Context) {
	deleteByID[models.MonitoredInstance](c, s.db, "Monitored instance")
}

func (s *Server) monitoringHistory(c *gin.Context) {
	q := s.db.Order("check_time DESC").Limit(1000)
	if instanceID := c.Query("instanceId"); instanceID != "" {
		q = q.Where("monitored_instance_id = ?", instanceID)
	}
	days, _ := strconv.Atoi(defaultString(c.Query("days"), "7"))
	q = q.Where("check_time >= ?", time.Now().AddDate(0, 0, -days))
	var rows []models.MonitoringHistory
	q.Find(&rows)
	c.JSON(http.StatusOK, rows)
}

func (s *Server) alertHistory(c *gin.Context) {
	q := s.db.Order("createdAt DESC").Limit(100)
	if instanceID := c.Query("instanceId"); instanceID != "" {
		q = q.Where("monitored_instance_id = ?", instanceID)
	}
	if resolved := c.Query("resolved"); resolved != "" {
		q = q.Where("resolved = ?", resolved == "true")
	}
	var rows []models.AlertHistory
	q.Find(&rows)
	c.JSON(http.StatusOK, rows)
}

func (s *Server) resolveAlert(c *gin.Context) {
	var row models.AlertHistory
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "Alert") {
		return
	}
	now := time.Now()
	s.db.Model(&row).Updates(map[string]any{"resolved": true, "resolved_at": now})
	row.Resolved = true
	row.ResolvedAt = &now
	c.JSON(http.StatusOK, row)
}

func (s *Server) triggerDailyCheck(c *gin.Context) {
	if err := s.runDailyHealthCheck(); err != nil {
		abort(c, http.StatusBadRequest, err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Daily health check triggered successfully"})
}

func (s *Server) triggerHourlyCheck(c *gin.Context) {
	if err := s.runHourlyHealthCheck(); err != nil {
		abort(c, http.StatusBadRequest, err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Hourly health check triggered successfully"})
}

func (s *Server) createUser(c *gin.Context) {
	var dto createUserDTO
	if !bind(c, &dto) {
		return
	}
	if !s.verifyAdminToken(userID(c), dto.AdminTwoFactorToken) {
		abort(c, http.StatusUnauthorized, "Invalid 2FA token")
		return
	}
	if s.userExistsWithUsernameOrEmail("", dto.Username, dto.Email) {
		abort(c, http.StatusBadRequest, "User with this username or email already exists")
		return
	}
	password, err := bcrypt.GenerateFromPassword([]byte(dto.Password), 12)
	if err != nil {
		abort(c, http.StatusInternalServerError, "Failed to hash password")
		return
	}
	row := models.User{Username: dto.Username, Email: dto.Email, Password: string(password), Active: true, IsFirstLogin: true}
	if err := s.db.Create(&row).Error; err != nil {
		abort(c, http.StatusBadRequest, err.Error())
		return
	}
	c.JSON(http.StatusCreated, userResponse(row))
}

func (s *Server) listUsers(c *gin.Context) {
	page, _ := strconv.Atoi(defaultString(c.Query("page"), "1"))
	limit, _ := strconv.Atoi(defaultString(c.Query("limit"), "10"))
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	q := s.db.Model(&models.User{})
	if search := c.Query("search"); search != "" {
		q = q.Where("LOWER(username) LIKE ? OR LOWER(email) LIKE ?", "%"+strings.ToLower(search)+"%", "%"+strings.ToLower(search)+"%")
	}
	if active := c.Query("active"); active != "" {
		q = q.Where("active = ?", active == "true")
	}
	var total int64
	q.Count(&total)
	var rows []models.User
	q.Order("createdAt DESC").Offset((page - 1) * limit).Limit(limit).Find(&rows)
	c.JSON(http.StatusOK, gin.H{"data": mapSlice(rows, userResponse), "total": total, "page": page, "limit": limit})
}

func (s *Server) userStats(c *gin.Context) {
	var total, active, inactive, with2FA int64
	s.db.Model(&models.User{}).Count(&total)
	s.db.Model(&models.User{}).Where("active = ?", true).Count(&active)
	s.db.Model(&models.User{}).Where("active = ?", false).Count(&inactive)
	s.db.Model(&models.User{}).Where("twoFactorEnabled = ?", true).Count(&with2FA)
	c.JSON(http.StatusOK, gin.H{"total": total, "active": active, "inactive": inactive, "with2FA": with2FA})
}

func (s *Server) getUser(c *gin.Context) {
	var row models.User
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "User") {
		return
	}
	c.JSON(http.StatusOK, userResponse(row))
}

func (s *Server) updateUser(c *gin.Context) {
	var dto updateUserDTO
	if !bind(c, &dto) {
		return
	}
	if !s.verifyAdminToken(userID(c), dto.AdminTwoFactorToken) {
		abort(c, http.StatusUnauthorized, "Invalid 2FA token")
		return
	}
	var row models.User
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "User") {
		return
	}
	username := ""
	if dto.Username != nil {
		username = *dto.Username
	}
	email := ""
	if dto.Email != nil {
		email = *dto.Email
	}
	if (username != "" || email != "") && s.userExistsWithUsernameOrEmail(row.ID, username, email) {
		abort(c, http.StatusBadRequest, "Username or email already exists")
		return
	}
	updates := map[string]any{}
	if dto.Username != nil {
		updates["username"] = *dto.Username
	}
	if dto.Email != nil {
		updates["email"] = *dto.Email
	}
	if dto.Password != nil {
		password, err := bcrypt.GenerateFromPassword([]byte(*dto.Password), 12)
		if err != nil {
			abort(c, http.StatusInternalServerError, "Failed to hash password")
			return
		}
		updates["password"] = string(password)
	}
	if dto.Active != nil {
		updates["active"] = *dto.Active
	}
	if err := s.db.Model(&row).Updates(updates).Error; err != nil {
		abort(c, http.StatusBadRequest, err.Error())
		return
	}
	s.db.First(&row, "id = ?", row.ID)
	c.JSON(http.StatusOK, userResponse(row))
}

func (s *Server) userExistsWithUsernameOrEmail(excludeID, username, email string) bool {
	query := s.db.Model(&models.User{})
	if excludeID != "" {
		query = query.Where("id <> ?", excludeID)
	}
	switch {
	case username != "" && email != "":
		query = query.Where("username = ? OR email = ?", username, email)
	case username != "":
		query = query.Where("username = ?", username)
	case email != "":
		query = query.Where("email = ?", email)
	default:
		return false
	}
	var count int64
	query.Count(&count)
	return count > 0
}

func (s *Server) deleteUser(c *gin.Context) {
	var dto deleteUserDTO
	if !bind(c, &dto) {
		return
	}
	if c.Param("id") == userID(c) {
		abort(c, http.StatusBadRequest, "Cannot delete own account")
		return
	}
	if !s.verifyAdminToken(userID(c), dto.AdminTwoFactorToken) {
		abort(c, http.StatusUnauthorized, "Invalid 2FA token")
		return
	}
	var row models.User
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "User") {
		return
	}
	s.db.Delete(&row)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "User deleted successfully"})
}

func (s *Server) listMessageTemplates(c *gin.Context) {
	var rows []models.MessageTemplate
	s.db.Order("template_type ASC").Find(&rows)
	c.JSON(http.StatusOK, rows)
}

func (s *Server) getMessageTemplate(c *gin.Context) {
	var row models.MessageTemplate
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "Message template") {
		return
	}
	c.JSON(http.StatusOK, row)
}

func (s *Server) getMessageTemplateByType(c *gin.Context) {
	var row models.MessageTemplate
	if !first(c, s.db.First(&row, "template_type = ? AND is_active = ?", c.Param("type"), true), "Message template") {
		return
	}
	c.JSON(http.StatusOK, row)
}

func (s *Server) createMessageTemplate(c *gin.Context) {
	var dto messageTemplateDTO
	if !bind(c, &dto) {
		return
	}
	var existing models.MessageTemplate
	if err := s.db.First(&existing, "template_type = ?", dto.TemplateType).Error; err == nil {
		abort(c, http.StatusConflict, fmt.Sprintf("Template with type '%s' already exists", dto.TemplateType))
		return
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		abort(c, http.StatusInternalServerError, err.Error())
		return
	}
	row := models.MessageTemplate{
		TemplateType:       dto.TemplateType,
		TemplateName:       dto.TemplateName,
		MessageTemplate:    dto.MessageTemplate,
		Description:        dto.Description,
		AvailableVariables: availableTemplateVariables(dto.TemplateType),
		IsDefault:          false,
		IsActive:           true,
	}
	if err := s.db.Create(&row).Error; err != nil {
		abort(c, http.StatusBadRequest, err.Error())
		return
	}
	c.JSON(http.StatusCreated, row)
}

func (s *Server) updateMessageTemplate(c *gin.Context) {
	var dto messageTemplateUpdateDTO
	if !bind(c, &dto) {
		return
	}
	var row models.MessageTemplate
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "Message template") {
		return
	}
	updates := map[string]any{}
	if dto.TemplateName != nil {
		updates["template_name"] = *dto.TemplateName
	}
	if dto.MessageTemplate != nil {
		updates["message_template"] = *dto.MessageTemplate
	}
	if dto.Description != nil {
		updates["description"] = *dto.Description
	}
	if dto.IsActive != nil {
		updates["is_active"] = *dto.IsActive
	}
	s.db.Model(&row).Updates(updates)
	s.db.First(&row, "id = ?", row.ID)
	c.JSON(http.StatusOK, row)
}

func (s *Server) deleteMessageTemplate(c *gin.Context) {
	var row models.MessageTemplate
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "Message template") {
		return
	}
	if row.IsDefault {
		abort(c, http.StatusBadRequest, "Cannot delete default system template. Use restore instead.")
		return
	}
	s.db.Delete(&row)
	c.Status(http.StatusNoContent)
}

func (s *Server) restoreMessageTemplate(c *gin.Context) {
	var row models.MessageTemplate
	if !first(c, s.db.First(&row, "id = ?", c.Param("id")), "Message template") {
		return
	}
	defaultTemplate, ok := defaultMessageTemplate(row.TemplateType)
	if !ok {
		abort(c, http.StatusBadRequest, fmt.Sprintf("No default template for type '%s'", row.TemplateType))
		return
	}
	row.TemplateName = defaultTemplate.TemplateName
	row.MessageTemplate = defaultTemplate.MessageTemplate
	row.Description = defaultTemplate.Description
	row.IsActive = true
	if err := s.db.Save(&row).Error; err != nil {
		abort(c, http.StatusBadRequest, err.Error())
		return
	}
	c.JSON(http.StatusOK, row)
}

func (s *Server) previewMessageTemplate(c *gin.Context) {
	var dto previewTemplateDTO
	if !bind(c, &dto) {
		return
	}
	sample := dto.SampleData
	if sample == nil {
		sample = defaultTemplateSample(dto.TemplateType)
	}
	rendered := dto.MessageTemplate
	for key, value := range sample {
		rendered = strings.ReplaceAll(rendered, "{{"+key+"}}", fmt.Sprint(value))
	}
	rendered = templatePlaceholderPattern.ReplaceAllString(rendered, "")
	rendered = strings.TrimSpace(rendered)
	response := gin.H{"renderedMessage": rendered}
	if dto.SampleData != nil {
		response["sampleData"] = dto.SampleData
	}
	c.JSON(http.StatusOK, response)
}

func (s *Server) listTrustedDevices(c *gin.Context) {
	var rows []models.TrustedDevice
	s.db.Where("user_id = ?", userID(c)).Order("createdAt DESC").Find(&rows)
	out := make([]gin.H, 0, len(rows))
	for _, row := range rows {
		out = append(out, gin.H{
			"id":              row.ID,
			"deviceName":      row.DeviceName,
			"ipAddress":       row.IPAddress,
			"lastUsedAt":      row.LastUsedAt,
			"expiresAt":       row.ExpiresAt,
			"createdAt":       row.CreatedAt,
			"isCurrentDevice": false,
		})
	}
	c.JSON(http.StatusOK, out)
}

func (s *Server) revokeTrustedDevice(c *gin.Context) {
	result := s.db.Where("id = ? AND user_id = ?", c.Param("id"), userID(c)).Delete(&models.TrustedDevice{})
	if result.RowsAffected == 0 {
		abort(c, http.StatusNotFound, "Device not found")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (s *Server) revokeAllTrustedDevices(c *gin.Context) {
	result := s.db.Where("user_id = ?", userID(c)).Delete(&models.TrustedDevice{})
	c.JSON(http.StatusOK, gin.H{"success": true, "count": result.RowsAffected})
}

func (s *Server) signJWT(user models.User, temp bool, ttl time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"sub":      user.ID,
		"username": user.Username,
		"exp":      time.Now().Add(ttl).Unix(),
	}
	if temp {
		claims["temp"] = true
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.cfg.JWTSecret))
}

func (s *Server) isDeviceTrusted(userID string, fingerprint string) bool {
	var device models.TrustedDevice
	if err := s.db.First(&device, "user_id = ? AND device_fingerprint = ?", userID, fingerprint).Error; err != nil {
		return false
	}
	if time.Now().After(device.ExpiresAt) {
		s.db.Delete(&device)
		return false
	}
	return true
}

func (s *Server) trustDevice(userID, fingerprint, name string, userAgent *string, ip *string) {
	now := time.Now()
	var existing models.TrustedDevice
	if err := s.db.First(&existing, "user_id = ? AND device_fingerprint = ?", userID, fingerprint).Error; err == nil {
		s.db.Model(&existing).Updates(map[string]any{
			"device_name":  name,
			"ip_address":   ip,
			"user_agent":   userAgent,
			"last_used_at": now,
			"expires_at":   now.Add(30 * 24 * time.Hour),
		})
		return
	}
	s.enforceTrustedDeviceLimit(userID)
	device := models.TrustedDevice{
		UserID:            userID,
		DeviceFingerprint: fingerprint,
		DeviceName:        name,
		IPAddress:         ip,
		UserAgent:         userAgent,
		LastUsedAt:        now,
		ExpiresAt:         now.Add(30 * 24 * time.Hour),
	}
	s.db.Where(models.TrustedDevice{UserID: userID, DeviceFingerprint: fingerprint}).Assign(device).FirstOrCreate(&device)
}

func (s *Server) enforceTrustedDeviceLimit(userID string) {
	var devices []models.TrustedDevice
	s.db.Where("user_id = ?", userID).Order("createdAt ASC").Find(&devices)
	if len(devices) < 3 {
		return
	}
	for _, device := range devices[:len(devices)-2] {
		s.db.Delete(&device)
	}
}

func (s *Server) cleanupExpiredTrustedDevices() error {
	return s.db.Where("expires_at < ?", time.Now()).Delete(&models.TrustedDevice{}).Error
}

func (s *Server) verifyAdminToken(userID, token string) bool {
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return false
	}
	return user.TwoFactorSecret != nil && validTOTP(token, *user.TwoFactorSecret)
}

func (s *Server) compareServiceSets(scope, sourceID, targetID, sourceKey, targetKey string) gin.H {
	var sourceServices []models.Service
	var targetServices []models.Service
	if scope == "instance" {
		sourceServices = s.refreshServicesForAppInstance(models.AppInstance{ID: sourceID})
		targetServices = s.refreshServicesForAppInstance(models.AppInstance{ID: targetID})
	} else {
		sourceServices = s.servicesForEnvironment(sourceID)
		targetServices = s.servicesForEnvironment(targetID)
	}
	return serviceComparisonResponse(sourceServices, targetServices, sourceID, targetID, sourceKey, targetKey, "environmentId")
}

func serviceComparisonResponse(sourceServices, targetServices []models.Service, sourceID, targetID, sourceKey, targetKey, sideIDKey string) gin.H {
	sourceByName := map[string]models.Service{}
	targetByName := map[string]models.Service{}
	names := map[string]bool{}
	for _, svc := range sourceServices {
		sourceByName[svc.Name] = svc
		names[svc.Name] = true
	}
	for _, svc := range targetServices {
		targetByName[svc.Name] = svc
		names[svc.Name] = true
	}
	orderedNames := make([]string, 0, len(names))
	for name := range names {
		orderedNames = append(orderedNames, name)
	}
	sort.Strings(orderedNames)
	comparisons := make([]gin.H, 0, len(orderedNames))
	for _, name := range orderedNames {
		sourceSvc, sourceOK := sourceByName[name]
		targetSvc, targetOK := targetByName[name]
		sourceVersion := serviceImageVersion(sourceSvc.ImageTag)
		targetVersion := serviceImageVersion(targetSvc.ImageTag)
		differenceType := serviceDifferenceType(sourceOK, targetOK, sourceSvc, targetSvc)
		comparison := gin.H{
			"serviceName":    name,
			"workloadType":   firstNonEmpty(sourceSvc.WorkloadType, targetSvc.WorkloadType),
			"source":         serviceComparisonSide(sourceOK, sourceID, sideIDKey, sourceSvc, sourceVersion),
			"target":         serviceComparisonSide(targetOK, targetID, sideIDKey, targetSvc, targetVersion),
			"status":         serviceComparisonStatus(sourceOK, targetOK, sourceSvc, targetSvc),
			"differenceType": differenceType,
			"differences": gin.H{
				"existence": !sourceOK || !targetOK,
				"imageTag":  sourceOK && targetOK && stringPtrValue(sourceSvc.ImageTag) != stringPtrValue(targetSvc.ImageTag),
				"version":   sourceVersion != targetVersion,
				"status":    sourceOK && targetOK && sourceSvc.Status != targetSvc.Status,
				"replicas":  sourceOK && targetOK && sourceSvc.Replicas != targetSvc.Replicas,
			},
		}
		comparisons = append(comparisons, comparison)
	}
	sort.SliceStable(comparisons, func(i, j int) bool {
		left := valueString(comparisons[i]["differenceType"])
		right := valueString(comparisons[j]["differenceType"])
		if left != right {
			return serviceDifferenceSortOrder(left) < serviceDifferenceSortOrder(right)
		}
		return valueString(comparisons[i]["serviceName"]) < valueString(comparisons[j]["serviceName"])
	})
	summary := gin.H{
		"totalServices":   len(orderedNames),
		"identical":       0,
		"different":       0,
		"missingInSource": 0,
		"missingInTarget": 0,
	}
	for _, comparison := range comparisons {
		switch comparison["differenceType"] {
		case "identical":
			summary["identical"] = summary["identical"].(int) + 1
		case "different":
			summary["different"] = summary["different"].(int) + 1
		case "missing_in_source":
			summary["missingInSource"] = summary["missingInSource"].(int) + 1
		case "missing_in_target":
			summary["missingInTarget"] = summary["missingInTarget"].(int) + 1
		}
	}
	return gin.H{sourceKey: sourceID, targetKey: targetID, "summary": summary, "comparisons": comparisons}
}

func serviceComparisonSide(ok bool, id, idKey string, service models.Service, version *string) any {
	if !ok {
		return nil
	}
	out := gin.H{
		idKey:               id,
		"imageTag":          service.ImageTag,
		"version":           version,
		"status":            service.Status,
		"replicas":          service.Replicas,
		"availableReplicas": service.AvailableReplicas,
		"lastUpdated":       service.UpdatedAt,
	}
	if idKey != "appInstanceId" {
		out["appInstanceId"] = service.AppInstanceID
	}
	return out
}

func serviceImageVersion(imageTag *string) *string {
	if imageTag == nil || *imageTag == "" {
		return nil
	}
	parts := strings.Split(*imageTag, ":")
	version := parts[len(parts)-1]
	return &version
}

func serviceComparisonStatus(sourceOK, targetOK bool, source, target models.Service) string {
	if !sourceOK || !targetOK {
		return "missing"
	}
	if stringPtrValue(source.ImageTag) != stringPtrValue(target.ImageTag) || source.Status != target.Status || source.Replicas != target.Replicas {
		return "different"
	}
	return "identical"
}

func serviceDifferenceType(sourceOK, targetOK bool, source, target models.Service) string {
	switch {
	case !sourceOK && targetOK:
		return "missing_in_source"
	case sourceOK && !targetOK:
		return "missing_in_target"
	case serviceComparisonStatus(sourceOK, targetOK, source, target) == "different":
		return "different"
	default:
		return "identical"
	}
}

func serviceDifferenceSortOrder(value string) int {
	switch value {
	case "missing_in_source":
		return 0
	case "missing_in_target":
		return 1
	case "different":
		return 2
	case "identical":
		return 3
	default:
		return 4
	}
}

func stringPtrValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

type httpStatusError struct {
	status int
	body   string
	err    error
}

func (e httpStatusError) Error() string {
	if e.err != nil {
		return e.err.Error()
	}
	if e.body != "" {
		return fmt.Sprintf("request failed with status %d: %s", e.status, e.body)
	}
	return fmt.Sprintf("request failed with status %d", e.status)
}

func rancherRequest(site models.RancherSite, endpoint string, params url.Values, out any) error {
	base := strings.TrimRight(site.URL, "/") + "/v3"
	reqURL := base + "/" + strings.TrimLeft(endpoint, "/")
	if params != nil && len(params) > 0 {
		reqURL += "?" + params.Encode()
	}
	req, err := http.NewRequest(http.MethodGet, reqURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+site.Token)
	req.Header.Set("Content-Type", "application/json")
	return doJSON(req, 30*time.Second, out)
}

func rancherClusters(site models.RancherSite) ([]gin.H, error) {
	var payload map[string]any
	if err := rancherRequest(site, "/clusters", nil, &payload); err != nil {
		return nil, err
	}
	items := arrayFromPayload(payload)
	clusters := make([]gin.H, 0, len(items))
	for _, item := range items {
		clusters = append(clusters, gin.H{
			"id":          valueString(item["id"]),
			"name":        valueString(item["name"]),
			"state":       valueString(item["state"]),
			"description": optionalValue(item["description"]),
		})
	}
	return clusters, nil
}

func rancherNamespaces(site models.RancherSite, clusterID string) ([]gin.H, error) {
	if clusterID == "" {
		var payload map[string]any
		if err := rancherRequest(site, "/namespaces", nil, &payload); err != nil {
			return nil, err
		}
		return mapRancherNamespaces(arrayFromPayload(payload), clusterID, ""), nil
	}

	endpoints := []string{
		"/namespaces?clusterId=" + url.QueryEscape(clusterID),
		"/clusters/" + url.PathEscape(clusterID) + "/namespaces",
		"/project/" + url.PathEscape(clusterID) + "/namespaces",
		"/k8s/clusters/" + url.PathEscape(clusterID) + "/v1/namespaces",
		"/k8s/clusters/" + url.PathEscape(clusterID) + "/api/v1/namespaces",
	}
	for _, endpoint := range endpoints {
		var payload map[string]any
		if err := rancherRequest(site, endpoint, nil, &payload); err != nil {
			continue
		}
		items := arrayFromPayload(payload)
		if items != nil {
			return mapRancherNamespaces(items, clusterID, ""), nil
		}
	}

	projects, err := rancherProjects(site, clusterID)
	if err != nil {
		return nil, err
	}
	namespaces := []gin.H{}
	for _, project := range projects {
		projectID := valueString(project["id"])
		if projectID == "" {
			continue
		}
		var payload map[string]any
		if err := rancherRequest(site, "/namespaces?projectId="+url.QueryEscape(projectID), nil, &payload); err != nil {
			continue
		}
		namespaces = append(namespaces, mapRancherNamespaces(arrayFromPayload(payload), clusterID, projectID)...)
	}
	return namespaces, nil
}

func rancherProjects(site models.RancherSite, clusterID string) ([]map[string]any, error) {
	endpoint := "/projects"
	if clusterID != "" {
		endpoint += "?clusterId=" + url.QueryEscape(clusterID)
	}
	var payload map[string]any
	if err := rancherRequest(site, endpoint, nil, &payload); err != nil {
		return nil, err
	}
	return arrayFromPayload(payload), nil
}

func mapRancherNamespaces(items []map[string]any, clusterID, projectID string) []gin.H {
	namespaces := make([]gin.H, 0, len(items))
	for _, item := range items {
		metadata, _ := item["metadata"].(map[string]any)
		labels, _ := metadata["labels"].(map[string]any)
		name := firstNonEmpty(valueString(item["name"]), valueString(metadata["name"]))
		namespaces = append(namespaces, gin.H{
			"id":        firstNonEmpty(valueString(item["id"]), valueString(metadata["name"]), name),
			"name":      name,
			"projectId": firstNonEmpty(valueString(item["projectId"]), valueString(labels["field.cattle.io/projectId"]), projectID),
			"clusterId": firstNonEmpty(valueString(item["clusterId"]), valueString(labels["field.cattle.io/clusterId"]), clusterID),
		})
	}
	return namespaces
}

func rancherErrorMessage(err error) string {
	var statusErr httpStatusError
	if errors.As(err, &statusErr) {
		switch statusErr.status {
		case http.StatusUnauthorized:
			return "Authentication failed - check token"
		case http.StatusForbidden:
			return "Access forbidden - insufficient permissions"
		}
	}
	if strings.Contains(err.Error(), "connection refused") {
		return "Connection refused - server may be down"
	}
	if strings.Contains(err.Error(), "no such host") {
		return "Server not found - check URL"
	}
	return err.Error()
}

func harborRequest(site models.HarborSite, endpoint string, params url.Values, out any) error {
	var lastErr error
	for _, baseURL := range harborBaseCandidates(site.URL) {
		reqURL := strings.TrimRight(baseURL, "/") + "/" + strings.TrimLeft(endpoint, "/")
		if params != nil && len(params) > 0 {
			reqURL += "?" + params.Encode()
		}
		req, err := http.NewRequest(http.MethodGet, reqURL, nil)
		if err != nil {
			return err
		}
		req.SetBasicAuth(site.Username, site.Password)
		req.Header.Set("Content-Type", "application/json")
		err = doJSON(req, 30*time.Second, out)
		if err == nil {
			return nil
		}
		lastErr = err
		var statusErr httpStatusError
		if errors.As(err, &statusErr) {
			if statusErr.status == http.StatusUnauthorized || statusErr.status == http.StatusForbidden {
				return fmt.Errorf("Harbor API authentication failed (%d): Check your username and password", statusErr.status)
			}
			if statusErr.status == http.StatusNotFound || statusErr.status == http.StatusMethodNotAllowed || statusErr.status == http.StatusBadRequest {
				continue
			}
		}
		return err
	}
	if lastErr != nil {
		return lastErr
	}
	return errors.New("Failed to fetch from Harbor: no base URL candidates succeeded")
}

func harborConnectionResult(site models.HarborSite) gin.H {
	var payload map[string]any
	if err := harborRequest(site, "/users/current", nil, &payload); err != nil {
		return gin.H{"success": false, "message": err.Error()}
	}
	var projects []map[string]any
	projectCount := 0
	if err := harborRequest(site, "/projects", nil, &projects); err == nil {
		projectCount = len(projects)
	}
	username := firstNonEmpty(valueString(payload["username"]), "user")
	return gin.H{
		"success": true,
		"message": "Connection successful - Authenticated as " + username,
		"data": gin.H{
			"user": gin.H{
				"username": payload["username"],
				"email":    payload["email"],
				"realname": payload["realname"],
				"admin":    boolFromValue(payload["sysadmin_flag"]),
			},
			"projectCount": projectCount,
			"harborUrl":    site.URL,
		},
	}
}

func harborArtifactByTag(site models.HarborSite, projectName, repositoryName, tag string) (map[string]any, error) {
	query := url.Values{
		"with_tag":              []string{"true"},
		"with_label":            []string{"true"},
		"with_scan_overview":    []string{"false"},
		"with_signature":        []string{"false"},
		"with_immutable_status": []string{"false"},
		"with_accessory":        []string{"false"},
	}
	var artifact map[string]any
	err := harborRequest(site, "/projects/"+url.PathEscape(projectName)+"/repositories/"+encodeHarborRepository(repositoryName)+"/artifacts/"+url.PathEscape(tag), query, &artifact)
	if err != nil {
		var statusErr httpStatusError
		if errors.As(err, &statusErr) && statusErr.status == http.StatusNotFound {
			return nil, nil
		}
		return nil, err
	}
	return artifact, nil
}

func harborImageSize(site models.HarborSite, fullImageTag string) (gin.H, error) {
	projectName, repositoryName, tag := parseHarborImageTag(fullImageTag, site.URL)
	if projectName == "" || repositoryName == "" {
		return nil, nil
	}
	artifact, err := harborArtifactByTag(site, projectName, repositoryName, tag)
	if err != nil || artifact == nil {
		return nil, err
	}
	compressed := int64FromValue(artifact["size"])
	size := int64(math.Round(float64(compressed) * 2.5))
	return gin.H{
		"size":                    size,
		"sizeFormatted":           formatBytes(size) + " (estimated)",
		"compressedSize":          compressed,
		"compressedSizeFormatted": formatBytes(compressed),
	}, nil
}

func harborBaseCandidates(rawURL string) []string {
	trimmed := strings.TrimRight(rawURL, "/")
	if strings.HasSuffix(trimmed, "/api/v2.0") {
		return []string{trimmed}
	}
	if strings.HasSuffix(trimmed, "/api") {
		return []string{trimmed + "/v2.0"}
	}
	return []string{trimmed + "/api/v2.0"}
}

func encodeHarborRepository(repositoryName string) string {
	if strings.Contains(repositoryName, "/") {
		return url.PathEscape(url.PathEscape(repositoryName))
	}
	return url.PathEscape(repositoryName)
}

func normalizeHarborRepository(repositoryName, projectName string) string {
	return strings.TrimPrefix(repositoryName, projectName+"/")
}

func parseHarborImageTag(fullImageTag, harborURL string) (string, string, string) {
	harborDomain := strings.TrimPrefix(strings.TrimPrefix(strings.TrimRight(harborURL, "/"), "https://"), "http://")
	imagePart := fullImageTag
	tag := "latest"
	if index := strings.LastIndex(fullImageTag, ":"); index >= 0 {
		imagePart = fullImageTag[:index]
		tag = fullImageTag[index+1:]
	}
	imagePart = strings.TrimPrefix(imagePart, harborDomain+"/")
	parts := strings.Split(imagePart, "/")
	if len(parts) < 2 {
		return "library", parts[0], tag
	}
	return parts[0], strings.Join(parts[1:], "/"), tag
}

func doJSON(req *http.Request, timeout time.Duration, out any) error {
	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return httpStatusError{status: resp.StatusCode, body: string(body)}
	}
	if out == nil || len(body) == 0 {
		return nil
	}
	return json.Unmarshal(body, out)
}

func arrayFromPayload(payload map[string]any) []map[string]any {
	for _, key := range []string{"data", "items"} {
		if raw, ok := payload[key]; ok {
			return anyArrayToMaps(raw)
		}
	}
	return anyArrayToMaps(payload)
}

func anyArrayToMaps(raw any) []map[string]any {
	switch value := raw.(type) {
	case []any:
		out := make([]map[string]any, 0, len(value))
		for _, item := range value {
			if mapped, ok := item.(map[string]any); ok {
				out = append(out, mapped)
			}
		}
		return out
	case []map[string]any:
		return value
	default:
		return nil
	}
}

func stringFromMap(data map[string]any, key, fallback string) string {
	if value := valueString(data[key]); value != "" {
		return value
	}
	return fallback
}

func valueString(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	case fmt.Stringer:
		return typed.String()
	case nil:
		return ""
	default:
		return fmt.Sprint(typed)
	}
}

func optionalValue(value any) any {
	if valueString(value) == "" {
		return nil
	}
	return value
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func boolFromValue(value any) bool {
	typed, _ := value.(bool)
	return typed
}

func int64FromValue(value any) int64 {
	switch typed := value.(type) {
	case int:
		return int64(typed)
	case int64:
		return typed
	case float64:
		return int64(typed)
	case json.Number:
		parsed, _ := typed.Int64()
		return parsed
	default:
		return 0
	}
}

func formatBytes(bytes int64) string {
	if bytes == 0 {
		return "0 Bytes"
	}
	k := float64(1024)
	sizes := []string{"Bytes", "KB", "MB", "GB", "TB"}
	i := int(math.Floor(math.Log(float64(bytes)) / math.Log(k)))
	if i < 0 {
		i = 0
	}
	if i >= len(sizes) {
		i = len(sizes) - 1
	}
	return strings.TrimRight(strings.TrimRight(fmt.Sprintf("%.2f", float64(bytes)/math.Pow(k, float64(i))), "0"), ".") + " " + sizes[i]
}

func pathParam(c *gin.Context, name string) string {
	value := c.Param(name)
	decoded, err := url.PathUnescape(value)
	if err != nil {
		return value
	}
	return decoded
}

func abort(c *gin.Context, status int, message string) {
	c.AbortWithStatusJSON(status, gin.H{"statusCode": status, "message": message})
}

func bind(c *gin.Context, dst any) bool {
	if err := c.ShouldBindJSON(dst); err != nil {
		abort(c, http.StatusBadRequest, err.Error())
		return false
	}
	return true
}

func first(c *gin.Context, tx *gorm.DB, name string) bool {
	if tx.Error == nil {
		return true
	}
	if errors.Is(tx.Error, gorm.ErrRecordNotFound) {
		abort(c, http.StatusNotFound, fmt.Sprintf("%s not found", name))
	} else {
		abort(c, http.StatusInternalServerError, tx.Error.Error())
	}
	return false
}

func deleteByID[T any](c *gin.Context, db *gorm.DB, name string) {
	var row T
	if !first(c, db.First(&row, "id = ?", c.Param("id")), name) {
		return
	}
	db.Delete(&row)
	c.Status(http.StatusNoContent)
}

func userID(c *gin.Context) string {
	id, _ := c.Get("userID")
	value, _ := id.(string)
	return value
}

func username(c *gin.Context) string {
	name, _ := c.Get("username")
	value, _ := name.(string)
	if value == "" {
		return "system"
	}
	return value
}

func clientIP(c *gin.Context) *string {
	ip := c.ClientIP()
	if ip == "" {
		return nil
	}
	return &ip
}

func validTOTP(token, secret string) bool {
	ok, err := totp.ValidateCustom(token, secret, time.Now(), totp.ValidateOpts{
		Period:    30,
		Skew:      2,
		Digits:    otp.DigitsSix,
		Algorithm: otp.AlgorithmSHA1,
	})
	return err == nil && ok
}

func parseSafeBaseURL(raw string) (string, error) {
	parsed, err := url.Parse(raw)
	if err != nil {
		return "", fmt.Errorf("Invalid URL: %q", raw)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", fmt.Errorf("URL scheme %q is not allowed. Only http:// and https:// are accepted", parsed.Scheme+":")
	}
	host := strings.ToLower(parsed.Hostname())
	if host == "" || blockedHost(host) {
		return "", fmt.Errorf("URL hostname %q is not permitted (loopback / metadata endpoint)", parsed.Hostname())
	}
	return (&url.URL{Scheme: parsed.Scheme, Host: parsed.Host}).String(), nil
}

func blockedHost(host string) bool {
	blocked := map[string]bool{
		"169.254.169.254":          true,
		"169.254.170.2":            true,
		"metadata.google.internal": true,
		"metadata.internal":        true,
		"localhost":                true,
		"localhost.localdomain":    true,
		"0.0.0.0":                  true,
		"::1":                      true,
	}
	if blocked[host] {
		return true
	}
	return strings.HasPrefix(host, "127.")
}

func mapSlice[T any, U any](items []T, fn func(T) U) []U {
	out := make([]U, 0, len(items))
	for _, item := range items {
		out = append(out, fn(item))
	}
	return out
}

func siteResponse(site models.RancherSite) gin.H {
	return gin.H{"id": site.ID, "name": site.Name, "url": site.URL, "active": site.Active, "createdAt": site.CreatedAt, "updatedAt": site.UpdatedAt, "hasToken": site.Token != ""}
}

func genericClusterResponse(row models.GenericClusterSite) gin.H {
	return gin.H{"id": row.ID, "name": row.Name, "clusterName": row.ClusterName, "serverUrl": row.ServerURL, "active": row.Active, "createdAt": row.CreatedAt, "updatedAt": row.UpdatedAt, "hasKubeconfig": row.Kubeconfig != ""}
}

func harborSiteResponse(row models.HarborSite) gin.H {
	return gin.H{"id": row.ID, "name": row.Name, "url": row.URL, "username": row.Username, "active": row.Active, "createdAt": row.CreatedAt, "updatedAt": row.UpdatedAt, "hasPassword": row.Password != ""}
}

func monitoringConfigResponse(row models.MonitoringConfig) gin.H {
	return gin.H{
		"id":                   row.ID,
		"telegramChatId":       row.TelegramChatID,
		"proxyHost":            row.ProxyHost,
		"proxyPort":            row.ProxyPort,
		"proxyUsername":        row.ProxyUsername,
		"monitoringEnabled":    row.MonitoringEnabled,
		"alertThreshold":       row.AlertThreshold,
		"notificationSchedule": row.NotificationSchedule,
		"taggedUsers":          row.TaggedUsers,
		"createdAt":            row.CreatedAt,
		"updatedAt":            row.UpdatedAt,
		"hasTelegramBotToken":  row.TelegramBotToken != nil && *row.TelegramBotToken != "",
		"hasProxyPassword":     row.ProxyPassword != nil && *row.ProxyPassword != "",
	}
}

func userResponse(user models.User) gin.H {
	return gin.H{
		"id":               user.ID,
		"username":         user.Username,
		"email":            user.Email,
		"twoFactorEnabled": user.TwoFactorEnabled,
		"active":           user.Active,
		"isFirstLogin":     user.IsFirstLogin,
		"lastLoginAt":      user.LastLoginAt,
		"createdAt":        user.CreatedAt,
		"updatedAt":        user.UpdatedAt,
	}
}

func applyMonitoringConfig(row *models.MonitoringConfig, dto monitoringConfigDTO) {
	if dto.TelegramBotToken != nil && strings.TrimSpace(*dto.TelegramBotToken) != "" {
		row.TelegramBotToken = dto.TelegramBotToken
	}
	if dto.TelegramChatID != nil {
		row.TelegramChatID = dto.TelegramChatID
	}
	if dto.ProxyHost != nil {
		row.ProxyHost = dto.ProxyHost
	}
	if dto.ProxyPort != nil {
		row.ProxyPort = dto.ProxyPort
	}
	if dto.ProxyUsername != nil {
		row.ProxyUsername = dto.ProxyUsername
	}
	if dto.ProxyPassword != nil && strings.TrimSpace(*dto.ProxyPassword) != "" {
		row.ProxyPassword = dto.ProxyPassword
	}
	if dto.MonitoringEnabled != nil {
		row.MonitoringEnabled = *dto.MonitoringEnabled
	}
	if dto.AlertThreshold != nil {
		row.AlertThreshold = *dto.AlertThreshold
	}
	if dto.NotificationSchedule != nil {
		row.NotificationSchedule = *dto.NotificationSchedule
	}
	if dto.TaggedUsers != nil {
		row.TaggedUsers = dto.TaggedUsers
	}
}

func defaultString(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

func defaultTemplateSample(templateType string) map[string]any {
	now := time.Now()
	sampleTaggedUsers := "@thangld19 @tungpt @devops_team"
	switch templateType {
	case "test_connection":
		return map[string]any{
			"timestamp":    now.Format(time.RFC3339Nano),
			"tagged_users": sampleTaggedUsers,
		}
	case "daily_health_check":
		return map[string]any{
			"date":              now.Format("2006-01-02"),
			"time":              now.Format("15:04:05"),
			"visual_summary":    "📊 **Overall Status**: ✅ All Systems Healthy (3/3 instances)\n\n**Environment: Production**\n• api-server: ✅ healthy (5/5 services)\n• web-app: ✅ healthy (3/3 services)\n• database: ✅ healthy (2/2 services)",
			"avg_response_time": "1.2",
			"tagged_users":      sampleTaggedUsers,
		}
	case "critical_alert":
		return map[string]any{
			"date":         now.Format("2006-01-02"),
			"time":         now.Format("15:04:05"),
			"visual_alert": "**Service Failure Detected**\n• Environment: Production\n• Instance: api-server\n• Status: ❌ critical\n\n**Failed Services:**\n• auth-service (deployment): crashlooping [0/3]\n• payment-api (deployment): unhealthy [1/3]",
			"tagged_users": sampleTaggedUsers,
		}
	}
	return map[string]any{}
}

func defaultMessageTemplate(templateType string) (models.MessageTemplate, bool) {
	testDescription := "Sent when testing Telegram connection"
	dailyDescription := "Sent daily at 11PM with system health summary"
	alertDescription := "Sent immediately when critical service failure is detected"
	defaults := map[string]models.MessageTemplate{
		"test_connection": {
			TemplateType:    "test_connection",
			TemplateName:    "Test Connection",
			MessageTemplate: "🔍 **Telegram Connection Test** - {{timestamp}}\n\nThis is a test message from RancherHub monitoring system.\n\n{{tagged_users}}",
			Description:     &testDescription,
		},
		"daily_health_check": {
			TemplateType:    "daily_health_check",
			TemplateName:    "Daily Health Check Report",
			MessageTemplate: "🔍 **Daily Health Check Report** - {{date}} {{time}}\n\n{{visual_summary}}\n\n📈 **Performance**: Avg response time {{avg_response_time}}s\n⏰ Next check: Tomorrow 06:00\n\n{{tagged_users}}",
			Description:     &dailyDescription,
		},
		"critical_alert": {
			TemplateType:    "critical_alert",
			TemplateName:    "Critical Alert",
			MessageTemplate: "🚨 **CRITICAL ALERT** - {{date}} {{time}}\n\n{{visual_alert}}\n\n📞 Contact DevOps team immediately\n\n{{tagged_users}}",
			Description:     &alertDescription,
		},
	}
	value, ok := defaults[templateType]
	return value, ok
}

func availableTemplateVariables(templateType string) []string {
	switch templateType {
	case "test_connection":
		return []string{"timestamp", "tagged_users"}
	case "daily_health_check":
		return []string{"date", "time", "visual_summary", "avg_response_time", "tagged_users"}
	case "critical_alert":
		return []string{"date", "time", "visual_alert", "tagged_users"}
	default:
		return []string{}
	}
}

type loginDTO struct {
	Username          string  `json:"username" binding:"required"`
	Password          string  `json:"password" binding:"required"`
	TwoFactorToken    *string `json:"twoFactorToken" binding:"omitempty,len=6"`
	DeviceFingerprint *string `json:"deviceFingerprint"`
	DeviceName        *string `json:"deviceName"`
	UserAgent         *string `json:"userAgent"`
	TrustDevice       *bool   `json:"trustDevice"`
}

type registerDTO struct {
	Username string `json:"username" binding:"required,min=3"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type tokenDTO struct {
	Token string `json:"token" binding:"required,len=6,numeric"`
}

type verifyTokenDTO struct {
	Token string `json:"token" binding:"required,len=6"`
}

type changePasswordDTO struct {
	CurrentPassword string `json:"currentPassword" binding:"required"`
	NewPassword     string `json:"newPassword" binding:"required,min=6"`
}

type siteDTO struct {
	Name  string `json:"name" binding:"required"`
	URL   string `json:"url" binding:"required"`
	Token string `json:"token" binding:"required"`
}

type siteUpdateDTO struct {
	Name  *string `json:"name"`
	URL   *string `json:"url"`
	Token *string `json:"token"`
}

type genericClusterDTO struct {
	Name       string `json:"name" binding:"required"`
	Kubeconfig string `json:"kubeconfig" binding:"required"`
}

type genericClusterUpdateDTO struct {
	Name       *string `json:"name"`
	Kubeconfig *string `json:"kubeconfig"`
}

type activeDTO struct {
	Active bool `json:"active"`
}

type environmentDTO struct {
	Name        string  `json:"name" binding:"required"`
	Description *string `json:"description"`
	Color       *string `json:"color"`
}

type environmentUpdateDTO struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Color       *string `json:"color"`
}

type appInstanceDTO struct {
	Name                 string  `json:"name" binding:"required"`
	Cluster              string  `json:"cluster" binding:"required"`
	Namespace            string  `json:"namespace" binding:"required"`
	ClusterType          string  `json:"clusterType" binding:"required,oneof=rancher generic"`
	RancherSiteID        *string `json:"rancherSiteId" binding:"omitempty,uuid"`
	GenericClusterSiteID *string `json:"genericClusterSiteId" binding:"omitempty,uuid"`
	EnvironmentID        string  `json:"environmentId" binding:"required,uuid"`
}

type appInstanceUpdateDTO struct {
	Name                 *string `json:"name"`
	Cluster              *string `json:"cluster"`
	Namespace            *string `json:"namespace"`
	ClusterType          *string `json:"clusterType" binding:"omitempty,oneof=rancher generic"`
	RancherSiteID        *string `json:"rancherSiteId" binding:"omitempty,uuid"`
	GenericClusterSiteID *string `json:"genericClusterSiteId" binding:"omitempty,uuid"`
	EnvironmentID        *string `json:"environmentId" binding:"omitempty,uuid"`
}

type harborSiteDTO struct {
	Name     string `json:"name" binding:"required"`
	URL      string `json:"url" binding:"required,url"`
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Active   *bool  `json:"active"`
}

type harborSiteUpdateDTO struct {
	Name     *string `json:"name"`
	URL      *string `json:"url" binding:"omitempty,url"`
	Username *string `json:"username"`
	Password *string `json:"password"`
	Active   *bool   `json:"active"`
}

type harborConnectionDTO struct {
	URL      string `json:"url" binding:"required,url"`
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type syncServicesDTO struct {
	SourceEnvironmentID  string   `json:"sourceEnvironmentId" binding:"required"`
	TargetEnvironmentID  string   `json:"targetEnvironmentId" binding:"required"`
	ServiceIDs           []string `json:"serviceIds" binding:"required"`
	TargetAppInstanceIDs []string `json:"targetAppInstanceIds" binding:"required"`
}

type monitoringConfigDTO struct {
	TelegramBotToken     *string  `json:"telegramBotToken"`
	TelegramChatID       *string  `json:"telegramChatId"`
	ProxyHost            *string  `json:"proxyHost"`
	ProxyPort            *int     `json:"proxyPort"`
	ProxyUsername        *string  `json:"proxyUsername"`
	ProxyPassword        *string  `json:"proxyPassword"`
	MonitoringEnabled    *bool    `json:"monitoringEnabled"`
	AlertThreshold       *int     `json:"alertThreshold"`
	NotificationSchedule *string  `json:"notificationSchedule" binding:"omitempty,oneof=immediate hourly daily"`
	TaggedUsers          []string `json:"taggedUsers"`
}

type monitoredInstanceDTO struct {
	AppInstanceID        string `json:"appInstanceId" binding:"required"`
	MonitoringEnabled    *bool  `json:"monitoringEnabled"`
	CheckIntervalMinutes *int   `json:"checkIntervalMinutes"`
}

type monitoredInstanceUpdateDTO struct {
	AppInstanceID        *string `json:"appInstanceId"`
	MonitoringEnabled    *bool   `json:"monitoringEnabled"`
	CheckIntervalMinutes *int    `json:"checkIntervalMinutes"`
}

type createUserDTO struct {
	Username            string `json:"username" binding:"required"`
	Email               string `json:"email" binding:"required,email"`
	Password            string `json:"password" binding:"required,min=8"`
	AdminTwoFactorToken string `json:"adminTwoFactorToken" binding:"required"`
}

type updateUserDTO struct {
	Username            *string `json:"username"`
	Email               *string `json:"email" binding:"omitempty,email"`
	Password            *string `json:"password" binding:"omitempty,min=8"`
	Active              *bool   `json:"active"`
	AdminTwoFactorToken string  `json:"adminTwoFactorToken" binding:"required"`
}

type deleteUserDTO struct {
	AdminTwoFactorToken string `json:"adminTwoFactorToken" binding:"required"`
}

type messageTemplateDTO struct {
	TemplateType    string  `json:"templateType" binding:"required,oneof=test_connection daily_health_check critical_alert"`
	TemplateName    string  `json:"templateName" binding:"required"`
	MessageTemplate string  `json:"messageTemplate" binding:"required"`
	Description     *string `json:"description"`
}

type messageTemplateUpdateDTO struct {
	TemplateName    *string `json:"templateName"`
	MessageTemplate *string `json:"messageTemplate"`
	Description     *string `json:"description"`
	IsActive        *bool   `json:"isActive"`
}

type previewTemplateDTO struct {
	TemplateType    string         `json:"templateType" binding:"required"`
	MessageTemplate string         `json:"messageTemplate" binding:"required"`
	SampleData      map[string]any `json:"sampleData"`
}
