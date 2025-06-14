import { useState } from "react";
import Card from "antd/es/card";
import Table from "antd/es/table";
import Tag from "antd/es/tag";
import Typography from "antd/es/typography";
import Select from "antd/es/select";
import Space from "antd/es/space";
import Input from "antd/es/input";
import Tooltip from "antd/es/tooltip";
import Modal from "antd/es/modal";
import {
  HistoryIcon,
  ArrowRightIcon,
  ClockIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import type { SyncHistory } from "../types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

const { Title, Text } = Typography;
const { Search } = Input;

dayjs.extend(relativeTime);

export function SyncHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedRecord, setSelectedRecord] = useState<SyncHistory | null>(
    null
  );

  const { data: syncHistory, isLoading } = useQuery({
    queryKey: ["detailed-sync-history"],
    queryFn: () =>
      api
        .get<SyncHistory[]>("/api/services/sync/history/detailed")
        .then((res) => res.data),
    refetchInterval: 30000,
  });

  const filteredHistory =
    syncHistory?.filter((record) => {
      const matchesSearch =
        !searchTerm ||
        record.serviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.sourceEnvironmentName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        record.targetEnvironmentName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        record.newImageTag?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = !statusFilter || record.status === statusFilter;

      return matchesSearch && matchesStatus;
    }) || [];

  const getStatusTag = (status: string) => {
    const colors = {
      success: "green",
      failed: "red",
      pending: "blue",
      partial: "orange",
    };
    return (
      <Tag color={colors[status as keyof typeof colors] || "default"}>
        {status}
      </Tag>
    );
  };

  const formatDuration = (durationMs?: number) => {
    if (!durationMs) return "-";
    if (durationMs < 1000) return `${durationMs}ms`;
    return `${(durationMs / 1000).toFixed(1)}s`;
  };

  const columns = [
    {
      title: "Service",
      dataIndex: "serviceName",
      key: "serviceName",
      render: (name: string, record: SyncHistory) => (
        <div>
          <Text strong>{name || "Unknown"}</Text>
          <div className="text-xs text-gray-500">
            {record.workloadType || "N/A"}
          </div>
        </div>
      ),
    },
    {
      title: "Sync Direction",
      key: "direction",
      render: (record: SyncHistory) => (
        <div className="flex items-center gap-2">
          <div className="text-center">
            <div className="text-sm font-medium">
              {record.sourceEnvironmentName || "Unknown"}
            </div>
            <div className="text-xs text-gray-500">
              {record.sourceCluster || "N/A"}/{record.sourceNamespace || "N/A"}
            </div>
          </div>
          <ArrowRightIcon size={16} className="text-gray-400" />
          <div className="text-center">
            <div className="text-sm font-medium">
              {record.targetEnvironmentName || "Unknown"}
            </div>
            <div className="text-xs text-gray-500">
              {record.targetCluster || "N/A"}/{record.targetNamespace || "N/A"}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Image Change",
      key: "imageChange",
      render: (record: SyncHistory) => (
        <div className="space-y-1">
          {record.previousImageTag && (
            <div className="text-xs text-gray-500">
              From:{" "}
              <code className="bg-gray-100 px-1 rounded">
                {record.previousImageTag}
              </code>
            </div>
          )}
          <div className="text-xs">
            To:{" "}
            <code className="bg-blue-50 px-1 rounded text-blue-700">
              {record.newImageTag}
            </code>
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => getStatusTag(status),
    },
    {
      title: "Duration",
      dataIndex: "durationMs",
      key: "duration",
      render: (duration: number) => (
        <div className="flex items-center gap-1">
          <ClockIcon size={12} className="text-gray-400" />
          <Text className="text-xs">{formatDuration(duration)}</Text>
        </div>
      ),
    },
    {
      title: "Timestamp",
      dataIndex: "timestamp",
      key: "timestamp",
      render: (timestamp: string) => (
        <Tooltip title={dayjs(timestamp).format("YYYY-MM-DD HH:mm:ss")}>
          <Text className="text-xs">{dayjs(timestamp).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: SyncHistory) => (
        <Space>
          <a
            onClick={() => setSelectedRecord(record)}
            className="text-blue-500 hover:text-blue-700"
          >
            View Details
          </a>
          {record.error && (
            <Tooltip title={record.error}>
              <AlertTriangleIcon size={16} className="text-red-500" />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <HistoryIcon size={24} className="text-blue-500" />
          <Title level={2} className="m-0">
            Sync History
          </Title>
        </div>

        <div className="flex gap-4 mb-4">
          <Search
            placeholder="Search by service, environment, or image tag..."
            allowClear
            style={{ width: 300 }}
            onSearch={setSearchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Select
            placeholder="Filter by status"
            style={{ width: 150 }}
            allowClear
            value={statusFilter || undefined}
            onChange={setStatusFilter}
            options={[
              { label: "Success", value: "success" },
              { label: "Failed", value: "failed" },
              { label: "Pending", value: "pending" },
              { label: "Partial", value: "partial" },
            ]}
          />
        </div>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredHistory}
          loading={isLoading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} records`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title="Sync History Details"
        open={!!selectedRecord}
        onCancel={() => setSelectedRecord(null)}
        footer={null}
        width={800}
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text strong>Service Name:</Text>
                <div>{selectedRecord.serviceName || "Unknown"}</div>
              </div>
              <div>
                <Text strong>Workload Type:</Text>
                <div>{selectedRecord.workloadType || "N/A"}</div>
              </div>
              <div>
                <Text strong>Status:</Text>
                <div>{getStatusTag(selectedRecord.status)}</div>
              </div>
              <div>
                <Text strong>Duration:</Text>
                <div>{formatDuration(selectedRecord.durationMs)}</div>
              </div>
            </div>

            <div>
              <Text strong>Source:</Text>
              <div className="bg-gray-50 p-3 rounded mt-1">
                <div>
                  Environment:{" "}
                  {selectedRecord.sourceEnvironmentName || "Unknown"}
                </div>
                <div>Cluster: {selectedRecord.sourceCluster || "N/A"}</div>
                <div>Namespace: {selectedRecord.sourceNamespace || "N/A"}</div>
              </div>
            </div>

            <div>
              <Text strong>Target:</Text>
              <div className="bg-gray-50 p-3 rounded mt-1">
                <div>
                  Environment:{" "}
                  {selectedRecord.targetEnvironmentName || "Unknown"}
                </div>
                <div>Cluster: {selectedRecord.targetCluster || "N/A"}</div>
                <div>Namespace: {selectedRecord.targetNamespace || "N/A"}</div>
              </div>
            </div>

            <div>
              <Text strong>Image Change:</Text>
              <div className="bg-gray-50 p-3 rounded mt-1">
                {selectedRecord.previousImageTag && (
                  <div>
                    Previous: <code>{selectedRecord.previousImageTag}</code>
                  </div>
                )}
                <div>
                  New: <code>{selectedRecord.newImageTag}</code>
                </div>
              </div>
            </div>

            {selectedRecord.configChanges && (
              <div>
                <Text strong>Configuration Changes:</Text>
                <div className="bg-gray-50 p-3 rounded mt-1">
                  <pre className="text-xs">
                    {JSON.stringify(selectedRecord.configChanges, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {selectedRecord.error && (
              <div>
                <Text strong>Error:</Text>
                <div className="bg-red-50 p-3 rounded mt-1 text-red-700">
                  {selectedRecord.error}
                </div>
              </div>
            )}

            <div>
              <Text strong>Timestamp:</Text>
              <div>
                {dayjs(selectedRecord.timestamp).format("YYYY-MM-DD HH:mm:ss")}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
