import { useState } from "react";
import Button from "antd/es/button";
import Table from "antd/es/table";
import Modal from "antd/es/modal";
import Spin from "antd/es/spin";
import Alert from "antd/es/alert";
import Badge from "antd/es/badge";
import Space from "antd/es/space";
import Popconfirm from "antd/es/popconfirm";
import Tooltip from "antd/es/tooltip";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { HistoryIcon, LayersIcon } from "lucide-react";
import { EnvironmentForm } from "./EnvironmentForm";
import { SyncHistoryModal } from "../services/SyncHistoryModal";
import {
  useEnvironments,
  useCreateEnvironment,
  useUpdateEnvironment,
  useDeleteEnvironment,
} from "../../hooks/useEnvironments";
import type { Environment, CreateEnvironmentRequest } from "../../types";

export function EnvironmentManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEnvironment, setEditingEnvironment] =
    useState<Environment | null>(null);
  const [showSyncHistory, setShowSyncHistory] = useState(false);
  const [selectedEnvironmentForHistory, setSelectedEnvironmentForHistory] =
    useState<Environment | null>(null);

  const { data: environments, isLoading, error } = useEnvironments();
  const createEnvironmentMutation = useCreateEnvironment();
  const updateEnvironmentMutation = useUpdateEnvironment();
  const deleteEnvironmentMutation = useDeleteEnvironment();

  const handleOpenModal = () => {
    setEditingEnvironment(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEnvironment(null);
  };

  const handleSubmit = (values: CreateEnvironmentRequest) => {
    if (editingEnvironment) {
      updateEnvironmentMutation.mutate(
        { id: editingEnvironment.id, data: values },
        { onSuccess: handleCloseModal }
      );
    } else {
      createEnvironmentMutation.mutate(values, { onSuccess: handleCloseModal });
    }
  };

  const handleEdit = (environment: Environment) => {
    setEditingEnvironment(environment);
    setIsModalOpen(true);
  };

  const handleDelete = (environmentId: string) => {
    deleteEnvironmentMutation.mutate(environmentId);
  };

  const handleViewSyncHistory = (environment: Environment) => {
    setSelectedEnvironmentForHistory(environment);
    setShowSyncHistory(true);
  };

  const columns: ColumnsType<Environment> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name: string, record) => (
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: record.color }}
          />
          <span className="font-medium">{name}</span>
        </div>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (description: string) =>
        description ? (
          <span className="text-gray-600">{description}</span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      title: "App Instances",
      key: "appInstances",
      render: (_, record) => {
        const count = record.appInstances?.length || 0;
        return (
          <Badge
            count={count}
            style={{ backgroundColor: record.color }}
            showZero
            title={`${count} app instance${count !== 1 ? "s" : ""}`}
          />
        );
      },
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
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Sync History">
            <Button
              type="text"
              icon={<HistoryIcon size={14} />}
              onClick={() => handleViewSyncHistory(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Delete Environment"
            description="This will also delete all associated app instances. This action cannot be undone."
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
        message="Error Loading Environments"
        description="There was an error loading the environments. Please try again."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Environments</h1>
          <p className="text-gray-600 mt-1">
            Organize your applications by environment (Dev, Staging, Production)
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenModal}
        >
          Add Environment
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={environments || []}
        rowKey="id"
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} environments`,
        }}
        locale={{
          emptyText: (
            <div className="text-center py-8">
              <LayersIcon
                size={48}
                className="mx-auto text-gray-400 mb-4"
              />
              <p className="text-gray-500 mb-2">No environments configured</p>
              <p className="text-gray-400 text-sm mb-4">
                Create your first environment to organize your applications
              </p>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenModal}
              >
                Create Your First Environment
              </Button>
            </div>
          ),
        }}
      />

      <Modal
        title={editingEnvironment ? "Edit Environment" : "Add New Environment"}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={500}
        destroyOnHidden
      >
        <EnvironmentForm
          initialValues={
            editingEnvironment
              ? {
                  name: editingEnvironment.name,
                  description: editingEnvironment.description || "",
                  color: editingEnvironment.color,
                }
              : undefined
          }
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
          loading={
            createEnvironmentMutation.isPending ||
            updateEnvironmentMutation.isPending
          }
        />
      </Modal>

      {/* Sync History Modal */}
      {selectedEnvironmentForHistory && (
        <SyncHistoryModal
          open={showSyncHistory}
          onClose={() => {
            setShowSyncHistory(false);
            setSelectedEnvironmentForHistory(null);
          }}
          environmentId={selectedEnvironmentForHistory.id}
          title={`Sync History - ${selectedEnvironmentForHistory.name}`}
        />
      )}
    </div>
  );
}
