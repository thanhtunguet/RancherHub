import React, { useState, useEffect } from 'react';
import Button from 'antd/es/button';
import Table from 'antd/es/table';
import message from 'antd/es/message';
import Card from 'antd/es/card';
import Tag from 'antd/es/tag';
import Switch from 'antd/es/switch';
import Space from 'antd/es/space';
import Popconfirm from 'antd/es/popconfirm';
import Badge from 'antd/es/badge';
import Tooltip from 'antd/es/tooltip';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  MonitorOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { MonitoredInstanceForm } from '../components/monitoring/MonitoredInstanceForm';
import { monitoringApi } from '../services/api';

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

export const MonitoredInstancesPage: React.FC = () => {
  const [instances, setInstances] = useState<MonitoredInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingInstance, setEditingInstance] = useState<MonitoredInstance | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    try {
      setLoading(true);
      const data = await monitoringApi.getMonitoredInstances();
      setInstances(data || []);
    } catch (error) {
      console.error('Failed to load monitored instances:', error);
      message.error('Failed to load monitored instances');
    } finally {
      setLoading(false);
    }
  };

  const handleAddInstance = () => {
    setEditingInstance(null);
    setFormVisible(true);
  };

  const handleEditInstance = (instance: MonitoredInstance) => {
    setEditingInstance(instance);
    setFormVisible(true);
  };

  const handleFormSubmit = async (values: any) => {
    try {
      if (editingInstance) {
        await monitoringApi.updateMonitoredInstance(editingInstance.id, values);
        message.success('Monitored instance updated successfully');
      } else {
        await monitoringApi.createMonitoredInstance(values);
        message.success('Instance added to monitoring successfully');
      }
      setFormVisible(false);
      setEditingInstance(null);
      await loadInstances();
    } catch (error: any) {
      console.error('Failed to save monitored instance:', error);
      message.error(error.response?.data?.message || 'Failed to save monitored instance');
    }
  };

  const handleDeleteInstance = async (id: string) => {
    try {
      await monitoringApi.deleteMonitoredInstance(id);
      message.success('Instance removed from monitoring');
      await loadInstances();
    } catch (error) {
      console.error('Failed to delete monitored instance:', error);
      message.error('Failed to remove instance from monitoring');
    }
  };

  const handleToggleMonitoring = async (id: string, enabled: boolean) => {
    setUpdatingIds(prev => new Set(prev).add(id));
    try {
      await monitoringApi.updateMonitoredInstance(id, { monitoringEnabled: enabled });
      message.success(`Monitoring ${enabled ? 'enabled' : 'disabled'}`);
      await loadInstances();
    } catch (error) {
      console.error('Failed to toggle monitoring:', error);
      message.error('Failed to update monitoring status');
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
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

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
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

  const columns: ColumnsType<MonitoredInstance> = [
    {
      title: 'Instance Name',
      dataIndex: ['appInstance', 'name'],
      key: 'name',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.appInstance.name}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            {record.appInstance.cluster} / {record.appInstance.namespace}
          </div>
        </div>
      ),
    },
    {
      title: 'Environment',
      dataIndex: ['appInstance', 'environment'],
      key: 'environment',
      render: (_, record) => (
        <Tag color={record.appInstance.environment.color}>
          {record.appInstance.environment.name}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'lastStatus',
      key: 'status',
      render: (status: string) => (
        <Space>
          {getStatusIcon(status)}
          <Badge status={getStatusColor(status)} text={status || 'Unknown'} />
        </Space>
      ),
    },
    {
      title: 'Last Check',
      dataIndex: 'lastCheckTime',
      key: 'lastCheckTime',
      render: (time: string) => (
        <Tooltip title={time ? new Date(time).toLocaleString() : 'Never checked'}>
          <span>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {formatLastCheckTime(time)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Interval',
      dataIndex: 'checkIntervalMinutes',
      key: 'interval',
      render: (minutes: number) => `${minutes}m`,
    },
    {
      title: 'Failures',
      dataIndex: 'consecutiveFailures',
      key: 'failures',
      render: (failures: number, record) => (
        <Space>
          {failures > 0 && <Tag color="red">{failures} failures</Tag>}
          {record.alertSent && <Tag color="orange">Alert sent</Tag>}
          {failures === 0 && !record.alertSent && <span>-</span>}
        </Space>
      ),
    },
    {
      title: 'Monitoring',
      dataIndex: 'monitoringEnabled',
      key: 'monitoringEnabled',
      render: (enabled: boolean, record) => (
        <Switch
          size="small"
          checked={enabled}
          onChange={(checked) => handleToggleMonitoring(record.id, checked)}
          loading={updatingIds.has(record.id)}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditInstance(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Remove from monitoring?"
            description="This will stop monitoring this instance."
            onConfirm={() => handleDeleteInstance(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Remove">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Monitored Instances</h1>
          <p style={{ margin: '4px 0 0', color: '#666' }}>
            Monitor app instances health and performance
          </p>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAddInstance}
        >
          Add Instance to Monitoring
        </Button>
      </div>
      
      {instances.length === 0 && !loading ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <MonitorOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: 16 }} />
            <div style={{ fontSize: '16px', marginBottom: 8 }}>No instances are being monitored</div>
            <div style={{ color: '#999', marginBottom: 16 }}>
              Add app instances to start monitoring their health and performance
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddInstance}>
              Add Instance to Monitoring
            </Button>
          </div>
        </Card>
      ) : (
        <Table
          columns={columns}
          dataSource={instances}
          rowKey="id"
          loading={loading}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} instances`,
          }}
        />
      )}

      <MonitoredInstanceForm
        visible={formVisible}
        onCancel={() => {
          setFormVisible(false);
          setEditingInstance(null);
        }}
        onSubmit={handleFormSubmit}
        initialValues={editingInstance ? {
          appInstanceId: editingInstance.appInstanceId,
          monitoringEnabled: editingInstance.monitoringEnabled,
          checkIntervalMinutes: editingInstance.checkIntervalMinutes,
        } : undefined}
        title={editingInstance ? 'Edit Monitoring Settings' : 'Add Instance to Monitoring'}
      />
    </div>
  );
};
