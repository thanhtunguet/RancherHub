import { useState } from "react";
import Button from "antd/es/button";
import Table from "antd/es/table";
import Modal from "antd/es/modal";
import Spin from "antd/es/spin";
import Alert from "antd/es/alert";
import Tag from "antd/es/tag";
import Space from "antd/es/space";
import Popconfirm from "antd/es/popconfirm";
import Tooltip from "antd/es/tooltip";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { ServerIcon } from "lucide-react";
import { SiteForm } from "./SiteForm";
import {
  useSites,
  useCreateSite,
  useUpdateSite,
  useDeleteSite,
  useTestConnection,
  useActivateSite,
} from "../../hooks/useSites";
import type { RancherSite, CreateSiteRequest } from "../../types";

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

  const columns: ColumnsType<RancherSite> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name: string) => (
        <div className="flex items-center gap-2">
          <ServerIcon size={16} className="text-blue-500" />
          <span className="font-medium">{name}</span>
        </div>
      ),
    },
    {
      title: "URL",
      dataIndex: "url",
      key: "url",
      render: (url: string) => (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {url}
        </a>
      ),
    },
    {
      title: "Status",
      dataIndex: "active",
      key: "status",
      render: (active: boolean) => (
        <Tag color={active ? "blue" : "default"}>
          {active ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="Test Connection">
            <Button
              type="text"
              icon={<PlayCircleOutlined />}
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
                icon={<CheckCircleOutlined />}
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
            title="Delete Site"
            description="Are you sure you want to delete this site?"
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

      <Table
        columns={columns}
        dataSource={sites || []}
        rowKey="id"
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} sites`,
        }}
        locale={{
          emptyText: (
            <div className="text-center py-8">
              <ServerIcon
                size={48}
                className="mx-auto text-gray-400 mb-4"
              />
              <p className="text-gray-500 mb-2">No Rancher sites configured</p>
              <p className="text-gray-400 text-sm mb-4">
                Add your first Rancher site to get started
              </p>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenModal}
              >
                Add Your First Site
              </Button>
            </div>
          ),
        }}
      />

      <Modal
        title={editingSite ? "Edit Site" : "Add New Site"}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={500}
      >
        <SiteForm
          initialValues={
            editingSite
              ? {
                  name: editingSite.name,
                  url: editingSite.url,
                  token: "", // Don't pre-fill token for security
                }
              : undefined
          }
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
          loading={createSiteMutation.isPending || updateSiteMutation.isPending}
        />
      </Modal>
    </div>
  );
}
