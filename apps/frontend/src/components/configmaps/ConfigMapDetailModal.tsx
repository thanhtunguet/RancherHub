import React, { useState, useMemo } from 'react';
import Modal from 'antd/es/modal';
import Table from 'antd/es/table';
import Typography from 'antd/es/typography';
import Tag from 'antd/es/tag';
import Button from 'antd/es/button';
import Space from 'antd/es/space';
import Checkbox from 'antd/es/checkbox';
import message from 'antd/es/message';
import Tooltip from 'antd/es/tooltip';
import Card from 'antd/es/card';
import Divider from 'antd/es/divider';
import Alert from 'antd/es/alert';
import Spin from 'antd/es/spin';
import {
  CopyIcon,
  RefreshCwIcon,
  EyeIcon,
  EyeOffIcon,
  CheckIcon,
  XIcon,
  GitCompareIcon,
} from 'lucide-react';
import { useConfigMapDetails, useSyncConfigMapKey, useSyncConfigMapKeys } from '../../hooks/useConfigMaps';
import ConfigMapKeyDiffModal from './ConfigMapKeyDiffModal';
import type { ConfigMapKeyComparison } from '../../types';

const { Title, Text } = Typography;

interface ConfigMapDetailModalProps {
  open: boolean;
  onClose: () => void;
  configMapName: string;
  sourceAppInstanceId: string;
  targetAppInstanceId: string;
  sourceInstanceName?: string;
  targetInstanceName?: string;
}

