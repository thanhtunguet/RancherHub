import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  message,
  Typography,
  Tag,
  Space,
  Empty,
  Spin,
} from 'antd';
import {
  FileTextOutlined,
  EditOutlined,
  EyeOutlined,
  UndoOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { messageTemplatesApi } from '../../services/api';
import { MessageTemplate } from '../../types';
import { TemplateEditorModal } from './TemplateEditorModal';
import { TemplatePreviewModal } from './TemplatePreviewModal';

const { Title, Text, Paragraph } = Typography;

const templateTypeDescriptions: Record<string, string> = {
  test_connection: 'Sent when testing Telegram connection',
  daily_health_check: 'Sent daily at 11PM with system health summary',
  critical_alert: 'Sent immediately when critical service failure is detected',
};

export const MessageTemplatesTab: React.FC = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await messageTemplatesApi.getAll();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
      message.error('Failed to load message templates');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setEditorVisible(true);
  };

  const handlePreview = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setPreviewVisible(true);
  };

  const handleRestore = async (template: MessageTemplate) => {
    try {
      await messageTemplatesApi.restore(template.id);
      message.success('Template restored to default successfully');
      await loadTemplates();
    } catch (error) {
      console.error('Failed to restore template:', error);
      message.error('Failed to restore template');
    }
  };

  const handleSave = async () => {
    setEditorVisible(false);
    await loadTemplates();
  };

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'test_connection':
        return '🔍';
      case 'daily_health_check':
        return '📊';
      case 'critical_alert':
        return '🚨';
      default:
        return '📝';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Title level={4}>
          <FileTextOutlined /> Message Templates
        </Title>
        <Text type="secondary">
          Customize Telegram notification messages with editable templates. Changes will be applied to all future notifications.
        </Text>
      </div>

      {templates.length === 0 ? (
        <Empty description="No templates found" />
      ) : (
        <Row gutter={[16, 16]}>
          {templates.map((template) => (
            <Col key={template.id} xs={24} lg={12} xl={8}>
              <Card
                hoverable
                title={
                  <Space>
                    <span style={{ fontSize: '24px' }}>{getTemplateIcon(template.templateType)}</span>
                    <span>{template.templateName}</span>
                    {template.isDefault && (
                      <Tag color="blue">Default</Tag>
                    )}
                    {template.isActive ? (
                      <Tag color="green" icon={<CheckCircleOutlined />}>Active</Tag>
                    ) : (
                      <Tag>Inactive</Tag>
                    )}
                  </Space>
                }
                actions={[
                  <Button
                    key="edit"
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(template)}
                  >
                    Edit
                  </Button>,
                  <Button
                    key="preview"
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => handlePreview(template)}
                  >
                    Preview
                  </Button>,
                  <Button
                    key="restore"
                    type="link"
                    icon={<UndoOutlined />}
                    onClick={() => handleRestore(template)}
                  >
                    Restore
                  </Button>,
                ]}
              >
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Used when:</Text>
                  <br />
                  <Text type="secondary">
                    {templateTypeDescriptions[template.templateType] || template.description || 'No description'}
                  </Text>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Text strong>Available Variables:</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space size={[4, 4]} wrap>
                      {template.availableVariables.map((variable) => (
                        <Tag key={variable} style={{ fontFamily: 'monospace' }}>
                          {`{{${variable}}}`}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                </div>

                <div>
                  <Text strong>Template Preview:</Text>
                  <Paragraph
                    ellipsis={{ rows: 3 }}
                    style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      background: '#f5f5f5',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {template.messageTemplate}
                  </Paragraph>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {selectedTemplate && (
        <>
          <TemplateEditorModal
            visible={editorVisible}
            template={selectedTemplate}
            onClose={() => setEditorVisible(false)}
            onSave={handleSave}
          />
          <TemplatePreviewModal
            visible={previewVisible}
            template={selectedTemplate}
            onClose={() => setPreviewVisible(false)}
          />
        </>
      )}
    </>
  );
};
