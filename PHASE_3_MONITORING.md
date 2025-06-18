# Phase 3: Monitoring and Alerting System

## Overview

Phase 3 focuses on implementing a comprehensive monitoring and alerting system for RancherHub. This phase will add automated monitoring capabilities with Telegram notifications, scheduled health checks, and proxy support for users in regions where Telegram is restricted.

## Key Features

### 1. Telegram Integration
- Configure Telegram bot token and chat ID for notifications
- Support for SOCKS5 proxy to bypass regional restrictions
- Rich message formatting with status indicators
- Configurable notification preferences

### 2. Scheduled Monitoring
- Daily health checks at 6:00 AM
- Monitor registered app instances for status changes
- Track service availability and performance metrics
- Automated alert generation for critical issues

### 3. Monitoring Dashboard
- Real-time status overview of all monitored instances
- Historical monitoring data and trends
- Alert history and resolution tracking
- Performance metrics visualization

## Technical Implementation

### 1. Database Schema Extensions

#### Monitoring Configuration Entity
```typescript
@Entity('monitoring_configs')
export class MonitoringConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'telegram_bot_token', length: 255 })
  telegramBotToken: string;

  @Column({ name: 'telegram_chat_id', length: 255 })
  telegramChatId: string;

  @Column({ name: 'proxy_host', length: 255, nullable: true })
  proxyHost: string;

  @Column({ name: 'proxy_port', type: 'integer', nullable: true })
  proxyPort: number;

  @Column({ name: 'proxy_username', length: 255, nullable: true })
  proxyUsername: string;

  @Column({ name: 'proxy_password', length: 255, nullable: true })
  proxyPassword: string;

  @Column({ name: 'monitoring_enabled', default: true })
  monitoringEnabled: boolean;

  @Column({ name: 'alert_threshold', type: 'integer', default: 3 })
  alertThreshold: number; // Number of consecutive failures before alert

  @Column({ name: 'notification_schedule', length: 50, default: 'daily' })
  notificationSchedule: string; // daily, hourly, immediate

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### Monitored Instance Entity
```typescript
@Entity('monitored_instances')
export class MonitoredInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'app_instance_id' })
  appInstanceId: string;

  @Column({ name: 'monitoring_enabled', default: true })
  monitoringEnabled: boolean;

  @Column({ name: 'check_interval_minutes', type: 'integer', default: 60 })
  checkIntervalMinutes: number;

  @Column({ name: 'last_check_time', type: 'datetime', nullable: true })
  lastCheckTime: Date;

  @Column({ name: 'last_status', length: 50, nullable: true })
  lastStatus: string;

  @Column({ name: 'consecutive_failures', type: 'integer', default: 0 })
  consecutiveFailures: number;

  @Column({ name: 'alert_sent', default: false })
  alertSent: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => AppInstance, (appInstance) => appInstance.monitoredInstances)
  @JoinColumn({ name: 'app_instance_id' })
  appInstance: AppInstance;
}
```

#### Monitoring History Entity
```typescript
@Entity('monitoring_history')
export class MonitoringHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'monitored_instance_id' })
  monitoredInstanceId: string;

  @Column({ name: 'check_time', type: 'datetime' })
  checkTime: Date;

  @Column({ length: 50 })
  status: string; // healthy, warning, critical, error

  @Column({ name: 'response_time_ms', type: 'integer', nullable: true })
  responseTimeMs: number;

  @Column({ name: 'services_count', type: 'integer', nullable: true })
  servicesCount: number;

  @Column({ name: 'healthy_services', type: 'integer', nullable: true })
  healthyServices: number;

  @Column({ name: 'failed_services', type: 'integer', nullable: true })
  failedServices: number;

  @Column({ type: 'text', nullable: true })
  details: string; // JSON string with detailed status info

  @Column({ type: 'text', nullable: true })
  error: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => MonitoredInstance, (instance) => instance.monitoringHistory)
  @JoinColumn({ name: 'monitored_instance_id' })
  monitoredInstance: MonitoredInstance;
}
```

#### Alert History Entity
```typescript
@Entity('alert_history')
export class AlertHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'monitored_instance_id' })
  monitoredInstanceId: string;

  @Column({ length: 50 })
  alertType: string; // status_change, service_failure, performance_degradation

  @Column({ length: 50 })
  severity: string; // info, warning, critical

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'telegram_sent', default: false })
  telegramSent: boolean;

  @Column({ name: 'telegram_message_id', length: 255, nullable: true })
  telegramMessageId: string;

  @Column({ name: 'resolved', default: false })
  resolved: boolean;

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => MonitoredInstance, (instance) => instance.alertHistory)
  @JoinColumn({ name: 'monitored_instance_id' })
  monitoredInstance: MonitoredInstance;
}
```

### 2. Backend Module Structure

#### Monitoring Module
```
backend/src/modules/monitoring/
├── dto/
│   ├── create-monitoring-config.dto.ts
│   ├── update-monitoring-config.dto.ts
│   ├── create-monitored-instance.dto.ts
│   ├── update-monitored-instance.dto.ts
│   └── test-telegram-connection.dto.ts
├── monitoring.controller.ts
├── monitoring.module.ts
├── monitoring.service.ts
├── telegram.service.ts
├── health-check.service.ts
└── cron.service.ts
```

#### Services Structure
```
backend/src/services/
├── telegram-api.service.ts
├── proxy.service.ts
└── monitoring-scheduler.service.ts
```

### 3. Frontend Components

#### Monitoring Management Components
```
frontend/src/components/monitoring/
├── MonitoringConfigForm.tsx
├── MonitoringDashboard.tsx
├── MonitoredInstanceCard.tsx
├── MonitoredInstanceForm.tsx
├── MonitoringHistoryChart.tsx
├── AlertHistoryTable.tsx
└── TelegramTestModal.tsx
```

#### Pages
```
frontend/src/pages/
├── MonitoringPage.tsx
└── AlertHistoryPage.tsx
```

## Implementation Plan

### Week 6: Core Monitoring Infrastructure

#### Day 1-2: Database and Entities
- [ ] Create monitoring-related entities
- [ ] Update database schema
- [ ] Add entity relationships
- [ ] Create database migrations

#### Day 3-4: Backend Core Services
- [ ] Implement Telegram API service with proxy support
- [ ] Create monitoring configuration service
- [ ] Implement health check service
- [ ] Add monitoring scheduler service

#### Day 5: Basic API Endpoints
- [ ] Create monitoring configuration CRUD endpoints
- [ ] Implement monitored instance management
- [ ] Add Telegram connection testing endpoint

### Week 7: Monitoring Logic and Scheduling

#### Day 1-2: Health Check Implementation
- [ ] Implement comprehensive health check logic
- [ ] Add service status monitoring
- [ ] Create performance metrics collection
- [ ] Implement alert threshold logic

#### Day 3-4: Cron Job Implementation
- [ ] Set up NestJS cron jobs
- [ ] Implement daily 6:00 AM monitoring schedule
- [ ] Add configurable monitoring intervals
- [ ] Create monitoring history tracking

#### Day 5: Alert System
- [ ] Implement alert generation logic
- [ ] Add Telegram notification formatting
- [ ] Create alert history tracking
- [ ] Implement alert resolution system

### Week 8: Frontend and Polish

#### Day 1-2: Frontend Components
- [ ] Create monitoring configuration UI
- [ ] Implement monitored instance management
- [ ] Add Telegram settings form with proxy configuration
- [ ] Create monitoring dashboard

#### Day 3-4: Advanced Features
- [ ] Implement monitoring history visualization
- [ ] Add alert history table
- [ ] Create performance metrics charts
- [ ] Add real-time status updates

#### Day 5: Testing and Documentation
- [ ] Comprehensive testing of monitoring system
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Final polish and bug fixes

## API Endpoints

### Monitoring Configuration

#### Get Monitoring Configuration
```
GET /api/monitoring/config

