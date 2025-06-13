import { Card, Empty, Modal, Spin, Typography } from "antd";
import type { SyncOperation } from "../../types";

const { Text } = Typography;

interface SyncHistoryModalProps {
  open: boolean;
  onClose: () => void;
  syncHistory: SyncOperation[];
  isLoading: boolean;
}

export function SyncHistoryModal({
  open,
  onClose,
  syncHistory,
  isLoading,
}: SyncHistoryModalProps) {
  return (
    <Modal
      title="Synchronization History"
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Spin size="large" />
        </div>
      ) : (
        <div className="space-y-4">
          {syncHistory && syncHistory.length > 0 ? (
            syncHistory.map((operation) => (
              <Card key={operation.id} size="small">
                <div className="flex items-center justify-between">
                  <div>
                    <Text strong>Operation {operation.id.slice(0, 8)}</Text>
                    <div className="text-sm text-gray-600">
                      {operation.serviceIds.length} services •{" "}
                      {operation.status}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    {new Date(operation.startTime).toLocaleString()}
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Empty description="No sync history found" />
          )}
        </div>
      )}
    </Modal>
  );
}
