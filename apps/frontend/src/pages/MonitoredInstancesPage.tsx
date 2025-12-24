import React, { useState, useEffect } from 'react';
import Button from 'antd/es/button';
import Row from 'antd/es/row';
import Col from 'antd/es/col';
import message from 'antd/es/message';
import Card from 'antd/es/card';
import {
  PlusOutlined,
  MonitorOutlined,
} from '@ant-design/icons';
import { MonitoredInstanceCard } from '../components/monitoring/MonitoredInstanceCard';
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
  const [formVisible, setFormVisible] = useState(false);
  const [editingInstance, setEditingInstance] = useState<MonitoredInstance | null>(null);

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    try {
      const data = await monitoringApi.getMonitoredInstances();
      setInstances(data || []);
    } catch (error) {
      console.error('Failed to load monitored instances:', error);
      message.error('Failed to load monitored instances');
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
    try {
      await monitoringApi.updateMonitoredInstance(id, { monitoringEnabled: enabled });
      message.success(`Monitoring ${enabled ? 'enabled' : 'disabled'}`);
      await loadInstances();
    } catch (error) {
      console.error('Failed to toggle monitoring:', error);
      message.error('Failed to update monitoring status');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAddInstance}
        >
          Add Instance to Monitoring
        </Button>
      </div>
      
      {instances.length === 0 ? (
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
        <Row gutter={[16, 16]}>
          {instances.map((instance) => (
            <Col key={instance.id} xs={24} sm={12} lg={8} xl={6}>
              <MonitoredInstanceCard
                instance={instance}
                onEdit={handleEditInstance}
                onDelete={handleDeleteInstance}
                onToggleMonitoring={handleToggleMonitoring}
              />
            </Col>
          ))}
        </Row>
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