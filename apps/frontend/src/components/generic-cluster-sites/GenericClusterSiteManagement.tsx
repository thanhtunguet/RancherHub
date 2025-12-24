import { useState } from "react";
import Button from "antd/es/button";
import Row from "antd/es/row";
import Col from "antd/es/col";
import Modal from "antd/es/modal";
import Empty from "antd/es/empty";
import Spin from "antd/es/spin";
import Alert from "antd/es/alert";
import Typography from "antd/es/typography";
import { PlusOutlined, CloudServerOutlined } from "@ant-design/icons";
import { ServerIcon } from "lucide-react";
import { GenericClusterSiteCard } from "./GenericClusterSiteCard";
import { GenericClusterSiteForm } from "./GenericClusterSiteForm";
import {
  useGenericClusterSites,
  useCreateGenericClusterSite,
  useUpdateGenericClusterSite,
  useDeleteGenericClusterSite,
  useTestGenericClusterConnection,
  useSetGenericClusterActive,
} from "../../hooks/useGenericClusterSites";
import type { GenericClusterSite, CreateGenericClusterSiteRequest } from "../../types";

const { Title, Text } = Typography;

export function GenericClusterSiteManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<GenericClusterSite | null>(null);
  const [testingSiteId, setTestingSiteId] = useState<string | null>(null);

  const {
    data: sites,
    isLoading,
    error,
  } = useGenericClusterSites();
  const createMutation = useCreateGenericClusterSite();
  const updateMutation = useUpdateGenericClusterSite();
  const deleteMutation = useDeleteGenericClusterSite();
  const testConnectionMutation = useTestGenericClusterConnection();
  const setActiveMutation = useSetGenericClusterActive();

  const handleOpenModal = () => {
    setEditingSite(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSite(null);
  };

  const handleSubmit = (values: CreateGenericClusterSiteRequest) => {
    if (editingSite) {
      updateMutation.mutate(
        { id: editingSite.id, data: values },
        { onSuccess: handleCloseModal },
      );
    } else {
      createMutation.mutate(values, { onSuccess: handleCloseModal });
    }
  };

  const handleEdit = (site: GenericClusterSite) => {
    setEditingSite(site);
    setIsModalOpen(true);
  };

  const handleDelete = (siteId: string) => {
    deleteMutation.mutate(siteId);
  };

  const handleTestConnection = (siteId: string) => {
    setTestingSiteId(siteId);
    testConnectionMutation.mutate(siteId, {
      onSettled: () => setTestingSiteId(null),
    });
  };

  const handleToggleActive = (siteId: string, active: boolean) => {
    setActiveMutation.mutate({ id: siteId, active });
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
      <div className="p-6">
        <Alert
          message="Error Loading Generic Clusters"
          description="There was an error loading the generic clusters. Please try again."
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} className="mb-1">
            Generic Clusters
          </Title>
          <Text className="text-gray-600">
            Manage connections to EKS, GKE, AKS, and other Kubernetes clusters using kubeconfig
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenModal}
        >
          Add Cluster
        </Button>
      </div>

      {sites && sites.length > 0 ? (
        <div>
          <div className="mb-4">
            <Text className="text-gray-600">
              {sites.length} cluster{sites.length !== 1 ? "s" : ""}
            </Text>
          </div>
          <Row gutter={[16, 16]}>
            {sites.map((site) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={site.id}>
                <GenericClusterSiteCard
                  site={site}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onTestConnection={handleTestConnection}
                  onToggleActive={handleToggleActive}
                  testingConnection={testingSiteId === site.id}
                />
              </Col>
            ))}
          </Row>
        </div>
      ) : (
        <Empty
          image={<ServerIcon size={64} className="mx-auto text-gray-400" />}
          description={
            <div className="text-center">
              <p className="text-gray-500 mb-2">No generic clusters configured</p>
              <p className="text-gray-400 text-sm">
                Add your first generic Kubernetes cluster to get started
              </p>
            </div>
          }
        >
          <Button
            type="primary"
            icon={<CloudServerOutlined />}
            onClick={handleOpenModal}
          >
            Add Your First Cluster
          </Button>
        </Empty>
      )}

      <Modal
        title={editingSite ? "Edit Cluster" : "Add New Cluster"}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={600}
        destroyOnClose
      >
        <GenericClusterSiteForm
          initialValues={
            editingSite
              ? {
                  name: editingSite.name,
                  kubeconfig: "",
                }
              : undefined
          }
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </div>
  );
}


