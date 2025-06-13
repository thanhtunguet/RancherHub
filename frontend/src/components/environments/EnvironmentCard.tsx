import { Card, Button, Tag, Dropdown, Modal, Badge } from 'antd';
import { MoreOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Environment } from '../../types';

interface EnvironmentCardProps {
  environment: Environment;
  onEdit: (environment: Environment) => void;
  onDelete: (environmentId: string) => void;
  onSelect: (environment: Environment) => void;
  isSelected?: boolean;
}

export function EnvironmentCard({ 
  environment, 
  onEdit, 
  onDelete, 
  onSelect,
  isSelected 
}: EnvironmentCardProps) {
  const handleDelete = () => {
    Modal.confirm({
      title: 'Delete Environment',
      content: `Are you sure you want to delete "${environment.name}"? This will also delete all associated app instances.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => onDelete(environment.id),
    });
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: 'Edit',
      icon: <EditOutlined />,
      onClick: () => onEdit(environment),
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

  const appInstanceCount = environment.appInstances?.length || 0;

  return (
    <Card
      className={`transition-all duration-200 cursor-pointer ${
        isSelected 
          ? 'border-blue-500 shadow-md bg-blue-50' 
          : 'border-gray-200 hover:shadow-sm hover:border-gray-300'
      }`}
      onClick={() => onSelect(environment)}
      actions={[
        <Button
          key="select"
          type={isSelected ? 'primary' : 'default'}
          icon={<AppstoreOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(environment);
          }}
        >
          {isSelected ? 'Selected' : 'Select'}
        </Button>,
        <Button
          key="edit"
          type="text"
          icon={<EditOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(environment);
          }}
        >
          Edit
        </Button>,
        <Dropdown 
          menu={{ items: menuItems }} 
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
        </Dropdown>,
      ]}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: environment.color }}
          />
          <h3 className="text-lg font-semibold text-gray-900 mb-0">
            {environment.name}
          </h3>
        </div>
        {isSelected && <Tag color="blue">Active</Tag>}
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
          title={`${appInstanceCount} app instance${appInstanceCount !== 1 ? 's' : ''}`}
        />
      </div>
    </Card>
  );
}