import React, { useState } from 'react';
import Card from 'antd/es/card';
import Tag from 'antd/es/tag';
import Button from 'antd/es/button';
import Space from 'antd/es/space';
import Tooltip from 'antd/es/tooltip';
import Switch from 'antd/es/switch';
import Popconfirm from 'antd/es/popconfirm';
import Badge from 'antd/es/badge';
import Typography from 'antd/es/typography';
import Row from 'antd/es/row';
import Col from 'antd/es/col';
import {
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface MonitoredInstanceCardProps {
  instance: {
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
  };
  onEdit?: (instance: any) => void;
  onDelete?: (id: string) => void;
  onToggleMonitoring?: (id: string, enabled: boolean) => void;
}

export const MonitoredInstanceCard: React.FC<MonitoredInstanceCardProps> = ({
  instance,
  onEdit,
  onDelete,
  onToggleMonitoring,
}) => {
  const [updating, setUpdating] = useState(false);

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

  const handleToggleMonitoring = async (enabled: boolean) => {
    setUpdating(true);
    try {
      await onToggleMonitoring?.(instance.id, enabled);
    } catch (error) {
      console.error('Failed to toggle monitoring:', error);
    } finally {
      setUpdating(false);
    }
  };

  const formatLastCheckTime = (time: string) => {
    if (!time) return 'Never';
    const date = new Date(time);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <Card
      size="small"
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong>{instance.appInstance.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {instance.appInstance.cluster} / {instance.appInstance.namespace}
            </Text>
          </div>
          <Tag color={instance.appInstance.environment.color}>
            {instance.appInstance.environment.name}
          </Tag>
        </div>
      }
      extra={
        <Space>
          <Tooltip title="Edit monitoring settings">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => onEdit?.(instance)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Remove from monitoring?"
            description="This will stop monitoring this instance."
            onConfirm={() => onDelete?.(instance.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Remove from monitoring">
              <Button 
                type="text" 
                icon={<DeleteOutlined />} 
                danger
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      }
    >
      <Row gutter={16}>
        <Col span={12}>
          <div style={{ marginBottom: 12 }}>
            <Space>
              {getStatusIcon(instance.lastStatus)}
              <Badge 
                status={getStatusColor(instance.lastStatus) as any} 
                text={instance.lastStatus || 'Unknown'} 
              />
            </Space>
          </div>
          
          <div style={{ marginBottom: 8 }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <ClockCircleOutlined /> Last Check: {formatLastCheckTime(instance.lastCheckTime)}
            </Text>
          </div>
          
          <div style={{ marginBottom: 8 }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Check Interval: {instance.checkIntervalMinutes}m
            </Text>
          </div>
        </Col>
        
        <Col span={12}>
          <div style={{ marginBottom: 12 }}>
            <Space>
              <Text style={{ fontSize: '12px' }}>Monitoring:</Text>
              <Switch
                size="small"
                checked={instance.monitoringEnabled}
                onChange={handleToggleMonitoring}
                loading={updating}
              />
            </Space>
          </div>
          
          {instance.consecutiveFailures > 0 && (
            <div style={{ marginBottom: 8 }}>
              <Tag color="red" style={{ fontSize: '11px' }}>
                {instance.consecutiveFailures} failures
              </Tag>
            </div>
          )}
          
          {instance.alertSent && (
            <div style={{ marginBottom: 8 }}>
              <Tag color="orange" style={{ fontSize: '11px' }}>
                Alert sent
              </Tag>
            </div>
          )}
        </Col>
      </Row>
    </Card>
  );
};