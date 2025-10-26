import {
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  ExclamationCircleTwoTone,
  SyncOutlined as SyncIcon,
  CopyOutlined,
  CloudUploadOutlined,
} from "@ant-design/icons";
import Badge from "antd/es/badge";
import Button from "antd/es/button";
import Space from "antd/es/space";
import Table from "antd/es/table";
import Typography from "antd/es/typography";
import message from "antd/es/message";
import { useMemo, useState } from "react";
import type { Service } from "../../types";
import { UpdateImageModal } from "./UpdateImageModal";

const { Text } = Typography;

interface ServiceTableProps {
  filteredServices: Service[];
  selectedServices: Service[];
  onServiceSelectionChange: (
    selectedRowKeys: React.Key[],
    selectedRows: Service[]
  ) => void;
}

type SortOrder = "ascend" | "descend" | null;

interface SortState {
  field: string;
  order: SortOrder;
}

export function ServiceTable({
  filteredServices,
  selectedServices,
  onServiceSelectionChange,
}: ServiceTableProps) {
  const [sortState, setSortState] = useState<SortState>({
    field: "name",
    order: "ascend",
  });

  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Sort services based on current sort state
  const sortedServices = useMemo(() => {
    if (!sortState.field || !sortState.order) {
      return filteredServices;
    }

    return [...filteredServices].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortState.field) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "status":
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case "workloadType":
          aValue = a.workloadType.toLowerCase();
          bValue = b.workloadType.toLowerCase();
          break;
        case "replicas":
          aValue = a.availableReplicas;
          bValue = b.availableReplicas;
          break;
        case "imageTag":
          aValue = a.imageTag?.toLowerCase() || "";
          bValue = b.imageTag?.toLowerCase() || "";
          break;
        default:
          aValue = a[sortState.field as keyof Service];
          bValue = b[sortState.field as keyof Service];
      }

      if (aValue < bValue) {
        return sortState.order === "ascend" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortState.order === "ascend" ? 1 : -1;
      }
      return 0;
    });
  }, [filteredServices, sortState]);

  const handleTableChange = (_pagination: any, _filters: any, sorter: any) => {
    setSortState({
      field: sorter.field || "name",
      order: sorter.order || "ascend",
    });
  };

  const handleCopyTag = async (imageTag: string) => {
    try {
      await navigator.clipboard.writeText(imageTag);
      message.success("Tag copied to clipboard");
    } catch (error) {
      message.error("Failed to copy tag");
    }
  };

  const handleUpdateClick = (service: Service) => {
    setSelectedService(service);
    setUpdateModalOpen(true);
  };

  const handleUpdateModalClose = () => {
    setUpdateModalOpen(false);
    setSelectedService(null);
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: true,
      sortOrder: sortState.field === "name" ? sortState.order : null,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      sorter: true,
      sortOrder: sortState.field === "status" ? sortState.order : null,
      render: (status: string) => {
        let color = "default";
        let icon = null;
        if (["active", "running", "Ready"].includes(status)) {
          color = "success";
          icon = <CheckCircleTwoTone twoToneColor="#52c41a" />;
        } else if (["failed", "error", "CrashLoopBackOff"].includes(status)) {
          color = "error";
          icon = <CloseCircleTwoTone twoToneColor="#ff4d4f" />;
        } else if (["pending", "progressing", "updating"].includes(status)) {
          color = "processing";
          icon = <SyncIcon spin style={{ color: "#1890ff" }} />;
        } else {
          color = "warning";
          icon = <ExclamationCircleTwoTone twoToneColor="#faad14" />;
        }
        return (
          <Badge
            status={color as any}
            text={
              <span>
                {icon} {status}
              </span>
            }
          />
        );
      },
    },
    {
      title: "Type",
      dataIndex: "workloadType",
      key: "workloadType",
      sorter: true,
      sortOrder: sortState.field === "workloadType" ? sortState.order : null,
      render: (workloadType: string) => {
        return (
          <span className="capitalize">
            {workloadType === "deployment" ? "Deployment" : "DaemonSets"}
          </span>
        );
      },
    },
    {
      title: "Replicas",
      key: "replicas",
      sorter: true,
      sortOrder: sortState.field === "replicas" ? sortState.order : null,
      render: (_: any, record: Service) =>
        `${record.availableReplicas} / ${record.replicas}`,
    },
    {
      title: "Tag",
      dataIndex: "imageTag",
      key: "imageTag",
      sorter: true,
      sortOrder: sortState.field === "imageTag" ? sortState.order : null,
      render: (imageTag: string) => {
        if (!imageTag) return "";
        const parts = imageTag.split(":");
        let version = parts.length > 1 ? parts.slice(1).join(":") : parts[0];
        if (
          typeof version === "string" &&
          (version.length === 32 || version.length === 40)
        ) {
          version = version.slice(0, 7);
        }
        return (
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: "monospace", fontSize: 14 }}>
              {version}
            </span>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyTag(imageTag)}
              title="Copy full image tag"
              className="text-gray-500 hover:text-blue-600"
            />
          </div>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: any, record: Service) => (
        <Button
          type="primary"
          size="small"
          icon={<CloudUploadOutlined />}
          onClick={() => handleUpdateClick(record)}
          title="Update image tag"
        >
          Update
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Space>
          <Text className="text-gray-500">
            Showing {sortedServices.length} services
          </Text>
          {sortState.field && sortState.order && (
            <Text className="text-blue-600">
              Sorted by: {sortState.field} ({sortState.order})
            </Text>
          )}
        </Space>
      </div>

      <Table
        dataSource={sortedServices}
        rowKey="id"
        rowSelection={{
          selectedRowKeys: selectedServices.map((s) => s.id),
          onChange: onServiceSelectionChange,
        }}
        columns={columns}
        onChange={handleTableChange}
        pagination={false}
      />

      <UpdateImageModal
        service={selectedService}
        open={updateModalOpen}
        onClose={handleUpdateModalClose}
        onSuccess={() => {
          // The mutation will automatically invalidate queries
          // and refresh the services list
        }}
      />
    </div>
  );
}
