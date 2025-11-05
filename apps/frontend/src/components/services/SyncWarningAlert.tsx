import Alert from "antd/es/alert";

export function SyncWarningAlert() {
  return (
    <Alert
      message="⚠️ Critical System Operation"
      description={
        <div>
          <p><strong>This action will permanently modify the target environment and cannot be undone.</strong></p>
          <p>Changes include:</p>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Image tags will be updated in target deployments</li>
            <li>Running pods may be recreated with new images</li>
            <li>Service downtime may occur during the update process</li>
            <li>Any manual configurations in target environment may be overwritten</li>
          </ul>
          <p><strong>Please verify all target instances and service configurations before proceeding.</strong></p>
        </div>
      }
      type="error"
      showIcon
    />
  );
}
