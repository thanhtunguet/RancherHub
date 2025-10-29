import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Typography,
  Spin,
  message,
  Card,
  Divider,
} from 'antd';
import { SendOutlined, EyeOutlined } from '@ant-design/icons';
import { messageTemplatesApi, monitoringApi } from '../../services/api';
import { MessageTemplate, PreviewTemplateResponse } from '../../types';

const { Text, Paragraph } = Typography;

interface TemplatePreviewModalProps {
  visible: boolean;
  template: MessageTemplate;
  onClose: () => void;
}

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  visible,
  template,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<PreviewTemplateResponse | null>(null);

  useEffect(() => {
    if (visible && template) {
      loadPreview();
    }
  }, [visible, template]);

  const loadPreview = async () => {
    try {
      setLoading(true);
      const data = await messageTemplatesApi.preview({
        templateType: template.templateType,
        messageTemplate: template.messageTemplate,
      });
      setPreview(data);
    } catch (error) {
      console.error('Failed to load preview:', error);
      message.error('Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    try {
      setSending(true);

      // Get monitoring config to get Telegram credentials
      const config = await monitoringApi.getConfig();

      if (!config?.telegramBotToken || !config?.telegramChatId) {
        message.warning('Please configure Telegram settings in Monitoring Configuration first');
        return;
      }

      // Send test message via Telegram test connection endpoint
      const result = await monitoringApi.testTelegramConnection({
        telegramBotToken: config.telegramBotToken,
        telegramChatId: config.telegramChatId,
        proxyHost: config.proxyHost,
        proxyPort: config.proxyPort,
        proxyUsername: config.proxyUsername,
        proxyPassword: config.proxyPassword,
        taggedUsers: config.taggedUsers,
      });

      if (result.success) {
        message.success('Test message sent to Telegram successfully!');
      } else {
        message.error(`Failed to send test message: ${result.message}`);
      }
    } catch (error: any) {
      console.error('Failed to send test message:', error);
      message.error(error.response?.data?.message || 'Failed to send test message');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      title={
        <span>
          <EyeOutlined /> Template Preview: {template.templateName}
        </span>
      }
      open={visible}
      onCancel={onClose}
      width={700}
      footer={[
        <Button
          key="test"
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSendTest}
          loading={sending}
        >
          Send Test Message to Telegram
        </Button>,
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Card size="small" title="Sample Data Used" style={{ marginBottom: 16 }}>
            <pre style={{
              background: '#f5f5f5',
              padding: '12px',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
              maxHeight: '200px',
            }}>
              {JSON.stringify(preview?.sampleData, null, 2)}
            </pre>
          </Card>

          <Card size="small" title="Rendered Message">
            <div style={{
              padding: '16px',
              background: '#fafafa',
              borderRadius: '4px',
              border: '1px solid #d9d9d9',
            }}>
              <Paragraph
                style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: '14px',
                  marginBottom: 0,
                }}
              >
                {preview?.renderedMessage}
              </Paragraph>
            </div>
          </Card>

          <Divider />

          <div style={{
            padding: '12px',
            background: '#fffbe6',
            border: '1px solid #ffe58f',
            borderRadius: '4px',
          }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <strong>Note:</strong> The "Send Test Message" button will send this preview message to your configured Telegram chat.
              Make sure your Telegram settings are properly configured in Monitoring Configuration.
            </Text>
          </div>
        </>
      )}
    </Modal>
  );
};
