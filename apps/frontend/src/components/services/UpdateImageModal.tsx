import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import Modal from "antd/es/modal";
import Table from "antd/es/table";
import Typography from "antd/es/typography";
import Button from "antd/es/button";
import Space from "antd/es/space";
import Tag from "antd/es/tag";
import message from "antd/es/message";
import Spin from "antd/es/spin";
import Alert from "antd/es/alert";
import Input from "antd/es/input";
import { useState, useMemo } from "react";
import { useImageTags, useUpdateServiceImage } from "../../hooks/useServices";
import type { Service, ImageTag } from "../../types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const { Text } = Typography;

interface UpdateImageModalProps {
  service: Service | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UpdateImageModal({
  service,
  open,
  onClose,
  onSuccess,
}: UpdateImageModalProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");

  const {
    data: imageTags,
    isLoading,
    error,
    refetch,
  } = useImageTags(service?.id);

  const updateMutation = useUpdateServiceImage();

  const getNewImageTag = () => {
    if (!service?.imageTag || !selectedTag) return null;
    const parts = service.imageTag.split(":");
    if (parts.length > 1) {
      const imageWithoutTag = parts.slice(0, -1).join(":");
      return `${imageWithoutTag}:${selectedTag}`;
    }
    return `${service.imageTag}:${selectedTag}`;
  };

  const handleUpdate = async () => {
    if (!selectedTag || !service) return;

    const newImageTag = getNewImageTag();
    const currentTag = getCurrentTag();

    Modal.confirm({
      title: "Confirm Update",
      content: (
        <div>
          <p>Are you sure you want to update the image tag?</p>
          <Space direction="vertical" size={4} style={{ marginTop: 8 }}>
            <Text type="secondary">
              Service: <Text strong>{service.name}</Text>
            </Text>
            <Text type="secondary">
              Current: <Text code>{service.imageTag}</Text>
            </Text>
            <Text type="secondary">
              New: <Text code>{newImageTag}</Text>
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              (Replacing tag <Text code>{currentTag}</Text> with{" "}
              <Text code>{selectedTag}</Text>)
            </Text>
          </Space>
        </div>
      ),
      okText: "Update",
      okType: "primary",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await updateMutation.mutateAsync({
            serviceId: service.id,
            tag: selectedTag,
          });

          message.success(
            `Successfully updated ${service.name} to ${selectedTag}`,
          );

          onClose();
          setSelectedTag(null);

          if (onSuccess) {
            onSuccess();
          }
        } catch (error: any) {
          message.error(
            error.response?.data?.message ||
              error.message ||
              "Failed to update service image",
          );
        }
      },
    });
  };

  const handleCancel = () => {
    setSelectedTag(null);
    setSearchText("");
    onClose();
  };

  const getCurrentTag = () => {
    if (!service?.imageTag) return null;
    const parts = service.imageTag.split(":");
    return parts.length > 1 ? parts[parts.length - 1] : "latest";
  };

  const currentTag = getCurrentTag();

  // Filter image tags based on search text
  const filteredImageTags = useMemo(() => {
    if (!imageTags || !searchText.trim()) {
      return imageTags || [];
    }

    const searchLower = searchText.toLowerCase().trim();
    return imageTags.filter((tag) =>
      tag.name.toLowerCase().includes(searchLower),
    );
  }, [imageTags, searchText]);

  const columns = [
    {
      title: "Tag",
      dataIndex: "name",
      key: "name",
      render: (tag: string) => {
        const isCurrentTag = tag === currentTag;
        const isSelectedTag = tag === selectedTag;

        return (
          <Space>
            <Text
              strong={isCurrentTag || isSelectedTag}
              style={{
                fontFamily: "monospace",
                fontSize: 14,
                color: isCurrentTag ? "#52c41a" : undefined,
              }}
            >
              {tag}
            </Text>
            {isCurrentTag && (
              <Tag color="success" icon={<CheckCircleOutlined />}>
                Current
              </Tag>
            )}
            {isSelectedTag && !isCurrentTag && <Tag color="blue">Selected</Tag>}
          </Space>
        );
      },
    },
    {
      title: "Pushed",
      dataIndex: "pushedAt",
      key: "pushedAt",
      render: (pushedAt: string) => {
        const date = dayjs(pushedAt);
        return (
          <Space direction="vertical" size={0}>
            <Text>{date.format("YYYY-MM-DD HH:mm:ss")}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <ClockCircleOutlined /> {date.fromNow()}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Size",
      dataIndex: "sizeFormatted",
      key: "sizeFormatted",
      render: (sizeFormatted?: string) => {
        if (!sizeFormatted) return "-";
        return (
          <Text style={{ fontFamily: "monospace" }}>
            <DatabaseOutlined /> {sizeFormatted}
          </Text>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      render: (_: any, record: ImageTag) => {
        const isCurrentTag = record.name === currentTag;
        const isSelectedTag = record.name === selectedTag;

        if (isCurrentTag) {
          return <Tag color="success">Current Version</Tag>;
        }

        return (
          <Button
            type={isSelectedTag ? "default" : "primary"}
            size="small"
            onClick={() => {
              if (isSelectedTag) {
                setSelectedTag(null);
              } else {
                setSelectedTag(record.name);
              }
            }}
          >
            {isSelectedTag ? "Deselect" : "Select"}
          </Button>
        );
      },
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <ReloadOutlined />
          <span>Update Image Tag</span>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      width={900}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="update"
          type="primary"
          onClick={handleUpdate}
          disabled={!selectedTag || updateMutation.isPending}
          loading={updateMutation.isPending}
        >
          Update to {selectedTag || "..."}
        </Button>,
      ]}
    >
      {service && (
        <div className="mb-4">
          <Space direction="vertical" size={2}>
            <Text strong>Service: {service.name}</Text>
            <Text type="secondary">
              Current Image: <Text code>{service.imageTag}</Text>
            </Text>
          </Space>
        </div>
      )}

      {!!error && (
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="Failed to fetch image tags"
            description={
              ((error as any)?.response?.data?.message as string) ||
              ((error as Error)?.message as string) ||
              "Unknown error"
            }
            type="error"
            showIcon
            closable
          />
          <Button
            size="small"
            onClick={() => {
              void refetch();
            }}
            style={{ marginTop: 8 }}
          >
            Retry
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <Spin size="large" tip="Loading image tags..." />
        </div>
      )}

      {!isLoading && !error && imageTags && imageTags.length > 0 && (
        <>
          <div className="mb-4">
            <Text type="secondary">
              Found {imageTags.length} tags. Select a tag to update the
              deployment.
            </Text>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Input
              placeholder="Search by tag name..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ width: "100%" }}
            />
          </div>

          <Table
            dataSource={filteredImageTags}
            columns={columns as any}
            rowKey="name"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} tags`,
            }}
            rowClassName={(record) =>
              record.name === selectedTag
                ? "bg-blue-50"
                : record.name === currentTag
                  ? "bg-green-50"
                  : ""
            }
          />
        </>
      )}

      {!isLoading && !error && imageTags && imageTags.length === 0 && (
        <Alert
          message="No image tags found"
          description="No tags are available for this service's image in the registry."
          type="info"
          showIcon
        />
      )}
    </Modal>
  );
}