const ConfigMapDetailModal: React.FC<ConfigMapDetailModalProps> = ({
  open,
  onClose,
  configMapName,
  sourceAppInstanceId,
  targetAppInstanceId,
  sourceInstanceName = 'Source',
  targetInstanceName = 'Target',
}) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [selectedKeyForDiff, setSelectedKeyForDiff] = useState<ConfigMapKeyComparison | null>(null);

  const {
    data: details,
    isLoading,
    error,
    refetch,
  } = useConfigMapDetails(configMapName, sourceAppInstanceId, targetAppInstanceId);

  const syncKeyMutation = useSyncConfigMapKey();
  const syncKeysMutation = useSyncConfigMapKeys();

  const handleCopyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      message.success('Value copied to clipboard');
    } catch (err) {
      message.error('Failed to copy value');
    }
  };

  const handleSyncSingleKey = async (key: string, value: string) => {
    Modal.confirm({
      title: 'Confirm Sync Operation',
      content: (
        <div>
          <p><strong>Are you sure you want to sync this key?</strong></p>
          <p><strong>Key:</strong> <code>{key}</code></p>
          <p><strong>ConfigMap:</strong> {configMapName}</p>
          <p><strong>Direction:</strong> {sourceInstanceName} → {targetInstanceName}</p>
          <div style={{ 
            marginTop: '12px', 
            padding: '8px', 
            backgroundColor: '#fff7e6', 
            border: '1px solid #ffd591', 
            borderRadius: '4px' 
          }}>
            <Text type="warning">
              <strong>Warning:</strong> This will overwrite the target value and cannot be undone.
            </Text>
          </div>
        </div>
      ),
      okText: 'Yes, Sync Now',
      cancelText: 'Cancel',
      okType: 'primary',
      width: 500,
      onOk: async () => {
        try {
          await syncKeyMutation.mutateAsync({
            sourceAppInstanceId,
            targetAppInstanceId,
            configMapName,
            key,
            value,
          });
          message.success(`Successfully synced key '${key}'`);
          refetch();
        } catch (err) {
          message.error(`Failed to sync key '${key}': ${(err as any)?.message || 'Unknown error'}`);
        }
      },
    });
  };

  const handleSyncSelectedKeys = async () => {
    if (selectedKeys.length === 0) {
      message.warning('Please select keys to sync');
      return;
    }

    const keysToSync: Record<string, string> = {};
    selectedKeys.forEach(key => {
      const keyComparison = details?.keyComparisons.find(k => k.key === key);
      if (keyComparison?.sourceValue) {
        keysToSync[key] = keyComparison.sourceValue;
      }
    });

    Modal.confirm({
      title: 'Confirm Bulk Sync Operation',
      content: (
        <div>
          <p><strong>Are you sure you want to sync {selectedKeys.length} keys?</strong></p>
          <p><strong>ConfigMap:</strong> {configMapName}</p>
          <p><strong>Direction:</strong> {sourceInstanceName} → {targetInstanceName}</p>
          <div style={{ marginTop: '8px', marginBottom: '8px' }}>
            <strong>Keys to sync:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
              {selectedKeys.map(key => (
                <li key={key}><code>{key}</code></li>
              ))}
            </ul>
          </div>
          <div style={{ 
            marginTop: '12px', 
            padding: '8px', 
            backgroundColor: '#fff2f0', 
            border: '1px solid #ffccc7', 
            borderRadius: '4px' 
          }}>
            <Text type="danger">
              <strong>Warning:</strong> This will overwrite all selected target values and cannot be undone.
            </Text>
          </div>
        </div>
      ),
      okText: `Yes, Sync ${selectedKeys.length} Keys`,
      cancelText: 'Cancel',
      okType: 'danger',
      width: 600,
      onOk: async () => {
        try {
          await syncKeysMutation.mutateAsync({
            sourceAppInstanceId,
            targetAppInstanceId,
            configMapName,
            keys: keysToSync,
          });
          message.success(`Successfully synced ${selectedKeys.length} keys`);
          setSelectedKeys([]);
          refetch();
        } catch (err) {
          message.error(`Failed to sync keys: ${(err as any)?.message || 'Unknown error'}`);
        }
      },
    });
  };

  const toggleShowValue = (key: string) => {
    setShowValues(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenDiffModal = (keyComparison: ConfigMapKeyComparison) => {
    setSelectedKeyForDiff(keyComparison);
    setDiffModalOpen(true);
  };

  const handleCloseDiffModal = () => {
    setDiffModalOpen(false);
    setSelectedKeyForDiff(null);
  };

  const handleSyncFromDiff = async (key: string, value: string) => {
    await handleSyncSingleKey(key, value);
  };

  const getStatusTag = (comparison: ConfigMapKeyComparison) => {
    if (comparison.identical) {
      return <Tag color="green" icon={<CheckIcon size={12} />}>Identical</Tag>;
    }
    if (comparison.missingInSource) {
      return <Tag color="red" icon={<XIcon size={12} />}>Missing in Source</Tag>;
    }
    if (comparison.missingInTarget) {
      return <Tag color="orange" icon={<XIcon size={12} />}>Missing in Target</Tag>;
    }
    if (comparison.isDifferent) {
      return <Tag color="blue">Different</Tag>;
    }
    return <Tag>Unknown</Tag>;
  };

  const renderValue = (value: string | null, key: string, side: 'source' | 'target') => {
    if (!value) {
      return <Text type="secondary" italic>No value</Text>;
    }

    const showKey = `${key}-${side}`;
    const isLongValue = value.length > 100;
    const shouldShowFull = showValues[showKey];
    const displayValue = isLongValue && !shouldShowFull 
      ? `${value.substring(0, 100)}...` 
      : value;

    return (
      <div style={{ maxWidth: '300px' }}>
        <div style={{ marginBottom: '8px' }}>
          <Space>
            <Tooltip title="Copy value">
              <Button
                size="small"
                icon={<CopyIcon size={12} />}
                onClick={() => handleCopyValue(value)}
              />
            </Tooltip>
            {isLongValue && (
              <Button
                size="small"
                icon={shouldShowFull ? <EyeOffIcon size={12} /> : <EyeIcon size={12} />}
                onClick={() => toggleShowValue(showKey)}
              >
                {shouldShowFull ? 'Show less' : 'Show more'}
              </Button>
            )}
          </Space>
        </div>
        <div style={{ 
          maxHeight: shouldShowFull ? '200px' : 'auto',
          overflow: shouldShowFull ? 'auto' : 'hidden',
          fontFamily: 'monospace',
          fontSize: '12px',
          backgroundColor: '#f5f5f5',
          padding: '8px',
          borderRadius: '4px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}>
          {displayValue}
        </div>
      </div>
    );
  };

  const columns = [
    {
      title: (
        <Checkbox
          checked={selectedKeys.length === details?.keyComparisons.length && details?.keyComparisons.length > 0}
          indeterminate={selectedKeys.length > 0 && selectedKeys.length < (details?.keyComparisons.length || 0)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedKeys(details?.keyComparisons.map(k => k.key) || []);
            } else {
              setSelectedKeys([]);
            }
          }}
        />
      ),
      key: 'select',
      width: 50,
      render: (_: any, record: ConfigMapKeyComparison) => (
        <Checkbox
          checked={selectedKeys.includes(record.key)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedKeys(prev => [...prev, record.key]);
            } else {
              setSelectedKeys(prev => prev.filter(k => k !== record.key));
            }
          }}
          disabled={!record.sourceValue} // Only allow selection if source has value
        />
      ),
    },
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      width: 200,
      render: (key: string) => (
        <Text strong style={{ fontFamily: 'monospace' }}>{key}</Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_: any, record: ConfigMapKeyComparison) => getStatusTag(record),
    },
    {
      title: `${sourceInstanceName} (Source)`,
      key: 'sourceValue',
      render: (_: any, record: ConfigMapKeyComparison) => 
        renderValue(record.sourceValue, record.key, 'source'),
    },
    {
      title: `${targetInstanceName} (Target)`,
      key: 'targetValue',
      render: (_: any, record: ConfigMapKeyComparison) => 
        renderValue(record.targetValue, record.key, 'target'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_: any, record: ConfigMapKeyComparison) => {
        return (
          <Space direction="vertical" size="small">
            <Tooltip title="View detailed diff comparison">
              <Button
                size="small"
                icon={<GitCompareIcon size={12} />}
                onClick={() => handleOpenDiffModal(record)}
                disabled={!record.sourceValue && !record.targetValue}
              >
                Diff View
              </Button>
            </Tooltip>
            {record.sourceValue && (
              <Tooltip title={`Sync '${record.key}' from source to target`}>
                <Button
                  size="small"
                  type="primary"
                  icon={<RefreshCwIcon size={12} />}
                  onClick={() => handleSyncSingleKey(record.key, record.sourceValue!)}
                  loading={syncKeyMutation.isPending}
                  disabled={record.identical}
                >
                  Sync
                </Button>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  const filteredComparisons = useMemo(() => {
    if (!details?.keyComparisons) return [];
    
    // Sort by status priority: different > missing > identical
    return details.keyComparisons.sort((a, b) => {
      if (a.missingInTarget && !b.missingInTarget) return -1;
      if (!a.missingInTarget && b.missingInTarget) return 1;
      if (a.missingInSource && !b.missingInSource) return -1;
      if (!a.missingInSource && b.missingInSource) return 1;
      if (a.isDifferent && !b.isDifferent) return -1;
      if (!a.isDifferent && b.isDifferent) return 1;
      return a.key.localeCompare(b.key);
    });
  }, [details?.keyComparisons]);

  if (!open) return null;

  return (
    <Modal
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>
            ConfigMap Details: {configMapName}
          </Title>
          <Text type="secondary">
            Comparing {sourceInstanceName} → {targetInstanceName}
          </Text>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={1200}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button
          key="sync-selected"
          type="primary"
          icon={<RefreshCwIcon size={16} />}
          onClick={handleSyncSelectedKeys}
          loading={syncKeysMutation.isPending}
          disabled={selectedKeys.length === 0}
        >
          Sync Selected Keys ({selectedKeys.length})
        </Button>,
      ]}
      destroyOnHidden
    >
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      )}

      {error && (
        <Alert
          type="error"
          message="Failed to load ConfigMap details"
          description={(error as any)?.message || 'Unknown error'}
          style={{ marginBottom: '16px' }}
        />
      )}

      {details && (
        <>
          {/* Summary Cards */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <Text type="secondary">Total Keys</Text>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                  {details.summary.totalKeys}
                </div>
              </Card>
              <Card size="small" style={{ textAlign: 'center' }}>
                <Text type="secondary">Identical</Text>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                  {details.summary.identical}
                </div>
              </Card>
              <Card size="small" style={{ textAlign: 'center' }}>
                <Text type="secondary">Different</Text>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                  {details.summary.different}
                </div>
              </Card>
              <Card size="small" style={{ textAlign: 'center' }}>
                <Text type="secondary">Missing in Source</Text>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff4d4f' }}>
                  {details.summary.missingInSource}
                </div>
              </Card>
              <Card size="small" style={{ textAlign: 'center' }}>
                <Text type="secondary">Missing in Target</Text>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fa8c16' }}>
                  {details.summary.missingInTarget}
                </div>
              </Card>
            </div>
          </div>

          <Divider />

          {/* Key Comparison Table */}
          <Table
            columns={columns}
            dataSource={filteredComparisons}
            rowKey="key"
            pagination={false}
            scroll={{ y: 400 }}
            size="small"
          />
        </>
      )}

      {/* Diff Modal */}
      <ConfigMapKeyDiffModal
        open={diffModalOpen}
        onClose={handleCloseDiffModal}
        keyComparison={selectedKeyForDiff}
        configMapName={configMapName}
        sourceInstanceName={sourceInstanceName}
        targetInstanceName={targetInstanceName}
        onSync={handleSyncFromDiff}
        syncLoading={syncKeyMutation.isPending}
      />
    </Modal>
  );
};

export default ConfigMapDetailModal;