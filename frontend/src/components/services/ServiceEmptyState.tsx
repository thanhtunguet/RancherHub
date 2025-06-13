import { Empty } from "antd";
import { GitBranchIcon } from "lucide-react";

interface ServiceEmptyStateProps {
  searchTerm: string;
  statusFilter: string;
  selectedAppInstanceId: string;
  selectedAppInstanceName?: string;
  selectedEnvironmentName?: string;
}

export function ServiceEmptyState({
  searchTerm,
  statusFilter,
  selectedAppInstanceId,
  selectedAppInstanceName,
  selectedEnvironmentName,
}: ServiceEmptyStateProps) {
  return (
    <Empty
      image={<GitBranchIcon size={64} className="mx-auto text-gray-400" />}
      description={
        <div className="text-center">
          <p className="text-gray-500 mb-2">
            {searchTerm || statusFilter !== "all"
              ? "No services match your filters"
              : selectedAppInstanceId !== "all"
                ? `No services found in ${selectedAppInstanceName || "selected app instance"}`
                : `No services found in ${selectedEnvironmentName || "selected environment"}`}
          </p>
          <p className="text-gray-400 text-sm">
            {!searchTerm &&
            statusFilter === "all" &&
            selectedAppInstanceId === "all"
              ? "Make sure you have app instances configured for this environment"
              : "Try adjusting your search or filter criteria"}
          </p>
        </div>
      }
    />
  );
}
