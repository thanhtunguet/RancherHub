package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RancherSite struct {
	ID        string        `gorm:"type:uuid;primaryKey" json:"id"`
	Name      string        `gorm:"size:255;not null" json:"name"`
	URL       string        `gorm:"size:500;not null" json:"url"`
	Token     string        `gorm:"type:text;not null" json:"-"`
	Active    bool          `gorm:"default:true" json:"active"`
	CreatedAt time.Time     `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time     `gorm:"column:updatedAt" json:"updatedAt"`
	Instances []AppInstance `gorm:"foreignKey:RancherSiteID" json:"appInstances,omitempty"`
}

func (m *RancherSite) BeforeCreate(*gorm.DB) error {
	setUUID(&m.ID)
	return nil
}

type GenericClusterSite struct {
	ID           string        `gorm:"type:uuid;primaryKey" json:"id"`
	Name         string        `gorm:"size:255;not null" json:"name"`
	Kubeconfig   string        `gorm:"type:text;not null" json:"-"`
	ClusterName  *string       `gorm:"column:clusterName;size:255" json:"clusterName"`
	ServerURL    *string       `gorm:"column:serverUrl;size:500" json:"serverUrl"`
	Active       bool          `gorm:"default:true" json:"active"`
	CreatedAt    time.Time     `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt    time.Time     `gorm:"column:updatedAt" json:"updatedAt"`
	AppInstances []AppInstance `gorm:"foreignKey:GenericClusterSiteID" json:"appInstances,omitempty"`
}

func (m *GenericClusterSite) BeforeCreate(*gorm.DB) error {
	setUUID(&m.ID)
	return nil
}

type HarborSite struct {
	ID        string    `gorm:"type:uuid;primaryKey" json:"id"`
	Name      string    `gorm:"size:255;not null" json:"name"`
	URL       string    `gorm:"size:500;not null" json:"url"`
	Username  string    `gorm:"size:255;not null" json:"username"`
	Password  string    `gorm:"type:text;not null" json:"-"`
	Active    bool      `gorm:"default:true" json:"active"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (m *HarborSite) BeforeCreate(*gorm.DB) error {
	setUUID(&m.ID)
	return nil
}

type Environment struct {
	ID           string        `gorm:"type:uuid;primaryKey" json:"id"`
	Name         string        `gorm:"size:255;not null" json:"name"`
	Description  *string       `gorm:"type:text" json:"description"`
	Color        string        `gorm:"size:7;default:#1890ff" json:"color"`
	CreatedAt    time.Time     `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt    time.Time     `gorm:"column:updatedAt" json:"updatedAt"`
	AppInstances []AppInstance `gorm:"foreignKey:EnvironmentID" json:"appInstances,omitempty"`
}

func (m *Environment) BeforeCreate(*gorm.DB) error {
	setUUID(&m.ID)
	if m.Color == "" {
		m.Color = "#1890ff"
	}
	return nil
}

type AppInstance struct {
	ID                   string              `gorm:"type:uuid;primaryKey" json:"id"`
	Name                 string              `gorm:"size:255;not null" json:"name"`
	Cluster              string              `gorm:"size:255;not null" json:"cluster"`
	Namespace            string              `gorm:"size:255;not null" json:"namespace"`
	ClusterType          string              `gorm:"column:cluster_type;size:50;default:rancher" json:"clusterType"`
	RancherSiteID        *string             `gorm:"column:rancher_site_id" json:"rancherSiteId"`
	GenericClusterSiteID *string             `gorm:"column:generic_cluster_site_id" json:"genericClusterSiteId"`
	EnvironmentID        string              `gorm:"column:environment_id;not null" json:"environmentId"`
	CreatedAt            time.Time           `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt            time.Time           `gorm:"column:updatedAt" json:"updatedAt"`
	RancherSite          *RancherSite        `gorm:"foreignKey:RancherSiteID" json:"rancherSite,omitempty"`
	GenericClusterSite   *GenericClusterSite `gorm:"foreignKey:GenericClusterSiteID" json:"genericClusterSite,omitempty"`
	Environment          *Environment        `gorm:"foreignKey:EnvironmentID" json:"environment,omitempty"`
	Services             []Service           `gorm:"foreignKey:AppInstanceID" json:"services,omitempty"`
}

func (m *AppInstance) BeforeCreate(*gorm.DB) error {
	setUUID(&m.ID)
	if m.ClusterType == "" {
		m.ClusterType = "rancher"
	}
	return nil
}

type Service struct {
	ID                string       `gorm:"type:uuid;primaryKey" json:"id"`
	Name              string       `gorm:"size:255;not null;uniqueIndex:idx_services_name_app_instance" json:"name"`
	AppInstanceID     string       `gorm:"column:app_instance_id;not null;uniqueIndex:idx_services_name_app_instance" json:"appInstanceId"`
	Status            string       `gorm:"size:50;default:unknown" json:"status"`
	Replicas          int          `gorm:"default:1" json:"replicas"`
	AvailableReplicas int          `gorm:"column:available_replicas;default:0" json:"availableReplicas"`
	ImageTag          *string      `gorm:"column:image_tag;size:255" json:"imageTag"`
	WorkloadType      string       `gorm:"column:workload_type;size:50;default:Deployment" json:"workloadType"`
	LastSynced        *time.Time   `gorm:"column:last_synced" json:"lastSynced"`
	CreatedAt         time.Time    `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt         time.Time    `gorm:"column:updatedAt" json:"updatedAt"`
	AppInstance       *AppInstance `gorm:"foreignKey:AppInstanceID" json:"appInstance,omitempty"`
}

