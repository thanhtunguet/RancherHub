import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Badge,
  Typography,
  Button,
  Tag,
  Empty,
  Alert,
  Space,
} from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { monitoringApi } from '../../services/api';

const { Title, Text } = Typography;

interface MonitoredInstance {
  id: string;
  appInstanceId: string;
  monitoringEnabled: boolean;
  checkIntervalMinutes: number;
  lastCheckTime: string;
  lastStatus: string;
  consecutiveFailures: number;
  alertSent: boolean;
  appInstance: {
    id: string;
    name: string;
    cluster: string;
    namespace: string;
    environment: {
      name: string;
      color: string;
    };
  };
}

interface Alert {
  id: string;
  alertType: string;
  severity: string;
  message: string;
  resolved: boolean;
  createdAt: string;
  monitoredInstance: {
    appInstance: {
      name: string;
      environment: {
        name: string;
      };
    };
  };
}

export const MonitoringDashboard: React.FC = () => {
  const [instances, setInstances] = useState<MonitoredInstance[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [instancesData, alertsData] = await Promise.all([
        monitoringApi.getMonitoredInstances(),
        monitoringApi.getAlertHistory(undefined, false), // Get unresolved alerts
      ]);
      setInstances(instancesData || []);
      setAlerts(alertsData || []);
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'critical':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ExclamationCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'red';
      case 'warning':
        return 'orange';
      case 'info':
        return 'blue';
      default:
        return 'default';
    }
  };

  // Calculate statistics
  const stats = {
    total: instances.length,
    healthy: instances.filter(i => i.lastStatus === 'healthy').length,
    warning: instances.filter(i => i.lastStatus === 'warning').length,
    critical: instances.filter(i => i.lastStatus === 'critical' || i.lastStatus === 'error').length,
    disabled: instances.filter(i => !i.monitoringEnabled).length,
  };

  const columns = [
    {
      title: 'Instance',
      key: 'instance',
      render: (record: MonitoredInstance) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.appInstance.name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.appInstance.cluster} / {record.appInstance.namespace}
          </Text>
        </div>
      ),
    },
    {
      title: 'Environment',
      key: 'environment',
      render: (record: MonitoredInstance) => (
        <Tag color={record.appInstance.environment.color}>
          {record.appInstance.environment.name}
        </Tag>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (record: MonitoredInstance) => (
        <Space>
          {getStatusIcon(record.lastStatus)}
          <Badge status={getStatusColor(record.lastStatus) as any} text={record.lastStatus || 'Unknown'} />
        </Space>
      ),
    },
    {
      title: 'Last Check',
      dataIndex: 'lastCheckTime',
      key: 'lastCheckTime',
      render: (time: string) => 
        time ? new Date(time).toLocaleString() : 'Never',
    },
    {
      title: 'Failures',
      dataIndex: 'consecutiveFailures',
      key: 'consecutiveFailures',
      render: (failures: number) => 
        failures > 0 ? <Tag color="red">{failures}</Tag> : <Tag color="green">0</Tag>,
    },
    {
      title: 'Monitoring',
      key: 'monitoring',
      render: (record: MonitoredInstance) => (
        <Space>
          <Badge 
            status={record.monitoringEnabled ? 'success' : 'default'} 
            text={record.monitoringEnabled ? 'Enabled' : 'Disabled'} 
          />
          {record.alertSent && <Tag color="orange">Alert Sent</Tag>}
        </Space>
      ),
    },
  ];

  const alertColumns = [
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)}>
          {severity.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Instance',
      key: 'instance',
      render: (record: Alert) => (
        <div>
          <div>{record.monitoredInstance?.appInstance?.name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.monitoredInstance?.appInstance?.environment?.name}
          </Text>
        </div>
      ),
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => new Date(time).toLocaleString(),
    },
  ];

  if (loading) {
    return <Card loading={loading} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3}>Monitoring Dashboard</Title>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={handleRefresh} 
          loading={refreshing}
        >
          Refresh
        </Button>
      </div>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Instances"
              value={stats.total}
              prefix={<EyeOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Healthy"
              value={stats.healthy}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Warning"
              value={stats.warning}
              prefix={<WarningOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Critical"
              value={stats.critical}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Alert
          message={`${alerts.length} active alert${alerts.length > 1 ? 's' : ''} require attention`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Monitored Instances Table */}
      <Card title="Monitored Instances" style={{ marginBottom: 24 }}>
        {instances.length === 0 ? (
          <Empty 
            description="No monitored instances configured"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={instances}
            rowKey="id"
            pagination={{
              total: instances.length,
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} instances`,
            }}
          />
        )}
      </Card>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <Card title="Active Alerts">
          <Table
            columns={alertColumns}
            dataSource={alerts}
            rowKey="id"
            pagination={{
              total: alerts.length,
              pageSize: 5,
              showSizeChanger: false,
            }}
          />
        </Card>
      )}
    </div>
  );
};