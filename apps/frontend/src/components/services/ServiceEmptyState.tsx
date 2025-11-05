import Empty from "antd/es/empty";
import { GitBranchIcon } from "lucide-react";

interface ServiceEmptyStateProps {
  searchTerm: string;
  statusFilter: string;
  selectedAppInstanceId: string;
  selectedAppInstanceName?: string;
}

export function ServiceEmptyState({
  searchTerm,
  statusFilter,
  selectedAppInstanceId,
  selectedAppInstanceName,
}: ServiceEmptyStateProps) {
  return (
    <Empty
      image={<GitBranchIcon size={64} className="mx-auto text-gray-400" />}
      description={
        <div className="text-center">
          <p className="text-gray-500 mb-2">
            {searchTerm || statusFilter !== "all"
              ? "No services match your filters"
              : selectedAppInstanceId === "all"
                ? "Select an app instance to view services"
                : `No services found in ${selectedAppInstanceName || "selected app instance"}`}
          </p>
          <p className="text-gray-400 text-sm">
            {!searchTerm &&
            statusFilter === "all" &&
            selectedAppInstanceId === "all"
              ? "Use the app instance tree above to select an app instance"
              : "Try adjusting your search or filter criteria"}
          </p>
        </div>
      }
    />
  );
}
