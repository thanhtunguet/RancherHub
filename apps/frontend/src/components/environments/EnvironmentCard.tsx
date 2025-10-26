import { useState } from "react";
import Card from "antd/es/card";
import Button from "antd/es/button";
import Dropdown from "antd/es/dropdown";
import Modal from "antd/es/modal";
import Badge from "antd/es/badge";
import {
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { HistoryIcon } from "lucide-react";
import type { MenuProps } from "antd";
import { Environment } from "../../types";
import { SyncHistoryModal } from "../services/SyncHistoryModal";

interface EnvironmentCardProps {
  environment: Environment;
  onEdit: (environment: Environment) => void;
  onDelete: (environmentId: string) => void;
}

export function EnvironmentCard({
  environment,
  onEdit,
  onDelete,
}: EnvironmentCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSyncHistory, setShowSyncHistory] = useState(false);

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    onDelete(environment.id);
    setShowDeleteModal(false);
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "edit",
      label: "Edit",
      icon: <EditOutlined />,
      onClick: () => onEdit(environment),
    },
    {
      key: "sync-history",
      label: "Sync History",
      icon: <HistoryIcon size={14} />,
      onClick: () => setShowSyncHistory(true),
    },
    {
      type: "divider",
    },
    {
      key: "delete",
      label: "Delete",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: handleDelete,
    },
  ];

  const appInstanceCount = environment.appInstances?.length || 0;

  return (
    <>
      <Card
        className="transition-all duration-200 border-gray-200 hover:shadow-sm hover:border-gray-300"
        actions={[
          <Button
            key="edit"
            type="text"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(environment);
            }}
          />,
          <Dropdown
            menu={{ items: menuItems }}
            trigger={["click"]}
            className="mx-0"
          >
            <Button
              type="text"
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>,
        ]}
      >
        <div className="flex items-start mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: environment.color }}
            />
            <h3 className="text-lg font-semibold text-gray-900 mb-0">
              {environment.name}
            </h3>
          </div>
        </div>

        {environment.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {environment.description}
          </p>
        )}

        <div className="flex justify-between items-center text-xs text-gray-500">
          <div>
            Created: {new Date(environment.createdAt).toLocaleDateString()}
          </div>
          <Badge
            count={appInstanceCount}
            style={{ backgroundColor: environment.color }}
            title={`${appInstanceCount} app instance${appInstanceCount !== 1 ? "s" : ""}`}
          />
        </div>
      </Card>

      {/* Sync History Modal */}
      <SyncHistoryModal
        open={showSyncHistory}
        onClose={() => setShowSyncHistory(false)}
        environmentId={environment.id}
        title={`Sync History - ${environment.name}`}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete Environment"
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
            <span>Are you sure you want to delete "{environment.name}"?</span>
          </div>
          <p className="text-gray-600">
            This will also delete all associated app instances. This action
            cannot be undone.
          </p>
        </div>
      </Modal>
    </>
  );
}
