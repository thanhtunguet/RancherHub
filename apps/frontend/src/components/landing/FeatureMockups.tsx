import React from 'react';
import { Button, Select, Table, Tag, Space } from 'antd';
import { ServerIcon, CheckCircleIcon, DatabaseIcon, RefreshCwIcon, PlusIcon, EditIcon, TrashIcon } from 'lucide-react';

export const RancherClustersMockup: React.FC = () => {
  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Rancher Sites</h3>
        <Button 
          type="primary" 
          icon={<PlusIcon size={16} />}
          size="middle"
        >
          Add Rancher Site
        </Button>
      </div>

      {/* Sites List */}
      <div className="space-y-3">
        {[
          { name: 'Production Cluster', url: 'https://rancher.prod.example.com', status: 'Connected' },
          { name: 'Staging Cluster', url: 'https://rancher.staging.example.com', status: 'Connected' },
          { name: 'Development Cluster', url: 'https://rancher.dev.example.com', status: 'Connected' },
        ].map((site, index) => (
          <div key={index} className="bg-white rounded-lg p-4 border-2 border-blue-100 hover:border-blue-200 hover:shadow-lg transition-all duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ServerIcon className="w-5 h-5 text-blue-600" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{site.name}</h4>
                  <p className="text-sm text-gray-500 font-mono">{site.url}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" aria-hidden="true" />
                    <span className="text-xs text-green-600 font-medium">{site.status}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Space>
                  <Button 
                    type="link" 
                    icon={<EditIcon size={14} />} 
                    size="small"
                  >
                    Edit
                  </Button>
                  <Button 
                    type="link" 
                    danger
                    icon={<TrashIcon size={14} />} 
                    size="small"
                  >
                    Delete
                  </Button>
                </Space>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const EnvironmentComparisonMockup: React.FC = () => {
  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Compare Environments</h3>
        <div className="flex gap-4 items-center">
          <Select 
            defaultValue="staging-api-gateway"
            style={{ flex: 1 }}
            options={[
              { value: 'staging-api-gateway', label: 'Staging - API Gateway' },
              { value: 'staging-auth-service', label: 'Staging - Auth Service' },
              { value: 'staging-database', label: 'Staging - Database' }
            ]}
          />
          <Button 
            icon={<RefreshCwIcon size={16} />} 
            type="text"
            shape="circle"
          />
          <Select 
            defaultValue="production-api-gateway"
            style={{ flex: 1 }}
            options={[
              { value: 'production-api-gateway', label: 'Production - API Gateway' },
              { value: 'production-auth-service', label: 'Production - Auth Service' },
              { value: 'production-database', label: 'Production - Database' }
            ]}
          />
        </div>
      </div>

      {/* Comparison Table */}
      <Table 
        size="small"
        pagination={false}
        dataSource={[
          {
            key: 'api-gateway',
            service: 'api-gateway',
            staging: 'v2.1.4',
            production: 'v2.1.3',
            status: 'different'
          },
          {
            key: 'auth-service',
            service: 'auth-service',
            staging: 'v1.8.2',
            production: 'v1.8.2',
            status: 'synced'
          },
          {
            key: 'database',
            service: 'database',
            staging: 'v3.2.1',
            production: 'v3.2.0',
            status: 'different'
          }
        ]}
        columns={[
          {
            title: 'Service',
            dataIndex: 'service',
            key: 'service',
            render: (text) => <span className="font-medium">{text}</span>
          },
          {
            title: 'Staging',
            dataIndex: 'staging',
            key: 'staging',
            render: (text) => <code className="text-xs">{text}</code>
          },
          {
            title: 'Production',
            dataIndex: 'production',
            key: 'production',
            render: (text) => <code className="text-xs">{text}</code>
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
              <Tag color={status === 'synced' ? 'success' : 'warning'}>
                {status === 'synced' ? 'Synced' : 'Different'}
              </Tag>
            )
          }
        ]}
      />

      <div className="mt-4">
        <Button 
          type="primary"
          icon={<RefreshCwIcon size={16} />}
        >
          Sync Selected Services
        </Button>
      </div>
    </div>
  );
};

export const HarborRegistryMockup: React.FC = () => {
  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Harbor Registry Browser</h3>
        <div className="text-sm text-gray-600">
          <span className="font-medium">Registry:</span> harbor.prod.example.com
        </div>
      </div>

      {/* Repository List */}
      <div className="bg-white rounded-lg border-2 border-blue-100 overflow-hidden shadow-md">
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-purple-200">
          <div className="flex items-center justify-between">
            <div className="font-medium text-gray-700">backend/api-gateway</div>
            <div className="text-sm text-gray-500">12 tags</div>
          </div>
        </div>

        <div className="divide-y divide-blue-100">
          {[
            { tag: 'v2.1.4', size: '245 MB', date: '2 days ago', latest: true },
            { tag: 'v2.1.3', size: '243 MB', date: '1 week ago', latest: false },
            { tag: 'v2.1.2', size: '242 MB', date: '2 weeks ago', latest: false },
          ].map((image, index) => (
            <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <DatabaseIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-gray-900">{image.tag}</span>
                      {image.latest && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          latest
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>{image.size}</span>
                      <span>{image.date}</span>
                    </div>
                  </div>
                </div>
                <Button 
                  type="primary"
                  size="small"
                >
                  Deploy
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ConfigMapSyncMockup: React.FC = () => {
  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">ConfigMap Comparison</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex-1">
            <div className="font-medium text-gray-700 mb-1">Source</div>
            <div className="text-gray-600">Staging - api-config</div>
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-700 mb-1">Target</div>
            <div className="text-gray-600">Production - api-config</div>
          </div>
        </div>
      </div>

      {/* ConfigMap Diff */}
      <Table 
        size="small"
        pagination={false}
        rowSelection={{
          type: 'checkbox',
          defaultSelectedRowKeys: ['API_TIMEOUT'],
        }}
        dataSource={[
          {
            key: 'API_TIMEOUT',
            configKey: 'API_TIMEOUT',
            staging: '30000',
            production: '20000',
            status: 'different'
          },
          {
            key: 'LOG_LEVEL',
            configKey: 'LOG_LEVEL',
            staging: 'debug',
            production: 'info',
            status: 'different'
          },
          {
            key: 'MAX_CONNECTIONS',
            configKey: 'MAX_CONNECTIONS',
            staging: '100',
            production: '100',
            status: 'synced'
          }
        ]}
        columns={[
          {
            title: 'Key',
            dataIndex: 'configKey',
            key: 'configKey',
            render: (text) => <code className="text-xs font-medium">{text}</code>
          },
          {
            title: 'Staging',
            dataIndex: 'staging',
            key: 'staging',
            render: (text) => <code className="text-xs">{text}</code>
          },
          {
            title: 'Production',
            dataIndex: 'production',
            key: 'production',
            render: (text) => <code className="text-xs">{text}</code>
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
              <Tag color={status === 'synced' ? 'success' : 'warning'}>
                {status === 'synced' ? 'Synced' : 'Different'}
              </Tag>
            )
          }
        ]}
        rowClassName={(record) => 
          record.status === 'different' && record.key === 'API_TIMEOUT' 
            ? 'bg-orange-50' 
            : ''
        }
      />

      <div className="mt-4 flex gap-3">
        <Space>
          <Button 
            type="primary"
            icon={<CheckCircleIcon size={16} />}
          >
            Sync Selected Keys
          </Button>
          <Button>
            Sync All
          </Button>
        </Space>
      </div>
    </div>
  );
};
