import { Badge, Table, Select, Space, Typography } from "antd";
import {
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  ExclamationCircleTwoTone,
  SyncOutlined as SyncIcon,
} from "@ant-design/icons";
import { useState } from "react";
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

export function ServiceTable({
  filteredServices,
  selectedServices,
  onServiceSelectionChange,
}: ServiceTableProps) {
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
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
    { title: "Type", dataIndex: "workloadType", key: "workloadType" },
    {
      title: "Replicas",
      key: "replicas",
      render: (_: any, record: Service) =>
        `${record.availableReplicas}/${record.replicas}`,
    },
    {
      title: "Tag",
      dataIndex: "imageTag",
      key: "imageTag",
      width: 220,
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
  const endIndex = Math.min(currentPage * pageSize, filteredServices.length);

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
            Showing {startIndex}-{endIndex} of {filteredServices.length}{" "}
            services
          </Text>
        </Space>
      </div>

      <Table
        dataSource={filteredServices}
        rowKey="id"
        rowSelection={{
          selectedRowKeys: selectedServices.map((s) => s.id),
          onChange: onServiceSelectionChange,
        }}
        columns={columns}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: filteredServices.length,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total: number, range: [number, number]) =>
            `${range[0]}-${range[1]} of ${total} services`,
          pageSizeOptions: ["10", "20", "50", "100"],
          onShowSizeChange: (current: number, size: number) =>
            handlePageSizeChange(size),
          onChange: (page: number) => setCurrentPage(page),
        }}
      />
    </div>
  );
}
