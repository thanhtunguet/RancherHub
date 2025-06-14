import { Alert } from "antd";

export function SyncWarningAlert() {
  return (
    <Alert
      message="Warning"
      description="This action will update image tags in the target environment. Make sure you understand the impact of bulk synchronization."
      type="warning"
      showIcon
    />
  );
}