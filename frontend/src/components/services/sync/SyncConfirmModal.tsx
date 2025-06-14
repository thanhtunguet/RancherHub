import Modal from "antd/es/modal";
import Button from "antd/es/button";
import type { Environment, Service } from "../../../types";
import { SyncReviewContent } from "../SyncReviewContent";

interface SyncConfirmModalProps {
  open: boolean;
  isSyncing: boolean;
  selectedServices: Service[];
  sourceEnvironment: Environment;
  targetEnvironment: Environment;
  selectedTargetInstancesCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SyncConfirmModal({
  open,
  isSyncing,
  selectedServices,
  sourceEnvironment,
  targetEnvironment,
  selectedTargetInstancesCount,
  onCancel,
  onConfirm,
}: SyncConfirmModalProps) {
  return (
    <Modal
      title="Confirm Synchronization"
      open={open}
      onCancel={() => !isSyncing && onCancel()}
      width={960}
      closable={!isSyncing}
      maskClosable={!isSyncing}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={isSyncing}>
          Cancel
        </Button>,
        <Button
          key="confirm"
          type="primary"
          danger
          loading={isSyncing}
          onClick={onConfirm}
        >
          Synchronize Services
        </Button>,
      ]}
    >
      <SyncReviewContent
        selectedServices={selectedServices}
        sourceEnvironment={sourceEnvironment}
        targetEnvironment={targetEnvironment}
        selectedTargetInstancesCount={selectedTargetInstancesCount}
      />
    </Modal>
  );
}