Response:
{
  "id": "config-1",
  "telegramBotToken": "encrypted-token",
  "telegramChatId": "123456789",
  "proxyHost": "proxy.example.com",
  "proxyPort": 1080,
  "proxyUsername": "user",
  "proxyPassword": "encrypted-password",
  "monitoringEnabled": true,
  "alertThreshold": 3,
  "notificationSchedule": "daily",
  "createdAt": "2023-06-15T10:00:00Z",
  "updatedAt": "2023-06-15T10:00:00Z"
}
```

#### Update Monitoring Configuration
```
PUT /api/monitoring/config
Content-Type: application/json

Request:
{
  "telegramBotToken": "new-bot-token",
  "telegramChatId": "123456789",
  "proxyHost": "proxy.example.com",
  "proxyPort": 1080,
  "proxyUsername": "user",
  "proxyPassword": "password",
  "monitoringEnabled": true,
  "alertThreshold": 3,
  "notificationSchedule": "daily"
}
```

#### Test Telegram Connection
```
POST /api/monitoring/config/test-telegram
Content-Type: application/json

Request:
{
  "telegramBotToken": "bot-token",
  "telegramChatId": "123456789",
  "proxyHost": "proxy.example.com",
  "proxyPort": 1080,
  "proxyUsername": "user",
  "proxyPassword": "password"
}

