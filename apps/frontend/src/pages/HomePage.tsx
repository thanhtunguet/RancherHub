import Alert from "antd/es/alert";
import Badge from 'antd/es/badge';
import Button from "antd/es/button";
import Card from "antd/es/card";
import Col from 'antd/es/col';
import Empty from 'antd/es/empty';
import Row from 'antd/es/row';
import Space from "antd/es/space";
import Spin from 'antd/es/spin';
import Statistic from 'antd/es/statistic';
import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import Typography from "antd/es/typography";
import { useEffect, useState } from 'react';

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import message from 'antd/es/message';
import {
  ArrowRightIcon,
  DatabaseIcon,
  LayersIcon,
  ServerIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppInstances } from "../hooks/useAppInstances";
import { useEnvironments } from "../hooks/useEnvironments";
import { useSites } from "../hooks/useSites";
import { monitoringApi } from '../services/api';

const { Title, Paragraph, Text } = Typography;

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

export function HomePage() {
  const navigate = useNavigate();
  const { data: sites } = useSites();
  const { data: environments } = useEnvironments();
  const { data: appInstances } = useAppInstances();
  
  // Monitoring state
  const [instances, setInstances] = useState<MonitoredInstance[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [monitoringLoading, setMonitoringLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringDaily, setTriggeringDaily] = useState(false);
  const [triggeringHourly, setTriggeringHourly] = useState(false);

  const sitesCount = sites?.length || 0;
  const environmentsCount = environments?.length || 0;
  const appInstancesCount = appInstances?.length || 0;
  const hasActiveSite = sitesCount > 0;
  const hasEnvironments = environmentsCount > 0;

  useEffect(() => {
    loadMonitoringData();
  }, []);

  const loadMonitoringData = async () => {
    try {
      setMonitoringLoading(true);
      const [instancesData, alertsData] = await Promise.all([
        monitoringApi.getMonitoredInstances(),
        monitoringApi.getAlertHistory(undefined, false), // Get unresolved alerts
      ]);
      setInstances(instancesData || []);
      setAlerts(alertsData || []);
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setMonitoringLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMonitoringData();
    setRefreshing(false);
  };

  const handleTriggerDailyCheck = async () => {
    try {
      setTriggeringDaily(true);
      const response = await monitoringApi.triggerDailyCheck();
      message.success(response.message || 'Daily health check triggered successfully');
      setTimeout(() => {
        handleRefresh();
      }, 2000);
    } catch (error) {
      console.error('Failed to trigger daily check:', error);
      message.error('Failed to trigger daily health check');
    } finally {
      setTriggeringDaily(false);
    }
  };

  const handleTriggerHourlyCheck = async () => {
    try {
      setTriggeringHourly(true);
      const response = await monitoringApi.triggerHourlyCheck();
      message.success(response.message || 'Hourly health check triggered successfully');
      setTimeout(() => {
        handleRefresh();
      }, 2000);
    } catch (error) {
      console.error('Failed to trigger hourly check:', error);
      message.error('Failed to trigger hourly health check');
    } finally {
      setTriggeringHourly(false);
    }
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

  // Calculate monitoring statistics
  const monitoringStats = {
    total: instances.length,
    healthy: instances.filter(i => i.lastStatus === 'healthy').length,
    warning: instances.filter(i => i.lastStatus === 'warning').length,
    critical: instances.filter(i => i.lastStatus === 'critical' || i.lastStatus === 'error').length,
    disabled: instances.filter(i => !i.monitoringEnabled).length,
  };

  const monitoringColumns = [
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

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Setup Status Overview */}
        <div className="mb-8">
          <Title level={3}>Setup Status</Title>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card
              className={
                sitesCount > 0
                  ? "border-green-200 bg-green-50"
                  : "border-orange-200 bg-orange-50"
              }
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">Rancher Sites</div>
                  <div className="text-2xl font-bold">{sitesCount}</div>
                  {hasActiveSite && (
                    <div className="text-sm text-green-600">
                      ✓ Active site configured
                    </div>
                  )}
                </div>
                <ServerIcon
                  size={32}
                  className={
                    sitesCount > 0 ? "text-green-500" : "text-orange-500"
                  }
                />
              </div>
              <Button
                type="link"
                className="p-0 h-auto mt-2"
                onClick={() => navigate("/sites")}
              >
                {sitesCount > 0 ? "Manage Sites" : "Add First Site"}{" "}
                <ArrowRightIcon size={14} />
              </Button>
            </Card>

            <Card
              className={
                environmentsCount > 0
                  ? "border-green-200 bg-green-50"
                  : "border-orange-200 bg-orange-50"
              }
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">Environments</div>
                  <div className="text-2xl font-bold">{environmentsCount}</div>
                  {hasEnvironments && (
                    <div className="text-sm text-green-600">
                      ✓ Environments configured
                    </div>
                  )}
                </div>
                <LayersIcon
                  size={32}
                  className={
                    environmentsCount > 0 ? "text-green-500" : "text-orange-500"
                  }
                />
              </div>
              <Button
                type="link"
                className="p-0 h-auto mt-2"
                onClick={() => navigate("/environments")}
              >
                {environmentsCount > 0
                  ? "Manage Environments"
                  : "Create First Environment"}{" "}
                <ArrowRightIcon size={14} />
              </Button>
            </Card>

            <Card
              className={
                appInstancesCount > 0
                  ? "border-green-200 bg-green-50"
                  : "border-orange-200 bg-orange-50"
              }
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">App Instances</div>
                  <div className="text-2xl font-bold">{appInstancesCount}</div>
                  {appInstancesCount > 0 && (
                    <div className="text-sm text-green-600">
                      ✓ App instances configured
                    </div>
                  )}
                </div>
                <DatabaseIcon
                  size={32}
                  className={
                    appInstancesCount > 0 ? "text-green-500" : "text-orange-500"
                  }
                />
              </div>
              <Button
                type="link"
                className="p-0 h-auto mt-2"
                onClick={() => navigate("/app-instances")}
              >
                {appInstancesCount > 0
                  ? "Manage App Instances"
                  : "Create First App Instance"}{" "}
                <ArrowRightIcon size={14} />
              </Button>
            </Card>
          </div>
        </div>

        {/* Getting Started */}
        {(!sitesCount || !environmentsCount || !appInstancesCount) && (
          <Alert
            message="Getting Started"
            description={
              <div>
                <p className="mb-3">
                  Complete these steps to start managing your Rancher services:
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  {!sitesCount && (
                    <li>Add your first Rancher site connection</li>
                  )}
                  {!environmentsCount && (
                    <li>Create environments (Dev, Staging, Production)</li>
                  )}
                  {!appInstancesCount && environmentsCount > 0 && (
                    <li>Configure app instances for your environments</li>
                  )}
                  <li>Start synchronizing services between environments</li>
                </ol>
              </div>
            }
            type="info"
            showIcon
            className="mb-8"
          />
        )}

        {/* System Monitoring */}
        <div className="mb-8">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={3}>System Monitoring</Title>
            <Space>
              <Button 
                icon={<PlayCircleOutlined />} 
                onClick={handleTriggerHourlyCheck} 
                loading={triggeringHourly}
                type="primary"
                ghost
              >
                Trigger Hourly Check
              </Button>
              <Button 
                icon={<PlayCircleOutlined />} 
                onClick={handleTriggerDailyCheck} 
                loading={triggeringDaily}
                type="primary"
              >
                Trigger Daily Check
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRefresh} 
                loading={refreshing}
              >
                Refresh
              </Button>
            </Space>
          </div>

          {/* Monitoring Statistics */}
          <Spin spinning={monitoringLoading}>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Total Instances"
                    value={monitoringStats.total}
                    prefix={<EyeOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Healthy"
                    value={monitoringStats.healthy}
                    prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Warning"
                    value={monitoringStats.warning}
                    prefix={<WarningOutlined style={{ color: '#faad14' }} />}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Critical"
                    value={monitoringStats.critical}
                    prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
            </Row>
          </Spin>

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
            <Spin spinning={monitoringLoading}>
              {instances.length === 0 ? (
                <Empty 
                  description="No monitored instances configured"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  <Button 
                    type="primary" 
                    onClick={() => navigate('/monitoring/instances')}
                  >
                    Add Instance to Monitoring
                  </Button>
                </Empty>
              ) : (
                <Table
                  columns={monitoringColumns}
                  dataSource={instances}
                  rowKey="id"
                  pagination={{
                    total: instances.length,
                    pageSize: 5,
                    showSizeChanger: false,
                  }}
                />
              )}
            </Spin>
          </Card>

          {/* Recent Alerts */}
          {alerts.length > 0 && (
            <Card title="Active Alerts">
              <Spin spinning={monitoringLoading}>
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
              </Spin>
            </Card>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Multi-Site Support" className="text-center">
            <Paragraph>
              Connect to multiple Rancher instances and manage them from a
              single dashboard
            </Paragraph>
          </Card>

          <Card title="Environment Management" className="text-center">
            <Paragraph>
              Organize your applications by environments (Dev, Staging,
              Production)
            </Paragraph>
          </Card>

          <Card title="Service Synchronization" className="text-center">
            <Paragraph>
              Sync services between environments with a single click and track
              history
            </Paragraph>
          </Card>
        </div>
      </div>
    </div>
  );
}
