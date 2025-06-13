import { Form, Input, Button, Space, ColorPicker } from "antd";
import type { Color } from "antd/es/color-picker";
import { useEffect } from "react";
import { CreateEnvironmentRequest } from "../../types";

interface EnvironmentFormProps {
  initialValues?: Partial<CreateEnvironmentRequest>;
  onSubmit: (values: CreateEnvironmentRequest) => void;
  onCancel: () => void;
  loading?: boolean;
}

const DEFAULT_COLORS = [
  "#1890ff", // Blue
  "#52c41a", // Green
  "#fa541c", // Orange
  "#f5222d", // Red
  "#722ed1", // Purple
  "#13c2c2", // Cyan
  "#eb2f96", // Magenta
  "#faad14", // Gold
];

export function EnvironmentForm({
  initialValues,
  onSubmit,
  onCancel,
  loading,
}: EnvironmentFormProps) {
  const [form] = Form.useForm();

  // Reset form when initialValues change (create vs edit mode)
  useEffect(() => {
    if (initialValues) {
      // Edit mode - set the form values
      form.setFieldsValue({
        name: initialValues.name || "",
        description: initialValues.description || "",
        color: initialValues.color || "#1890ff",
      });
    } else {
      // Create mode - reset to default values
      form.resetFields();
      form.setFieldsValue({
        color: "#1890ff",
      });
    }
  }, [initialValues, form]);

  const handleSubmit = (values: CreateEnvironmentRequest) => {
    onSubmit({
      ...values,
      color: values.color || "#1890ff",
    });
  };

  const handleCancel = () => {
    // Reset form before closing
    form.resetFields();
    onCancel();
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      className="w-full"
    >
      <Form.Item
        label="Environment Name"
        name="name"
        rules={[
          { required: true, message: "Please enter an environment name" },
          { min: 1, message: "Environment name must be at least 1 character" },
        ]}
      >
        <Input placeholder="e.g., Development, Staging, Production" />
      </Form.Item>

      <Form.Item label="Description" name="description">
        <Input.TextArea
          placeholder="Optional description for this environment"
          rows={3}
        />
      </Form.Item>

      <Form.Item
        label="Color"
        name="color"
        help="Choose a color to visually identify this environment"
        getValueFromEvent={(color: Color | string) => {
          // Convert Color object to hex string
          if (color && typeof color === "object" && "toHexString" in color) {
            return color.toHexString();
          }
          return color;
        }}
      >
        <ColorPicker
          presets={[
            {
              label: "Recommended",
              colors: DEFAULT_COLORS,
            },
          ]}
          showText
          format="hex"
        />
      </Form.Item>

      <Form.Item className="mb-0">
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {initialValues ? "Update Environment" : "Create Environment"}
          </Button>
          <Button onClick={handleCancel}>Cancel</Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
