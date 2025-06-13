import { Badge, Table, Select, Space, Typography } from "antd";
import {
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  ExclamationCircleTwoTone,
  SyncOutlined as SyncIcon,
} from "@ant-design/icons";
import { useState, useMemo } from "react";
import type { Service } from "../../types";

const { Option } = Select;
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
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortState, setSortState] = useState<SortState>({
    field: "name",
    order: "ascend",
  });

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

  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    setSortState({
      field: sorter.field || "name",
      order: sorter.order || "ascend",
    });
    setCurrentPage(1);
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
    },
    {
      title: "Replicas",
      key: "replicas",
      sorter: true,
      sortOrder: sortState.field === "replicas" ? sortState.order : null,
      render: (_: any, record: Service) =>
        `${record.availableReplicas}/${record.replicas}`,
    },
    {
      title: "Tag",
      dataIndex: "imageTag",
      key: "imageTag",
      width: 220,
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
          <span style={{ fontFamily: "monospace", fontSize: 14 }}>
            {version}
          </span>
        );
      },
    },
  ];

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, sortedServices.length);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Space>
          <Text>Items per page:</Text>
          <Select
            value={pageSize.toString()}
            onChange={(value) => handlePageSizeChange(Number(value))}
            style={{ width: 80 }}
          >
            <Option value="10">10</Option>
            <Option value="20">20</Option>
            <Option value="50">50</Option>
            <Option value="100">100</Option>
          </Select>
          <Text className="text-gray-500">
            Showing {startIndex}-{endIndex} of {sortedServices.length} services
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
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: sortedServices.length,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total: number, range: [number, number]) =>
            `${range[0]}-${range[1]} of ${total} services`,
          pageSizeOptions: ["10", "20", "50", "100"],
          onShowSizeChange: (size: number) => handlePageSizeChange(size),
          onChange: (page: number) => setCurrentPage(page),
        }}
      />
    </div>
  );
}
