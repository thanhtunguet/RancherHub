import { Card, Button, Tag, Dropdown, Modal } from 'antd';
import { MoreOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { RancherSite } from '../../types';

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
  testingConnection 
}: SiteCardProps) {
  const handleDelete = () => {
    Modal.confirm({
      title: 'Delete Site',
      content: `Are you sure you want to delete "${site.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => onDelete(site.id),
    });
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: 'Edit',
      icon: <EditOutlined />,
      onClick: () => onEdit(site),
    },
    {
      key: 'test',
      label: 'Test Connection',
      icon: <PlayCircleOutlined />,
      onClick: () => onTestConnection(site.id),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: handleDelete,
    },
  ];

  if (!site.active) {
    menuItems.splice(2, 0, {
      key: 'activate',
      label: 'Set as Active',
      icon: <CheckCircleOutlined />,
      onClick: () => onActivate(site.id),
    });
  }

  return (
    <Card
      className={`transition-all duration-200 ${
        site.active 
          ? 'border-blue-500 shadow-md' 
          : 'border-gray-200 hover:shadow-sm'
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
        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>,
      ]}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{site.name}</h3>
        {site.active && <Tag color="blue">Active</Tag>}
      </div>
      
      <p className="text-gray-600 text-sm mb-2">{site.url}</p>
      
      <div className="text-xs text-gray-500">
        Created: {new Date(site.createdAt).toLocaleDateString()}
      </div>
    </Card>
  );
}