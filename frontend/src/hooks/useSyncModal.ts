import { useState } from "react";
import { useAppInstancesByEnvironment } from "./useAppInstances";
import { useSyncServices } from "./useServices";
import type { Service, Environment, SyncServicesRequest } from "../types";

interface UseSyncModalProps {
  selectedServices: Service[];
  sourceEnvironment: Environment;
  environments: Environment[];
  onSuccess: () => void;
}

export function useSyncModal({
  selectedServices,
  sourceEnvironment,
  environments,
  onSuccess,
}: UseSyncModalProps) {
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
    onSuccess();
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!targetEnvironmentId) {
        return {
          success: false,
          message: "Please select a target environment",
        };
      }
      setCurrentStep(1);
      return { success: true };
    } else if (currentStep === 1) {
      if (selectedTargetInstances.length === 0) {
        return {
          success: false,
          message: "Please select at least one target app instance",
        };
      }
      setCurrentStep(2);
      return { success: true };
    }
    return { success: true };
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

      setIsSyncing(false);
      setShowConfirmModal(false);

      // Close the main modal after a short delay to let user see the message
      const timeoutId = setTimeout(() => {
        handleClose();
      }, 1500);

      setCloseTimeoutId(timeoutId);

      return {
        success: true,
        status: result.status,
        message:
          result.status === "completed"
            ? "Services synchronized successfully!"
            : result.status === "partial"
              ? "Synchronization completed with some errors"
              : "Synchronization failed",
      };
    } catch (error: any) {
      setIsSyncing(false);
      setShowConfirmModal(false);

      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to synchronize services",
      };
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

  return {
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
    handleClose,
    handleNext,
    handleBack,
    handleSync,
    handleConfirmSync,
    handleInstanceSelectionChange,
    handleSelectAllInstances,
    setShowConfirmModal,
  };
}
