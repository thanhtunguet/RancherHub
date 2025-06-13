import { useState } from 'react';
import { 
  Modal, 
  Steps, 
  Select, 
  Button, 
  Alert, 
  Typography, 
  Space, 
  Card,
  Tag,
  Table,
  message
} from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { ArrowRightIcon } from 'lucide-react';
import { useAppInstancesByEnvironment } from '../../hooks/useAppInstances';
import { useSyncServices } from '../../hooks/useServices';
import type { Service, Environment, SyncServicesRequest } from '../../types';

const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

interface SyncModalProps {
  open: boolean;
  onClose: () => void;
  selectedServices: Service[];
  sourceEnvironment: Environment;
  environments: Environment[];
  onSuccess: () => void;
}

export function SyncModal({
  open,
  onClose,
  selectedServices,
  sourceEnvironment,
  environments,
  onSuccess,
}: SyncModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetEnvironmentId, setTargetEnvironmentId] = useState<string>('');
  const [serviceAppInstanceMap, setServiceAppInstanceMap] = useState<Record<string, string>>({});

  const { data: targetAppInstances } = useAppInstancesByEnvironment(targetEnvironmentId);
  const syncMutation = useSyncServices();

  const targetEnvironments = environments.filter(env => env.id !== sourceEnvironment.id);

  const resetModal = () => {
    setCurrentStep(0);
    setTargetEnvironmentId('');
    setServiceAppInstanceMap({});
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!targetEnvironmentId) {
        message.warning('Please select a target environment');
        return;
      }
      setCurrentStep(1);
    } else if (currentStep === 1) {
      // Validate app instance mappings
      const missingMappings = selectedServices.filter(service => !serviceAppInstanceMap[service.id]);
      if (missingMappings.length > 0) {
        message.warning('Please select target app instances for all services');
        return;
      }
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSync = () => {
    confirm({
      title: 'Confirm Synchronization',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>This will synchronize <strong>{selectedServices.length} services</strong> from:</p>
          <p><strong>Source:</strong> {sourceEnvironment.name}</p>
          <p><strong>Target:</strong> {environments.find(e => e.id === targetEnvironmentId)?.name}</p>
          <br />
          <Alert
            message="Warning"
            description="This action will update image tags in the target environment. Make sure you understand the impact."
            type="warning"
            showIcon
          />
        </div>
      ),
      onOk: async () => {
        try {
          const syncRequest: SyncServicesRequest = {
            sourceEnvironmentId: sourceEnvironment.id,
            targetEnvironmentId,
            serviceIds: selectedServices.map(s => s.id),
            targetAppInstanceIds: selectedServices.map(s => serviceAppInstanceMap[s.id]),
          };

          await syncMutation.mutateAsync(syncRequest);
          onSuccess();
        } catch (error) {
          // Error is handled by the mutation
        }
      },
    });
  };

  const handleAppInstanceChange = (serviceId: string, appInstanceId: string) => {
    setServiceAppInstanceMap(prev => ({
      ...prev,
      [serviceId]: appInstanceId,
    }));
  };

  const steps = [
    {
      title: 'Select Target',
      description: 'Choose target environment',
    },
    {
      title: 'Map Services',
      description: 'Map to app instances',
    },
    {
      title: 'Review & Sync',
      description: 'Confirm and execute',
    },
  ];

  const serviceColumns = [
    {
      title: 'Service',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, service: Service) => (
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-sm text-gray-500">{service.workloadType}</div>
        </div>
      ),
    },
    {
      title: 'Current Image',
      dataIndex: 'imageTag',
      key: 'imageTag',
      render: (tag: string) => (
        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{tag}</code>
      ),
    },
    {
      title: 'Target App Instance',
      key: 'target',
      render: (_: any, service: Service) => (
        <Select
          placeholder="Select app instance"
          value={serviceAppInstanceMap[service.id]}
          onChange={(value) => handleAppInstanceChange(service.id, value)}
          className="w-full"
        >
          {targetAppInstances?.map((appInstance) => (
            <Option key={appInstance.id} value={appInstance.id}>
              {appInstance.name} ({appInstance.cluster}/{appInstance.namespace})
            </Option>
          ))}
        </Select>
      ),
    },
  ];

  return (
    <Modal
      title="Synchronize Services"
      open={open}
      onCancel={handleClose}
      width={800}
      footer={null}
    >
      <div className="mb-6">
        <Steps current={currentStep} items={steps} />
      </div>

      {/* Step 0: Select Target Environment */}
      {currentStep === 0 && (
        <div className="space-y-4">
          <div>
            <Title level={4}>Select Target Environment</Title>
            <Text className="text-gray-600">
              Choose the environment where you want to synchronize the selected services.
            </Text>
          </div>

          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <Text strong>Source Environment</Text>
                <div className="flex items-center gap-2 mt-1">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: sourceEnvironment.color }}
                  />
                  <span className="font-medium">{sourceEnvironment.name}</span>
                  <Tag color="blue">{selectedServices.length} services</Tag>
                </div>
              </div>
            </div>
          </Card>

          <div>
            <Text strong className="block mb-2">Target Environment</Text>
            <Select
              placeholder="Select target environment"
              value={targetEnvironmentId}
              onChange={setTargetEnvironmentId}
              className="w-full"
              size="large"
            >
              {targetEnvironments.map((env) => (
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

          {targetEnvironmentId && (
            <Alert
              message="Ready to Proceed"
              description={`You will synchronize ${selectedServices.length} services from ${sourceEnvironment.name} to ${environments.find(e => e.id === targetEnvironmentId)?.name}.`}
              type="success"
              showIcon
            />
          )}
        </div>
      )}

      {/* Step 1: Map Services to App Instances */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <Title level={4}>Map Services to App Instances</Title>
            <Text className="text-gray-600">
              Select the target app instance for each service in the destination environment.
            </Text>
          </div>

          {!targetAppInstances || targetAppInstances.length === 0 ? (
            <Alert
              message="No App Instances Found"
              description="The target environment has no app instances configured. Please create app instances first."
              type="warning"
              showIcon
            />
          ) : (
            <Table
              dataSource={selectedServices}
              columns={serviceColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          )}
        </div>
      )}

      {/* Step 2: Review and Confirm */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div>
            <Title level={4}>Review Synchronization</Title>
            <Text className="text-gray-600">
              Please review the synchronization details before proceeding.
            </Text>
          </div>

          <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded">
            <Card size="small" className="text-center">
              <div 
                className="w-4 h-4 rounded-full mx-auto mb-2"
                style={{ backgroundColor: sourceEnvironment.color }}
              />
              <div className="font-medium">{sourceEnvironment.name}</div>
              <div className="text-sm text-gray-600">Source</div>
            </Card>
            
            <ArrowRightIcon size={24} className="text-gray-400" />
            
            <Card size="small" className="text-center">
              <div 
                className="w-4 h-4 rounded-full mx-auto mb-2"
                style={{ backgroundColor: environments.find(e => e.id === targetEnvironmentId)?.color }}
              />
              <div className="font-medium">
                {environments.find(e => e.id === targetEnvironmentId)?.name}
              </div>
              <div className="text-sm text-gray-600">Target</div>
            </Card>
          </div>

          <Card title={`Services to Sync (${selectedServices.length})`} size="small">
            <div className="space-y-2">
              {selectedServices.map((service) => {
                const targetAppInstance = targetAppInstances?.find(
                  ai => ai.id === serviceAppInstanceMap[service.id]
                );
                return (
                  <div key={service.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-sm text-gray-600">
                        {service.imageTag} → {targetAppInstance?.name}
                      </div>
                    </div>
                    <Tag color="blue">{service.workloadType}</Tag>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between mt-6 pt-4 border-t">
        <Button onClick={currentStep === 0 ? handleClose : handleBack}>
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </Button>
        
        <Space>
          {currentStep < 2 ? (
            <Button type="primary" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button 
              type="primary" 
              danger
              loading={syncMutation.isPending}
              onClick={handleSync}
            >
              Synchronize Services
            </Button>
          )}
        </Space>
      </div>
    </Modal>
  );
}