Response:
{
  "success": true,
  "message": "Test message sent successfully"
}
```

### Monitored Instances

#### Get All Monitored Instances
```
GET /api/monitoring/instances

Response:
[
  {
    "id": "monitored-1",
    "appInstanceId": "app-1",
    "monitoringEnabled": true,
    "checkIntervalMinutes": 60,
    "lastCheckTime": "2023-06-15T06:00:00Z",
    "lastStatus": "healthy",
    "consecutiveFailures": 0,
    "alertSent": false,
    "appInstance": {
      "id": "app-1",
      "name": "Web Frontend Dev",
      "cluster": "cluster-1",
      "namespace": "frontend-dev",
      "environment": {
        "name": "Development",
        "color": "#4CAF50"
      }
    }
  }
]
```

#### Add Instance to Monitoring
```
POST /api/monitoring/instances
Content-Type: application/json

Request:
{
  "appInstanceId": "app-1",
  "monitoringEnabled": true,
  "checkIntervalMinutes": 60
}
```

#### Update Monitored Instance
```
PUT /api/monitoring/instances/monitored-1
Content-Type: application/json

Request:
{
  "monitoringEnabled": true,
  "checkIntervalMinutes": 30
}
```

### Monitoring History

#### Get Monitoring History
```
GET /api/monitoring/history?instanceId=monitored-1&days=7

Response:
[
  {
    "id": "history-1",
    "monitoredInstanceId": "monitored-1",
    "checkTime": "2023-06-15T06:00:00Z",
    "status": "healthy",
    "responseTimeMs": 1250,
    "servicesCount": 5,
    "healthyServices": 5,
    "failedServices": 0,
    "details": "{\"services\":[...]}",
    "createdAt": "2023-06-15T06:00:00Z"
  }
]
```

### Alert History

#### Get Alert History
```
GET /api/monitoring/alerts?instanceId=monitored-1&resolved=false

Response:
[
  {
    "id": "alert-1",
    "monitoredInstanceId": "monitored-1",
    "alertType": "service_failure",
    "severity": "critical",
    "message": "Service 'frontend' is down in Development environment",
    "telegramSent": true,
    "telegramMessageId": "12345",
    "resolved": false,
    "createdAt": "2023-06-15T06:05:00Z"
  }
]
```

#### Resolve Alert
```
PUT /api/monitoring/alerts/alert-1/resolve
Content-Type: application/json

Request:
{
  "resolved": true
}
```

## Telegram Integration Details

### Message Formatting

#### Health Check Summary
```
🔍 **Daily Health Check Report** - 2023-06-15 06:00

📊 **Overall Status**: ✅ Healthy (5/5 instances)

**Environment: Development**
• Web Frontend Dev: ✅ Healthy (2/2 services)
• API Backend Dev: ✅ Healthy (3/3 services)

**Environment: Staging**
• Web Frontend Stage: ⚠️ Warning (1/2 services)
• API Backend Stage: ✅ Healthy (3/3 services)

**Environment: Production**
• Web Frontend Prod: ✅ Healthy (2/2 services)

📈 **Performance**: Avg response time 1.2s
⏰ Next check: Tomorrow 06:00
```

#### Critical Alert
```
🚨 **CRITICAL ALERT** - 2023-06-15 06:05

**Service Failure Detected**
• Environment: Production
• Instance: Web Frontend Prod
• Service: frontend-deployment
• Status: ❌ Failed (0/2 replicas available)

