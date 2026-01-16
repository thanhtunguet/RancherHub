import React, { useState, useEffect } from 'react';
import Table from 'antd/es/table';
import Button from 'antd/es/button';
import Typography from 'antd/es/typography';
import Spin from 'antd/es/spin';
import Alert from 'antd/es/alert';
import Space from 'antd/es/space';
import message from 'antd/es/message';
import Modal from 'antd/es/modal';
import Tag from 'antd/es/tag';
import Popconfirm from 'antd/es/popconfirm';
import Tooltip from 'antd/es/tooltip';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import {
  PlusOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  FolderOpenOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { HarborSiteForm } from './HarborSiteForm';
import { HarborSite, CreateHarborSiteRequest } from '../../types';
import { harborSitesApi } from '../../services/api';

const { Title, Text } = Typography;

export const HarborSiteManagement: React.FC = () => {
  const navigate = useNavigate();
  const [sites, setSites] = useState<HarborSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingSite, setEditingSite] = useState<HarborSite | null>(null);
  const [testingSiteId, setTestingSiteId] = useState<string | null>(null);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await harborSitesApi.getAll();
      setSites(data);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message || err?.message || 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSite(null);
    setFormVisible(true);
  };

  const handleEdit = (site: HarborSite) => {
    setEditingSite(site);
    setFormVisible(true);
  };

  const handleFormSubmit = async (data: CreateHarborSiteRequest) => {
    try {
      if (editingSite) {
        await harborSitesApi.update(editingSite.id, data);
      } else {
        await harborSitesApi.create(data);
      }
      await fetchSites();
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message || err?.message || 'Failed to save Harbor site';
      throw new Error(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await harborSitesApi.remove(id);
      message.success('Harbor site deleted successfully');
      await fetchSites();
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message || err?.message || 'Failed to delete Harbor site';
      message.error(errorMessage);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await harborSitesApi.activate(id);
      message.success('Harbor site activated successfully');
      await fetchSites();
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message || err?.message || 'Failed to activate Harbor site';
      message.error(errorMessage);
    }
  };

  const handleTestConnection = async (site: HarborSite) => {
    setTestingSiteId(site.id);
    try {
      const result = await harborSitesApi.testSiteConnection(site.id);

      if (result.success) {
        Modal.success({
          title: 'Connection Test Successful',
          content: result.message || 'Successfully connected to Harbor registry.',
        });
        message.success('Harbor connection test passed');
      } else {
        Modal.error({
          title: 'Connection Test Failed',
          content: result.message || 'Failed to connect to Harbor registry.',
        });
      }
    } catch (err: any) {
      const errorMessage = 
        err?.response?.data?.message || 
        err?.message || 
        'Failed to test Harbor connection';
      
      Modal.error({
        title: 'Connection Test Error',
        content: errorMessage,
      });
      message.error('Harbor connection test failed');
    } finally {
      setTestingSiteId(null);
    }
  };

  const handleBrowse = (siteId: string) => {
    navigate(`/harbor-sites/${siteId}/browser`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const activeSite = sites.find(site => site.active);

  const columns: ColumnsType<HarborSite> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <div className="flex items-center gap-2">
          <DatabaseOutlined className="text-blue-500" />
          <span className="font-medium">{name}</span>
          {record.active && (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              Active
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">
          {url}
        </a>
      ),
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      render: (username: string) => (
        <code className="text-sm">{username}</code>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => formatDate(date),
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 120,
      render: (date: string) => formatDate(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 280,
      render: (_, record) => (
        <Space>
          <Tooltip title="Test Connection">
            <Button
              type="text"
              icon={<ApiOutlined />}
              onClick={() => handleTestConnection(record)}
              loading={testingSiteId === record.id}
              size="small"
            >
              Test
            </Button>
          </Tooltip>
          <Tooltip title="Browse Registry">
            <Button
              type="text"
              icon={<FolderOpenOutlined />}
              onClick={() => handleBrowse(record.id)}
              size="small"
            >
              Browse
            </Button>
          </Tooltip>
          {!record.active && (
            <Tooltip title="Set as Active">
              <Button
                type="text"
                onClick={() => handleActivate(record.id)}
                size="small"
              >
                Activate
              </Button>
            </Tooltip>
          )}
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Delete Harbor Site"
            description="Are you sure you want to delete this Harbor site?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p style={{ marginTop: '16px' }}>Loading Harbor sites...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <DatabaseOutlined />
              Harbor Sites
            </Title>
            <Text type="secondary">
              Manage Harbor registry connections for container image management
            </Text>
          </div>
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchSites}
              loading={loading}
            >
              Refresh
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleCreate}
            >
              Add Harbor Site
            </Button>
          </Space>
        </div>

        {activeSite && (
          <Alert
            message={`Active Harbor Site: ${activeSite.name}`}
            description={`Currently using ${activeSite.url} for image size queries and registry operations.`}
            type="info"
            showIcon
            icon={<DatabaseOutlined />}
            style={{ marginBottom: '16px' }}
          />
        )}

        {!activeSite && sites.length > 0 && (
          <Alert
            message="No Active Harbor Site"
            description="Please activate a Harbor site to enable image size queries and registry operations."
            type="warning"
            showIcon
            icon={<ExclamationCircleOutlined />}
            style={{ marginBottom: '16px' }}
          />
        )}
      </div>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: '24px' }}
          action={
            <Button onClick={fetchSites} size="small">
              Retry
            </Button>
          }
        />
      )}

      <Table
        columns={columns}
        dataSource={sites}
        rowKey="id"
        loading={loading}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} Harbor sites`,
        }}
        locale={{
          emptyText: (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <DatabaseOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
              <p style={{ color: '#666', marginBottom: 8 }}>No Harbor sites configured</p>
              <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
                Add your first Harbor registry to enable container image management
              </Text>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                Add Harbor Site
              </Button>
            </div>
          ),
        }}
      />

      <HarborSiteForm
        visible={formVisible}
        site={editingSite}
        onClose={() => setFormVisible(false)}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
};
