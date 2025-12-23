import React, { useState, useEffect } from 'react';
import Tabs from 'antd/es/tabs';
import Button from 'antd/es/button';
import Row from 'antd/es/row';
import Col from 'antd/es/col';
import message from 'antd/es/message';
import Card from 'antd/es/card';
import {
  DashboardOutlined,
  SettingOutlined,
  PlusOutlined,
  MonitorOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { MonitoringDashboard } from '../components/monitoring/MonitoringDashboard';
import { MonitoringConfigForm } from '../components/monitoring/MonitoringConfigForm';
import { MonitoredInstanceCard } from '../components/monitoring/MonitoredInstanceCard';
import { MonitoredInstanceForm } from '../components/monitoring/MonitoredInstanceForm';
import { AlertDetailPage } from '../components/monitoring/AlertDetailPage';
import { MessageTemplatesTab } from '../components/message-templates/MessageTemplatesTab';
import { monitoringApi } from '../services/api';

const { TabPane } = Tabs;

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

export const MonitoringPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [instances, setInstances] = useState<MonitoredInstance[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editingInstance, setEditingInstance] = useState<MonitoredInstance | null>(null);
  const [showAlertDetail, setShowAlertDetail] = useState(false);

  useEffect(() => {
    if (activeTab === 'instances') {
      loadInstances();
    }
  }, [activeTab]);

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
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        size="large"
      >
        <TabPane 
          tab={
            <span>
              <DashboardOutlined  className="mr-2"/>
              Dashboard
            </span>
          } 
          key="dashboard"
        >
          {showAlertDetail ? (
            <AlertDetailPage onBack={() => setShowAlertDetail(false)} />
          ) : (
            <MonitoringDashboard onNavigateToAlerts={() => setShowAlertDetail(true)} />
          )}
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <MonitorOutlined className="mr-2" />
              Monitored Instances
            </span>
          } 
          key="instances"
        >
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
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <SettingOutlined className="mr-2" />
              Configuration
            </span>
          }
          key="config"
        >
          <MonitoringConfigForm />
        </TabPane>

        <TabPane
          tab={
            <span>
              <FileTextOutlined className="mr-2" />
              Message Templates
            </span>
          }
          key="templates"
        >
          <MessageTemplatesTab />
        </TabPane>
      </Tabs>

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