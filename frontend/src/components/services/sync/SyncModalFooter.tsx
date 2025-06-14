import Button from "antd/es/button";
import Space from "antd/es/space";

interface SyncModalFooterProps {
  currentStep: number;
  isSyncing: boolean;
  onBack: () => void;
  onNext: () => void;
  onSync: () => void;
  onClose: () => void;
}

export function SyncModalFooter({
  currentStep,
  isSyncing,
  onBack,
  onNext,
  onSync,
  onClose,
}: SyncModalFooterProps) {
  return (
    <div className="flex justify-between mt-6 pt-4 border-t">
      <Button onClick={currentStep === 0 ? onClose : onBack}>
        {currentStep === 0 ? "Cancel" : "Back"}
      </Button>

      <Space>
        {currentStep < 2 ? (
          <Button type="primary" onClick={onNext}>
            Next
          </Button>
        ) : (
          <Button type="primary" danger loading={isSyncing} onClick={onSync}>
            Synchronize Services
          </Button>
        )}
      </Space>
    </div>
  );
}
