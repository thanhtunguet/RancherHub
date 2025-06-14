import { useState, useEffect } from "react";
import Button from "antd/es/button";
import Row from "antd/es/row";
import Col from "antd/es/col";
import Modal from "antd/es/modal";
import Empty from "antd/es/empty";
import Spin from "antd/es/spin";
import Alert from "antd/es/alert";
import Select from "antd/es/select";
import Typography from "antd/es/typography";
import { PlusOutlined } from "@ant-design/icons";
import { DatabaseIcon } from "lucide-react";
import { AppInstanceCard } from "./AppInstanceCard";
import { AppInstanceForm } from "./AppInstanceForm";
import {
  useAppInstancesByEnvironment,
  useCreateAppInstance,
  useUpdateAppInstance,
  useDeleteAppInstance,
} from "../../hooks/useAppInstances";
import { useEnvironments } from "../../hooks/useEnvironments";
import { useSites } from "../../hooks/useSites";
import type { AppInstance, CreateAppInstanceRequest } from "../../types";

const { Title, Text } = Typography;
const { Option } = Select;

export function AppInstanceManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppInstance, setEditingAppInstance] =
    useState<AppInstance | null>(null);
  const [selectedEnvironmentId, setSelectedEnvironmentId] =
    useState<string>("");

  const { data: environments, isLoading: environmentsLoading } =
    useEnvironments();
  const { data: sites, isLoading: sitesLoading } = useSites();

  // Auto-select first environment if not set
  useEffect(() => {
    if (!selectedEnvironmentId && environments && environments.length > 0) {
      setSelectedEnvironmentId(environments[0].id);
    }
  }, [selectedEnvironmentId, environments]);

  // Use the selected environment from local state
  const effectiveEnvironmentId = selectedEnvironmentId;

  const {
    data: appInstances,
    isLoading,
    error,
  } = useAppInstancesByEnvironment(effectiveEnvironmentId);
  const createAppInstanceMutation = useCreateAppInstance();
  const updateAppInstanceMutation = useUpdateAppInstance();
  const deleteAppInstanceMutation = useDeleteAppInstance();

  const handleOpenModal = () => {
    setEditingAppInstance(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAppInstance(null);
  };

  const handleSubmit = (values: CreateAppInstanceRequest) => {
    const submitData = {
      ...values,
    };

    if (editingAppInstance) {
      updateAppInstanceMutation.mutate(
        { id: editingAppInstance.id, data: submitData },
        { onSuccess: handleCloseModal }
      );
    } else {
      createAppInstanceMutation.mutate(submitData, {
        onSuccess: handleCloseModal,
      });
    }
  };

  const handleEdit = (appInstance: AppInstance) => {
    setEditingAppInstance(appInstance);
    setIsModalOpen(true);
  };

  const handleDelete = (appInstanceId: string) => {
    deleteAppInstanceMutation.mutate(appInstanceId);
  };

  const handleEnvironmentChange = (environmentId: string) => {
    setSelectedEnvironmentId(environmentId);
  };

  const selectedEnv = environments?.find(
    (e) => e.id === effectiveEnvironmentId
  );

  if (environmentsLoading || sitesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!environments || environments.length === 0) {
    return (
      <div className="p-6">
        <Alert
          message="No Environments Found"
          description="You need to create environments before you can create app instances."
          type="info"
          showIcon
          action={
            <Button type="primary" href="/environments">
              Create Environment
            </Button>
          }
        />
      </div>
    );
  }

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
          message="Error Loading App Instances"
          description="There was an error loading app instances. Please try again."
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
            App Instances
          </Title>
          <Text className="text-gray-600">
            Configure app instances to link environments with Rancher clusters
            and namespaces
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenModal}
          disabled={!effectiveEnvironmentId}
        >
          Add App Instance
        </Button>
      </div>

      {/* Environment Selector */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Text strong>Environment:</Text>
          <Select
            placeholder="Select environment to view app instances"
            value={effectiveEnvironmentId}
            onChange={handleEnvironmentChange}
            className="w-64"
          >
            {environments.map((env) => (
              <Option key={env.id} value={env.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: env.color }}
                  />
                  {env.name}
                </div>
              </Option>
            ))}
          </Select>
        </div>

        {selectedEnv && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedEnv.color }}
              />
              <Text strong>Selected: {selectedEnv.name}</Text>
              {selectedEnv.description && (
                <Text className="text-gray-600">
                  - {selectedEnv.description}
                </Text>
              )}
            </div>
          </div>
        )}
      </div>

      {!effectiveEnvironmentId ? (
        <Alert
          message="Select Environment"
          description="Please select an environment to view and manage app instances."
          type="info"
          showIcon
        />
      ) : appInstances && appInstances.length > 0 ? (
        <div>
          <div className="mb-4">
            <Text className="text-gray-600">
              {appInstances.length} app instance
              {appInstances.length !== 1 ? "s" : ""} in {selectedEnv?.name}
            </Text>
          </div>
          <Row gutter={[16, 16]}>
            {appInstances.map((appInstance) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={appInstance.id}>
                <AppInstanceCard
                  appInstance={appInstance}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </Col>
            ))}
          </Row>
        </div>
      ) : (
        <Empty
          image={<DatabaseIcon size={64} className="mx-auto text-gray-400" />}
          description={
            <div className="text-center">
              <p className="text-gray-500 mb-2">
                No app instances in {selectedEnv?.name}
              </p>
              <p className="text-gray-400 text-sm">
                Create your first app instance to link this environment with a
                Rancher cluster
              </p>
            </div>
          }
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenModal}
          >
            Create First App Instance
          </Button>
        </Empty>
      )}

      <Modal
        title={
          editingAppInstance ? "Edit App Instance" : "Create New App Instance"
        }
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={600}
        destroyOnClose
      >
        <AppInstanceForm
          initialValues={
            editingAppInstance
              ? {
                  name: editingAppInstance.name,
                  cluster: editingAppInstance.cluster,
                  namespace: editingAppInstance.namespace,
                  rancherSiteId: editingAppInstance.rancherSiteId,
                  environmentId: editingAppInstance.environmentId,
                }
              : {
                  environmentId: effectiveEnvironmentId,
                }
          }
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
          loading={
            createAppInstanceMutation.isPending ||
            updateAppInstanceMutation.isPending
          }
          environments={environments || []}
          sites={sites || []}
        />
      </Modal>
    </div>
  );
}
