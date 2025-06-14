import { useState } from "react";
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
  Checkbox,
  List,
  App,
} from "antd";
import { useAppInstancesByEnvironment } from "../../hooks/useAppInstances";
import { useSyncServices } from "../../hooks/useServices";
import type {
  Service,
  Environment,
  SyncServicesRequest,
  AppInstance,
} from "../../types";
import { SyncReviewContent } from "./SyncReviewContent";

const { Title, Text } = Typography;
const { Option } = Select;

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
  const { message } = App.useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetEnvironmentId, setTargetEnvironmentId] = useState<string>("");
  const [selectedTargetInstances, setSelectedTargetInstances] = useState<
    string[]
  >([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [closeTimeoutId, setCloseTimeoutId] = useState<NodeJS.Timeout | null>(
    null
  );

  const { data: targetAppInstances } =
    useAppInstancesByEnvironment(targetEnvironmentId);
  const syncMutation = useSyncServices();

  const targetEnvironments = environments.filter(
    (env) => env.id !== sourceEnvironment.id
  );

  const targetEnvironment = environments.find(
    (e) => e.id === targetEnvironmentId
  );

  const resetModal = () => {
    setCurrentStep(0);
    setTargetEnvironmentId("");
    setSelectedTargetInstances([]);
    setShowConfirmModal(false);
    setIsSyncing(false);
    if (closeTimeoutId) {
      clearTimeout(closeTimeoutId);
      setCloseTimeoutId(null);
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!targetEnvironmentId) {
        message.warning("Please select a target environment");
        return;
      }
      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (selectedTargetInstances.length === 0) {
        message.warning("Please select at least one target app instance");
        return;
      }
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSync = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmSync = async () => {
    setIsSyncing(true);
    try {
      const syncRequest: SyncServicesRequest = {
        sourceEnvironmentId: sourceEnvironment.id,
        targetEnvironmentId,
        serviceIds: selectedServices.map((s) => s.id),
        targetAppInstanceIds: selectedTargetInstances,
      };

      const result = await syncMutation.mutateAsync(syncRequest);

      if (result.status === "completed") {
        message.success("Services synchronized successfully!");
      } else if (result.status === "partial") {
        message.warning("Synchronization completed with some errors");
      } else {
        message.error("Synchronization failed");
      }

      setIsSyncing(false);
      setShowConfirmModal(false);

      // Close the main modal after a short delay to let user see the message
      const timeoutId = setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);

      setCloseTimeoutId(timeoutId);
    } catch (error: any) {
      setIsSyncing(false);
      setShowConfirmModal(false);

      message.error(
        error.response?.data?.message || "Failed to synchronize services"
      );
    }
  };

  const handleInstanceSelectionChange = (
    instanceId: string,
    checked: boolean
  ) => {
    if (checked) {
      setSelectedTargetInstances([...selectedTargetInstances, instanceId]);
    } else {
      setSelectedTargetInstances(
        selectedTargetInstances.filter((id) => id !== instanceId)
      );
    }
  };

  const handleSelectAllInstances = (checked: boolean) => {
    if (checked) {
      setSelectedTargetInstances(
        targetAppInstances?.map((instance) => instance.id) || []
      );
    } else {
      setSelectedTargetInstances([]);
    }
  };

  const steps = [
    {
      title: "Select Target",
      description: "Choose target environment",
    },
    {
      title: "Select Instances",
      description: "Choose target app instances",
    },
    {
      title: "Review & Sync",
      description: "Confirm and execute",
    },
  ];

  // Helper function to get readable cluster name
  const getClusterDisplayName = (cluster?: string) => {
    if (!cluster) return "Unknown";
    // Extract name from cluster ID (e.g., "c-local" -> "local", "c-dev" -> "dev")
    const match = cluster.match(/^(c\-\w+)$/);
    return match ? match[1] : cluster;
  };

  // Helper function to extract version from image tag (part after colon)
  const getImageVersion = (imageTag?: string) => {
    if (!imageTag) return "";
    const parts = imageTag.split(":");
    const version = parts.length > 1 ? parts[parts.length - 1] : imageTag;

    // Check if version is a hash (SHA1/MD5) and truncate to 7 characters
    const hashPattern = /^[a-fA-F0-9]{32,40}$/; // Matches 32-40 hex characters
    return hashPattern.test(version) ? version.substring(0, 7) : version;
  };

  return (
    <Modal
      title="Synchronize Services"
      open={open}
      onCancel={handleClose}
      width={960}
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
              Choose the environment where you want to synchronize the selected
              services.
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
            <Text strong className="block mb-2">
              Target Environment
            </Text>
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
              description={`You will synchronize ${selectedServices.length} services from ${sourceEnvironment.name} to ${environments.find((e) => e.id === targetEnvironmentId)?.name}.`}
              type="success"
              showIcon
            />
          )}
        </div>
      )}

      {/* Step 1: Select Target App Instances */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <Title level={4}>Select Target App Instances</Title>
            <Text className="text-gray-600">
              Choose all app instances where you want to deploy the services.
              Each service will be synchronized to all selected instances.
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Text strong>
                  Available App Instances ({targetAppInstances.length})
                </Text>
                <Checkbox
                  checked={
                    selectedTargetInstances.length === targetAppInstances.length
                  }
                  indeterminate={
                    selectedTargetInstances.length > 0 &&
                    selectedTargetInstances.length < targetAppInstances.length
                  }
                  onChange={(e) => handleSelectAllInstances(e.target.checked)}
                >
                  Select All
                </Checkbox>
              </div>

              <List
                dataSource={targetAppInstances}
                renderItem={(instance: AppInstance) => (
                  <List.Item className="border rounded p-3 bg-gray-50">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedTargetInstances.includes(
                            instance.id
                          )}
                          onChange={(e) =>
                            handleInstanceSelectionChange(
                              instance.id,
                              e.target.checked
                            )
                          }
                        />
                        <div>
                          <div className="font-medium">{instance.name}</div>
                          <div className="text-sm text-gray-600">
                            {getClusterDisplayName(instance.cluster)}/
                            {instance.namespace}
                          </div>
                        </div>
                      </div>
                      <Tag color="green">Active</Tag>
                    </div>
                  </List.Item>
                )}
              />

              {selectedTargetInstances.length > 0 && (
                <Alert
                  message={`${selectedTargetInstances.length} instance(s) selected`}
                  description={`Each of the ${selectedServices.length} services will be synchronized to all ${selectedTargetInstances.length} selected app instances.`}
                  type="info"
                  showIcon
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Review and Confirm */}
      {currentStep === 2 && targetEnvironment && (
        <div className="space-y-4">
          <div>
            <Title level={4}>Review Synchronization</Title>
            <Text className="text-gray-600">
              Please review the synchronization details before proceeding.
            </Text>
          </div>

          <SyncReviewContent
            selectedServices={selectedServices}
            sourceEnvironment={sourceEnvironment}
            targetEnvironment={targetEnvironment}
            selectedTargetInstancesCount={selectedTargetInstances.length}
            getClusterDisplayName={getClusterDisplayName}
            getImageVersion={getImageVersion}
          />
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between mt-6 pt-4 border-t">
        <Button onClick={currentStep === 0 ? handleClose : handleBack}>
          {currentStep === 0 ? "Cancel" : "Back"}
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
              loading={isSyncing}
              onClick={handleSync}
            >
              Synchronize Services
            </Button>
          )}
        </Space>
      </div>

      {showConfirmModal && targetEnvironment && (
        <Modal
          title="Confirm Synchronization"
          open={showConfirmModal}
          onCancel={() => !isSyncing && setShowConfirmModal(false)}
          width={800}
          closable={!isSyncing}
          maskClosable={!isSyncing}
          footer={[
            <Button
              key="cancel"
              onClick={() => setShowConfirmModal(false)}
              disabled={isSyncing}
            >
              Cancel
            </Button>,
            <Button
              key="confirm"
              type="primary"
              danger
              loading={isSyncing}
              onClick={handleConfirmSync}
            >
              Synchronize Services
            </Button>,
          ]}
        >
          <SyncReviewContent
            selectedServices={selectedServices}
            sourceEnvironment={sourceEnvironment}
            targetEnvironment={targetEnvironment}
            selectedTargetInstancesCount={selectedTargetInstances.length}
            getClusterDisplayName={getClusterDisplayName}
            getImageVersion={getImageVersion}
          />
        </Modal>
      )}
    </Modal>
  );
}
