import React, { useState } from 'react';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Button from 'antd/es/button';
import Alert from 'antd/es/alert';
import Card from 'antd/es/card';
import Typography from 'antd/es/typography';
import Space from 'antd/es/space';
import { SafetyOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;

interface Disable2FAConfirmProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export const Disable2FAConfirm: React.FC<Disable2FAConfirmProps> = ({ onComplete, onCancel }) => {
  const { disable2FA } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values: { token: string }) => {
    setLoading(true);
    setError(null);

    try {
      await disable2FA(values.token);
      setSuccess(true);
      form.resetFields();

      setTimeout(() => {
        onComplete?.();
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Failed to disable 2FA. Please check your code and try again.'
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
            2FA Disabled Successfully
          </Title>
          <Paragraph>
            Two-factor authentication has been removed from your account.
            You can re-enable it anytime from your account settings.
          </Paragraph>
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ maxWidth: 500, margin: '0 auto', padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <WarningOutlined style={{ fontSize: 64, color: '#faad14' }} />
          <Title level={3}>Disable Two-Factor Authentication</Title>
          <Text type="secondary">
            Verify your identity to disable 2FA
          </Text>
        </div>

        <Alert
          message="Security Warning"
          description="Disabling 2FA will make your account less secure. You will only need your password to sign in."
          type="warning"
          showIcon
        />

        {error && <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />}

        <div>
          <Paragraph>
            To confirm you want to disable two-factor authentication, please enter the 6-digit code
            from your authenticator app.
          </Paragraph>
        </div>

        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="token"
            label="Verification Code"
            rules={[
              { required: true, message: 'Please enter your 2FA code' },
              { len: 6, message: 'Code must be exactly 6 digits' },
              { pattern: /^\d{6}$/, message: 'Code must contain only numbers' },
            ]}
          >
            <Input
              prefix={<SafetyOutlined />}
              placeholder="Enter 6-digit code"
              maxLength={6}
              size="large"
              style={{ textAlign: 'center', fontSize: 18, letterSpacing: 2 }}
              autoComplete="one-time-code"
              autoFocus
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="primary"
                danger
                htmlType="submit"
                loading={loading}
              >
                Disable 2FA
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <SafetyOutlined /> <strong>Security Tip:</strong> Two-factor authentication
            adds an extra layer of security to your account. We recommend keeping it enabled.
          </Text>
        </div>
      </Space>
    </Card>
  );
};
