import { useState } from "react";
import Button from "antd/es/button";
import Table from "antd/es/table";
import Modal from "antd/es/modal";
import Spin from "antd/es/spin";
import Alert from "antd/es/alert";
import Typography from "antd/es/typography";
import Tag from "antd/es/tag";
import Space from "antd/es/space";
import Popconfirm from "antd/es/popconfirm";
import Tooltip from "antd/es/tooltip";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, CloudServerOutlined, EditOutlined, DeleteOutlined, ApiOutlined } from "@ant-design/icons";
import { ServerIcon } from "lucide-react";
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

  const columns: ColumnsType<GenericClusterSite> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name: string) => (
        <div className="flex items-center gap-2">
          <CloudServerOutlined className="text-blue-500" />
          <span className="font-medium">{name}</span>
        </div>
      ),
    },
    {
      title: "Cluster Name",
      dataIndex: "clusterName",
      key: "clusterName",
      render: (clusterName: string) =>
        clusterName ? (
          <span>{clusterName}</span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      title: "Server URL",
      dataIndex: "serverUrl",
      key: "serverUrl",
      render: (url: string) =>
        url ? (
          <Tooltip title={url}>
            <span className="text-xs text-gray-700 truncate max-w-xs block">
              {url}
            </span>
          </Tooltip>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      title: "Status",
      dataIndex: "active",
      key: "status",
      render: (active: boolean) => (
        <Tag color={active ? "green" : "default"}>
          {active ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="Test Connection">
            <Button
              type="text"
              icon={<ApiOutlined />}
              onClick={() => handleTestConnection(record.id)}
              loading={testingSiteId === record.id}
              size="small"
            >
              Test
            </Button>
          </Tooltip>
          {!record.active && (
            <Tooltip title="Set as Active">
              <Button
                type="text"
                onClick={() => handleToggleActive(record.id, true)}
                size="small"
              >
                Activate
              </Button>
            </Tooltip>
          )}
          {record.active && (
            <Tooltip title="Deactivate">
              <Button
                type="text"
                onClick={() => handleToggleActive(record.id, false)}
                size="small"
              >
                Deactivate
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
            title="Delete Cluster"
            description="Are you sure you want to delete this cluster?"
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

      <div className="mb-4">
        <Text className="text-gray-600">
          {sites?.length || 0} cluster{(sites?.length || 0) !== 1 ? "s" : ""}
        </Text>
      </div>

      <Table
        columns={columns}
        dataSource={sites || []}
        rowKey="id"
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} clusters`,
        }}
        locale={{
          emptyText: (
            <div className="text-center py-8">
              <ServerIcon
                size={48}
                className="mx-auto text-gray-400 mb-4"
              />
              <p className="text-gray-500 mb-2">No generic clusters configured</p>
              <p className="text-gray-400 text-sm mb-4">
                Add your first generic Kubernetes cluster to get started
              </p>
              <Button
                type="primary"
                icon={<CloudServerOutlined />}
                onClick={handleOpenModal}
              >
                Add Your First Cluster
              </Button>
            </div>
          ),
        }}
      />

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
