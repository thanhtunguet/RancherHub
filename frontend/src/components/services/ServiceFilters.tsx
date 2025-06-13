import { Button, Input, Select } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Option } = Select;

interface ServiceFiltersProps {
  searchTerm: string;
  statusFilter: string;
  availableStatuses: string[];
  filteredServicesCount: number;
  selectedServicesCount: number;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSelectAll: () => void;
}

export function ServiceFilters({
  searchTerm,
  statusFilter,
  availableStatuses,
  filteredServicesCount,
  selectedServicesCount,
  onSearchChange,
  onStatusFilterChange,
  onSelectAll,
}: ServiceFiltersProps) {
  return (
    <div className="flex items-center gap-4 mb-4">
      <Input
        placeholder="Search services..."
        prefix={<SearchOutlined />}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-64"
      />

      <Select
        placeholder="Filter by status"
        value={statusFilter}
        onChange={onStatusFilterChange}
        className="w-48"
      >
        <Option value="all">All Statuses</Option>
        {availableStatuses.map((status) => (
          <Option key={status} value={status}>
            {status}
          </Option>
        ))}
      </Select>

      <Button onClick={onSelectAll} disabled={filteredServicesCount === 0}>
        {selectedServicesCount === filteredServicesCount
          ? "Deselect All"
          : "Select All"}
      </Button>
    </div>
  );
}
