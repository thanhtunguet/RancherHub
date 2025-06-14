import Button from "antd/es/button";
import Space from "antd/es/space";
import Typography from "antd/es/typography";
import { HistoryOutlined, SyncOutlined } from "@ant-design/icons";
import { RefreshCwIcon } from "lucide-react";

const { Title, Text } = Typography;

interface ServiceHeaderProps {
  selectedServicesCount: number;
  effectiveEnvironmentId: string;
  onShowHistory: () => void;
  onRefresh: () => void;
  onSync: () => void;
}

export function ServiceHeader({
  selectedServicesCount,
  effectiveEnvironmentId,
  onShowHistory,
  onRefresh,
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
