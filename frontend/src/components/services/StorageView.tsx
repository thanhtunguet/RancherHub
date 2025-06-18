import React, { useState, useEffect } from "react";
import {
  Table,
  Card,
  Spin,
  Alert,
  Typography,
  Select,
  Space,
  Tag,
  Progress,
  Tooltip,
  Button,
  message,
} from "antd";
import {
  CloudServerOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  BugOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { ServiceWithImageSize, AppInstanceTreeNode } from "../../types";

const { Title, Text } = Typography;
const { Option } = Select;

interface StorageViewProps {
  style?: React.CSSProperties;
}

export const StorageView: React.FC<StorageViewProps> = ({ style }) => {
  const [services, setServices] = useState<ServiceWithImageSize[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppInstance, setSelectedAppInstance] = useState<string | null>(
    null
  );
  const [appInstanceTree, setAppInstanceTree] = useState<AppInstanceTreeNode[]>(
    []
  );
  const [treeLoading, setTreeLoading] = useState(true);
  const [debugLoading, setDebugLoading] = useState(false);

  useEffect(() => {
    fetchAppInstanceTree();
  }, []);

  useEffect(() => {
    if (selectedAppInstance) {
      fetchServicesWithSizes();
    }
  }, [selectedAppInstance]);

  const fetchAppInstanceTree = async () => {
    try {
      setTreeLoading(true);
      const response = await fetch("/api/services/app-instances/tree");
      if (!response.ok) {
        throw new Error("Failed to fetch app instances");
      }
      const data: AppInstanceTreeNode[] = await response.json();
      setAppInstanceTree(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load app instances"
      );
    } finally {
      setTreeLoading(false);
    }
  };

  const fetchServicesWithSizes = async () => {
    if (!selectedAppInstance) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/services/with-image-sizes/${selectedAppInstance}`
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch services with image sizes: ${response.status} ${errorText}`
        );
      }

      const data: ServiceWithImageSize[] = await response.json();
      console.log("Received services with image sizes:", data);
      setServices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const debugHarborAPI = async () => {
    if (!selectedAppInstance) return;

    try {
      setDebugLoading(true);

      // First, check if Harbor site is configured
      const harborResponse = await fetch("/api/harbor-sites/active");
      if (!harborResponse.ok) {
        message.error("No active Harbor site configured");
        return;
      }

      const harborSite = await harborResponse.json();
      if (!harborSite) {
        message.error("No active Harbor site found");
        return;
      }

      message.info(
        `Testing Harbor API with site: ${harborSite.name} (${harborSite.url})`
      );

      // Test with a sample image tag if we have services
      if (services.length > 0) {
        const sampleService = services[0];
        if (sampleService.imageTag) {
          const testResponse = await fetch(
            `/api/harbor-sites/${harborSite.id}/test-image-size?imageTag=${encodeURIComponent(sampleService.imageTag)}`
          );
          const testResult = await testResponse.json();

          console.log("Harbor API test result:", testResult);

          if (testResult.result) {
            message.success(
              `Harbor API working! Sample image size: ${testResult.result.sizeFormatted}`
            );
          } else {
            message.warning(
              "Harbor API responded but no size found. Check console for details."
            );
          }
        }
      }
    } catch (err) {
      message.error(
        "Harbor API test failed: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
      console.error("Harbor API test error:", err);
    } finally {
      setDebugLoading(false);
    }
  };

  const formatBytes = (bytes: number | null | undefined): string => {
    if (!bytes) return "Unknown";
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getSelectedAppInstanceInfo = () => {
    for (const env of appInstanceTree) {
      const instance = env.appInstances.find(
        (ai) => ai.id === selectedAppInstance
      );
      if (instance) {
        return { environment: env.name, instance };
      }
    }
    return null;
  };

  const totalSize = services.reduce(
    (sum, service) => sum + (service.imageSize || 0),
    0
  );
  const servicesWithSize = services.filter((s) => s.imageSize);
  const servicesWithoutSize = services.filter((s) => !s.imageSize);

  const columns: ColumnsType<ServiceWithImageSize> = [
    {
      title: "Service",
      dataIndex: "name",
      key: "name",
      width: 200,
      render: (text: string, record) => (
        <div>
          <div style={{ fontWeight: "bold" }}>{text}</div>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {record.workloadType}
          </Text>
        </div>
      ),
    },
    {
      title: "Image",
      dataIndex: "imageTag",
      key: "imageTag",
      width: 300,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text code style={{ fontSize: "12px" }}>
            {text?.length > 40 ? `${text.substring(0, 40)}...` : text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Uncompressed Size",
      key: "imageSize",
      width: 160,
      render: (_, record) => {
        if (!record.imageSize) {
          return <Tag color="default">Unknown</Tag>;
        }

        const sizeInMB = record.imageSize / (1024 * 1024);
        let color = "green";
        if (sizeInMB > 1000) color = "red";
        else if (sizeInMB > 500) color = "orange";
        else if (sizeInMB > 100) color = "yellow";

        return (
          <Tooltip
            title={`Uncompressed: ${record.imageSizeFormatted}${record.compressedImageSizeFormatted ? `\nCompressed: ${record.compressedImageSizeFormatted}` : ""}`}
          >
            <Tag color={color}>{record.imageSizeFormatted}</Tag>
          </Tooltip>
        );
      },
      sorter: (a, b) => (a.imageSize || 0) - (b.imageSize || 0),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => {
        const color =
          status === "running"
            ? "green"
            : status === "pending"
              ? "orange"
              : status === "failed"
                ? "red"
                : "default";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "Replicas",
      key: "replicas",
      width: 120,
      render: (_, record) => (
        <div style={{ textAlign: "center" }}>
          <Progress
            type="circle"
            size={50}
            percent={
              record.replicas > 0
                ? Math.round((record.availableReplicas / record.replicas) * 100)
                : 0
            }
            format={() => `${record.availableReplicas}/${record.replicas}`}
            strokeColor={
              record.availableReplicas === record.replicas
                ? "#52c41a"
                : "#faad14"
            }
          />
        </div>
      ),
    },
  ];

  const selectedInfo = getSelectedAppInstanceInfo();

  return (
    <Card style={style}>
      <div style={{ marginBottom: "20px" }}>
        <Title level={4}>
          <DatabaseOutlined style={{ marginRight: "8px" }} />
          Storage View
        </Title>
        <Text type="secondary">
          View services with their container image sizes from Harbor registry
        </Text>
      </div>

      <Space direction="vertical" style={{ width: "100%" }} size="large">
        {/* App Instance Selector */}
        <Card size="small">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: "300px" }}>
              <Text strong style={{ marginRight: "8px" }}>
                App Instance:
              </Text>
              <Select
                placeholder="Select an app instance to view storage"
                style={{ minWidth: "300px" }}
                value={selectedAppInstance}
                onChange={setSelectedAppInstance}
                loading={treeLoading}
                disabled={treeLoading}
              >
                {appInstanceTree.map((env) => (
                  <Select.OptGroup key={env.id} label={env.name}>
                    {env.appInstances.map((instance) => (
                      <Option key={instance.id} value={instance.id}>
                        <Space>
                          <CloudServerOutlined />
                          <span>{instance.name}</span>
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            ({instance.cluster}/{instance.namespace})
                          </Text>
                        </Space>
                      </Option>
                    ))}
                  </Select.OptGroup>
                ))}
              </Select>
            </div>

            {selectedAppInstance && (
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchServicesWithSizes}
                  loading={loading}
                >
                  Refresh
                </Button>
                <Button
                  icon={<BugOutlined />}
                  onClick={debugHarborAPI}
                  loading={debugLoading}
                  type="dashed"
                >
                  Test Harbor API
                </Button>
              </Space>
            )}
          </div>

          {selectedInfo && (
            <div
              style={{
                marginTop: "12px",
                padding: "8px",
                background: "#f5f5f5",
                borderRadius: "4px",
              }}
            >
              <Text type="secondary">
                Environment: <strong>{selectedInfo.environment}</strong> |
                Cluster: <strong>{selectedInfo.instance.cluster}</strong> |
                Namespace: <strong>{selectedInfo.instance.namespace}</strong>
              </Text>
            </div>
          )}
        </Card>

        {/* Storage Summary */}
        {selectedAppInstance && services.length > 0 && (
          <Card size="small">
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <div>
                <Text type="secondary">Total Services:</Text>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#1890ff",
                  }}
                >
                  {services.length}
                </div>
              </div>
              <div>
                <Text type="secondary">Total Storage:</Text>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#52c41a",
                  }}
                >
                  {formatBytes(totalSize)}
                </div>
              </div>
              <div>
                <Text type="secondary">With Size Info:</Text>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#722ed1",
                  }}
                >
                  {servicesWithSize.length}
                </div>
              </div>
              <div>
                <Text type="secondary">Unknown Size:</Text>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#fa8c16",
                  }}
                >
                  {servicesWithoutSize.length}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Services Table */}
        {selectedAppInstance && (
          <>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <Spin size="large" />
                <p style={{ marginTop: "10px" }}>
                  Loading services with image sizes...
                </p>
              </div>
            ) : error ? (
              <Alert
                message="Error"
                description={error}
                type="error"
                showIcon
                action={
                  <Button
                    onClick={fetchServicesWithSizes}
                    type="primary"
                    size="small"
                  >
                    Retry
                  </Button>
                }
              />
            ) : services.length === 0 ? (
              <Alert
                message="No Services"
                description="No services found for the selected app instance."
                type="info"
                showIcon
              />
            ) : (
              <Table
                columns={columns}
                dataSource={services}
                rowKey="id"
                pagination={false}
                scroll={{ x: 1000 }}
                size="small"
              />
            )}
          </>
        )}

        {!selectedAppInstance && !treeLoading && (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <CloudServerOutlined
              style={{
                fontSize: "48px",
                color: "#d9d9d9",
                marginBottom: "16px",
              }}
            />
            <p style={{ color: "#999" }}>
              Please select an app instance to view storage information
            </p>
          </div>
        )}
      </Space>
    </Card>
  );
};
