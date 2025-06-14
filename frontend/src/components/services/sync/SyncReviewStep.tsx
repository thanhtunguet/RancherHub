import Typography from "antd/es/typography";
import type { Environment, Service } from "../../../types";
import { SyncReviewContent } from "../SyncReviewContent";

const { Title, Text } = Typography;

interface SyncReviewStepProps {
  selectedServices: Service[];
  sourceEnvironment: Environment;
  targetEnvironment: Environment;
  selectedTargetInstancesCount: number;
}

export function SyncReviewStep({
  selectedServices,
  sourceEnvironment,
  targetEnvironment,
  selectedTargetInstancesCount,
}: SyncReviewStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <Title level={4}>Review Synchronization</Title>
        <Text className="text-gray-600">
          Please review the synchronization details before proceeding.
        </Text>
      </div>

      <SyncReviewContent
        selectedServices={selectedServices}
        sourceEnvironment={sourceEnvironment}
        targetEnvironment={targetEnvironment}
        selectedTargetInstancesCount={selectedTargetInstancesCount}
      />
    </div>
  );
}
