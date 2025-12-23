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
  Space
} from 'antd';
import { ShieldIcon, EyeIcon, PlusIcon, MinusIcon } from 'lucide-react';
import SecretDetailModal from './SecretDetailModal';
import { useEnvironments } from '../../hooks/useEnvironments';
import { useAppInstances } from '../../hooks/useAppInstances';
import { useSecretComparison } from '../../hooks/useSecrets';
import type { SecretComparison } from '../../types';

const { Title, Text } = Typography;

const SecretComparison: React.FC = () => {
  const [sourceAppInstanceId, setSourceAppInstanceId] = useState<string>();
  const [targetAppInstanceId, setTargetAppInstanceId] = useState<string>();
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSecretName, setSelectedSecretName] = useState<string>();

  const { data: environments, isLoading: isLoadingEnvironments } = useEnvironments();
  const { data: allAppInstances, isLoading: isLoadingAppInstances } = useAppInstances();

  const {
    data: comparison,
    isLoading: isLoadingComparison,
    error: comparisonError,
    refetch: refetchComparison,
  } = useSecretComparison(sourceAppInstanceId, targetAppInstanceId);

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
          key: instance.id,
        })),
    }));
  }, [environments, allAppInstances]);

  const getStatusTag = (comparison: SecretComparison) => {
    const { status, differenceType } = comparison;
    
    if (status === 'identical') {
      return <Tag color="green">Identical</Tag>;
    }
    
    if (status === 'missing') {
      if (differenceType === 'missing-in-source') {
        return <Tag color="orange" icon={<PlusIcon className="w-3 h-3" />}>Missing in Source</Tag>;
      } else {
        return <Tag color="red" icon={<MinusIcon className="w-3 h-3" />}>Missing in Target</Tag>;
      }
    }
    
    return <Tag color="blue">Different</Tag>;
  };

  const getDifferencesText = (comparison: SecretComparison) => {
    if (comparison.status === 'identical') {
      return 'No differences';
    }
    
    if (comparison.status === 'missing') {
      return 'Secret does not exist in one instance';
    }

    const { keys } = comparison.differences;
    const parts = [];
    
    if (keys.onlyInSource.length > 0) {
      parts.push(`${keys.onlyInSource.length} keys only in source`);
    }
    if (keys.onlyInTarget.length > 0) {
      parts.push(`${keys.onlyInTarget.length} keys only in target`);
    }
    if (keys.different.length > 0) {
      parts.push(`${keys.different.length} keys with different values`);
    }
    
    return parts.join(', ') || 'No key differences';
  };

  const columns = [
    {
      title: 'Secret Name',
      dataIndex: 'secretName',
      key: 'secretName',
      render: (text: string) => (
        <Space>
          <ShieldIcon className="w-4 h-4 text-blue-500" />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (record: SecretComparison) => getStatusTag(record),
    },
    {
      title: 'Type',
      key: 'type',
      render: (record: SecretComparison) => {
        const secret = record.source || record.target;
        return <Text code>{secret?.type || 'Unknown'}</Text>;
      },
    },
    {
      title: 'Keys Count',
      key: 'keysCount',
      render: (record: SecretComparison) => {
        if (record.status === 'missing') {
          const existingSecret = record.source || record.target;
          return <Text>{existingSecret?.dataSize || 0}</Text>;
        }
        
        const sourceCount = record.source?.dataSize || 0;
        const targetCount = record.target?.dataSize || 0;
        
        if (sourceCount === targetCount) {
          return <Text>{sourceCount}</Text>;
        }
        
        return (
          <Space>
            <Text>Source: {sourceCount}</Text>
            <Text>Target: {targetCount}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Differences',
      key: 'differences',
      render: (record: SecretComparison) => (
        <Text type={record.status === 'identical' ? 'success' : 'warning'}>
          {getDifferencesText(record)}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: SecretComparison) => (
        <Button
          type="link"
          icon={<EyeIcon className="w-4 h-4" />}
          onClick={() => {
            setSelectedSecretName(record.secretName);
            setDetailModalOpen(true);
          }}
        >
          View Details
        </Button>
      ),
    },
  ];

  const handleRefresh = () => {
    refetchComparison();
  };

  const getSourceInstanceName = () => {
    if (!sourceAppInstanceId || !allAppInstances) return 'Select source...';
    const instance = allAppInstances.find(i => i.id === sourceAppInstanceId);
    return instance ? formatAppInstanceDisplay(instance.name, instance.cluster, instance.namespace) : 'Unknown';
  };

  const getTargetInstanceName = () => {
    if (!targetAppInstanceId || !allAppInstances) return 'Select target...';
    const instance = allAppInstances.find(i => i.id === targetAppInstanceId);
    return instance ? formatAppInstanceDisplay(instance.name, instance.cluster, instance.namespace) : 'Unknown';
  };

  return (
    <div className="space-y-6">
      <Card>
        <Title level={3}>
          <ShieldIcon className="w-6 h-6 inline mr-2" />
          Secret Comparison
        </Title>
        <Text type="secondary">
          Compare Kubernetes secrets between different app instances to identify differences and sync configurations.
        </Text>
        
        <Divider />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Text strong className="block mb-2">Source Instance:</Text>
            <TreeSelect
              placeholder="Select source app instance"
              style={{ width: '100%' }}
              value={sourceAppInstanceId}
              onChange={setSourceAppInstanceId}
              treeData={treeData}
              showSearch
              treeDefaultExpandAll
              loading={isLoadingEnvironments || isLoadingAppInstances}
              styles={{ popup: { root: { maxHeight: 400, overflow: 'auto' } } }}
            />
          </div>
          <div>
            <Text strong className="block mb-2">Target Instance:</Text>
            <TreeSelect
              placeholder="Select target app instance"
              style={{ width: '100%' }}
              value={targetAppInstanceId}
              onChange={setTargetAppInstanceId}
              treeData={treeData}
              showSearch
              treeDefaultExpandAll
              loading={isLoadingEnvironments || isLoadingAppInstances}
              styles={{ popup: { root: { maxHeight: 400, overflow: 'auto' } } }}
            />
          </div>
        </div>

        {sourceAppInstanceId && targetAppInstanceId && (
          <div className="mb-4">
            <Alert
              message={
                <span>
                  Comparing secrets from <strong>{getSourceInstanceName()}</strong> to{' '}
                  <strong>{getTargetInstanceName()}</strong>
                </span>
              }
              type="info"
              showIcon
              action={
                <Button size="small" onClick={handleRefresh}>
                  Refresh
                </Button>
              }
            />
          </div>
        )}
      </Card>

      {sourceAppInstanceId && targetAppInstanceId && (
        <Card>
          {isLoadingComparison && (
            <div className="text-center py-8">
              <Text>Loading secret comparison...</Text>
            </div>
          )}

          {comparisonError && (
            <Alert
              message="Error loading secret comparison"
              description={comparisonError.message}
              type="error"
              showIcon
              className="mb-4"
            />
          )}

          {comparison && !isLoadingComparison && (
            <>
              <div className="mb-6">
                <Title level={4}>Comparison Summary</Title>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-700">{comparison.summary.totalSecrets}</div>
                    <div className="text-sm text-gray-500">Total Secrets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{comparison.summary.identical}</div>
                    <div className="text-sm text-gray-500">Identical</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{comparison.summary.different}</div>
                    <div className="text-sm text-gray-500">Different</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{comparison.summary.missingInSource}</div>
                    <div className="text-sm text-gray-500">Missing in Source</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{comparison.summary.missingInTarget}</div>
                    <div className="text-sm text-gray-500">Missing in Target</div>
                  </div>
                </div>
              </div>

              <Table
                columns={columns}
                dataSource={comparison.comparisons}
                rowKey="secretName"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} of ${total} secrets`,
                }}
              />
            </>
          )}
        </Card>
      )}

      {selectedSecretName && (
        <SecretDetailModal
          open={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedSecretName(undefined);
          }}
          secretName={selectedSecretName}
          sourceAppInstanceId={sourceAppInstanceId!}
          targetAppInstanceId={targetAppInstanceId!}
          onSync={handleRefresh}
        />
      )}
    </div>
  );
};

export default SecretComparison;