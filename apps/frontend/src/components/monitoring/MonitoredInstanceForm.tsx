import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Switch,
  InputNumber,
  message,
  Spin,
} from 'antd';
import { appInstancesApi } from '../../services/api';
import type { AppInstance } from '../../types';

const { Option } = Select;

interface MonitoredInstanceFormProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  initialValues?: any;
  title?: string;
}

export const MonitoredInstanceForm: React.FC<MonitoredInstanceFormProps> = ({
  visible,
  onCancel,
  onSubmit,
  initialValues,
  title = 'Add Instance to Monitoring',
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [appInstances, setAppInstances] = useState<AppInstance[]>([]);

  useEffect(() => {
    if (visible) {
      loadAppInstances();
      if (initialValues) {
        form.setFieldsValue(initialValues);
      }
    }
  }, [visible, initialValues]);

  const loadAppInstances = async () => {
    try {
      setLoading(true);
      const instances = await appInstancesApi.getAll();
      setAppInstances(instances || []);
    } catch (error) {
      console.error('Failed to load app instances:', error);
      message.error('Failed to load app instances');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();
      await onSubmit(values);
      form.resetFields();
    } catch (error) {
      console.error('Form validation failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const groupedInstances = appInstances.reduce((acc, instance) => {
    const envName = instance.environment?.name || 'No Environment';
    if (!acc[envName]) {
      acc[envName] = [];
    }
    acc[envName].push(instance);
    return acc;
  }, {} as Record<string, AppInstance[]>);

  return (
    <Modal
      title={title}
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={submitting}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            monitoringEnabled: true,
            checkIntervalMinutes: 60,
          }}
        >
          <Form.Item
            name="appInstanceId"
            label="App Instance"
            rules={[{ required: true, message: 'Please select an app instance' }]}
          >
            <Select
              placeholder="Select an app instance to monitor"
              showSearch
              optionFilterProp="children"
            >
              {Object.entries(groupedInstances).map(([envName, instances]) => (
                <Select.OptGroup key={envName} label={envName}>
                  {instances.map((instance) => (
                    <Option key={instance.id} value={instance.id}>
                      {instance.name} ({instance.cluster}/{instance.namespace})
                    </Option>
                  ))}
                </Select.OptGroup>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="monitoringEnabled"
            label="Enable Monitoring"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="checkIntervalMinutes"
            label="Check Interval (minutes)"
            rules={[{ required: true, message: 'Please enter check interval' }]}
            help="How often to check the instance health"
          >
            <InputNumber
              min={5}
              max={1440}
              style={{ width: '100%' }}
              placeholder="60"
            />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};