func (m *Service) BeforeCreate(*gorm.DB) error {
	setUUID(&m.ID)
	if m.Status == "" {
		m.Status = "unknown"
	}
	if m.Replicas == 0 {
		m.Replicas = 1
	}
	if m.WorkloadType == "" {
		m.WorkloadType = "Deployment"
	}
	return nil
}

type SyncOperation struct {
	ID                  string        `gorm:"type:uuid;primaryKey" json:"id"`
	SourceEnvironmentID string        `gorm:"column:source_environment_id;not null" json:"sourceEnvironmentId"`
	TargetEnvironmentID string        `gorm:"column:target_environment_id;not null" json:"targetEnvironmentId"`
	ServiceIDs          []string      `gorm:"column:serviceIds;serializer:json" json:"serviceIds"`
	Status              string        `gorm:"size:50;default:pending" json:"status"`
	StartTime           time.Time     `gorm:"column:start_time" json:"startTime"`
	EndTime             *time.Time    `gorm:"column:end_time" json:"endTime"`
	InitiatedBy         string        `gorm:"column:initiated_by;size:255" json:"initiatedBy"`
	CreatedAt           time.Time     `gorm:"column:createdAt" json:"createdAt"`
	SyncHistory         []SyncHistory `gorm:"foreignKey:SyncOperationID" json:"syncHistory,omitempty"`
}

func (m *SyncOperation) BeforeCreate(*gorm.DB) error {
	setUUID(&m.ID)
	if m.Status == "" {
		m.Status = "pending"
	}
	return nil
}

type SyncHistory struct {
	ID                    string         `gorm:"type:uuid;primaryKey" json:"id"`
	SyncOperationID       string         `gorm:"column:sync_operation_id;not null" json:"syncOperationId"`
	ServiceID             string         `gorm:"column:service_id;not null" json:"serviceId"`
	ServiceName           *string        `gorm:"column:service_name;size:255" json:"serviceName"`
	WorkloadType          *string        `gorm:"column:workload_type;size:100" json:"workloadType"`
	SourceAppInstanceID   string         `gorm:"column:source_app_instance_id;not null" json:"sourceAppInstanceId"`
	SourceEnvironmentName *string        `gorm:"column:source_environment_name;size:255" json:"sourceEnvironmentName"`
	SourceCluster         *string        `gorm:"column:source_cluster;size:255" json:"sourceCluster"`
	SourceNamespace       *string        `gorm:"column:source_namespace;size:255" json:"sourceNamespace"`
	TargetAppInstanceID   string         `gorm:"column:target_app_instance_id;not null" json:"targetAppInstanceId"`
	TargetEnvironmentName *string        `gorm:"column:target_environment_name;size:255" json:"targetEnvironmentName"`
	TargetCluster         *string        `gorm:"column:target_cluster;size:255" json:"targetCluster"`
	TargetNamespace       *string        `gorm:"column:target_namespace;size:255" json:"targetNamespace"`
	PreviousImageTag      *string        `gorm:"column:previous_image_tag;size:255" json:"previousImageTag"`
	NewImageTag           *string        `gorm:"column:new_image_tag;size:255" json:"newImageTag"`
	ContainerName         *string        `gorm:"column:container_name;size:255" json:"containerName"`
	ConfigChanges         *string        `gorm:"column:configChanges;type:text" json:"configChanges"`
	Status                string         `gorm:"size:50;not null" json:"status"`
	Error                 *string        `gorm:"type:text" json:"error"`
	DurationMS            *int           `gorm:"column:duration_ms" json:"durationMs"`
	InitiatedBy           *string        `gorm:"column:initiated_by;size:255" json:"initiatedBy"`
	Timestamp             time.Time      `json:"timestamp"`
	CreatedAt             time.Time      `gorm:"column:createdAt" json:"createdAt"`
	SyncOperation         *SyncOperation `gorm:"foreignKey:SyncOperationID" json:"syncOperation,omitempty"`
}

