import Alert from "antd/es/alert";
import Typography from "antd/es/typography";
import Checkbox from "antd/es/checkbox";
import List from "antd/es/list";
import Tag from "antd/es/tag";
import type { AppInstance, Service } from "../../../types";
import { getClusterDisplayName } from "../../../utils/displayUtils";

const { Title, Text } = Typography;

interface SyncTargetInstancesStepProps {
  targetAppInstances?: AppInstance[];
  selectedTargetInstances: string[];
  selectedServices: Service[];
  onInstanceSelectionChange: (instanceId: string, checked: boolean) => void;
  onSelectAllInstances: (checked: boolean) => void;
}

export function SyncTargetInstancesStep({
  targetAppInstances,
  selectedTargetInstances,
  selectedServices,
  onInstanceSelectionChange,
  onSelectAllInstances,
}: SyncTargetInstancesStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <Title level={4}>Select Target App Instances</Title>
        <Text className="text-gray-600">
          Choose all app instances where you want to deploy the services. Each
          service will be synchronized to all selected instances.
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
              onChange={(e) => onSelectAllInstances(e.target.checked)}
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
                      checked={selectedTargetInstances.includes(instance.id)}
                      onChange={(e) =>
                        onInstanceSelectionChange(instance.id, e.target.checked)
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
  );
}
