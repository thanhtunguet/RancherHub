import { Typography, Card, Space, Button, Alert } from 'antd'
import { ServerIcon, LayersIcon, DatabaseIcon, ArrowRightIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSites } from '../hooks/useSites'
import { useEnvironments } from '../hooks/useEnvironments'
import { useAppInstances } from '../hooks/useAppInstances'
import { useAppStore } from '../stores/useAppStore'

const { Title, Paragraph } = Typography

export function HomePage() {
  const navigate = useNavigate()
  const { data: sites } = useSites()
  const { data: environments } = useEnvironments()
  const { activeSite, selectedEnvironment } = useAppStore()
  const { data: appInstances } = useAppInstances(selectedEnvironment?.id)

  const sitesCount = sites?.length || 0
  const environmentsCount = environments?.length || 0
  const appInstancesCount = appInstances?.length || 0
  const hasActiveSite = !!activeSite
  const hasSelectedEnvironment = !!selectedEnvironment

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Space size="large" direction="vertical">
            <Title level={1}>Welcome to Rancher Hub</Title>
            <Paragraph className="text-lg text-gray-600">
              Manage and synchronize services across different environments in your Rancher clusters
            </Paragraph>
          </Space>
        </div>

        {/* Status Overview */}
        <div className="mb-8">
          <Title level={3}>Setup Status</Title>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={sitesCount > 0 ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">Rancher Sites</div>
                  <div className="text-2xl font-bold">{sitesCount}</div>
                  {hasActiveSite && (
                    <div className="text-sm text-green-600">✓ Active site configured</div>
                  )}
                </div>
                <ServerIcon size={32} className={sitesCount > 0 ? 'text-green-500' : 'text-orange-500'} />
              </div>
              <Button 
                type="link" 
                className="p-0 h-auto mt-2"
                onClick={() => navigate('/sites')}
              >
                {sitesCount > 0 ? 'Manage Sites' : 'Add First Site'} <ArrowRightIcon size={14} />
              </Button>
            </Card>

            <Card className={environmentsCount > 0 ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">Environments</div>
                  <div className="text-2xl font-bold">{environmentsCount}</div>
                  {hasSelectedEnvironment && (
                    <div className="text-sm text-green-600">✓ Environment selected</div>
                  )}
                </div>
                <LayersIcon size={32} className={environmentsCount > 0 ? 'text-green-500' : 'text-orange-500'} />
              </div>
              <Button 
                type="link" 
                className="p-0 h-auto mt-2"
                onClick={() => navigate('/environments')}
              >
                {environmentsCount > 0 ? 'Manage Environments' : 'Create First Environment'} <ArrowRightIcon size={14} />
              </Button>
            </Card>

            <Card className={appInstancesCount > 0 ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">App Instances</div>
                  <div className="text-2xl font-bold">{appInstancesCount}</div>
                  {selectedEnvironment && appInstancesCount > 0 && (
                    <div className="text-sm text-green-600">✓ {selectedEnvironment.name} configured</div>
                  )}
                </div>
                <DatabaseIcon size={32} className={appInstancesCount > 0 ? 'text-green-500' : 'text-orange-500'} />
              </div>
              <Button 
                type="link" 
                className="p-0 h-auto mt-2"
                onClick={() => navigate('/app-instances')}
              >
                {appInstancesCount > 0 ? 'Manage App Instances' : 'Create First App Instance'} <ArrowRightIcon size={14} />
              </Button>
            </Card>
          </div>
        </div>

        {/* Getting Started */}
        {(!sitesCount || !environmentsCount || !appInstancesCount) && (
          <Alert
            message="Getting Started"
            description={
              <div>
                <p className="mb-3">Complete these steps to start managing your Rancher services:</p>
                <ol className="list-decimal list-inside space-y-1">
                  {!sitesCount && <li>Add your first Rancher site connection</li>}
                  {!environmentsCount && <li>Create environments (Dev, Staging, Production)</li>}
                  {!appInstancesCount && selectedEnvironment && <li>Configure app instances for your environments</li>}
                  <li>Start synchronizing services between environments</li>
                </ol>
              </div>
            }
            type="info"
            showIcon
            className="mb-8"
          />
        )}

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Multi-Site Support" className="text-center">
            <Paragraph>
              Connect to multiple Rancher instances and manage them from a single dashboard
            </Paragraph>
          </Card>

          <Card title="Environment Management" className="text-center">
            <Paragraph>
              Organize your applications by environments (Dev, Staging, Production)
            </Paragraph>
          </Card>

          <Card title="Service Synchronization" className="text-center">
            <Paragraph>
              Sync services between environments with a single click and track history
            </Paragraph>
          </Card>
        </div>
      </div>
    </div>
  )
}