func (m *SyncHistory) BeforeCreate(*gorm.DB) error {
	setUUID(&m.ID)
	return nil
}

func (SyncHistory) TableName() string {
	return "sync_history"
}

type MonitoringConfig struct {
	ID                   string    `gorm:"type:uuid;primaryKey" json:"id"`
	TelegramBotToken     *string   `gorm:"column:telegram_bot_token;size:255" json:"-"`
	TelegramChatID       *string   `gorm:"column:telegram_chat_id;size:255" json:"telegramChatId"`
	ProxyHost            *string   `gorm:"column:proxy_host;size:255" json:"proxyHost"`
	ProxyPort            *int      `gorm:"column:proxy_port" json:"proxyPort"`
	ProxyUsername        *string   `gorm:"column:proxy_username;size:255" json:"proxyUsername"`
	ProxyPassword        *string   `gorm:"column:proxy_password;size:255" json:"-"`
	MonitoringEnabled    bool      `gorm:"column:monitoring_enabled;default:true" json:"monitoringEnabled"`
	AlertThreshold       int       `gorm:"column:alert_threshold;default:3" json:"alertThreshold"`
	NotificationSchedule string    `gorm:"column:notification_schedule;size:50;default:daily" json:"notificationSchedule"`
	TaggedUsers          []string  `gorm:"column:tagged_users;serializer:json" json:"taggedUsers"`
	CreatedAt            time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt            time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (m *MonitoringConfig) BeforeCreate(*gorm.DB) error {
	setUUID(&m.ID)
	if m.AlertThreshold == 0 {
		m.AlertThreshold = 3
	}
	if m.NotificationSchedule == "" {
		m.NotificationSchedule = "daily"
	}
	return nil
}

type MonitoredInstance struct {
	ID                   string       `gorm:"type:uuid;primaryKey" json:"id"`
	AppInstanceID        string       `gorm:"column:app_instance_id;not null" json:"appInstanceId"`
	MonitoringEnabled    bool         `gorm:"column:monitoring_enabled;default:true" json:"monitoringEnabled"`
	CheckIntervalMinutes int          `gorm:"column:check_interval_minutes;default:60" json:"checkIntervalMinutes"`
	LastCheckTime        *time.Time   `gorm:"column:last_check_time" json:"lastCheckTime"`
	LastStatus           *string      `gorm:"column:last_status;size:50" json:"lastStatus"`
	ConsecutiveFailures  int          `gorm:"column:consecutive_failures;default:0" json:"consecutiveFailures"`
	AlertSent            bool         `gorm:"column:alert_sent;default:false" json:"alertSent"`
	CreatedAt            time.Time    `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt            time.Time    `gorm:"column:updatedAt" json:"updatedAt"`
	AppInstance          *AppInstance `gorm:"foreignKey:AppInstanceID" json:"appInstance,omitempty"`
}

func (m *MonitoredInstance) BeforeCreate(*gorm.DB) error {
	setUUID(&m.ID)
	if m.CheckIntervalMinutes == 0 {
		m.CheckIntervalMinutes = 60
	}
	return nil
}

type MonitoringHistory struct {
	ID                  string             `gorm:"type:uuid;primaryKey" json:"id"`
	MonitoredInstanceID string             `gorm:"column:monitored_instance_id;not null" json:"monitoredInstanceId"`
	CheckTime           time.Time          `gorm:"column:check_time;not null" json:"checkTime"`
	Status              string             `gorm:"size:50;not null" json:"status"`
	ResponseTimeMS      *int               `gorm:"column:response_time_ms" json:"responseTimeMs"`
	ServicesCount       *int               `gorm:"column:services_count" json:"servicesCount"`
	HealthyServices     *int               `gorm:"column:healthy_services" json:"healthyServices"`
	FailedServices      *int               `gorm:"column:failed_services" json:"failedServices"`
	PausedServices      *int               `gorm:"column:paused_services" json:"pausedServices"`
	Details             *string            `gorm:"type:text" json:"details"`
	Error               *string            `gorm:"type:text" json:"error"`
	CreatedAt           time.Time          `gorm:"column:createdAt" json:"createdAt"`
	MonitoredInstance   *MonitoredInstance `gorm:"foreignKey:MonitoredInstanceID" json:"monitoredInstance,omitempty"`
}

func (m *MonitoringHistory) BeforeCreate(*gorm.DB) error {
	setUUID(&m.ID)
	return nil
}

func (MonitoringHistory) TableName() string {
	return "monitoring_history"
}

type AlertHistory struct {
	ID                  string             `gorm:"type:uuid;primaryKey" json:"id"`
	MonitoredInstanceID string             `gorm:"column:monitored_instance_id;not null" json:"monitoredInstanceId"`
	AlertType           string             `gorm:"size:50;not null" json:"alertType"`
	Severity            string             `gorm:"size:50;not null" json:"severity"`
	Message             string             `gorm:"type:text;not null" json:"message"`
	TelegramSent        bool               `gorm:"column:telegram_sent;default:false" json:"telegramSent"`
	TelegramMessageID   *string            `gorm:"column:telegram_message_id;size:255" json:"telegramMessageId"`
	Resolved            bool               `gorm:"default:false" json:"resolved"`
	ResolvedAt          *time.Time         `gorm:"column:resolved_at" json:"resolvedAt"`
	CreatedAt           time.Time          `gorm:"column:createdAt" json:"createdAt"`
	MonitoredInstance   *MonitoredInstance `gorm:"foreignKey:MonitoredInstanceID" json:"monitoredInstance,omitempty"`
}

func (m *AlertHistory) BeforeCreate(*gorm.DB) error {
	setUUID(&m.ID)
	return nil
}

func (AlertHistory) TableName() string {
	return "alert_history"
}

type User struct {
	ID               string          `gorm:"type:uuid;primaryKey" json:"id"`
	Username         string          `gorm:"size:255;unique;not null" json:"username"`
	Email            string          `gorm:"size:255;unique;not null" json:"email"`
	Password         string          `gorm:"type:text;not null" json:"-"`
	TwoFactorEnabled bool            `gorm:"column:twoFactorEnabled;default:false" json:"twoFactorEnabled"`
	TwoFactorSecret  *string         `gorm:"column:twoFactorSecret;type:text" json:"-"`
	Active           bool            `gorm:"default:true" json:"active"`
	IsFirstLogin     bool            `gorm:"column:isFirstLogin;default:false" json:"isFirstLogin"`
	LastLoginAt      *time.Time      `gorm:"column:lastLoginAt" json:"lastLoginAt"`
	TrustedDevices   []TrustedDevice `gorm:"foreignKey:UserID" json:"trustedDevices,omitempty"`
	CreatedAt        time.Time       `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt        time.Time       `gorm:"column:updatedAt" json:"updatedAt"`
}

func (m *User) BeforeCreate(*gorm.DB) error {
	setUUID(&m.ID)
	return nil
}

type MessageTemplate struct {
	ID                 string    `gorm:"type:uuid;primaryKey" json:"id"`
	TemplateType       string    `gorm:"column:template_type;size:50;unique;not null" json:"templateType"`
	TemplateName       string    `gorm:"column:template_name;size:255;not null" json:"templateName"`
	MessageTemplate    string    `gorm:"column:message_template;type:text;not null" json:"messageTemplate"`
	Description        *string   `gorm:"type:text" json:"description"`
	AvailableVariables []string  `gorm:"column:available_variables;serializer:json" json:"availableVariables"`
	IsActive           bool      `gorm:"column:is_active;default:true" json:"isActive"`
	IsDefault          bool      `gorm:"column:is_default;default:false" json:"isDefault"`
	CreatedAt          time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt          time.Time `gorm:"column:updated_at" json:"updatedAt"`
}

func (m *MessageTemplate) BeforeCreate(*gorm.DB) error {
	setUUID(&m.ID)
	return nil
}

type TrustedDevice struct {
	ID                string    `gorm:"type:uuid;primaryKey" json:"id"`
	UserID            string    `gorm:"column:user_id;uniqueIndex:idx_user_device;not null" json:"userId"`
	DeviceFingerprint string    `gorm:"column:device_fingerprint;size:255;uniqueIndex:idx_user_device;not null" json:"deviceFingerprint"`
	DeviceName        string    `gorm:"column:device_name;size:500;not null" json:"deviceName"`
	IPAddress         *string   `gorm:"column:ip_address;size:45" json:"ipAddress"`
	UserAgent         *string   `gorm:"column:user_agent;type:text" json:"userAgent"`
	LastUsedAt        time.Time `gorm:"column:last_used_at;not null" json:"lastUsedAt"`
	ExpiresAt         time.Time `gorm:"column:expires_at;index;not null" json:"expiresAt"`
	CreatedAt         time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt         time.Time `gorm:"column:updatedAt" json:"updatedAt"`
	User              *User     `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
}

func (m *TrustedDevice) BeforeCreate(*gorm.DB) error {
	setUUID(&m.ID)
	return nil
}

func setUUID(id *string) {
	if *id == "" {
		*id = uuid.NewString()
	}
}
