import { useState } from "react";
import Card from "antd/es/card";
import Select from "antd/es/select";
import Button from "antd/es/button";
import Table from "antd/es/table";
import Tag from "antd/es/tag";
import Alert from "antd/es/alert";
import Space from "antd/es/space";
import Typography from "antd/es/typography";
import Divider from "antd/es/divider";
import { GitCompareIcon } from "lucide-react";
import { useEnvironments } from "../../hooks/useEnvironments";
import { useCompareServices } from "../../hooks/useServices";

const { Option } = Select;
const { Title, Text } = Typography;

interface ServiceComparisonProps {
  initialSourceEnv?: string;
  initialTargetEnv?: string;
}

export function ServiceComparison({
  initialSourceEnv,
  initialTargetEnv,
}: ServiceComparisonProps) {
  const [sourceEnvironmentId, setSourceEnvironmentId] = useState<
    string | undefined
  >(initialSourceEnv);
  const [targetEnvironmentId, setTargetEnvironmentId] = useState<
    string | undefined
  >(initialTargetEnv);

  const { data: environments, isLoading: isLoadingEnvironments } =
    useEnvironments();
  const {
    data: comparison,
    isLoading: isLoadingComparison,
    error: comparisonError,
    refetch: refetchComparison,
  } = useCompareServices(sourceEnvironmentId, targetEnvironmentId);

  const handleCompare = () => {
    refetchComparison();
  };

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

  const sourceEnvName =
    environments?.find((env) => env.id === sourceEnvironmentId)?.name ||
    "Unknown";
  const targetEnvName =
    environments?.find((env) => env.id === targetEnvironmentId)?.name ||
    "Unknown";

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <GitCompareIcon size={24} className="text-blue-500" />
            <Title level={3} className="mb-0">
              Service Comparison
            </Title>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <Text strong>Source Environment</Text>
            <Select
              className="w-full mt-1"
              placeholder="Select source environment"
              value={sourceEnvironmentId}
              onChange={setSourceEnvironmentId}
              loading={isLoadingEnvironments}
            >
              {environments?.map((env) => (
                <Option key={env.id} value={env.id}>
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: env.color }}
                    />
                    <span>{env.name}</span>
                  </div>
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <Text strong>Target Environment</Text>
            <Select
              className="w-full mt-1"
              placeholder="Select target environment"
              value={targetEnvironmentId}
              onChange={setTargetEnvironmentId}
              loading={isLoadingEnvironments}
            >
              {environments?.map((env) => (
                <Option
                  key={env.id}
                  value={env.id}
                  disabled={env.id === sourceEnvironmentId}
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: env.color }}
                    />
                    <span>{env.name}</span>
                  </div>
                </Option>
              ))}
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              type="primary"
              icon={<GitCompareIcon size={16} />}
              onClick={handleCompare}
              loading={isLoadingComparison}
              disabled={
                !sourceEnvironmentId ||
                !targetEnvironmentId ||
                sourceEnvironmentId === targetEnvironmentId
              }
              className="w-full"
            >
              Compare
            </Button>
          </div>
        </div>

        {comparisonError && (
          <Alert
            type="error"
            message="Comparison Failed"
            description={
              (comparisonError as any)?.message ||
              "An error occurred during comparison"
            }
            className="mb-4"
          />
        )}

        {comparison && (
          <>
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
                {sourceEnvName} vs {targetEnvName}
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
          </>
        )}

        {!comparison &&
          !isLoadingComparison &&
          sourceEnvironmentId &&
          targetEnvironmentId && (
            <div className="text-center py-12">
              <GitCompareIcon
                size={48}
                className="text-gray-300 mx-auto mb-4"
              />
              <Text type="secondary">
                Click "Compare" to see the differences between environments
              </Text>
            </div>
          )}
      </Card>
    </div>
  );
}
