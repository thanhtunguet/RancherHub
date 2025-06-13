import { Button, Space, Typography } from "antd";
import { HistoryOutlined, SyncOutlined } from "@ant-design/icons";
import { RefreshCwIcon } from "lucide-react";
import type { Service } from "../../types";

const { Title, Text } = Typography;

interface ServiceHeaderProps {
  selectedServicesCount: number;
  effectiveEnvironmentId: string;
  selectedAppInstanceId: string;
  onShowHistory: () => void;
  onRefresh: () => void;
  onTestApi: () => void;
  onDebugAppInstances: () => void;
  onDebugClusters: () => void;
  onSync: () => void;
}

export function ServiceHeader({
  selectedServicesCount,
  effectiveEnvironmentId,
  selectedAppInstanceId,
  onShowHistory,
  onRefresh,
  onTestApi,
  onDebugAppInstances,
  onDebugClusters,
  onSync,
}: ServiceHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <Title level={2} className="mb-1">
          Services
        </Title>
        <Text className="text-gray-600">
          View and manage services across your environments
        </Text>
      </div>

      <Space>
        <Button
          icon={<HistoryOutlined />}
          onClick={onShowHistory}
          disabled={!effectiveEnvironmentId}
        >
          Sync History
        </Button>
        <Button
          icon={<RefreshCwIcon size={16} />}
          onClick={onRefresh}
          disabled={!effectiveEnvironmentId}
        >
          Refresh
        </Button>
        <Button
          onClick={onTestApi}
          disabled={!effectiveEnvironmentId || selectedAppInstanceId === "all"}
        >
          Test API
        </Button>
        <Button
          onClick={onDebugAppInstances}
          disabled={!effectiveEnvironmentId}
        >
          Debug
        </Button>
        <Button
          onClick={onDebugClusters}
          disabled={!effectiveEnvironmentId || selectedAppInstanceId === "all"}
        >
          Debug Clusters
        </Button>
        <Button
          type="primary"
          icon={<SyncOutlined />}
          disabled={selectedServicesCount === 0}
          onClick={onSync}
        >
          Sync Selected ({selectedServicesCount})
        </Button>
      </Space>
    </div>
  );
}
