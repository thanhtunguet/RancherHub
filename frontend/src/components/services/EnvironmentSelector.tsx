import { Select, Typography } from "antd";
import type { Environment } from "../../types";

const { Text } = Typography;
const { Option } = Select;

interface EnvironmentSelectorProps {
  environments: Environment[];
  effectiveEnvironmentId: string;
  selectedEnvironmentId: string;
  onEnvironmentChange: (environmentId: string) => void;
}

export function EnvironmentSelector({
  environments,
  effectiveEnvironmentId,
  selectedEnvironmentId,
  onEnvironmentChange,
}: EnvironmentSelectorProps) {
  const selectedEnv = environments?.find(
    (e) => e.id === effectiveEnvironmentId
  );

  return (
    <div className="mb-6">
      <div className="flex items-center gap-4">
        <Text strong>Environment:</Text>
        <Select
          placeholder="Select environment to view services"
          value={effectiveEnvironmentId}
          onChange={onEnvironmentChange}
          className="w-64"
        >
          {environments.map((env) => (
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

      {selectedEnv && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: selectedEnv.color }}
            />
            <Text strong>Selected: {selectedEnv.name}</Text>
            {selectedEnv.description && (
              <Text className="text-gray-600">- {selectedEnv.description}</Text>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
