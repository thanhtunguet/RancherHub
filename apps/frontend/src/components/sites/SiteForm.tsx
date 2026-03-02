import Form from "antd/es/form";
import Input from "antd/es/input";
import Button from "antd/es/button";
import Space from "antd/es/space";
import { CreateSiteRequest } from "../../types";

interface SiteFormProps {
  initialValues?: Partial<CreateSiteRequest>;
  onSubmit: (values: CreateSiteRequest) => void;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * Hostnames that the backend rejects — mirrored here so the user sees an
 * inline error immediately instead of receiving a cryptic 400 from the API.
 * Must stay in sync with apps/backend/src/common/validators/safe-url.validator.ts
 */
const BLOCKED_HOSTNAMES = new Set([
  "169.254.169.254",
  "169.254.170.2",
  "metadata.google.internal",
  "metadata.internal",
  "localhost",
  "localhost.localdomain",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

function validateRancherUrl(_: unknown, value: string): Promise<void> {
  if (!value) return Promise.resolve(); // required rule handles empty

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return Promise.reject(new Error("Please enter a valid URL"));
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return Promise.reject(
      new Error("URL must use http:// or https://")
    );
  }

  const hostname = url.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return Promise.reject(
      new Error(`"${url.hostname}" is not a permitted hostname`)
    );
  }

  // Block 127.0.0.0/8 (IPv4 loopback)
  const parts = hostname.split(".");
  if (
    parts.length === 4 &&
    parts.every((p) => /^\d+$/.test(p)) &&
    Number(parts[0]) === 127
  ) {
    return Promise.reject(
      new Error("Loopback addresses (127.x.x.x) are not permitted")
    );
  }

  return Promise.resolve();
}

export function SiteForm({
  initialValues,
  onSubmit,
  onCancel,
  loading,
}: SiteFormProps) {
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
          { required: true, message: "Please enter a site name" },
          { min: 1, message: "Site name must be at least 1 character" },
        ]}
      >
        <Input placeholder="e.g., Production Rancher" />
      </Form.Item>

      <Form.Item
        label="Rancher URL"
        name="url"
        rules={[
          { required: true, message: "Please enter the Rancher URL" },
          { validator: validateRancherUrl },
        ]}
        extra="Internal network addresses are supported. Loopback and cloud metadata hosts are not."
      >
        <Input placeholder="https://rancher.example.com" />
      </Form.Item>

      <Form.Item
        label="API Token"
        name="token"
        rules={[
          { required: true, message: "Please enter the API token" },
          { min: 10, message: "Token must be at least 10 characters" },
        ]}
      >
        <Input.Password placeholder="token-abc123:xyz789" />
      </Form.Item>

      <Form.Item className="mb-0">
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {initialValues ? "Update Site" : "Create Site"}
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
