import { Button, Input, Select, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { Environment, AppInstance } from "../../types";

const { Option } = Select;
const { Text } = Typography;

interface ServiceFiltersProps {
  // Environment filter
  environments: Environment[];
  effectiveEnvironmentId: string;
  onEnvironmentChange: (environmentId: string) => void;

  // App Instance filter
  appInstances: AppInstance[];
  selectedAppInstanceId: string;
  onAppInstanceChange: (appInstanceId: string) => void;

  // Search and status filters
  searchTerm: string;
  statusFilter: string;
  availableStatuses: string[];
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;

  // Select all functionality
  filteredServicesCount: number;
  selectedServicesCount: number;
  onSelectAll: () => void;
}

export function ServiceFilters({
  // Environment filter
  environments,
  effectiveEnvironmentId,
  onEnvironmentChange,

  // App Instance filter
  appInstances,
  selectedAppInstanceId,
  onAppInstanceChange,

  // Search and status filters
  searchTerm,
  statusFilter,
  availableStatuses,
  onSearchChange,
  onStatusFilterChange,

  // Select all functionality
  filteredServicesCount,
  selectedServicesCount,
  onSelectAll,
}: ServiceFiltersProps) {
  return (
    <div className="flex items-end gap-6 mb-4">
      {/* Environment Filter */}
      <div className="flex flex-col gap-1">
        <Text strong>Environment</Text>
        <Select
          placeholder="Select environment"
          value={effectiveEnvironmentId}
          onChange={onEnvironmentChange}
          className="w-48"
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

      {/* App Instance Filter */}
      {appInstances && appInstances.length > 0 && (
        <div className="flex flex-col gap-1">
          <Text strong>App Instance</Text>
          <Select
            placeholder="Filter by app instance"
            value={selectedAppInstanceId}
            onChange={onAppInstanceChange}
            className="w-64"
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
      )}

      {/* Search Filter */}
      <div className="flex flex-col gap-1">
        <Text strong>Search</Text>
        <Input
          placeholder="Search services..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-48"
        />
      </div>

      {/* Status Filter */}
      <div className="flex flex-col gap-1">
        <Text strong>Status</Text>
        <Select
          placeholder="Filter by status"
          value={statusFilter}
          onChange={onStatusFilterChange}
          className="w-40"
        >
          <Option value="all">All Statuses</Option>
          {availableStatuses.map((status) => (
            <Option key={status} value={status}>
              {status}
            </Option>
          ))}
        </Select>
      </div>

      {/* Select All Button */}
      <div className="flex flex-col gap-1">
        <Text strong>&nbsp;</Text>
        <Button onClick={onSelectAll} disabled={filteredServicesCount === 0}>
          {selectedServicesCount === filteredServicesCount
            ? "Deselect All"
            : "Select All"}
        </Button>
      </div>
    </div>
  );
}
