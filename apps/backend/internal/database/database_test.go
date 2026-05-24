package database

import (
	"sync"
	"testing"
	"time"

	"rancher-hub-backend/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

type legacyAlertHistory struct {
	ID                  string     `gorm:"type:uuid;primaryKey"`
	MonitoredInstanceID string     `gorm:"column:monitored_instance_id;not null"`
	Severity            string     `gorm:"size:50;not null"`
	Message             string     `gorm:"type:text;not null"`
	TelegramSent        bool       `gorm:"column:telegram_sent;default:false"`
	TelegramMessageID   *string    `gorm:"column:telegram_message_id;size:255"`
	Resolved            bool       `gorm:"default:false"`
	ResolvedAt          *time.Time `gorm:"column:resolved_at"`
	CreatedAt           time.Time  `gorm:"column:createdAt"`
}

func (legacyAlertHistory) TableName() string {
	return "alert_history"
}

func TestMigrate_BackfillsAlertTypeForLegacyAlertHistoryRows(t *testing.T) {

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}

	if err := db.Migrator().CreateTable(&legacyAlertHistory{}); err != nil {
		t.Fatalf("create legacy alert_history: %v", err)
	}

	if err := db.Create(&legacyAlertHistory{
		ID:                  "legacy-1",
		MonitoredInstanceID: "instance-1",
		Severity:            "critical",
		Message:             "legacy alert",
		TelegramSent:        false,
		Resolved:            false,
		CreatedAt:           time.Now(),
	}).Error; err != nil {
		t.Fatalf("insert legacy alert_history row: %v", err)
	}

	if err := Migrate(db); err != nil {
		t.Fatalf("migrate should succeed for legacy rows: %v", err)
	}

	var alertType string
	if err := db.Table("alert_history").Select("alert_type").Where("id = ?", "legacy-1").Scan(&alertType).Error; err != nil {
		t.Fatalf("query alert_type: %v", err)
	}
	if alertType == "" {
		t.Fatalf("expected legacy row alert_type to be backfilled")
	}
}

func TestUserSchemaMatchesNestUniqueColumns(t *testing.T) {
	userSchema, err := schema.Parse(&models.User{}, &sync.Map{}, schema.NamingStrategy{})
	if err != nil {
		t.Fatalf("parse user schema: %v", err)
	}

	for _, fieldName := range []string{"Username", "Email"} {
		field := userSchema.FieldsByName[fieldName]
		if field == nil {
			t.Fatalf("expected %s field in user schema", fieldName)
		}
		if !field.Unique {
			t.Fatalf("expected %s to use a column-level unique constraint", fieldName)
		}
		if field.UniqueIndex != "" {
			t.Fatalf("expected %s not to use uniqueIndex, got %q", fieldName, field.UniqueIndex)
		}
	}
}
