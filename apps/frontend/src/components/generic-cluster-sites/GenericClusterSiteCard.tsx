import { useState } from "react";
import Card from "antd/es/card";
import Tag from "antd/es/tag";
import Typography from "antd/es/typography";
import Dropdown from "antd/es/dropdown";
import Button from "antd/es/button";
import Modal from "antd/es/modal";
import {
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  CloudServerOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import type { GenericClusterSite } from "../../types";

const { Text, Title } = Typography;

interface GenericClusterSiteCardProps {
  site: GenericClusterSite;
  onEdit: (site: GenericClusterSite) => void;
  onDelete: (id: string) => void;
  onTestConnection: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  testingConnection?: boolean;
}

export function GenericClusterSiteCard({
  site,
  onEdit,
  onDelete,
  onTestConnection,
  onToggleActive,
  testingConnection,
}: GenericClusterSiteCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleEdit = () => {
    onEdit(site);
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    onDelete(site.id);
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
      key: "test",
      label: "Test Connection",
      onClick: () => onTestConnection(site.id),
    },
    {
      key: "toggle-active",
      label: site.active ? "Deactivate" : "Set as Active",
      onClick: () => onToggleActive(site.id, !site.active),
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
            key="test"
            type="text"
            loading={testingConnection}
            onClick={() => onTestConnection(site.id)}
          >
            Test Connection
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
                {site.name}
              </Title>
              <Text className="text-sm text-gray-500">
                Generic Kubernetes Cluster
              </Text>
            </div>
            <CloudServerOutlined className="text-blue-500 text-lg" />
          </div>

          {/* Cluster Info */}
          <div className="space-y-1">
            {site.clusterName && (
              <div>
                <Text className="text-xs text-gray-600 block">
                  CLUSTER NAME
                </Text>
                <Text className="text-sm font-medium">{site.clusterName}</Text>
              </div>
            )}

            {site.serverUrl && (
              <div>
                <Text className="text-xs text-gray-600 block">SERVER URL</Text>
                <Text className="text-xs text-gray-700 break-all">
                  {site.serverUrl}
                </Text>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <Text className="text-xs text-gray-600">STATUS</Text>
            <Tag color={site.active ? "green" : "default"}>
              {site.active ? "Active" : "Inactive"}
            </Tag>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete Cluster"
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
            <span>
              Are you sure you want to delete "{site.name}" generic cluster?
            </span>
          </div>
          <p className="text-gray-600">This action cannot be undone.</p>
        </div>
      </Modal>
    </>
  );
}


