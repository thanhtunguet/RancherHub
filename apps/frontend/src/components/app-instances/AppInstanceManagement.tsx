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
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import { ServerIcon, LayersIcon, CloudIcon } from "lucide-react";
import { AppInstanceForm } from "./AppInstanceForm";
import {
  useAppInstances,
  useCreateAppInstance,
  useUpdateAppInstance,
  useDeleteAppInstance,
} from "../../hooks/useAppInstances";
import { useEnvironments } from "../../hooks/useEnvironments";
import { useSites } from "../../hooks/useSites";
import { useGenericClusterSites } from "../../hooks/useGenericClusterSites";
import type { AppInstance, CreateAppInstanceRequest } from "../../types";

const { Title, Text } = Typography;

export function AppInstanceManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppInstance, setEditingAppInstance] =
    useState<AppInstance | null>(null);

  const { data: environments, isLoading: environmentsLoading } =
    useEnvironments();
  const { data: sites, isLoading: sitesLoading } = useSites();
  const {
    data: genericClusterSites,
    isLoading: genericSitesLoading,
  } = useGenericClusterSites();

  const {
    data: appInstances,
    isLoading,
    error,
  } = useAppInstances();
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

  const columns: ColumnsType<AppInstance> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name: string) => (
        <div className="flex items-center gap-2">
          <DatabaseOutlined className="text-blue-500" />
          <span className="font-medium">{name}</span>
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "clusterType",
      key: "clusterType",
      render: (clusterType: string) => (
        <Tag color={clusterType === "generic" ? "purple" : "blue"}>
          {clusterType === "generic" ? "Generic" : "Rancher"}
        </Tag>
      ),
    },
    {
      title: "Environment",
      dataIndex: "environment",
      key: "environment",
      render: (_, record) =>
        record.environment ? (
          <div className="flex items-center gap-2">
            <LayersIcon size={14} className="text-gray-400" />
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: record.environment.color }}
            />
            <span>{record.environment.name}</span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      title: "Cluster",
      dataIndex: "cluster",
      key: "cluster",
      render: (cluster: string) => (
        <div className="flex items-center gap-2">
          <ServerIcon size={14} className="text-gray-400" />
          <span>{cluster}</span>
        </div>
      ),
    },
    {
      title: "Namespace",
      dataIndex: "namespace",
      key: "namespace",
    },
    {
      title: "Site",
      key: "site",
      render: (_, record) => {
        if (record.rancherSite) {
          return <span>{record.rancherSite.name}</span>;
        }
        if (record.genericClusterSite) {
          return (
            <div className="flex items-center gap-2">
              <CloudIcon size={14} className="text-gray-400" />
              <span>{record.genericClusterSite.name}</span>
            </div>
          );
        }
        return <span className="text-gray-400">-</span>;
      },
    },
    {
      title: "Site Status",
      key: "siteStatus",
      render: (_, record) => {
        if (record.rancherSite) {
          return (
            <Tag color={record.rancherSite.active ? "green" : "default"}>
              {record.rancherSite.active ? "Active" : "Inactive"}
            </Tag>
          );
        }
        if (record.genericClusterSite) {
          return (
            <Tag color={record.genericClusterSite.active ? "green" : "default"}>
              {record.genericClusterSite.active ? "Active" : "Inactive"}
            </Tag>
          );
        }
        return <span className="text-gray-400">-</span>;
      },
    },
    {
      title: "Services",
      key: "services",
      render: (_, record) =>
        record.services ? (
          <Tag color="blue">{record.services.length}</Tag>
        ) : (
          <span className="text-gray-400">0</span>
        ),
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
          <Popconfirm
            title="Delete App Instance"
            description="Are you sure you want to delete this app instance?"
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

  if (environmentsLoading || sitesLoading || genericSitesLoading) {
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
            Configure app instances to link environments with Rancher or generic
            Kubernetes clusters and namespaces
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenModal}
        >
          Add App Instance
        </Button>
      </div>

      <div className="mb-4">
        <Text className="text-gray-600">
          {appInstances?.length || 0} app instance
          {(appInstances?.length || 0) !== 1 ? "s" : ""}
        </Text>
      </div>

      <Table
        columns={columns}
        dataSource={appInstances || []}
        rowKey="id"
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} app instances`,
        }}
        locale={{
          emptyText: (
            <div className="text-center py-8">
              <DatabaseOutlined
                style={{ fontSize: 48, color: "#d9d9d9", marginBottom: 16 }}
              />
              <p className="text-gray-500 mb-2">No app instances configured</p>
              <p className="text-gray-400 text-sm mb-4">
                Create your first app instance to link an environment with a
                cluster
              </p>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenModal}
              >
                Create First App Instance
              </Button>
            </div>
          ),
        }}
      />

      <Modal
        title={
          editingAppInstance ? "Edit App Instance" : "Create New App Instance"
        }
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <AppInstanceForm
          initialValues={
            editingAppInstance
              ? {
                  name: editingAppInstance.name,
                  cluster: editingAppInstance.cluster,
                  namespace: editingAppInstance.namespace,
                  clusterType: editingAppInstance.clusterType,
                  rancherSiteId: editingAppInstance.rancherSiteId || undefined,
                  genericClusterSiteId:
                    editingAppInstance.genericClusterSiteId || undefined,
                  environmentId: editingAppInstance.environmentId,
                }
              : undefined
          }
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
          loading={
            createAppInstanceMutation.isPending ||
            updateAppInstanceMutation.isPending
          }
          environments={environments || []}
          sites={sites || []}
          genericClusterSites={genericClusterSites || []}
        />
      </Modal>
    </div>
  );
}