**Details:**
• Last healthy: 2023-06-15 05:30
• Duration: 35 minutes
• Impact: High - User-facing service

🔧 **Recommended Actions:**
1. Check pod logs
2. Verify resource limits
3. Restart deployment if needed

📞 Contact DevOps team immediately
```

### Proxy Configuration

The system will support SOCKS5 proxy configuration for Telegram API access:

```typescript
interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  type: 'socks5' | 'http';
}
```

### Telegram Service Implementation

```typescript
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly proxyService: ProxyService,
  ) {}

  async sendMessage(
    chatId: string,
    message: string,
    config: MonitoringConfig,
  ): Promise<string> {
    const axiosConfig = await this.createAxiosConfig(config);
    
    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
        {
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        },
        axiosConfig,
      );

      return response.data.result.message_id;
    } catch (error) {
      this.logger.error(`Failed to send Telegram message: ${error.message}`);
      throw new Error(`Telegram API error: ${error.message}`);
    }
  }

  private async createAxiosConfig(config: MonitoringConfig) {
    const axiosConfig: any = {
      timeout: 10000,
    };

    if (config.proxyHost && config.proxyPort) {
      const proxyConfig = {
        host: config.proxyHost,
        port: config.proxyPort,
        protocol: 'socks5',
      };

      if (config.proxyUsername && config.proxyPassword) {
        proxyConfig.auth = {
          username: config.proxyUsername,
          password: config.proxyPassword,
        };
      }

      axiosConfig.proxy = proxyConfig;
    }

    return axiosConfig;
  }
}
```

## Cron Job Implementation

### Daily Health Check Schedule

```typescript
@Injectable()
export class MonitoringSchedulerService {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly telegramService: TelegramService,
    private readonly monitoringConfigService: MonitoringConfigService,
  ) {}

  @Cron('0 6 * * *') // Every day at 6:00 AM
  async runDailyHealthCheck() {
    this.logger.log('Starting daily health check...');
    
    const config = await this.monitoringConfigService.getConfig();
    if (!config?.monitoringEnabled) {
      this.logger.log('Monitoring is disabled, skipping health check');
      return;
    }

    const instances = await this.monitoringConfigService.getMonitoredInstances();
    const results = await this.healthCheckService.checkAllInstances(instances);
    
    // Generate summary report
    const summary = this.generateSummaryReport(results);
    
    // Send Telegram notification
    if (config.telegramBotToken && config.telegramChatId) {
      await this.telegramService.sendMessage(
        config.telegramChatId,
        summary,
        config,
      );
    }
  }

  @Cron('0 */1 * * *') // Every hour
  async runHourlyChecks() {
    const config = await this.monitoringConfigService.getConfig();
    if (!config?.monitoringEnabled) return;

    const instances = await this.monitoringConfigService.getMonitoredInstances();
    
    for (const instance of instances) {
      if (instance.checkIntervalMinutes <= 60) {
        await this.healthCheckService.checkInstance(instance);
      }
    }
  }
}
```

## Frontend Implementation

### Monitoring Configuration Form

```typescript
interface MonitoringConfigFormProps {
  config?: MonitoringConfig;
  onSave: (config: MonitoringConfig) => void;
  onTestTelegram: (config: Partial<MonitoringConfig>) => Promise<void>;
}

