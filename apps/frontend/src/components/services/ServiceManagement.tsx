import { useMemo } from "react";
import Alert from "antd/es/alert";
import Button from "antd/es/button";
import Input from "antd/es/input";
import Select from "antd/es/select";
import Spin from "antd/es/spin";
import Tabs from "antd/es/tabs";
import TreeSelect from "antd/es/tree-select";
import Typography from "antd/es/typography";
import { RefreshCwIcon, GitBranchIcon, GitCompareIcon } from "lucide-react";
import { SyncModal } from "./SyncModal";
import { ServiceHeader } from "./ServiceHeader";
import { ServiceStats } from "./ServiceStats";
import { ServiceTable } from "./ServiceTable";
import { ServiceEmptyState } from "./ServiceEmptyState";
import { SyncHistoryModal } from "./SyncHistoryModal";
import { ServiceComparison } from "./ServiceComparison";
import { useServiceManagement } from "../../hooks/useServiceManagement";
import { formatAppInstanceDisplay } from "../../utils/displayUtils";

const { Option } = Select;
const { Text } = Typography;

export function ServiceManagement() {
  const {
    // State
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    selectedAppInstanceId,
    selectedServices,
    showSyncModal,
    setShowSyncModal,
    showHistory,
    setShowHistory,
    effectiveEnvironmentId,

    // Data
    environments,
    services,
    filteredServices,
    appInstances,
    allAppInstances,
    selectedEnv,
    selectedAppInstance,
    availableStatuses,

    // Loading states
    isInitialLoading,
    isLoadingServices,
    error,

    // Handlers
    handleServiceSelectionChange,
    handleSelectAll,
    handleSync,
    handleRefresh,
    handleAppInstanceChange,
  } = useServiceManagement();


  // Create tree data for app instance selection
  const treeData = useMemo(() => {
    if (!environments || !allAppInstances) return [];
    
    return environments.map(env => ({
      title: env.name,
      value: `env-${env.id}`,
      disabled: true, // Environment nodes are not selectable
      children: allAppInstances
        .filter(instance => instance.environmentId === env.id)
        .map(instance => ({
          title: formatAppInstanceDisplay(instance.name, instance.cluster, instance.namespace),
          value: instance.id,
        }))
    })).filter(env => env.children && env.children.length > 0);
  }, [environments, allAppInstances]);

  if (!environments || environments.length === 0) {
    return (
      <div className="p-6">
        <Alert
          message="No Environments Found"
          description="You need to create environments before you can view services."
          type="info"
          showIcon
          action={
            <Button type="primary" href="/environments">
              Create Environment
            </Button>
          }
        />
      </div>
    );
  }

  if (isInitialLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert
          message="Error Loading Services"
          description={`There was an error loading services: ${(error as any)?.message || "Unknown error"}`}
          type="error"
          showIcon
          action={
            <Button onClick={handleRefresh}>
              <RefreshCwIcon size={16} />
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const tabItems = [
    {
      key: "1",
      label: (
        <span className="flex items-center space-x-2">
          <GitBranchIcon size={16} />
          <span>Service Management</span>
        </span>
      ),
      children: (
        <>
          {/* Header */}
          <div className="mb-6">
            <ServiceHeader
              selectedServicesCount={selectedServices.length}
              effectiveEnvironmentId={effectiveEnvironmentId}
              onShowHistory={() => setShowHistory(true)}
              onRefresh={handleRefresh}
              onSync={handleSync}
            />

            {/* Filters and Controls Row */}
            <div className="flex items-end gap-3 mb-4 flex-wrap">
              {/* App Instance Tree Selector */}
              <div className="flex flex-col gap-1 flex-1 min-w-[250px]">
                <Text strong>App Instance</Text>
                <TreeSelect
                  className="w-full"
                  placeholder="Select an app instance"
                  value={selectedAppInstanceId === "all" ? undefined : selectedAppInstanceId}
                  onChange={(value) => {
                    handleAppInstanceChange(value || "all");
                  }}
                  treeData={treeData}
                  loading={!environments || !allAppInstances}
                  showSearch
                  filterTreeNode={(search, node) => {
                    if (typeof node.title === 'string') {
                      return node.title.toLowerCase().includes(search.toLowerCase());
                    }
                    return false;
                  }}
                  treeDefaultExpandAll
                  allowClear
                />
              </div>

              {/* Search Filter */}
              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <Text strong>Search</Text>
                <Input
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  allowClear
                />
              </div>

              {/* Status Filter */}
              <div className="flex flex-col gap-1 w-40">
                <Text strong>Status</Text>
                <Select
                  placeholder="Filter by status"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  className="w-full"
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
                <Button onClick={handleSelectAll} disabled={filteredServices.length === 0}>
                  {selectedServices.length === filteredServices.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>
            </div>

            {/* Stats */}
            {services && services.length > 0 && (
              <ServiceStats
                services={services || []}
                filteredServices={filteredServices}
                selectedServices={selectedServices}
                appInstances={appInstances || []}
              />
            )}
          </div>

          {/* Services Table */}
          {isLoadingServices ? (
            <div className="flex justify-center items-center h-64">
              <Spin size="large" />
            </div>
          ) : filteredServices.length > 0 ? (
            <ServiceTable
              filteredServices={filteredServices}
              selectedServices={selectedServices}
              onServiceSelectionChange={handleServiceSelectionChange}
            />
          ) : (
            <ServiceEmptyState
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              selectedAppInstanceId={selectedAppInstanceId}
              selectedAppInstanceName={selectedAppInstance?.name}
            />
          )}
        </>
      ),
    },
    {
      key: "2",
      label: (
        <span className="flex items-center space-x-2">
          <GitCompareIcon size={16} />
          <span>Service Diffs</span>
        </span>
      ),
      children: <ServiceComparison />,
    },
  ];

  return (
    <div className="p-6">
      <Tabs defaultActiveKey="1" items={tabItems} />

      {/* Sync Modal */}
      {showSyncModal && selectedEnv && (
        <SyncModal
          open={showSyncModal}
          onClose={() => setShowSyncModal(false)}
          selectedServices={selectedServices}
          sourceEnvironment={selectedEnv}
          environments={environments || []}
          onSuccess={() => {
            setShowSyncModal(false);
          }}
        />
      )}

      {/* Sync History Modal */}
      <SyncHistoryModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
}
