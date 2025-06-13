import { Form, Input, Button, Space } from 'antd';
import { CreateSiteRequest } from '../../types';

interface SiteFormProps {
  initialValues?: Partial<CreateSiteRequest>;
  onSubmit: (values: CreateSiteRequest) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function SiteForm({ initialValues, onSubmit, onCancel, loading }: SiteFormProps) {
  const [form] = Form.useForm();

  const handleSubmit = (values: CreateSiteRequest) => {
    onSubmit(values);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={handleSubmit}
      className="w-full"
    >
      <Form.Item
        label="Site Name"
        name="name"
        rules={[
          { required: true, message: 'Please enter a site name' },
          { min: 1, message: 'Site name must be at least 1 character' },
        ]}
      >
        <Input placeholder="e.g., Production Rancher" />
      </Form.Item>

      <Form.Item
        label="Rancher URL"
        name="url"
        rules={[
          { required: true, message: 'Please enter the Rancher URL' },
          { type: 'url', message: 'Please enter a valid URL' },
        ]}
      >
        <Input placeholder="https://rancher.example.com" />
      </Form.Item>

      <Form.Item
        label="API Token"
        name="token"
        rules={[
          { required: true, message: 'Please enter the API token' },
          { min: 10, message: 'Token must be at least 10 characters' },
        ]}
      >
        <Input.Password placeholder="token-abc123:xyz789" />
      </Form.Item>

      <Form.Item className="mb-0">
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {initialValues ? 'Update Site' : 'Create Site'}
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </Space>
      </Form.Item>
    </Form>
  );
}