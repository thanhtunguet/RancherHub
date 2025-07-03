import Card from "antd/es/card";
import Tag from "antd/es/tag";
import Typography from "antd/es/typography";
import Space from "antd/es/space";
import Tooltip from "antd/es/tooltip";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ServerIcon,
} from "lucide-react";
import dayjs from "dayjs";
import type { Service } from "../../types";

const { Text, Title } = Typography;

interface ServiceCardProps {
  service: Service;
  selected?: boolean;
  onSelect?: (service: Service) => void;
}

export function ServiceCard({
  service,
  selected = false,
  onSelect,
}: ServiceCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "running":
        return <CheckCircleIcon size={16} className="text-green-500" />;
      case "failed":
      case "error":
        return <XCircleIcon size={16} className="text-red-500" />;
      case "pending":
      case "starting":
        return <ClockIcon size={16} className="text-yellow-500" />;
      default:
        return <ServerIcon size={16} className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "running":
        return "green";
      case "failed":
      case "error":
        return "red";
      case "pending":
      case "starting":
        return "orange";
      default:
        return "default";
    }
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(service);
    }
  };

  return (
    <Card
      size="small"
      className={`cursor-pointer transition-all duration-200 ${
        selected
          ? "border-blue-500 shadow-md bg-blue-50"
          : "hover:border-blue-300 hover:shadow-sm"
      }`}
      onClick={handleCardClick}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <Title level={5} className="mb-1 truncate">
              {service.name}
            </Title>
            <Text className="text-sm text-gray-500">
              {service.workloadType}
            </Text>
          </div>
          <div className="flex items-center gap-1 ml-2">
            {getStatusIcon(service.status)}
            <Tag color={getStatusColor(service.status)}>{service.status}</Tag>
          </div>
        </div>

        {/* Image Info */}
        <div className="space-y-1">
          <Text strong className="text-xs text-gray-600">
            IMAGE
          </Text>
          <div className="bg-gray-100 p-2 rounded text-xs font-mono break-all">
            {service.imageTag || "unknown"}
          </div>
        </div>

        {/* Replicas */}
        <div className="flex items-center justify-between">
          <Space size="small">
            <Text className="text-xs text-gray-600">REPLICAS</Text>
            <Text className="text-sm font-medium">
              {service.availableReplicas} / {service.replicas}
            </Text>
          </Space>

          {service.lastSynced && (
            <Tooltip
              title={`Last synced: ${dayjs(service.lastSynced).format("YYYY-MM-DD HH:mm:ss")}`}
            >
              <Tag color="blue">Synced</Tag>
            </Tooltip>
          )}
        </div>
      </div>
    </Card>
  );
}
