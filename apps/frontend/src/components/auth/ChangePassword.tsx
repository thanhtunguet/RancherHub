import React, { useState } from 'react';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Button from 'antd/es/button';
import Alert from 'antd/es/alert';
import Card from 'antd/es/card';
import Typography from 'antd/es/typography';
import Space from 'antd/es/space';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;

interface ChangePasswordProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export const ChangePassword: React.FC<ChangePasswordProps> = ({ onComplete, onCancel }) => {
  const { changePassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      await changePassword(values.currentPassword, values.newPassword);
      setSuccess(true);
      form.resetFields();

      setTimeout(() => {
        onComplete?.();
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Failed to change password. Please check your current password and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card style={{ maxWidth: 500, margin: '0 auto', padding: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
          <Title level={4} style={{ color: '#52c41a', marginTop: 16 }}>
            Password Changed Successfully!
          </Title>
          <Paragraph>
            Your password has been updated. You can now use your new password to sign in.
          </Paragraph>
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ maxWidth: 500, margin: '0 auto', padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <LockOutlined style={{ fontSize: 64, color: '#1890ff' }} />
          <Title level={3}>Change Password</Title>
          <Text type="secondary">
            Update your account password
          </Text>
        </div>

        {error && <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />}

        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="currentPassword"
            label="Current Password"
            rules={[
              { required: true, message: 'Please enter your current password' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter current password"
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: 'Please enter your new password' },
              { min: 6, message: 'Password must be at least 6 characters long' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter new password"
              size="large"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm New Password"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm your new password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm new password"
              size="large"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
              >
                Change Password
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <strong>Password Requirements:</strong>
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>Minimum 6 characters</li>
              <li>Use a strong, unique password</li>
            </ul>
          </Text>
        </div>
      </Space>
    </Card>
  );
};
