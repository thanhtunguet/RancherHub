import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Typography,
  Space,
  Button,
  Badge,
  Descriptions,
  Alert,
  Empty,
  Drawer,
  Timeline,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  EyeOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { monitoringApi } from '../../services/api';

const { Title, Text } = Typography;

interface Alert {
  id: string;
  alertType: string;
  severity: string;
  message: string;
  resolved: boolean;
  createdAt: string;
  resolvedAt?: string;
  monitoredInstance: {
    id: string;
    appInstance: {
      name: string;
      cluster: string;
      namespace: string;
      environment: {
        name: string;
        color: string;
      };
    };
  };
}

interface MonitoringHistory {
  id: string;
  status: string;
  responseTimeMs: number;
  servicesCount: number;
  healthyServices: number;
  failedServices: number;
  checkTime: string;
  details?: {
    workloads?: any[];
    cluster: string;
    namespace: string;
  };
}

interface AlertDetailPageProps {
  onBack: () => void;
}

export const AlertDetailPage: React.FC<AlertDetailPageProps> = ({ onBack }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [monitoringHistory, setMonitoringHistory] = useState<MonitoringHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const alertsData = await monitoringApi.getAlertHistory();
      setAlerts(alertsData || []);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonitoringHistory = async (instanceId: string) => {
    try {
      setHistoryLoading(true);
      const historyData = await monitoringApi.getMonitoringHistory(instanceId, 7);
      setMonitoringHistory(historyData || []);
    } catch (error) {
      console.error('Failed to load monitoring history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleViewDetails = async (alert: Alert) => {
    setSelectedAlert(alert);
    await loadMonitoringHistory(alert.monitoredInstance.id);
    setDetailDrawerVisible(true);
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await monitoringApi.resolveAlert(alertId);
      await loadAlerts(); // Refresh the list
    } catch (error) {
      console.error('Failed to resolve alert:', error);
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
      filters: [
        { text: 'Critical', value: 'critical' },
        { text: 'Warning', value: 'warning' },
        { text: 'Info', value: 'info' },
      ],
      onFilter: (value: any, record: Alert) => record.severity === value,
    },
    {
      title: 'Instance',
      key: 'instance',
      render: (record: Alert) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.monitoredInstance?.appInstance?.name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.monitoredInstance?.appInstance?.cluster} / {record.monitoredInstance?.appInstance?.namespace}
          </Text>
          <div>
            <Tag color={record.monitoredInstance?.appInstance?.environment?.color}>
              {record.monitoredInstance?.appInstance?.environment?.name}
            </Tag>
          </div>
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
      title: 'Status',
      key: 'resolved',
      render: (record: Alert) => (
        <Badge
          status={record.resolved ? 'success' : 'error'}
          text={record.resolved ? 'Resolved' : 'Active'}
        />
      ),
      filters: [
        { text: 'Active', value: false },
        { text: 'Resolved', value: true },
      ],
      onFilter: (value: any, record: Alert) => record.resolved === value,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => new Date(time).toLocaleString(),
      sorter: (a: Alert, b: Alert) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend' as any,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Alert) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewDetails(record)}
          >
            Details
          </Button>
          {!record.resolved && (
            <Button
              icon={<CheckCircleOutlined />}
              size="small"
              type="link"
              onClick={() => handleResolveAlert(record.id)}
            >
              Resolve
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={onBack}
          style={{ marginRight: 12 }}
        >
          Back to Dashboard
        </Button>
        <Title level={3} style={{ margin: 0 }}>Alert History</Title>
      </div>

      <Card title="All Alerts" loading={loading}>
        {alerts.length === 0 ? (
          <Empty 
            description="No alerts found"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={alertColumns}
            dataSource={alerts}
            rowKey="id"
            pagination={{
              total: alerts.length,
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} alerts`,
            }}
          />
        )}
      </Card>

      <Drawer
        title="Alert Details"
        placement="right"
        size="large"
        onClose={() => setDetailDrawerVisible(false)}
        open={detailDrawerVisible}
      >
        {selectedAlert && (
          <div>
            <Descriptions title="Alert Information" bordered column={1}>
              <Descriptions.Item label="Severity">
                <Tag color={getSeverityColor(selectedAlert.severity)}>
                  {selectedAlert.severity.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Instance">
                {selectedAlert.monitoredInstance?.appInstance?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Environment">
                <Tag color={selectedAlert.monitoredInstance?.appInstance?.environment?.color}>
                  {selectedAlert.monitoredInstance?.appInstance?.environment?.name}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Cluster">
                {selectedAlert.monitoredInstance?.appInstance?.cluster}
              </Descriptions.Item>
              <Descriptions.Item label="Namespace">
                {selectedAlert.monitoredInstance?.appInstance?.namespace}
              </Descriptions.Item>
              <Descriptions.Item label="Message">
                {selectedAlert.message}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge
                  status={selectedAlert.resolved ? 'success' : 'error'}
                  text={selectedAlert.resolved ? 'Resolved' : 'Active'}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {new Date(selectedAlert.createdAt).toLocaleString()}
              </Descriptions.Item>
              {selectedAlert.resolvedAt && (
                <Descriptions.Item label="Resolved">
                  {new Date(selectedAlert.resolvedAt).toLocaleString()}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            <Title level={4}>
              <HistoryOutlined /> Recent Monitoring History
            </Title>
            
            {historyLoading ? (
              <Card loading />
            ) : (
              <Timeline>
                {monitoringHistory.slice(0, 10).map((history) => (
                  <Timeline.Item
                    key={history.id}
                    dot={getStatusIcon(history.status)}
                  >
                    <div>
                      <strong>{new Date(history.checkTime).toLocaleString()}</strong>
                      <div>
                        Status: <Tag color={history.status === 'healthy' ? 'green' : 'red'}>
                          {history.status.toUpperCase()}
                        </Tag>
                      </div>
                      <div>
                        Services: {history.healthyServices}/{history.servicesCount} healthy
                        {history.failedServices > 0 && (
                          <span style={{ color: '#ff4d4f' }}> ({history.failedServices} failed)</span>
                        )}
                      </div>
                      <div>Response time: {(history.responseTimeMs / 1000).toFixed(1)}s</div>
                      
                      {history.details?.workloads && history.failedServices > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <Text strong style={{ color: '#ff4d4f' }}>Failed Services:</Text>
                          <ul style={{ margin: '4px 0 0 16px', fontSize: '12px' }}>
                            {history.details.workloads
                              .filter((w: any) => w.status === 'failed')
                              .slice(0, 3)
                              .map((workload: any, index: number) => (
                                <li key={index}>
                                  {workload.name} ({workload.type}): {workload.state}
                                  {workload.scale && ` [${workload.availableReplicas || 0}/${workload.scale}]`}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};