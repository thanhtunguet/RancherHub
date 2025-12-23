import React, { useState, useEffect, useRef } from 'react';
import Modal from 'antd/es/modal';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Button from 'antd/es/button';
import Space from 'antd/es/space';
import message from 'antd/es/message';
import Typography from 'antd/es/typography';
import Tag from 'antd/es/tag';
import Row from 'antd/es/row';
import Col from 'antd/es/col';
import { SaveOutlined, PlusOutlined } from '@ant-design/icons';
import { messageTemplatesApi } from '../../services/api';
import { MessageTemplate, UpdateMessageTemplateDto } from '../../types';

const { TextArea } = Input;
const { Text } = Typography;

interface TemplateEditorModalProps {
  visible: boolean;
  template: MessageTemplate;
  onClose: () => void;
  onSave: () => void;
}

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  visible,
  template,
  onClose,
  onSave,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const textAreaRef = useRef<any>(null);

  useEffect(() => {
    if (visible && template) {
      form.setFieldsValue({
        templateName: template.templateName,
        messageTemplate: template.messageTemplate,
        description: template.description,
      });
    }
  }, [visible, template, form]);

  const handleSave = async (values: UpdateMessageTemplateDto) => {
    try {
      setSaving(true);
      await messageTemplatesApi.update(template.id, values);
      message.success('Template updated successfully');
      onSave();
    } catch (error) {
      console.error('Failed to update template:', error);
      message.error('Failed to update template');
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    const textArea = textAreaRef.current?.resizableTextArea?.textArea;
    if (!textArea) return;

    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;
    const text = form.getFieldValue('messageTemplate') || '';
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = `${before}{{${variable}}}${after}`;

    form.setFieldsValue({ messageTemplate: newText });

    // Set cursor position after inserted variable
    setTimeout(() => {
      textArea.focus();
      const newPosition = start + variable.length + 4; // +4 for {{}}
      textArea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  return (
    <Modal
      title={`Edit Template: ${template.templateName}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
      >
        <Form.Item
          name="templateName"
          label="Template Name"
          rules={[{ required: true, message: 'Please enter template name' }]}
        >
          <Input placeholder="Enter template name" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
        >
          <Input placeholder="Enter template description" />
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          <Text strong>Available Variables (click to insert):</Text>
          <div style={{ marginTop: 8 }}>
            <Space size={[8, 8]} wrap>
              {template.availableVariables.map((variable) => (
                <Button
                  key={variable}
                  size="small"
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => insertVariable(variable)}
                >
                  {`{{${variable}}}`}
                </Button>
              ))}
            </Space>
          </div>
        </div>

        <Form.Item
          name="messageTemplate"
          label="Message Template"
          rules={[{ required: true, message: 'Please enter message template' }]}
          extra="Use {{variable_name}} format for dynamic content. The variables will be replaced with actual data when sending messages."
        >
          <TextArea
            ref={textAreaRef}
            rows={12}
            placeholder="Enter your message template..."
            style={{ fontFamily: 'monospace', fontSize: '13px' }}
          />
        </Form.Item>

        <div style={{
          padding: '12px',
          background: '#e6f7ff',
          border: '1px solid #91d5ff',
          borderRadius: '4px',
          marginBottom: 16
        }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <strong>Note:</strong> The <Tag style={{ fontFamily: 'monospace' }}>{'{{tagged_users}}'}</Tag> variable
            will be automatically formatted as "@user1 @user2 @user3" based on the Tagged Users configured in Monitoring Configuration.
          </Text>
        </div>

        <Form.Item style={{ marginBottom: 0 }}>
          <Row gutter={8}>
            <Col>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                icon={<SaveOutlined />}
              >
                Save Template
              </Button>
            </Col>
            <Col>
              <Button onClick={onClose}>
                Cancel
              </Button>
            </Col>
          </Row>
        </Form.Item>
      </Form>
    </Modal>
  );
};
