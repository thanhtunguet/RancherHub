import React, { useState } from 'react';
import { Form, Input, Button, Alert, Card, Typography, Space, Image, Steps, Divider } from 'antd';
import { SafetyOutlined, QrcodeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;

interface TwoFactorSetupProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onComplete, onCancel }) => {
  const { setup2FA, verify2FA } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  const handleSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await setup2FA();
      setQrCode(response.qrCode);
      setSecret(response.secret);
      setCurrentStep(1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to setup 2FA. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (values: { token: string }) => {
    setLoading(true);
    setError(null);

    try {
      const isValid = await verify2FA(values.token);
      
      if (isValid) {
        setSuccess('2FA has been successfully enabled for your account!');
        setCurrentStep(2);
        setTimeout(() => {
          onComplete?.();
        }, 2000);
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'Initialize',
      description: 'Start 2FA setup',
      icon: <SafetyOutlined />,
    },
    {
      title: 'Scan QR Code',
      description: 'Add to authenticator app',
      icon: <QrcodeOutlined />,
    },
    {
      title: 'Verify',
      description: 'Confirm setup',
      icon: <CheckCircleOutlined />,
    },
  ];

  return (
    <Card style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <SafetyOutlined style={{ fontSize: 64, color: '#1890ff' }} />
          <Title level={3}>Two-Factor Authentication Setup</Title>
          <Text type="secondary">
            Enhance your account security with 2FA
          </Text>
        </div>

        <Steps current={currentStep} items={steps} />

        {error && <Alert message={error} type="error" showIcon />}
        {success && <Alert message={success} type="success" showIcon />}

        {currentStep === 0 && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={4}>Why enable 2FA?</Title>
              <Paragraph>
                Two-factor authentication adds an extra layer of security to your account by requiring
                a verification code from your mobile device in addition to your password.
              </Paragraph>
            </div>

            <Space style={{ width: '100%' }}>
              <Button onClick={onCancel}>Cancel</Button>
              <Button
                type="primary"
                onClick={handleSetup}
                loading={loading}
                style={{ flex: 1 }}
              >
                Start Setup
              </Button>
            </Space>
          </Space>
        )}

        {currentStep === 1 && qrCode && secret && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={4}>Scan QR Code</Title>
              <Paragraph>
                Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code:
              </Paragraph>
            </div>

            <div style={{ textAlign: 'center' }}>
              <Image
                src={qrCode}
                alt="2FA QR Code"
                style={{ maxWidth: 300, border: '1px solid #d9d9d9', borderRadius: '8px' }}
                preview={false}
              />
            </div>

            <Divider>Or enter manually</Divider>

            <div>
              <Text strong>Secret Key:</Text>
              <Input.TextArea
                value={secret}
                readOnly
                autoSize={{ minRows: 2, maxRows: 3 }}
                style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}
              />
            </div>

            <div>
              <Title level={4}>Verify Setup</Title>
              <Text>Enter the 6-digit code from your authenticator app:</Text>
            </div>

            <Form onFinish={handleVerify} layout="vertical">
              <Form.Item
                name="token"
                rules={[
                  { required: true, message: 'Please enter the verification code' },
                  { len: 6, message: 'Code must be 6 digits' },
                  { pattern: /^\d{6}$/, message: 'Code must contain only numbers' },
                ]}
              >
                <Input
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  style={{ textAlign: 'center', fontSize: 18, letterSpacing: 2 }}
                />
              </Form.Item>

              <Form.Item>
                <Space style={{ width: '100%' }}>
                  <Button onClick={() => setCurrentStep(0)}>Back</Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    style={{ flex: 1 }}
                  >
                    Verify & Enable 2FA
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Space>
        )}

        {currentStep === 2 && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
            <Title level={4} style={{ color: '#52c41a' }}>
              2FA Successfully Enabled!
            </Title>
            <Paragraph>
              Your account is now protected with two-factor authentication.
              Keep your authenticator app safe as you'll need it to sign in.
            </Paragraph>
          </div>
        )}
      </Space>
    </Card>
  );
};