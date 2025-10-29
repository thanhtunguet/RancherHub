import React, { useState, useMemo } from 'react';
import { 
  Card, 
  Table, 
  TreeSelect, 
  Button, 
  Typography, 
  Alert, 
  Divider, 
  Tag, 
  Space,
  Tooltip,
  Collapse
} from 'antd';
import { GitCompareIcon, EyeIcon } from 'lucide-react';
import ConfigMapDetailModal from './ConfigMapDetailModal';
import { useEnvironments } from '../../hooks/useEnvironments';
import { useAppInstances } from '../../hooks/useAppInstances';
import { useConfigMapComparison } from '../../hooks/useConfigMaps';
import type { ConfigMapComparison } from '../../types';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const ConfigMapComparison: React.FC = () => {
  const [sourceAppInstanceId, setSourceAppInstanceId] = useState<string>();
  const [targetAppInstanceId, setTargetAppInstanceId] = useState<string>();
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedConfigMapName, setSelectedConfigMapName] = useState<string>();

  const { data: environments, isLoading: isLoadingEnvironments } = useEnvironments();
  const { data: allAppInstances, isLoading: isLoadingAppInstances } = useAppInstances();

  const {
    data: comparison,
    isLoading: isLoadingComparison,
    error: comparisonError,
    refetch: refetchComparison,
  } = useConfigMapComparison(sourceAppInstanceId, targetAppInstanceId);

  const formatAppInstanceDisplay = (name: string, cluster: string, namespace: string) => {
    return `${name} (${cluster}/${namespace})`;
  };

  const treeData = useMemo(() => {
    if (!environments || !allAppInstances) return [];

    return environments.map(env => ({
      title: env.name,
      value: env.id,
      selectable: false,
      children: allAppInstances
        .filter(instance => instance.environmentId === env.id)
        .map(instance => ({
          title: formatAppInstanceDisplay(instance.name, instance.cluster, instance.namespace),
          value: instance.id,
        })),
    }));
  }, [environments, allAppInstances]);

  const handleCompare = () => {
    if (sourceAppInstanceId && targetAppInstanceId) {
      refetchComparison();
    }
  };

  const handleViewDetails = (configMapName: string) => {
    setSelectedConfigMapName(configMapName);
    setDetailModalOpen(true);
  };

  const getDifferentStatus = (record: ConfigMapComparison) => {
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

  const renderConfigMapData = (configMapData: any) => {
    if (!configMapData) {
      return (
        <Text type="secondary" italic>
          Not found
        </Text>
      );
    }

    return (
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <div>
          <Text strong>Data Keys: </Text>
          <Text style={{ fontFamily: "monospace", fontSize: "12px" }}>
            {configMapData.dataKeys?.length || 0} keys
          </Text>
        </div>
        {configMapData.dataKeys?.length > 0 && (
          <Collapse ghost size="small">
            <Panel header="View Data Keys" key="1">
              <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                {configMapData.dataKeys.map((key: string) => (
                  <div key={key} style={{ marginBottom: '4px' }}>
                    <Tag>{key}</Tag>
                  </div>
                ))}
              </div>
            </Panel>
          </Collapse>
        )}
        <div>
          <Text type="secondary" style={{ fontSize: "11px" }}>
            Created: {new Date(configMapData.creationTimestamp).toLocaleString()}
          </Text>
        </div>
      </Space>
    );
  };

  const renderDifferences = (record: ConfigMapComparison) => {
    if (!record.differences || record.differenceType === 'identical') {
      return <Text type="secondary">No differences</Text>;
    }

    const { differences } = record;
    const items = [];

    if (differences.existence) {
      items.push(<Tag color="red" key="existence">ConfigMap missing</Tag>);
    }
    if (differences.data) {
      items.push(<Tag color="blue" key="data">Data changed</Tag>);
    }
    if (differences.labels) {
      items.push(<Tag color="orange" key="labels">Labels changed</Tag>);
    }
    if (differences.annotations) {
      items.push(<Tag color="purple" key="annotations">Annotations changed</Tag>);
    }

    if (differences.dataKeys?.length > 0) {
      items.push(
        <Tooltip key="missing-keys" title={`Missing keys: ${differences.dataKeys.join(', ')}`}>
          <Tag color="volcano">Keys missing: {differences.dataKeys.length}</Tag>
        </Tooltip>
      );
    }

    if (differences.changedKeys?.length > 0) {
      items.push(
        <Tooltip key="changed-keys" title={`Changed keys: ${differences.changedKeys.join(', ')}`}>
          <Tag color="cyan">Keys changed: {differences.changedKeys.length}</Tag>
        </Tooltip>
      );
    }

    return <Space wrap>{items}</Space>;
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "ConfigMap Name",
      dataIndex: "configMapName",
      key: "configMapName",
      width: 200,
      render: (name: string) => (
        <Text strong>{name}</Text>
      ),
    },
    {
      title: "Different Status",
      key: "differentStatus",
      width: 150,
      render: (record: ConfigMapComparison) => {
        const status = getDifferentStatus(record);
        return <Tag color={getDifferentStatusColor(status)}>{status}</Tag>;
      },
    },
    {
      title: "Differences",
      key: "differences",
      width: 300,
      render: renderDifferences,
    },
    {
      title: "Source",
      key: "source",
      width: 300,
      render: (record: ConfigMapComparison) => renderConfigMapData(record.source),
    },
    {
      title: "Target",
      key: "target",
      width: 300,
      render: (record: ConfigMapComparison) => renderConfigMapData(record.target),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (record: ConfigMapComparison) => (
        <Space direction="vertical" size="small">
          <Tooltip title="View detailed comparison">
            <Button
              size="small"
              icon={<EyeIcon size={14} />}
              onClick={() => handleViewDetails(record.configMapName)}
              disabled={!record.source && !record.target}
            >
              Details
            </Button>
          </Tooltip>
        </Space>
      ),
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

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <GitCompareIcon size={24} className="text-blue-500" />
            <Title level={3} className="mb-0">
              ConfigMaps
            </Title>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <Text strong>Source Instance</Text>
            <TreeSelect
              className="w-full mt-1"
              placeholder="Select source app instance"
              value={sourceAppInstanceId}
              onChange={setSourceAppInstanceId}
              treeData={treeData}
              loading={isLoadingEnvironments || isLoadingAppInstances}
              showSearch
              filterTreeNode={(search, node) => {
                if (typeof node.title === 'string') {
                  return node.title.toLowerCase().includes(search.toLowerCase());
                }
                return false;
              }}
              treeDefaultExpandAll
            />
          </div>

          <div>
            <Text strong>Target Instance</Text>
            <TreeSelect
              className="w-full mt-1"
              placeholder="Select target app instance"
              value={targetAppInstanceId}
              onChange={setTargetAppInstanceId}
              treeData={treeData.map(env => ({
                ...env,
                children: env.children?.filter(instance => instance.value !== sourceAppInstanceId)
              }))}
              loading={isLoadingEnvironments || isLoadingAppInstances}
              showSearch
              filterTreeNode={(search, node) => {
                if (typeof node.title === 'string') {
                  return node.title.toLowerCase().includes(search.toLowerCase());
                }
                return false;
              }}
              treeDefaultExpandAll
            />
          </div>

          <div className="flex items-end">
            <Button
              type="primary"
              icon={<GitCompareIcon size={16} />}
              onClick={handleCompare}
              loading={isLoadingComparison}
              disabled={
                !sourceAppInstanceId ||
                !targetAppInstanceId ||
                sourceAppInstanceId === targetAppInstanceId
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
                <Text type="secondary">Total ConfigMaps</Text>
                <div className="text-2xl font-bold text-blue-600">
                  {comparison.summary.totalConfigMaps}
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
              rowKey="configMapName"
              pagination={false}
              scroll={{ x: 1520 }}
              size="middle"
            />
          </>
        )}
      </Card>

      {/* Detail Modal */}
      {selectedConfigMapName && sourceAppInstanceId && targetAppInstanceId && (
        <ConfigMapDetailModal
          open={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedConfigMapName(undefined);
          }}
          configMapName={selectedConfigMapName}
          sourceAppInstanceId={sourceAppInstanceId}
          targetAppInstanceId={targetAppInstanceId}
          sourceInstanceName={sourceInstanceDisplay}
          targetInstanceName={targetInstanceDisplay}
        />
      )}
    </div>
  );
};

export default ConfigMapComparison;