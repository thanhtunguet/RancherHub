package server

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

const rateLimitWindow = time.Minute

type rateLimitBucket struct {
	windowStart time.Time
	count       int
}

type rateLimitRule struct {
	limit int
	ttl   time.Duration
}

func rateLimitMiddleware() gin.HandlerFunc {
	limiter := &rateLimiter{
		defaultRule: rateLimitRule{limit: 120, ttl: rateLimitWindow},
		overrides: map[string]rateLimitRule{
			"POST /api/auth/login":                     {limit: 10, ttl: rateLimitWindow},
			"POST /api/sites/:id/test":                 {limit: 5, ttl: rateLimitWindow},
			"GET /api/services/test-api/:siteId":       {limit: 5, ttl: rateLimitWindow},
			"GET /api/services/test-structure/:siteId": {limit: 5, ttl: rateLimitWindow},
			"POST /api/services/sync":                  {limit: 5, ttl: rateLimitWindow},
			"POST /api/configmaps/sync-key":            {limit: 10, ttl: rateLimitWindow},
			"POST /api/configmaps/sync-keys":           {limit: 10, ttl: rateLimitWindow},
			"POST /api/secrets/sync-key":               {limit: 10, ttl: rateLimitWindow},
			"POST /api/secrets/sync-keys":              {limit: 10, ttl: rateLimitWindow},
		},
		buckets: make(map[string]rateLimitBucket),
		now:     time.Now,
	}
	return limiter.handle
}

type rateLimiter struct {
	mu          sync.Mutex
	defaultRule rateLimitRule
	overrides   map[string]rateLimitRule
	buckets     map[string]rateLimitBucket
	now         func() time.Time
}

func (r *rateLimiter) handle(c *gin.Context) {
	if c.Request.Method == http.MethodOptions {
		c.Next()
		return
	}

	routePath := c.FullPath()
	if routePath == "" {
		routePath = c.Request.URL.Path
	}
	rule := r.ruleFor(c.Request.Method, routePath)
	if !r.allow(c.ClientIP()+" "+c.Request.Method+" "+routePath, rule) {
		abort(c, http.StatusTooManyRequests, "Too Many Requests")
		return
	}
	c.Next()
}

func (r *rateLimiter) ruleFor(method, routePath string) rateLimitRule {
	if rule, ok := r.overrides[method+" "+routePath]; ok {
		return rule
	}
	return r.defaultRule
}

func (r *rateLimiter) allow(key string, rule rateLimitRule) bool {
	now := r.now()

	r.mu.Lock()
	defer r.mu.Unlock()

	r.cleanupExpiredLocked(now)
	bucket := r.buckets[key]
	if bucket.windowStart.IsZero() || now.Sub(bucket.windowStart) >= rule.ttl {
		r.buckets[key] = rateLimitBucket{windowStart: now, count: 1}
		return true
	}
	if bucket.count >= rule.limit {
		return false
	}
	bucket.count++
	r.buckets[key] = bucket
	return true
}

func (r *rateLimiter) cleanupExpiredLocked(now time.Time) {
	for key, bucket := range r.buckets {
		if bucket.windowStart.IsZero() || now.Sub(bucket.windowStart) >= rateLimitWindow {
			delete(r.buckets, key)
		}
	}
}
