import React, { useState, useEffect } from "react";
import Table from 'antd/es/table';
import Card from 'antd/es/card';
import Spin from 'antd/es/spin';
import Alert from 'antd/es/alert';
import Typography from 'antd/es/typography';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Tag from 'antd/es/tag';
import Progress from 'antd/es/progress';
import Tooltip from 'antd/es/tooltip';
import Button from 'antd/es/button';
import message from 'antd/es/message';
import {
  CloudServerOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  BugOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { ServiceWithImageSize, AppInstanceTreeNode } from "../../types";
import { servicesApi, harborSitesApi } from "../../services/api";

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
      const data = await servicesApi.getAppInstanceTree();
      setAppInstanceTree(data);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load app instances";
      setError(message);
    } finally {
      setTreeLoading(false);
    }
  };

  const fetchServicesWithSizes = async () => {
    if (!selectedAppInstance) return;

    try {
      setLoading(true);
      setError(null);

      const data = await servicesApi.getServicesWithImageSizes(
        selectedAppInstance
      );
      setServices(data);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || "An error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const debugHarborAPI = async () => {
    if (!selectedAppInstance) return;

    try {
      setDebugLoading(true);

      // First, check if Harbor site is configured
      const harborSite = await harborSitesApi.getActive();
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
          const testResult = await harborSitesApi.testImageSize(
            harborSite.id,
            sampleService.imageTag
          );

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
      render: (text: string, record) => (
        <div>
          <Tooltip title={text}>
            <Text code style={{ fontSize: "12px" }}>
              {text?.length > 40 ? `${text.substring(0, 40)}...` : text}
            </Text>
          </Tooltip>
          {record.imageSource && (
            <div style={{ marginTop: "4px" }}>
              <Tag 
                color={record.imageSource === 'Harbor' ? 'blue' : record.imageSource === 'DockerHub' ? 'orange' : 'default'}
                style={{ fontSize: '10px' }}
              >
                {record.imageSource}
              </Tag>
            </div>
          )}
        </div>
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
          View services with their container image sizes from Harbor registry and DockerHub
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