export function MonitoringConfigForm({
  config,
  onSave,
  onTestTelegram,
}: MonitoringConfigFormProps) {
  const [form] = Form.useForm();
  const [testing, setTesting] = useState(false);

  const handleTestTelegram = async () => {
    setTesting(true);
    try {
      const values = await form.validateFields();
      await onTestTelegram(values);
      message.success('Telegram connection test successful!');
    } catch (error) {
      message.error('Telegram connection test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={onSave}>
      <Card title="Telegram Configuration" className="mb-4">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="telegramBotToken"
              label="Bot Token"
              rules={[{ required: true }]}
            >
              <Input.Password placeholder="Enter bot token" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="telegramChatId"
              label="Chat ID"
              rules={[{ required: true }]}
            >
              <Input placeholder="Enter chat ID" />
            </Form.Item>
          </Col>
        </Row>
        
        <Button
          type="dashed"
          onClick={handleTestTelegram}
          loading={testing}
          icon={<MessageOutlined />}
        >
          Test Telegram Connection
        </Button>
      </Card>

      <Card title="Proxy Configuration" className="mb-4">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="proxyHost" label="Proxy Host">
              <Input placeholder="proxy.example.com" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="proxyPort" label="Proxy Port">
              <InputNumber placeholder="1080" min={1} max={65535} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="proxyUsername" label="Username">
              <Input placeholder="Username" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="proxyPassword" label="Password">
          <Input.Password placeholder="Password" />
        </Form.Item>
      </Card>

      <Card title="Monitoring Settings">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="monitoringEnabled"
              label="Enable Monitoring"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="alertThreshold"
              label="Alert Threshold"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} max={10} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="notificationSchedule"
              label="Notification Schedule"
              rules={[{ required: true }]}
            >
              <Select>
                <Select.Option value="immediate">Immediate</Select.Option>
                <Select.Option value="hourly">Hourly</Select.Option>
                <Select.Option value="daily">Daily</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          Save Configuration
        </Button>
      </Form.Item>
    </Form>
  );
}
```

## Testing Strategy

### Unit Tests
- Telegram service with proxy support
- Health check service logic
- Monitoring scheduler functionality
- Alert generation and formatting

### Integration Tests
- End-to-end monitoring workflow
- Telegram API integration with proxy
- Database operations for monitoring data
- Cron job execution

### Manual Testing
- Telegram message delivery with proxy
- Daily health check execution
- Alert generation and resolution
- Frontend configuration management

## Security Considerations

### Data Protection
- Encrypt sensitive configuration data (tokens, passwords)
- Secure storage of proxy credentials
- Audit logging for monitoring operations

### API Security
- Validate all monitoring configuration inputs
- Rate limiting for Telegram API calls
- Secure handling of proxy connections

### Access Control
- Restrict monitoring configuration access
- Log all monitoring operations
- Implement proper error handling

## Performance Considerations

### Monitoring Efficiency
- Optimize health check queries
- Implement caching for frequently accessed data
- Batch Telegram notifications when possible

### Database Optimization
- Index monitoring history tables
- Implement data retention policies
- Optimize queries for large datasets

### Resource Management
- Monitor memory usage during health checks
- Implement timeout handling for external API calls
- Use connection pooling for database operations

## Deployment Considerations

### Environment Variables
```bash
# Monitoring Configuration
MONITORING_ENABLED=true
DEFAULT_ALERT_THRESHOLD=3
DEFAULT_CHECK_INTERVAL=60

# Telegram Configuration (optional)
DEFAULT_TELEGRAM_BOT_TOKEN=
DEFAULT_TELEGRAM_CHAT_ID=

# Proxy Configuration (optional)
DEFAULT_PROXY_HOST=
DEFAULT_PROXY_PORT=
DEFAULT_PROXY_USERNAME=
DEFAULT_PROXY_PASSWORD=
```

### Docker Configuration
- Add monitoring services to Docker Compose
- Configure health checks for monitoring containers
- Set up proper logging for monitoring operations

### Kubernetes Deployment
- Create monitoring-specific ConfigMaps and Secrets
- Implement proper resource limits for monitoring pods
- Set up monitoring service accounts and RBAC

## Success Metrics

### Functionality
- [ ] Telegram notifications working with proxy support
- [ ] Daily health checks executing at 6:00 AM
- [ ] Alert generation for critical issues
- [ ] Monitoring history tracking

### Performance
- [ ] Health check response time < 5 seconds per instance
- [ ] Telegram message delivery < 10 seconds
- [ ] Database queries optimized for monitoring data

### User Experience
- [ ] Intuitive monitoring configuration UI
- [ ] Clear alert messages and status indicators
- [ ] Easy monitoring instance management
- [ ] Comprehensive monitoring dashboard

## Future Enhancements

### Advanced Monitoring
- Custom health check scripts
- Performance metrics collection
- SLA monitoring and reporting

### Notification Channels
- Email notifications
- Slack integration
- Webhook support

### Advanced Analytics
- Trend analysis and predictions
- Capacity planning insights
- Automated recommendations

### Integration Features
- Integration with external monitoring tools
- API for third-party integrations
- Webhook endpoints for external systems
