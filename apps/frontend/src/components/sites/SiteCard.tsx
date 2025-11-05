import { useState } from "react";
import Card from "antd/es/card";
import Button from "antd/es/button";
import Tag from "antd/es/tag";
import Dropdown from "antd/es/dropdown";
import Modal from "antd/es/modal";
import {
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { RancherSite } from "../../types";

interface SiteCardProps {
  site: RancherSite;
  onEdit: (site: RancherSite) => void;
  onDelete: (siteId: string) => void;
  onTestConnection: (siteId: string) => void;
  onActivate: (siteId: string) => void;
  testingConnection?: boolean;
}

export function SiteCard({
  site,
  onEdit,
  onDelete,
  onTestConnection,
  onActivate,
  testingConnection,
}: SiteCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
      onClick: () => onEdit(site),
    },
    {
      key: "test",
      label: "Test Connection",
      icon: <PlayCircleOutlined />,
      onClick: () => onTestConnection(site.id),
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

  if (!site.active) {
    menuItems.splice(2, 0, {
      key: "activate",
      label: "Set as Active",
      icon: <CheckCircleOutlined />,
      onClick: () => onActivate(site.id),
    });
  }

  return (
    <>
      <Card
        className={`transition-all duration-200 ${
          site.active
            ? "border-blue-500 shadow-md"
            : "border-gray-200 hover:shadow-sm"
        }`}
        actions={[
          <Button
            key="test"
            type="text"
            icon={<PlayCircleOutlined />}
            loading={testingConnection}
            onClick={() => onTestConnection(site.id)}
          >
            Test
          </Button>,
          <Button
            key="edit"
            type="text"
            icon={<EditOutlined />}
            onClick={() => onEdit(site)}
          >
            Edit
          </Button>,
          <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>,
        ]}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {site.name}
          </h3>
          {site.active && <Tag color="blue">Active</Tag>}
        </div>

        <div className="mb-2">
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm hover:underline"
          >
            {site.url}
          </a>
        </div>

        <div className="text-xs text-gray-500">
          Created: {new Date(site.createdAt).toLocaleDateString()}
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete Site"
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
            <span>Are you sure you want to delete "{site.name}"?</span>
          </div>
          <p className="text-gray-600">This action cannot be undone.</p>
        </div>
      </Modal>
    </>
  );
}
