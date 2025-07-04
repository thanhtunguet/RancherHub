import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Spin,
  Alert,
  Empty,
  Space,
  message,
  Modal,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { HarborSiteCard } from './HarborSiteCard';
import { HarborSiteForm } from './HarborSiteForm';
import { HarborSite, CreateHarborSiteRequest } from '../../types';

const { Title, Text } = Typography;

export const HarborSiteManagement: React.FC = () => {
  const [sites, setSites] = useState<HarborSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingSite, setEditingSite] = useState<HarborSite | null>(null);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/harbor-sites');
      if (!response.ok) {
        throw new Error('Failed to fetch Harbor sites');
      }
      
      const data = await response.json();
      setSites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
    const url = editingSite ? `/api/harbor-sites/${editingSite.id}` : '/api/harbor-sites';
    const method = editingSite ? 'PATCH' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save Harbor site');
    }

    await fetchSites();
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/harbor-sites/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete Harbor site');
      }

      message.success('Harbor site deleted successfully');
      await fetchSites();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to delete Harbor site');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      const response = await fetch(`/api/harbor-sites/${id}/activate`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to activate Harbor site');
      }

      message.success('Harbor site activated successfully');
      await fetchSites();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to activate Harbor site');
    }
  };

  const handleTestConnection = async () => {
    return new Promise<void>((resolve) => {
      Modal.info({
        title: 'Test Connection',
        content: 'This will test the connection using the stored credentials.',
        onOk: resolve,
      });
    });
  };

  const activeSite = sites.find(site => site.active);

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

      {sites.length === 0 && !loading && !error ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <p>No Harbor sites configured</p>
                <Text type="secondary">
                  Add your first Harbor registry to enable container image management
                </Text>
              </div>
            }
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Add Harbor Site
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {sites.map((site) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={site.id}>
              <HarborSiteCard
                site={site}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onActivate={handleActivate}
                onTestConnection={handleTestConnection}
              />
            </Col>
          ))}
        </Row>
      )}

      <HarborSiteForm
        visible={formVisible}
        site={editingSite}
        onClose={() => setFormVisible(false)}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
};