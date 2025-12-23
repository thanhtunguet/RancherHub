import React, { useState } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Typography,
  Alert,
  Tag,
  Checkbox,
  message,
  Card,
} from 'antd';
import { 
  ShieldIcon, 
  RefreshCwIcon as SyncIcon, 
  EyeIcon, 
  EyeOffIcon, 
  CopyIcon, 
  CheckIcon,
  AlertTriangleIcon 
} from 'lucide-react';
import { useSecretDetails, useSyncSecretKey, useSyncSecretKeys } from '../../hooks/useSecrets';
import { useAppInstances } from '../../hooks/useAppInstances';
import type { SecretKeyComparison } from '../../types';

const { Title, Text } = Typography;

interface SecretDetailModalProps {
  open: boolean;
  onClose: () => void;
  secretName: string;
  sourceAppInstanceId: string;
  targetAppInstanceId: string;
  onSync: () => void;
}

const SecretDetailModal: React.FC<SecretDetailModalProps> = ({
  open,
  onClose,
  secretName,
  sourceAppInstanceId,
  targetAppInstanceId,
  onSync,
}) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set());

  const { data: appInstances } = useAppInstances();
  const { data: details, isLoading, error, refetch } = useSecretDetails(
    secretName,
    sourceAppInstanceId,
    targetAppInstanceId
  );

  const syncKeyMutation = useSyncSecretKey();
  const syncKeysMutation = useSyncSecretKeys();

  const sourceInstance = appInstances?.find(i => i.id === sourceAppInstanceId);
  const targetInstance = appInstances?.find(i => i.id === targetAppInstanceId);

  const toggleValueVisibility = (key: string) => {
    const newVisible = new Set(visibleValues);
    if (newVisible.has(key)) {
      newVisible.delete(key);
    } else {
      newVisible.add(key);
    }
    setVisibleValues(newVisible);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Copied to clipboard');
  };

  const getStatusTag = (comparison: SecretKeyComparison) => {
    if (comparison.identical) {
      return <Tag color="green" icon={<CheckIcon className="w-3 h-3" />}>Identical</Tag>;
    }
    if (comparison.missingInSource) {
      return <Tag color="orange">Missing in Source</Tag>;
    }
    if (comparison.missingInTarget) {
      return <Tag color="red">Missing in Target</Tag>;
    }
    if (comparison.isDifferent) {
      return <Tag color="blue">Different</Tag>;
    }
    return <Tag>Unknown</Tag>;
  };

  const renderSecretValue = (value: string | null, key: string) => {
    if (!value) {
      return <Text type="secondary">N/A</Text>;
    }

    const isVisible = visibleValues.has(key);
    const displayValue = isVisible ? value : '•'.repeat(Math.min(value.length, 20));

    return (
      <div className="flex items-center space-x-2">
        <Text code className="flex-1 truncate max-w-xs">
          {displayValue}
        </Text>
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={isVisible ? <EyeOffIcon className="w-3 h-3" /> : <EyeIcon className="w-3 h-3" />}
            onClick={() => toggleValueVisibility(key)}
          />
          {isVisible && (
            <Button
              type="text"
              size="small"
              icon={<CopyIcon className="w-3 h-3" />}
              onClick={() => copyToClipboard(value)}
            />
          )}
        </Space>
      </div>
    );
  };

  const columns = [
    {
      title: (
        <Checkbox
          checked={selectedKeys.length === (details?.keyComparisons?.length || 0)}
          indeterminate={selectedKeys.length > 0 && selectedKeys.length < (details?.keyComparisons?.length || 0)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedKeys(details?.keyComparisons?.map(k => k.key) || []);
            } else {
              setSelectedKeys([]);
            }
          }}
        />
      ),
      dataIndex: 'select',
      width: 50,
      render: (_: any, record: SecretKeyComparison) => (
        <Checkbox
          checked={selectedKeys.includes(record.key)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedKeys([...selectedKeys, record.key]);
            } else {
              setSelectedKeys(selectedKeys.filter(k => k !== record.key));
            }
          }}
          disabled={record.identical || record.missingInSource}
        />
      ),
    },
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
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
      render: (record: SecretKeyComparison) => getStatusTag(record),
    },
    {
      title: `Source (${sourceInstance?.name})`,
      key: 'sourceValue',
      render: (record: SecretKeyComparison) => 
        renderSecretValue(
          record.sourceExists && details?.source?.data?.[record.key] 
            ? details?.source?.data[record.key] 
            : null, 
          `source-${record.key}`
        ),
    },
    {
      title: `Target (${targetInstance?.name})`,
      key: 'targetValue',
      render: (record: SecretKeyComparison) => 
        renderSecretValue(
          record.targetExists && details?.target?.data?.[record.key] 
            ? details?.target?.data[record.key] 
            : null, 
          `target-${record.key}`
        ),
    },
  ];

  const handleSyncSelected = async () => {
    if (!details || selectedKeys.length === 0) return;

    try {
      const keysToSync: Record<string, string> = {};
      selectedKeys.forEach(key => {
        const sourceValue = details?.source?.data?.[key];
        if (sourceValue) {
          keysToSync[key] = sourceValue;
        }
      });

      if (Object.keys(keysToSync).length === 0) {
        message.warning('No valid keys to sync');
        return;
      }

      if (Object.keys(keysToSync).length === 1) {
        const key = Object.keys(keysToSync)[0];
        await syncKeyMutation.mutateAsync({
          sourceAppInstanceId,
          targetAppInstanceId,
          secretName,
          key,
          value: keysToSync[key],
        });
      } else {
        await syncKeysMutation.mutateAsync({
          sourceAppInstanceId,
          targetAppInstanceId,
          secretName,
          keys: keysToSync,
        });
      }

      message.success(`Successfully synced ${Object.keys(keysToSync).length} key(s)`);
      setSelectedKeys([]);
      refetch();
      onSync();
    } catch (error) {
      console.error('Sync failed:', error);
      message.error('Failed to sync keys');
    }
  };

  const syncableKeys = details?.keyComparisons?.filter(
    k => !k.identical && !k.missingInSource
  ) || [];

  return (
    <Modal
      title={
        <Space>
          <ShieldIcon className="w-5 h-5" />
          <span>Secret Details: {secretName}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={1200}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        selectedKeys.length > 0 && (
          <Button
            key="sync"
            type="primary"
            icon={<SyncIcon className="w-4 h-4" />}
            onClick={handleSyncSelected}
            loading={syncKeyMutation.isPending || syncKeysMutation.isPending}
          >
            Sync Selected Keys ({selectedKeys.length})
          </Button>
        ),
      ].filter(Boolean)}
    >
      {isLoading && (
        <div className="text-center py-8">
          <Text>Loading secret details...</Text>
        </div>
      )}

      {error && (
        <Alert
          message="Error loading secret details"
          description={error.message}
          type="error"
          showIcon
          className="mb-4"
        />
      )}

      {details && (
        <div className="space-y-4">
          {/* Security Warning */}
          <Alert
            message="Security Notice"
            description="Secret values are hidden by default for security. Click the eye icon to reveal values when needed."
            type="warning"
            icon={<AlertTriangleIcon className="w-4 h-4" />}
            showIcon
            className="mb-4"
          />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card size="small">
              <Title level={5}>Source Secret</Title>
              <Space direction="vertical" size="small">
                <Text><strong>Instance:</strong> {sourceInstance?.name}</Text>
                <Text><strong>Type:</strong> {details.source?.type || 'N/A'}</Text>
                <Text><strong>Keys:</strong> {details.source?.dataSize || 0}</Text>
              </Space>
            </Card>
            <Card size="small">
              <Title level={5}>Target Secret</Title>
              <Space direction="vertical" size="small">
                <Text><strong>Instance:</strong> {targetInstance?.name}</Text>
                <Text><strong>Type:</strong> {details.target?.type || 'N/A'}</Text>
                <Text><strong>Keys:</strong> {details.target?.dataSize || 0}</Text>
              </Space>
            </Card>
          </div>

          {/* Summary Stats */}
          <Card size="small">
            <Title level={5}>Comparison Summary</Title>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-700">{details?.summary?.totalKeys || 0}</div>
                <div className="text-sm text-gray-500">Total Keys</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">{details?.summary?.identical || 0}</div>
                <div className="text-sm text-gray-500">Identical</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">{details?.summary?.different || 0}</div>
                <div className="text-sm text-gray-500">Different</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-orange-600">{details?.summary?.missingInTarget || 0}</div>
                <div className="text-sm text-gray-500">Missing in Target</div>
              </div>
            </div>
          </Card>

          {/* Sync Actions */}
          {syncableKeys.length > 0 && (
            <Alert
              message={`${syncableKeys.length} keys can be synced from source to target`}
              type="info"
              showIcon
              action={
                <Button 
                  size="small" 
                  onClick={() => setSelectedKeys(syncableKeys.map(k => k.key))}
                >
                  Select All Syncable
                </Button>
              }
            />
          )}

          {/* Key Comparison Table */}
          <Table
            columns={columns}
            dataSource={details?.keyComparisons || []}
            rowKey="key"
            pagination={false}
            scroll={{ y: 400 }}
            rowClassName={(record) => {
              if (record.identical) return 'bg-green-50';
              if (record.isDifferent) return 'bg-blue-50';
              if (record.missingInTarget) return 'bg-orange-50';
              if (record.missingInSource) return 'bg-red-50';
              return '';
            }}
          />
        </div>
      )}
    </Modal>
  );
};

export default SecretDetailModal;