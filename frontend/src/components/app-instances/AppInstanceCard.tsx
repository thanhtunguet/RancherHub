import { useState } from "react";
import { Card, Tag, Typography, Dropdown, Button, Modal } from "antd";
import {
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { ServerIcon, LayersIcon } from "lucide-react";
import type { MenuProps } from "antd";
import type { AppInstance } from "../../types";

const { Text, Title } = Typography;

interface AppInstanceCardProps {
  appInstance: AppInstance;
  onEdit: (appInstance: AppInstance) => void;
  onDelete: (appInstanceId: string) => void;
}

export function AppInstanceCard({
  appInstance,
  onEdit,
  onDelete,
}: AppInstanceCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleEdit = () => {
    onEdit(appInstance);
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    onDelete(appInstance.id);
    setShowDeleteModal(false);
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "edit",
      label: "Edit",
      icon: <EditOutlined />,
      onClick: handleEdit,
    },
    {
      key: "delete",
      label: "Delete",
      icon: <DeleteOutlined />,
      onClick: handleDelete,
      danger: true,
    },
  ];

  return (
    <>
      <Card
        size="small"
        className="hover:border-blue-300 hover:shadow-sm transition-all duration-200"
        actions={[
          <Button
            key="edit"
            type="text"
            icon={<EditOutlined />}
            onClick={handleEdit}
          >
            Edit
          </Button>,
          <Dropdown key="more" menu={{ items: menuItems }} trigger={["click"]}>
            <Button
              type="text"
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>,
        ]}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <Title level={5} className="mb-1 truncate">
                {appInstance.name}
              </Title>
              <Text className="text-sm text-gray-500">App Instance</Text>
            </div>
            <DatabaseOutlined className="text-blue-500 text-lg" />
          </div>

          {/* Environment */}
          {appInstance.environment && (
            <div className="flex items-center gap-2">
              <LayersIcon size={14} className="text-gray-400" />
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: appInstance.environment.color }}
                />
                <Text className="text-sm">{appInstance.environment.name}</Text>
              </div>
            </div>
          )}

          {/* Cluster Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ServerIcon size={14} className="text-gray-400" />
              <div>
                <Text className="text-xs text-gray-600 block">CLUSTER</Text>
                <Text className="text-sm font-medium">
                  {appInstance.cluster}
                </Text>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5" /> {/* Spacer */}
              <div>
                <Text className="text-xs text-gray-600 block">NAMESPACE</Text>
                <Text className="text-sm font-medium">
                  {appInstance.namespace}
                </Text>
              </div>
            </div>
          </div>

          {/* Site Info */}
          {appInstance.rancherSite && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-xs text-gray-600 block">
                    RANCHER SITE
                  </Text>
                  <Text className="text-sm">
                    {appInstance.rancherSite.name}
                  </Text>
                </div>
                <Tag
                  color={appInstance.rancherSite.active ? "green" : "default"}
                >
                  {appInstance.rancherSite.active ? "Active" : "Inactive"}
                </Tag>
              </div>
            </div>
          )}

          {/* Service Count */}
          {appInstance.services && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <Text className="text-xs text-gray-600">SERVICES</Text>
                <Tag color="blue">{appInstance.services.length}</Tag>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete App Instance"
        open={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>,
          <Button
            key="delete"
            type="primary"
            danger
            onClick={handleConfirmDelete}
          >
            Delete
          </Button>,
        ]}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ExclamationCircleOutlined className="text-red-500" />
            <span>Are you sure you want to delete "{appInstance.name}"?</span>
          </div>
          <p className="text-gray-600">This action cannot be undone.</p>
        </div>
      </Modal>
    </>
  );
}
