import Card from "antd/es/card";
import Table from "antd/es/table";
import Tag from "antd/es/tag";
import Alert from "antd/es/alert";
import Space from "antd/es/space";
import Typography from "antd/es/typography";
import Divider from "antd/es/divider";
import { GitCompareIcon } from "lucide-react";
import { useAppInstances } from "../../hooks/useAppInstances";
import { useCompareServicesByInstance } from "../../hooks/useServices";
import { formatAppInstanceDisplay } from "../../utils/displayUtils";

const { Title, Text } = Typography;

interface ServiceComparisonProps {
  initialSourceInstance?: string;
  initialTargetInstance?: string;
}

export function ServiceComparison({
  initialSourceInstance,
  initialTargetInstance,
}: ServiceComparisonProps) {
  const sourceAppInstanceId = initialSourceInstance;
  const targetAppInstanceId = initialTargetInstance;

  const { data: allAppInstances } = useAppInstances();
  const {
    data: comparison,
    isLoading: isLoadingComparison,
    error: comparisonError,
  } = useCompareServicesByInstance(sourceAppInstanceId, targetAppInstanceId);

  const getDifferentStatus = (record: any) => {
    // Use the differenceType from backend if available, otherwise fall back to logic
    if (record.differenceType) {
      switch (record.differenceType) {
        case "missing_in_source":
          return "Missing in Source";
        case "missing_in_target":
          return "Missing in Target";
        case "different":
          return "Different";
        case "identical":
          return "Identical";
        default:
          return "Unknown";
      }
    }

    // Fallback logic
    if (!record.source && record.target) {
      return "Missing in Source";
    }
    if (record.source && !record.target) {
      return "Missing in Target";
    }
    if (record.status === "different") {
      return "Different";
    }
    return "Identical";
  };

  const getDifferentStatusColor = (status: string) => {
    switch (status) {
      case "Missing in Source":
        return "red";
      case "Missing in Target":
        return "orange";
      case "Different":
        return "blue";
      case "Identical":
        return "green";
      default:
        return "default";
    }
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Service Name",
      dataIndex: "serviceName",
      key: "serviceName",
      width: 200,
      render: (name: string, record: any) => (
        <Space direction="vertical" size="small">
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {record.workloadType}
          </Text>
        </Space>
      ),
    },
    {
      title: "Different Status",
      key: "differentStatus",
      width: 150,
      render: (record: any) => {
        const status = getDifferentStatus(record);
        return <Tag color={getDifferentStatusColor(status)}>{status}</Tag>;
      },
    },
    {
      title: "Source",
      key: "source",
      width: 300,
      render: (record: any) => {
        if (!record.source) {
          return (
            <Text type="secondary" italic>
              Not found
            </Text>
          );
        }
        return (
          <Space direction="vertical" size="small">
            <Text style={{ fontFamily: "monospace", fontSize: "12px" }}>
              {record.source.imageTag}
            </Text>
            <Text type="secondary" style={{ fontSize: "11px" }}>
              Status: {record.source.status}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Target",
      key: "target",
      width: 300,
      render: (record: any) => {
        if (!record.target) {
          return (
            <Text type="secondary" italic>
              Not found
            </Text>
          );
        }
        return (
          <Space direction="vertical" size="small">
            <Text style={{ fontFamily: "monospace", fontSize: "12px" }}>
              {record.target.imageTag}
            </Text>
            <Text type="secondary" style={{ fontSize: "11px" }}>
              Status: {record.target.status}
            </Text>
          </Space>
        );
      },
    },
  ];

  const sourceInstance = allAppInstances?.find(instance => instance.id === sourceAppInstanceId);
  const targetInstance = allAppInstances?.find(instance => instance.id === targetAppInstanceId);
  
  const sourceInstanceDisplay = sourceInstance 
    ? formatAppInstanceDisplay(sourceInstance.name, sourceInstance.cluster, sourceInstance.namespace)
    : "Unknown";
  const targetInstanceDisplay = targetInstance
    ? formatAppInstanceDisplay(targetInstance.name, targetInstance.cluster, targetInstance.namespace)
    : "Unknown";

  if (comparisonError) {
    return (
      <Alert
        type="error"
        message="Comparison Failed"
        description={
          (comparisonError as any)?.message ||
          "An error occurred during comparison"
        }
        className="mb-4"
      />
    );
  }

  if (!comparison && isLoadingComparison) {
    return (
      <div className="text-center py-12">
        <Text type="secondary">Loading comparison...</Text>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="text-center py-12">
        <GitCompareIcon
          size={48}
          className="text-gray-300 mx-auto mb-4"
        />
        <Text type="secondary">
          Select both app instances to compare services
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4 mb-6">
        <Card size="small" className="text-center">
          <Text type="secondary">Total Services</Text>
          <div className="text-2xl font-bold text-blue-600">
            {comparison.summary.totalServices}
          </div>
        </Card>
        <Card size="small" className="text-center">
          <Text type="secondary">Identical</Text>
          <div className="text-2xl font-bold text-green-600">
            {comparison.summary.identical}
          </div>
        </Card>
        <Card size="small" className="text-center">
          <Text type="secondary">Different</Text>
          <div className="text-2xl font-bold text-blue-600">
            {comparison.summary.different}
          </div>
        </Card>
        <Card size="small" className="text-center">
          <Text type="secondary">Missing in Source</Text>
          <div className="text-2xl font-bold text-red-600">
            {comparison.summary.missingInSource || 0}
          </div>
        </Card>
        <Card size="small" className="text-center">
          <Text type="secondary">Missing in Target</Text>
          <div className="text-2xl font-bold text-orange-600">
            {comparison.summary.missingInTarget || 0}
          </div>
        </Card>
      </div>

      <Divider />

      <div className="mb-4">
        <Title level={4}>
          {sourceInstanceDisplay} vs {targetInstanceDisplay}
        </Title>
      </div>

      <Table
        columns={columns}
        dataSource={comparison.comparisons}
        rowKey="serviceName"
        pagination={false}
        scroll={{ x: 1000 }}
        loading={isLoadingComparison}
        size="small"
      />
    </div>
  );
}