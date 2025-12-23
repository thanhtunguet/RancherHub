import Form from "antd/es/form";
import Input from "antd/es/input";
import Button from "antd/es/button";
import Space from "antd/es/space";
import Upload from "antd/es/upload";
import message from "antd/es/message";
import { InboxOutlined } from "@ant-design/icons";
import type { CreateGenericClusterSiteRequest } from "../../types";

interface GenericClusterSiteFormProps {
  initialValues?: Partial<CreateGenericClusterSiteRequest>;
  onSubmit: (values: CreateGenericClusterSiteRequest) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function GenericClusterSiteForm({
  initialValues,
  onSubmit,
  onCancel,
  loading,
}: GenericClusterSiteFormProps) {
  const [form] = Form.useForm<CreateGenericClusterSiteRequest>();

  const handleSubmit = (values: CreateGenericClusterSiteRequest) => {
    onSubmit(values);
  };

  const handleFileUpload = (file: File) => {
    if (file.size > 1024 * 1024) {
      message.error("Kubeconfig file size must be less than 1MB");
      return Upload.LIST_IGNORE;
    }

    const isYaml =
      file.type === "application/x-yaml" ||
      file.type === "text/yaml" ||
      file.name.endsWith(".yaml") ||
      file.name.endsWith(".yml");

    if (!isYaml) {
      message.error("Please upload a valid YAML kubeconfig file");
      return Upload.LIST_IGNORE;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = String(e.target?.result || "");
      form.setFieldsValue({
        ...form.getFieldsValue(),
        kubeconfig: content,
      });
    };
    reader.readAsText(file);

    return false;
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
        label="Cluster Name"
        name="name"
        rules={[
          { required: true, message: "Please enter a cluster name" },
          { min: 1, message: "Cluster name must be at least 1 character" },
        ]}
      >
        <Input placeholder="e.g., Production EKS Cluster" />
      </Form.Item>

      <Form.Item
        label="Kubeconfig"
        name="kubeconfig"
        rules={[
          { required: true, message: "Please provide a kubeconfig" },
          {
            min: 10,
            message: "Kubeconfig must be at least 10 characters",
          },
        ]}
      >
        <Input.TextArea
          rows={6}
          placeholder="Paste your kubeconfig YAML here or upload a file below"
        />
      </Form.Item>

      <Form.Item label="Upload Kubeconfig File" valuePropName="fileList">
        <Upload.Dragger
          multiple={false}
          beforeUpload={handleFileUpload}
          showUploadList={false}
          accept=".yaml,.yml,text/yaml,application/x-yaml"
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            Click or drag kubeconfig file to this area to upload
          </p>
          <p className="ant-upload-hint text-xs text-gray-500">
            Only YAML files up to 1MB are supported. The content will be parsed
            client-side and stored securely on the server.
          </p>
        </Upload.Dragger>
      </Form.Item>

      <Form.Item className="mb-0">
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {initialValues ? "Update Cluster" : "Create Cluster"}
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </Space>
      </Form.Item>
    </Form>
  );
}


