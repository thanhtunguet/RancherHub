import React, { useState, useEffect } from 'react';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Button from 'antd/es/button';
import Alert from 'antd/es/alert';
import Card from 'antd/es/card';
import Typography from 'antd/es/typography';
import Space from 'antd/es/space';
import Checkbox from 'antd/es/checkbox';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import type { LoginRequest } from '../../types/auth';
import { getDeviceFingerprint, getDeviceName } from '../../utils/deviceFingerprint';

const { Title, Text } = Typography;

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [, setTempToken] = useState<string | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string>('');
  const [form] = Form.useForm();

  // Generate device fingerprint on mount
  useEffect(() => {
    const initFingerprint = async () => {
      try {
        const fp = await getDeviceFingerprint();
        const name = getDeviceName();
        setDeviceFingerprint(fp);
        setDeviceName(name);
      } catch (error) {
        console.error('Failed to generate device fingerprint:', error);
        // Continue without fingerprint - don't block login
      }
    };
    initFingerprint();
  }, []);

  const handleSubmit = async (values: LoginRequest) => {
    setLoading(true);
    setError(null);

    try {
      const loginData = {
        ...values,
        deviceFingerprint: deviceFingerprint || undefined,
        deviceName: deviceName || undefined,
        userAgent: navigator.userAgent,
      };

      const response = await login(loginData);

      if (response.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setTempToken(response.tempToken || null);
        // Don't set this as an error, just show the 2FA form
        return;
      }

      if (response.access_token) {
        onSuccess?.();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (values: { twoFactorToken: string; trustDevice?: boolean }) => {
    setLoading(true);
    setError(null);

    try {
      const loginData = {
        ...form.getFieldsValue(['username', 'password']),
        twoFactorToken: values.twoFactorToken,
        trustDevice: values.trustDevice || false,
        deviceFingerprint: deviceFingerprint || undefined,
        deviceName: deviceName || undefined,
        userAgent: navigator.userAgent,
      };

      const response = await login(loginData);

      if (response.access_token) {
        onSuccess?.();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '2FA verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (requiresTwoFactor) {
    return (
      <Card style={{ maxWidth: 400, margin: '0 auto' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <SafetyOutlined style={{ fontSize: 64, color: '#1890ff' }} />
            <Title level={3}>Two-Factor Authentication</Title>
            <Text type="secondary">
              Your account is protected with 2FA.
            </Text>
            <br />
            <Text type="secondary">
              Enter the 6-digit code from your authenticator app to continue.
            </Text>
          </div>

          {error && <Alert message={error} type="error" showIcon />}

          <Form onFinish={handle2FASubmit} layout="vertical">
            <Form.Item
              name="twoFactorToken"
              rules={[
                { required: true, message: 'Please enter your 2FA token' },
                { len: 6, message: '2FA token must be 6 digits' },
                { pattern: /^\d{6}$/, message: '2FA token must contain only numbers' },
              ]}
            >
              <Input
                placeholder="Enter 6-digit code"
                maxLength={6}
                style={{ textAlign: 'center', fontSize: 18, letterSpacing: 2 }}
                autoComplete="one-time-code"
              />
            </Form.Item>

            <Form.Item name="trustDevice" valuePropName="checked">
              <Checkbox>
                Trust this device for 30 days (skip 2FA on this device)
              </Checkbox>
            </Form.Item>

            <Form.Item>
              <Space style={{ width: '100%' }}>
                <Button onClick={() => setRequiresTwoFactor(false)}>
                  Back
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  style={{ flex: 1 }}
                >
                  Verify & Login
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    );
  }

  return (
    <Card style={{ maxWidth: 400, margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <Title level={2}>Rancher Hub</Title>
          <Text type="secondary">Sign in to your account</Text>
        </div>

        {error && <Alert message={error} type="error" showIcon />}

        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please enter your username or email' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Username or Email"
              size="large"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Space>
    </Card>
  );
};