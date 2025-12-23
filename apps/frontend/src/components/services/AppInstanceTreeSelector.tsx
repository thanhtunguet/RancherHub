import React, { useState, useEffect } from 'react';
import Tree from 'antd/es/tree';
import Spin from 'antd/es/spin';
import Alert from 'antd/es/alert';
import Card from 'antd/es/card';
import Typography from 'antd/es/typography';
import type { DataNode } from 'antd/es/tree';
import { AppInstanceTreeNode } from '../../types';

const { Title } = Typography;

interface AppInstanceTreeSelectorProps {
  selectedAppInstanceIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  title?: string;
  style?: React.CSSProperties;
}

export const AppInstanceTreeSelector: React.FC<AppInstanceTreeSelectorProps> = ({
  selectedAppInstanceIds = [],
  onSelectionChange,
  multiple = true,
  disabled = false,
  title = 'Select App Instances',
  style,
}) => {
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAppInstanceTree();
  }, []);

  const fetchAppInstanceTree = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/services/app-instances/tree');
      if (!response.ok) {
        throw new Error('Failed to fetch app instances');
      }

      const data: AppInstanceTreeNode[] = await response.json();
      const formattedTreeData = formatTreeData(data);
      setTreeData(formattedTreeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatTreeData = (data: AppInstanceTreeNode[]): DataNode[] => {
    return data.map((environment) => ({
      title: (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {environment.name} ({environment.appInstances.length} instances)
        </span>
      ),
      key: `env-${environment.id}`,
      selectable: false,
      children: environment.appInstances.map((instance) => ({
        title: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              <strong>{instance.name}</strong>
            </span>
            <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
              {instance.cluster}/{instance.namespace}
            </span>
          </div>
        ),
        key: instance.id,
        isLeaf: true,
      })),
    }));
  };

  const handleSelect = (selectedKeys: React.Key[]) => {
    if (onSelectionChange) {
      // Filter out environment keys (they start with 'env-')
      const appInstanceIds = selectedKeys.filter(key => !key.toString().startsWith('env-')) as string[];
      onSelectionChange(appInstanceIds);
    }
  };

  const handleCheck = (checkedKeys: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] }) => {
    if (onSelectionChange) {
      const keys = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked;
      // Filter out environment keys (they start with 'env-')
      const appInstanceIds = keys.filter(key => !key.toString().startsWith('env-')) as string[];
      onSelectionChange(appInstanceIds);
    }
  };

  if (loading) {
    return (
      <Card style={style}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
          <p style={{ marginTop: '10px' }}>Loading app instances...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={style}>
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          action={
            <button onClick={fetchAppInstanceTree} style={{ border: 'none', background: 'none', color: '#1890ff', cursor: 'pointer' }}>
              Retry
            </button>
          }
        />
      </Card>
    );
  }

  if (treeData.length === 0) {
    return (
      <Card style={style}>
        <Alert
          message="No App Instances"
          description="No app instances found. Please create environments and app instances first."
          type="info"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card style={style}>
      <Title level={5} style={{ marginBottom: '16px' }}>
        {title}
      </Title>
      <Tree
        treeData={treeData}
        checkable={multiple}
        selectable={!multiple}
        selectedKeys={multiple ? undefined : selectedAppInstanceIds}
        checkedKeys={multiple ? selectedAppInstanceIds : undefined}
        onSelect={multiple ? undefined : handleSelect}
        onCheck={multiple ? handleCheck : undefined}
        disabled={disabled}
        defaultExpandAll
        showLine={{ showLeafIcon: false }}
        style={{ maxHeight: '400px', overflow: 'auto' }}
      />
      {selectedAppInstanceIds.length > 0 && (
        <div style={{ marginTop: '12px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
          <span style={{ fontSize: '12px', color: '#666' }}>
            Selected: {selectedAppInstanceIds.length} app instance{selectedAppInstanceIds.length > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </Card>
  );
};