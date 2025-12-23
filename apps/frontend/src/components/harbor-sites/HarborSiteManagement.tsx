import React, { useState, useEffect } from 'react';
import Card from 'antd/es/card';
import Row from 'antd/es/row';
import Col from 'antd/es/col';
import Button from 'antd/es/button';
import Typography from 'antd/es/typography';
import Spin from 'antd/es/spin';
import Alert from 'antd/es/alert';
import Empty from 'antd/es/empty';
import Space from 'antd/es/space';
import message from 'antd/es/message';
import Modal from 'antd/es/modal';
import {
  PlusOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { HarborSiteCard } from './HarborSiteCard';
import { HarborSiteForm } from './HarborSiteForm';
import { HarborSite, CreateHarborSiteRequest } from '../../types';
import { harborSitesApi } from '../../services/api';

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
      
      const data = await harborSitesApi.getAll();
      setSites(data);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || 'An error occurred';
      setError(message);
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
      const message =
        err?.response?.data?.message || err?.message || 'Failed to save Harbor site';
      throw new Error(message);
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
    }
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
