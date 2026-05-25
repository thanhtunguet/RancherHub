package database

import (
	"fmt"
	"log"
	"strings"

	"rancher-hub-backend/internal/config"
	"rancher-hub-backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func Open(cfg config.Config) (*gorm.DB, error) {
	if strings.EqualFold(cfg.DatabaseType, "postgres") {
		sslMode := "disable"
		if cfg.DatabaseSSL == "true" {
			sslMode = "require"
		}
		dsn := fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			cfg.DatabaseHost,
			cfg.DatabasePort,
			cfg.DatabaseUsername,
			cfg.DatabasePassword,
			cfg.DatabaseName,
			sslMode,
		)
		return gorm.Open(postgres.Open(dsn), &gorm.Config{})
	}

	return gorm.Open(sqlite.Open(cfg.DatabasePath), &gorm.Config{})
}

func Migrate(db *gorm.DB) error {
	if err := prepareAlertHistoryAlertTypeMigration(db); err != nil {
		return err
	}

	return db.AutoMigrate(
		&models.RancherSite{},
		&models.GenericClusterSite{},
		&models.HarborSite{},
		&models.Environment{},
		&models.AppInstance{},
		&models.Service{},
		&models.SyncOperation{},
		&models.SyncHistory{},
		&models.MonitoringConfig{},
		&models.MonitoredInstance{},
		&models.MonitoringHistory{},
		&models.AlertHistory{},
		&models.User{},
		&models.MessageTemplate{},
		&models.TrustedDevice{},
	)
}

func prepareAlertHistoryAlertTypeMigration(db *gorm.DB) error {
	if !db.Migrator().HasTable(&models.AlertHistory{}) {
		return nil
	}

	if !db.Migrator().HasColumn(&models.AlertHistory{}, "alert_type") {
		if err := db.Exec(`ALTER TABLE "alert_history" ADD COLUMN "alert_type" varchar(50)`).Error; err != nil {
			return err
		}
	}

	if err := db.Exec(`UPDATE "alert_history" SET "alert_type" = 'service_failure' WHERE "alert_type" IS NULL OR "alert_type" = ''`).Error; err != nil {
		return err
	}

	if db.Dialector.Name() == "postgres" {
		if err := db.Exec(`ALTER TABLE "alert_history" ALTER COLUMN "alert_type" SET NOT NULL`).Error; err != nil {
			return err
		}
	}

	return nil
}

func SeedDefaultAdmin(db *gorm.DB) error {
	var count int64
	if err := db.Model(&models.User{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		log.Print("Admin users already exist, skipping seeder")
		return nil
	}

	password, err := bcrypt.GenerateFromPassword([]byte("admin123"), 12)
	if err != nil {
		return err
	}

	admin := models.User{
		Username:     "admin",
		Email:        "admin@rancherhub.local",
		Password:     string(password),
		Active:       true,
		IsFirstLogin: true,
	}
	if err := db.Create(&admin).Error; err != nil {
		return err
	}

	log.Print("Default admin user created: admin / admin123")
	log.Print("Please change the default password after first login!")
	return nil
}

func SeedDefaultMessageTemplates(db *gorm.DB) error {
	for _, template := range defaultMessageTemplates() {
		var count int64
		if err := db.Model(&models.MessageTemplate{}).
			Where("template_type = ?", template.TemplateType).
			Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}
		if err := db.Create(&template).Error; err != nil {
			return err
		}
	}
	return nil
}

func defaultMessageTemplates() []models.MessageTemplate {
	testDescription := "Sent when testing Telegram connection"
	dailyDescription := "Sent daily at 11PM with system health summary"
	alertDescription := "Sent immediately when critical service failure is detected"
	return []models.MessageTemplate{
		{
			TemplateType:       "test_connection",
			TemplateName:       "Test Connection",
			MessageTemplate:    "🔍 **Telegram Connection Test** - {{timestamp}}\n\nThis is a test message from RancherHub monitoring system.\n\n{{tagged_users}}",
			Description:        &testDescription,
			AvailableVariables: []string{"timestamp", "tagged_users"},
			IsDefault:          true,
			IsActive:           true,
		},
		{
			TemplateType:       "daily_health_check",
			TemplateName:       "Daily Health Check Report",
			MessageTemplate:    "🔍 **Daily Health Check Report** - {{date}} {{time}}\n\n{{visual_summary}}\n\n📈 **Performance**: Avg response time {{avg_response_time}}s\n⏰ Next check: Tomorrow 06:00\n\n{{tagged_users}}",
			Description:        &dailyDescription,
			AvailableVariables: []string{"date", "time", "visual_summary", "avg_response_time", "tagged_users"},
			IsDefault:          true,
			IsActive:           true,
		},
		{
			TemplateType:       "critical_alert",
			TemplateName:       "Critical Alert",
			MessageTemplate:    "🚨 **CRITICAL ALERT** - {{date}} {{time}}\n\n{{visual_alert}}\n\n📞 Contact DevOps team immediately\n\n{{tagged_users}}",
			Description:        &alertDescription,
			AvailableVariables: []string{"date", "time", "visual_alert", "tagged_users"},
			IsDefault:          true,
			IsActive:           true,
		},
	}
}
