import React, { useState } from 'react';
import { Card, Tag, Button, Space, Popconfirm, Tooltip } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { HarborSite } from '../../types';

interface HarborSiteCardProps {
  site: HarborSite;
  onEdit: (site: HarborSite) => void;
  onDelete: (id: string) => void;
  onActivate: (id: string) => void;
  onTestConnection: (site: HarborSite) => void;
}

export const HarborSiteCard: React.FC<HarborSiteCardProps> = ({
  site,
  onEdit,
  onDelete,
  onActivate,
  onTestConnection,
}) => {
  const [testing, setTesting] = useState(false);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      await onTestConnection(site);
    } finally {
      setTesting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card
      size="small"
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{site.name}</span>
            {site.active && (
              <Tag color="green" icon={<CheckCircleOutlined />}>
                Active
              </Tag>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Tooltip title="Harbor Registry URL">
              <LinkOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          </div>
        </div>
      }
      actions={[
        <Tooltip title="Test Connection" key="test">
          <Button
            type="text"
            icon={<ExclamationCircleOutlined />}
            loading={testing}
            onClick={handleTestConnection}
          >
            Test
          </Button>
        </Tooltip>,
        <Tooltip title="Edit Harbor Site" key="edit">
          <Button type="text" icon={<EditOutlined />} onClick={() => onEdit(site)} />
        </Tooltip>,
        <Popconfirm
          title="Delete Harbor Site"
          description="Are you sure you want to delete this Harbor site?"
          onConfirm={() => onDelete(site.id)}
          okText="Yes"
          cancelText="No"
          key="delete"
        >
          <Tooltip title="Delete Harbor Site">
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>,
      ]}
      style={{
        border: site.active ? '2px solid #52c41a' : undefined,
        boxShadow: site.active ? '0 4px 12px rgba(82, 196, 26, 0.15)' : undefined,
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <div>
          <strong>URL:</strong>
          <div style={{ marginTop: '4px' }}>
            <a href={site.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px' }}>
              {site.url}
            </a>
          </div>
        </div>

        <div>
          <strong>Username:</strong>
          <div style={{ marginTop: '4px', fontSize: '13px', fontFamily: 'monospace' }}>
            {site.username}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>Created</div>
            <div style={{ fontSize: '12px' }}>{formatDate(site.createdAt)}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>Updated</div>
            <div style={{ fontSize: '12px' }}>{formatDate(site.updatedAt)}</div>
          </div>
        </div>

        {!site.active && (
          <div style={{ marginTop: '12px' }}>
            <Button
              type="primary"
              size="small"
              block
              onClick={() => onActivate(site.id)}
            >
              Set as Active
            </Button>
          </div>
        )}
      </Space>
    </Card>
  );
};