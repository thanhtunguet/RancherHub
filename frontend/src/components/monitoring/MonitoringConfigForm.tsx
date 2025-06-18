import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  Button,
  Row,
  Col,
  message,
  Space,
  Typography,
  Divider,
} from 'antd';
import { MessageOutlined, BellOutlined, SaveOutlined } from '@ant-design/icons';
import { monitoringApi } from '../../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface MonitoringConfigFormProps {
  onConfigSaved?: () => void;
}

interface MonitoringConfig {
  id?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  proxyHost?: string;
  proxyPort?: number;
  proxyUsername?: string;
  proxyPassword?: string;
  monitoringEnabled: boolean;
  alertThreshold: number;
  notificationSchedule: string;
}

export const MonitoringConfigForm: React.FC<MonitoringConfigFormProps> = ({
  onConfigSaved,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState<MonitoringConfig | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await monitoringApi.getConfig();
      if (data) {
        setConfig(data);
        form.setFieldsValue(data);
      }
    } catch (error) {
      console.error('Failed to load monitoring config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: MonitoringConfig) => {
    try {
      setLoading(true);
      if (config?.id) {
        await monitoringApi.updateConfig(values);
        message.success('Monitoring configuration updated successfully');
      } else {
        await monitoringApi.createOrUpdateConfig(values);
        message.success('Monitoring configuration created successfully');
      }
      await loadConfig();
      onConfigSaved?.();
    } catch (error) {
      console.error('Failed to save monitoring config:', error);
      message.error('Failed to save monitoring configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTestTelegram = async () => {
    try {
      setTesting(true);
      const values = await form.validateFields([
        'telegramBotToken',
        'telegramChatId',
        'proxyHost',
        'proxyPort',
        'proxyUsername',
        'proxyPassword',
      ]);

      const result = await monitoringApi.testTelegramConnection(values);
      
      if (result.success) {
        message.success('Telegram connection test successful!');
      } else {
        message.error(`Telegram connection test failed: ${result.message}`);
      }
    } catch (error: any) {
      console.error('Telegram test failed:', error);
      message.error(error.response?.data?.message || 'Telegram connection test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card>
        <Title level={3}>
          <BellOutlined /> Monitoring Configuration
        </Title>
        <Text type="secondary">
          Configure monitoring settings, Telegram notifications, and proxy settings for your monitoring system.
        </Text>
        
        <Divider />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            monitoringEnabled: true,
            alertThreshold: 3,
            notificationSchedule: 'daily',
          }}
        >
          {/* Basic Monitoring Settings */}
          <Card size="small" title="Monitoring Settings" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="monitoringEnabled"
                  label="Enable Monitoring"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="alertThreshold"
                  label="Alert Threshold"
                  rules={[{ required: true, message: 'Please enter alert threshold' }]}
                  help="Number of consecutive failures before triggering alert"
                >
                  <InputNumber min={1} max={10} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="notificationSchedule"
                  label="Notification Schedule"
                  rules={[{ required: true, message: 'Please select notification schedule' }]}
                >
                  <Select>
                    <Option value="immediate">Immediate</Option>
                    <Option value="hourly">Hourly</Option>
                    <Option value="daily">Daily</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Telegram Configuration */}
          <Card size="small" title="Telegram Configuration" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="telegramBotToken"
                  label="Bot Token"
                  help="Get this from @BotFather on Telegram"
                >
                  <Input.Password placeholder="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="telegramChatId"
                  label="Chat ID"
                  help="Your Telegram chat ID or group ID"
                >
                  <Input placeholder="123456789" />
                </Form.Item>
              </Col>
            </Row>
            
            <Form.Item>
              <Button
                type="dashed"
                icon={<MessageOutlined />}
                onClick={handleTestTelegram}
                loading={testing}
                disabled={!form.getFieldValue('telegramBotToken') || !form.getFieldValue('telegramChatId')}
              >
                Test Telegram Connection
              </Button>
            </Form.Item>
          </Card>

          {/* Proxy Configuration */}
          <Card size="small" title="Proxy Configuration (Optional)" style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Configure SOCKS5 proxy if Telegram is blocked in your region
            </Text>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="proxyHost"
                  label="Proxy Host"
                >
                  <Input placeholder="proxy.example.com" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="proxyPort"
                  label="Proxy Port"
                >
                  <InputNumber placeholder="1080" min={1} max={65535} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="proxyUsername"
                  label="Username (Optional)"
                >
                  <Input placeholder="Username" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="proxyPassword"
                  label="Password (Optional)"
                >
                  <Input.Password placeholder="Password" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<SaveOutlined />}
              >
                Save Configuration
              </Button>
              <Button onClick={loadConfig} disabled={loading}>
                Reset
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};