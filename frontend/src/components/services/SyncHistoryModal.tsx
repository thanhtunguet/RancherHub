import { Card, Empty, Modal, Spin, Typography, Tag, Collapse, Space, Tooltip } from "antd";
import { ArrowRightIcon, ClockIcon, AlertTriangleIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import type { SyncHistory } from "../../types";
import dayjs from "dayjs";

const { Text } = Typography;
const { Panel } = Collapse;

interface SyncHistoryModalProps {
  open: boolean;
  onClose: () => void;
  environmentId?: string;
  title?: string;
}

export function SyncHistoryModal({
  open,
  onClose,
  environmentId,
  title = "Synchronization History",
}: SyncHistoryModalProps) {
  const { data: syncHistory, isLoading } = useQuery({
    queryKey: ['detailed-sync-history', environmentId],
    queryFn: () => {
      const url = environmentId 
        ? `/api/services/sync/history/detailed?env=${environmentId}`
        : '/api/services/sync/history/detailed';
      return api.get<SyncHistory[]>(url).then(res => res.data);
    },
    enabled: open,
    refetchInterval: 30000,
  });

  const getStatusTag = (status: string) => {
    const colors = {
      success: 'green',
      failed: 'red',
      pending: 'blue',
      partial: 'orange',
    };
    return <Tag color={colors[status as keyof typeof colors] || 'default'}>{status}</Tag>;
  };

  const formatDuration = (durationMs?: number) => {
    if (!durationMs) return '-';
    if (durationMs < 1000) return `${durationMs}ms`;
    return `${(durationMs / 1000).toFixed(1)}s`;
  };

  const groupedHistory = syncHistory?.reduce((groups, record) => {
    const operationId = record.syncOperationId;
    if (!groups[operationId]) {
      groups[operationId] = [];
    }
    groups[operationId].push(record);
    return groups;
  }, {} as Record<string, SyncHistory[]>) || {};

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      footer={null}
      width={1000}
    >
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Spin size="large" />
        </div>
      ) : (
        <div className="space-y-4">
          {Object.keys(groupedHistory).length > 0 ? (
            <Collapse>
              {Object.entries(groupedHistory).map(([operationId, records]) => {
                const firstRecord = records[0];
                const successCount = records.filter(r => r.status === 'success').length;
                const totalCount = records.length;
                
                return (
                  <Panel
                    key={operationId}
                    header={
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <Text strong>Operation {operationId.slice(0, 8)}</Text>
                          <div className="text-sm text-gray-600">
                            {totalCount} services • {successCount}/{totalCount} successful
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          {dayjs(firstRecord.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                        </div>
                      </div>
                    }
                  >
                    <div className="space-y-3">
                      {records.map((record) => (
                        <Card key={record.id} size="small" className="border-l-4 border-l-blue-200">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Text strong>{record.serviceName || 'Unknown'}</Text>
                                {record.workloadType && <Tag>{record.workloadType}</Tag>}
                                {getStatusTag(record.status)}
                              </div>
                              <Space size="small">
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <ClockIcon size={12} />
                                  {formatDuration(record.durationMs)}
                                </div>
                                {record.error && (
                                  <Tooltip title={record.error}>
                                    <AlertTriangleIcon size={16} className="text-red-500" />
                                  </Tooltip>
                                )}
                              </Space>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <div className="bg-gray-50 px-2 py-1 rounded">
                                <div className="font-medium">{record.sourceEnvironmentName || 'Unknown'}</div>
                                <div className="text-xs text-gray-500">
                                  {record.sourceCluster || 'N/A'}/{record.sourceNamespace || 'N/A'}
                                </div>
                              </div>
                              <ArrowRightIcon size={16} className="text-gray-400" />
                              <div className="bg-gray-50 px-2 py-1 rounded">
                                <div className="font-medium">{record.targetEnvironmentName || 'Unknown'}</div>
                                <div className="text-xs text-gray-500">
                                  {record.targetCluster || 'N/A'}/{record.targetNamespace || 'N/A'}
                                </div>
                              </div>
                            </div>

                            <div className="text-sm">
                              <Text strong>Image Update:</Text>
                              <div className="mt-1">
                                {record.previousImageTag && (
                                  <div className="text-xs text-gray-500">
                                    From: <code className="bg-gray-100 px-1 rounded">{record.previousImageTag}</code>
                                  </div>
                                )}
                                <div className="text-xs">
                                  To: <code className="bg-blue-50 px-1 rounded text-blue-700">{record.newImageTag}</code>
                                </div>
                              </div>
                            </div>

                            {record.error && (
                              <div className="bg-red-50 p-2 rounded text-xs text-red-700">
                                <Text strong>Error:</Text> {record.error}
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </Panel>
                );
              })}
            </Collapse>
          ) : (
            <Empty description="No sync history found" />
          )}
        </div>
      )}
    </Modal>
  );
}
