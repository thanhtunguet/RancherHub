import Typography from "antd/es/typography";
import type { Environment } from "../../types";

const { Text } = Typography;

interface SyncEnvironmentDetailsProps {
  sourceEnvironment: Environment;
  targetEnvironment: Environment;
}

export function SyncEnvironmentDetails({
  sourceEnvironment,
  targetEnvironment,
}: SyncEnvironmentDetailsProps) {
  return (
    <div className="bg-gray-50 p-4 rounded">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Text strong className="text-sm">
            Source Environment
          </Text>
          <div className="flex items-center gap-2 mt-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: sourceEnvironment.color }}
            />
            <span className="font-medium">{sourceEnvironment.name}</span>
          </div>
        </div>
        <div>
          <Text strong className="text-sm">
            Target Environment
          </Text>
          <div className="flex items-center gap-2 mt-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: targetEnvironment.color }}
            />
            <span className="font-medium">{targetEnvironment.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
