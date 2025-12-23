import React, { useState, useEffect } from 'react';
import Modal from 'antd/es/modal';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Button from 'antd/es/button';
import Alert from 'antd/es/alert';
import message from 'antd/es/message';
import Switch from 'antd/es/switch';
import Divider from 'antd/es/divider';
import {
  SaveOutlined,
  ExperimentOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { HarborSite, CreateHarborSiteRequest, TestHarborConnectionRequest } from '../../types';
import { harborSitesApi } from '../../services/api';

interface HarborSiteFormProps {
  visible: boolean;
  site?: HarborSite | null;
  onClose: () => void;
  onSubmit: (data: CreateHarborSiteRequest) => Promise<void>;
}

export const HarborSiteForm: React.FC<HarborSiteFormProps> = ({
  visible,
  site,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (visible) {
      if (site) {
        form.setFieldsValue({
          name: site.name,
          url: site.url,
          username: site.username,
          active: site.active,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ active: true });
      }
      setTestResult(null);
    }
  }, [visible, site, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await onSubmit(values);
      message.success(site ? 'Harbor site updated successfully!' : 'Harbor site created successfully!');
      onClose();
    } catch (error: any) {
      if (error.errorFields) {
        // Form validation errors
        return;
      }
      message.error('Failed to save Harbor site');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      const values = await form.validateFields(['url', 'username', 'password']);
      setTestLoading(true);
      setTestResult(null);

      const testData: TestHarborConnectionRequest = {
        url: values.url,
        username: values.username,
        password: values.password,
      };

      const result = await harborSitesApi.testConnection(testData);
      setTestResult(result);

      if (result.success) {
        message.success('Connection test successful!');
      } else {
        message.error(`Connection test failed: ${result.message}`);
      }
    } catch (error: any) {
      if (error?.errorFields) {
        message.error('Please fill in all required fields before testing');
        return;
      }
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Network error occurred during connection test';
      setTestResult({
        success: false,
        message: errorMessage,
      });
      message.error('Connection test failed');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <Modal
      title={site ? 'Edit Harbor Site' : 'Add Harbor Site'}
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="test"
          icon={<ExperimentOutlined />}
          onClick={handleTestConnection}
          loading={testLoading}
        >
          Test Connection
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<SaveOutlined />}
          loading={loading}
          onClick={handleSubmit}
        >
          {site ? 'Update' : 'Create'}
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        autoComplete="off"
      >
        <Form.Item
          name="name"
          label="Harbor Site Name"
          rules={[
            { required: true, message: 'Please enter a name for the Harbor site' },
            { min: 3, message: 'Name must be at least 3 characters long' },
          ]}
        >
          <Input
            placeholder="e.g., Production Harbor, Development Registry"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          name="url"
          label="Harbor URL"
          rules={[
            { required: true, message: 'Please enter the Harbor URL' },
            { type: 'url', message: 'Please enter a valid URL' },
          ]}
        >
          <Input
            placeholder="https://harbor.example.com"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          name="username"
          label="Username"
          rules={[
            { required: true, message: 'Please enter the Harbor username' },
          ]}
        >
          <Input
            placeholder="Harbor username"
            autoComplete="new-username"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: 'Please enter the Harbor password' },
            { min: 6, message: 'Password must be at least 6 characters long' },
          ]}
        >
          <Input.Password
            placeholder="Harbor password"
            autoComplete="new-password"
            iconRender={(visible) =>
              visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
            }
          />
        </Form.Item>

        <Form.Item
          name="active"
          label="Set as Active"
          valuePropName="checked"
          extra="Only one Harbor site can be active at a time. The active site will be used for image size queries."
        >
          <Switch />
        </Form.Item>

        {testResult && (
          <>
            <Divider />
            <Alert
              message={testResult.success ? 'Connection Successful' : 'Connection Failed'}
              description={testResult.message}
              type={testResult.success ? 'success' : 'error'}
              showIcon
              style={{ marginBottom: 16 }}
            />
          </>
        )}
      </Form>
    </Modal>
  );
};
