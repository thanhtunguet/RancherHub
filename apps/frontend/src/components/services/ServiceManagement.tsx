import Alert from "antd/es/alert";
import Button from "antd/es/button";
import Spin from "antd/es/spin";
import Tabs from "antd/es/tabs";
import { RefreshCwIcon, GitBranchIcon, GitCompareIcon, DatabaseIcon } from "lucide-react";
import { SyncModal } from "./SyncModal";
import { ServiceHeader } from "./ServiceHeader";
import { ServiceFilters } from "./ServiceFilters";
import { ServiceStats } from "./ServiceStats";
import { ServiceTable } from "./ServiceTable";
import { ServiceEmptyState } from "./ServiceEmptyState";
import { SyncHistoryModal } from "./SyncHistoryModal";
import { ServiceComparison } from "./ServiceComparison";
import ConfigMapComparison from "../configmaps/ConfigMapComparison";
import { StorageView } from "./StorageView";
import { useServiceManagement } from "../../hooks/useServiceManagement";

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
    selectedEnv,
    selectedAppInstance,
    availableStatuses,

    // Loading states
    isLoading,
    error,

    // Handlers
    handleServiceSelectionChange,
    handleSelectAll,
    handleSync,
    handleRefresh,
    handleEnvironmentChange,
    handleAppInstanceChange,
  } = useServiceManagement();

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

  if (isLoading) {
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

            {!effectiveEnvironmentId ? (
              <Alert
                message="Select Environment"
                description="Please select an environment to view and manage services."
                type="info"
                showIcon
              />
            ) : (
              <>
                {/* Combined Filters */}
                <ServiceFilters
                  // Environment filter
                  environments={environments}
                  effectiveEnvironmentId={effectiveEnvironmentId}
                  onEnvironmentChange={handleEnvironmentChange}
                  // App Instance filter
                  appInstances={appInstances || []}
                  selectedAppInstanceId={selectedAppInstanceId}
                  onAppInstanceChange={handleAppInstanceChange}
                  // Search and status filters
                  searchTerm={searchTerm}
                  statusFilter={statusFilter}
                  availableStatuses={availableStatuses}
                  onSearchChange={setSearchTerm}
                  onStatusFilterChange={setStatusFilter}
                  // Select all functionality
                  filteredServicesCount={filteredServices.length}
                  selectedServicesCount={selectedServices.length}
                  onSelectAll={handleSelectAll}
                />

                {/* Stats */}
                <ServiceStats
                  services={services || []}
                  filteredServices={filteredServices}
                  selectedServices={selectedServices}
                  appInstances={appInstances || []}
                />
              </>
            )}
          </div>

          {/* Services Table */}
          {!effectiveEnvironmentId ? null : filteredServices.length > 0 ? (
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
              selectedEnvironmentName={selectedEnv?.name}
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
    {
      key: "3",
      label: (
        <span className="flex items-center space-x-2">
          <GitCompareIcon size={16} />
          <span>ConfigMap Diffs</span>
        </span>
      ),
      children: <ConfigMapComparison />,
    },
    {
      key: "4",
      label: (
        <span className="flex items-center space-x-2">
          <DatabaseIcon size={16} />
          <span>Storage View</span>
        </span>
      ),
      children: <StorageView />,
    },
  ];

  return (
    <div className="p-6">
      <Tabs defaultActiveKey="1" items={tabItems} />

      {/* Sync Modal */}
      <SyncModal
        open={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        selectedServices={selectedServices}
        sourceEnvironment={selectedEnv!}
        environments={environments || []}
        onSuccess={() => {
          setShowSyncModal(false);
        }}
      />

      {/* Sync History Modal */}
      <SyncHistoryModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
}
