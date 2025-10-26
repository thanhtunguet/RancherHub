import { useState } from "react";
import Button from "antd/es/button";
import Row from "antd/es/row";
import Col from "antd/es/col";
import Modal from "antd/es/modal";
import Empty from "antd/es/empty";
import Spin from "antd/es/spin";
import Alert from "antd/es/alert";
import { PlusOutlined } from "@ant-design/icons";
import { LayersIcon } from "lucide-react";
import { EnvironmentCard } from "./EnvironmentCard";
import { EnvironmentForm } from "./EnvironmentForm";
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

      {environments && environments.length > 0 ? (
        <Row gutter={[16, 16]}>
          {environments.map((environment) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={environment.id}>
              <EnvironmentCard
                environment={environment}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <Empty
          image={<LayersIcon size={64} className="mx-auto text-gray-400" />}
          description={
            <div className="text-center">
              <p className="text-gray-500 mb-2">No environments configured</p>
              <p className="text-gray-400 text-sm">
                Create your first environment to organize your applications
              </p>
            </div>
          }
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenModal}
          >
            Create Your First Environment
          </Button>
        </Empty>
      )}

      <Modal
        title={editingEnvironment ? "Edit Environment" : "Add New Environment"}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={500}
        destroyOnClose
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
    </div>
  );
}
