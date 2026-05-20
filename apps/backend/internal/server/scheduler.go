package server

import (
	"log"
	"time"
)

func (s *Server) startMonitoringScheduler() {
	go s.runDailySchedule()
	go s.runHourlySchedule()
	go s.runFrequentSchedule()
	go s.runTrustedDeviceCleanupSchedule()
}

func (s *Server) runDailySchedule() {
	for {
		time.Sleep(time.Until(nextDailyAt(23, 0)))
		if err := s.runDailyHealthCheck(); err != nil {
			log.Printf("daily health check failed: %v", err)
		}
	}
}

func (s *Server) runHourlySchedule() {
	for {
		time.Sleep(time.Until(nextHour()))
		if err := s.runHourlyHealthCheck(); err != nil {
			log.Printf("hourly health check failed: %v", err)
		}
	}
}

func (s *Server) runFrequentSchedule() {
	ticker := time.NewTicker(3 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		if err := s.runFrequentHealthCheck(); err != nil {
			log.Printf("frequent health check failed: %v", err)
		}
	}
}

func (s *Server) runTrustedDeviceCleanupSchedule() {
	for {
		time.Sleep(time.Until(nextDailyAt(0, 0)))
		if err := s.cleanupExpiredTrustedDevices(); err != nil {
			log.Printf("trusted device cleanup failed: %v", err)
		}
	}
}

func nextDailyAt(hour, minute int) time.Time {
	now := time.Now()
	next := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, now.Location())
	if !next.After(now) {
		next = next.AddDate(0, 0, 1)
	}
	return next
}

func nextHour() time.Time {
	now := time.Now()
	return now.Truncate(time.Hour).Add(time.Hour)
}
