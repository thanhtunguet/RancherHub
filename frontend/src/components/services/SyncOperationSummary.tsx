import { Typography } from "antd";

const { Text } = Typography;

interface SyncOperationSummaryProps {
  serviceCount: number;
  targetInstanceCount: number;
}

export function SyncOperationSummary({
  serviceCount,
  targetInstanceCount,
}: SyncOperationSummaryProps) {
  return (
    <div className="bg-blue-50 p-4 rounded">
      <Text strong className="block mb-2">
        Operation Summary
      </Text>
      <div className="flex justify-between items-center">
        <div className="text-center justify-center flex-grow">
          <span className="text-2xl font-bold text-blue-600 text-center">
            {serviceCount}
          </span>
          <div className="text-sm text-gray-600">Services</div>
        </div>
        <div className="text-center justify-center flex-grow">
          <span className="text-2xl font-bold text-green-600 text-center">
            {targetInstanceCount}
          </span>
          <div className="text-sm text-gray-600">Target Instances</div>
        </div>
        <div className="text-center justify-center flex-grow">
          <span className="text-2xl font-bold text-orange-600 text-center">
            {serviceCount * targetInstanceCount}
          </span>
          <div className="text-sm text-gray-600">Total Operations</div>
        </div>
      </div>
    </div>
  );
}
