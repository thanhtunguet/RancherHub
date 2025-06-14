import { useState } from "react";
import Modal from "antd/es/modal";
import Steps from "antd/es/steps";
import App from "antd/es/app";
import type { Service, Environment } from "../../types";
import { useSyncModal } from "../../hooks/useSyncModal";
import { SyncTargetEnvironmentStep } from "./sync/SyncTargetEnvironmentStep";
import { SyncTargetInstancesStep } from "./sync/SyncTargetInstancesStep";
import { SyncReviewStep } from "./sync/SyncReviewStep";
import { SyncModalFooter } from "./sync/SyncModalFooter";
import { SyncConfirmModal } from "./sync/SyncConfirmModal";

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
  const [isClosing, setIsClosing] = useState(false);

  const {
    // State
    currentStep,
    targetEnvironmentId,
    selectedTargetInstances,
    showConfirmModal,
    isSyncing,
    targetAppInstances,
    targetEnvironments,
    targetEnvironment,
    
    // Actions
    setTargetEnvironmentId,
    resetModal,
    handleNext,
    handleBack,
    handleSync,
    handleConfirmSync,
    handleInstanceSelectionChange,
    handleSelectAllInstances,
    setShowConfirmModal,
  } = useSyncModal({
    selectedServices,
    sourceEnvironment,
    environments,
    onSuccess: () => {
      setIsClosing(true);
      onSuccess();
    },
  });

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

  const handleModalClose = () => {
    if (!isClosing) {
      resetModal();
      onClose();
    }
  };

  const handleNextWithValidation = () => {
    const result = handleNext();
    if (!result.success) {
      message.warning(result.message);
    }
  };

  const handleConfirmSyncWithMessage = async () => {
    const result = await handleConfirmSync();
    if (result.success) {
      message.success(result.message);
    } else {
      message.error(result.message);
    }
  };

  return (
    <Modal
      title="Synchronize Services"
      open={open}
      onCancel={handleModalClose}
      width={960}
      footer={null}
    >
      <div className="mb-6">
        <Steps current={currentStep} items={steps} />
      </div>

      {/* Step 0: Select Target Environment */}
      {currentStep === 0 && (
        <SyncTargetEnvironmentStep
          sourceEnvironment={sourceEnvironment}
          targetEnvironments={targetEnvironments}
          targetEnvironmentId={targetEnvironmentId}
          selectedServices={selectedServices}
          onTargetEnvironmentChange={setTargetEnvironmentId}
        />
      )}

      {/* Step 1: Select Target App Instances */}
      {currentStep === 1 && (
        <SyncTargetInstancesStep
          targetAppInstances={targetAppInstances}
          selectedTargetInstances={selectedTargetInstances}
          selectedServices={selectedServices}
          onInstanceSelectionChange={handleInstanceSelectionChange}
          onSelectAllInstances={handleSelectAllInstances}
        />
      )}

      {/* Step 2: Review and Confirm */}
      {currentStep === 2 && targetEnvironment && (
        <SyncReviewStep
          selectedServices={selectedServices}
          sourceEnvironment={sourceEnvironment}
          targetEnvironment={targetEnvironment}
          selectedTargetInstancesCount={selectedTargetInstances.length}
        />
      )}

      {/* Footer */}
      <SyncModalFooter
        currentStep={currentStep}
        isSyncing={isSyncing}
        onBack={handleBack}
        onNext={handleNextWithValidation}
        onSync={handleSync}
        onClose={handleModalClose}
      />

      {/* Confirmation Modal */}
      {showConfirmModal && targetEnvironment && (
        <SyncConfirmModal
          open={showConfirmModal}
          isSyncing={isSyncing}
          selectedServices={selectedServices}
          sourceEnvironment={sourceEnvironment}
          targetEnvironment={targetEnvironment}
          selectedTargetInstancesCount={selectedTargetInstances.length}
          onCancel={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmSyncWithMessage}
        />
      )}
    </Modal>
  );
}
