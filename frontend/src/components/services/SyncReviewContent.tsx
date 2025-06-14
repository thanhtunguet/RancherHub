import type { Service, Environment } from "../../types";
import { SyncEnvironmentDetails } from "./SyncEnvironmentDetails";
import { SyncOperationSummary } from "./SyncOperationSummary";
import { SyncServicesTable } from "./SyncServicesTable";
import { SyncWarningAlert } from "./SyncWarningAlert";

interface SyncReviewContentProps {
  selectedServices: Service[];
  sourceEnvironment: Environment;
  targetEnvironment: Environment;
  selectedTargetInstancesCount: number;
  getClusterDisplayName: (cluster?: string) => string;
  getImageVersion: (imageTag?: string) => string;
}

export function SyncReviewContent({
  selectedServices,
  sourceEnvironment,
  targetEnvironment,
  selectedTargetInstancesCount,
  getClusterDisplayName,
  getImageVersion,
}: SyncReviewContentProps) {
  return (
    <div className="space-y-4">
      <SyncEnvironmentDetails
        sourceEnvironment={sourceEnvironment}
        targetEnvironment={targetEnvironment}
      />

      <SyncOperationSummary
        serviceCount={selectedServices.length}
        targetInstanceCount={selectedTargetInstancesCount}
      />

      <SyncServicesTable
        selectedServices={selectedServices}
        targetInstanceCount={selectedTargetInstancesCount}
        getClusterDisplayName={getClusterDisplayName}
        getImageVersion={getImageVersion}
      />

      <SyncWarningAlert />
    </div>
  );
}