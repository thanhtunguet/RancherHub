import Select from "antd/es/select";
import Alert from "antd/es/alert";
import Typography from "antd/es/typography";
import Card from "antd/es/card";
import Tag from "antd/es/tag";
import type { Environment, Service } from "../../../types";

const { Title, Text } = Typography;
const { Option } = Select;

interface SyncTargetEnvironmentStepProps {
  sourceEnvironment: Environment;
  targetEnvironments: Environment[];
  targetEnvironmentId: string;
  selectedServices: Service[];
  onTargetEnvironmentChange: (environmentId: string) => void;
}

export function SyncTargetEnvironmentStep({
  sourceEnvironment,
  targetEnvironments,
  targetEnvironmentId,
  selectedServices,
  onTargetEnvironmentChange,
}: SyncTargetEnvironmentStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <Title level={4}>Select Target Environment</Title>
        <Text className="text-gray-600">
          Choose the environment where you want to synchronize the selected
          services.
        </Text>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <Text strong>Source Environment</Text>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: sourceEnvironment.color }}
              />
              <span className="font-medium">{sourceEnvironment.name}</span>
              <Tag color="blue">{selectedServices.length} services</Tag>
            </div>
          </div>
        </div>
      </Card>

      <div>
        <Text strong className="block mb-2">
          Target Environment
        </Text>
        <Select
          placeholder="Select target environment"
          value={targetEnvironmentId}
          onChange={onTargetEnvironmentChange}
          className="w-full"
          size="large"
        >
          {targetEnvironments.map((env) => (
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

      {targetEnvironmentId && (
        <Alert
          message="Ready to Proceed"
          description={`You will synchronize ${selectedServices.length} services from ${sourceEnvironment.name} to ${targetEnvironments.find((e) => e.id === targetEnvironmentId)?.name}.`}
          type="success"
          showIcon
        />
      )}
    </div>
  );
}
