import { useState } from 'react';
import { Button, Row, Col, Modal, Empty, Spin, Alert } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ServerIcon } from 'lucide-react';
import { SiteCard } from './SiteCard';
import { SiteForm } from './SiteForm';
import { useSites, useCreateSite, useUpdateSite, useDeleteSite, useTestConnection, useActivateSite } from '../../hooks/useSites';
import type { RancherSite, CreateSiteRequest } from '../../types';

export function SiteManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<RancherSite | null>(null);
  const [testingSiteId, setTestingSiteId] = useState<string | null>(null);

  const { data: sites, isLoading, error } = useSites();
  const createSiteMutation = useCreateSite();
  const updateSiteMutation = useUpdateSite();
  const deleteSiteMutation = useDeleteSite();
  const testConnectionMutation = useTestConnection();
  const activateSiteMutation = useActivateSite();

  const handleOpenModal = () => {
    setEditingSite(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSite(null);
  };

  const handleSubmit = (values: CreateSiteRequest) => {
    if (editingSite) {
      updateSiteMutation.mutate(
        { id: editingSite.id, data: values },
        { onSuccess: handleCloseModal }
      );
    } else {
      createSiteMutation.mutate(values, { onSuccess: handleCloseModal });
    }
  };

  const handleEdit = (site: RancherSite) => {
    setEditingSite(site);
    setIsModalOpen(true);
  };

  const handleDelete = (siteId: string) => {
    deleteSiteMutation.mutate(siteId);
  };

  const handleTestConnection = (siteId: string) => {
    setTestingSiteId(siteId);
    testConnectionMutation.mutate(siteId, {
      onSettled: () => setTestingSiteId(null),
    });
  };

  const handleActivate = (siteId: string) => {
    activateSiteMutation.mutate(siteId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Sites"
        description="There was an error loading the Rancher sites. Please try again."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rancher Sites</h1>
          <p className="text-gray-600 mt-1">
            Manage your Rancher server connections
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenModal}
        >
          Add Site
        </Button>
      </div>

      {sites && sites.length > 0 ? (
        <Row gutter={[16, 16]}>
          {sites.map((site) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={site.id}>
              <SiteCard
                site={site}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onTestConnection={handleTestConnection}
                onActivate={handleActivate}
                testingConnection={testingSiteId === site.id}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <Empty
          image={<ServerIcon size={64} className="mx-auto text-gray-400" />}
          description={
            <div className="text-center">
              <p className="text-gray-500 mb-2">No Rancher sites configured</p>
              <p className="text-gray-400 text-sm">
                Add your first Rancher site to get started
              </p>
            </div>
          }
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenModal}>
            Add Your First Site
          </Button>
        </Empty>
      )}

      <Modal
        title={editingSite ? 'Edit Site' : 'Add New Site'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={500}
      >
        <SiteForm
          initialValues={editingSite ? {
            name: editingSite.name,
            url: editingSite.url,
            token: '', // Don't pre-fill token for security
          } : undefined}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
          loading={createSiteMutation.isPending || updateSiteMutation.isPending}
        />
      </Modal>
    </div>
  );
}