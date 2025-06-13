import { Select, Typography } from "antd";
import type { AppInstance } from "../../types";

const { Text } = Typography;
const { Option } = Select;

interface AppInstanceFilterProps {
  appInstances: AppInstance[];
  selectedAppInstanceId: string;
  onAppInstanceChange: (appInstanceId: string) => void;
}

export function AppInstanceFilter({
  appInstances,
  selectedAppInstanceId,
  onAppInstanceChange,
}: AppInstanceFilterProps) {
  const selectedAppInstance = appInstances?.find(
    (a) => a.id === selectedAppInstanceId
  );

  if (!appInstances || appInstances.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-4">
        <Text strong>App Instance:</Text>
        <Select
          placeholder="Filter by app instance"
          value={selectedAppInstanceId}
          onChange={onAppInstanceChange}
          className="w-80"
        >
          <Option value="all">All App Instances</Option>
          {appInstances.map((appInstance) => (
            <Option key={appInstance.id} value={appInstance.id}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{appInstance.name}</span>
                <span className="text-sm text-gray-500">
                  ({appInstance.cluster}/{appInstance.namespace})
                </span>
              </div>
            </Option>
          ))}
        </Select>
      </div>

      {selectedAppInstance && selectedAppInstanceId !== "all" && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Text strong>Filtered by: {selectedAppInstance.name}</Text>
            <Text className="text-gray-600">
              ({selectedAppInstance.cluster}/{selectedAppInstance.namespace})
            </Text>
          </div>
        </div>
      )}
    </div>
  );
}
