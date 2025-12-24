import { useMemo, useState } from "react";
import Alert from "antd/es/alert";
import Button from "antd/es/button";
import Input from "antd/es/input";
import Spin from "antd/es/spin";
import TreeSelect from "antd/es/tree-select";
import Typography from "antd/es/typography";
import { RefreshCwIcon, GitBranchIcon } from "lucide-react";
import { HistoryOutlined, SyncOutlined } from "@ant-design/icons";
import Space from "antd/es/space";
import { SyncModal } from "./SyncModal";
import { ServiceStats } from "./ServiceStats";
import { ServiceTable } from "./ServiceTable";
import { ServiceEmptyState } from "./ServiceEmptyState";
import { SyncHistoryModal } from "./SyncHistoryModal";
import { ServiceComparison } from "./ServiceComparison";
import { useServiceManagement } from "../../hooks/useServiceManagement";
import { formatAppInstanceDisplay } from "../../utils/displayUtils";

const { Text } = Typography;

export function ServiceManagement() {
  const {
    // State
    searchTerm,
    setSearchTerm,
    statusFilter,
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

    // Loading states
    isInitialLoading,
    isLoadingServices,
    error,

    // Handlers
    handleServiceSelectionChange,
    handleSync,
    handleRefresh,
    handleAppInstanceChange,
  } = useServiceManagement();

  // State for second app instance (for comparison)
  const [secondAppInstanceId, setSecondAppInstanceId] = useState<string | undefined>();

  // Determine which view to show
  const isComparisonMode = !!selectedAppInstanceId && selectedAppInstanceId !== "all" && !!secondAppInstanceId;

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

  // Create tree data for second selector (exclude first selected instance)
  const secondTreeData = useMemo(() => {
    if (!selectedAppInstanceId || selectedAppInstanceId === "all") return treeData;
    
    return treeData.map(env => ({
      ...env,
      children: env.children?.filter(instance => instance.value !== selectedAppInstanceId)
    })).filter(env => env.children && env.children.length > 0);
  }, [treeData, selectedAppInstanceId]);

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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <GitBranchIcon size={24} className="text-blue-500" />
          <div>
            <Typography.Title level={3} className="mb-1">
              Services
            </Typography.Title>
            <Text className="text-gray-600">
              View and manage services across your environments
            </Text>
          </div>
        </div>

        {/* App Instance Selectors and Controls */}
        <div className="flex items-end gap-3 mb-4 flex-wrap">
          {/* First App Instance Selector */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <Text strong>First App Instance</Text>
            <TreeSelect
              className="w-full"
              placeholder="Select first app instance"
              value={selectedAppInstanceId === "all" ? undefined : selectedAppInstanceId}
              onChange={(value) => {
                handleAppInstanceChange(value || "all");
                // Reset second selector if needed
                if (value === secondAppInstanceId) {
                  setSecondAppInstanceId(undefined);
                }
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

          {/* Second App Instance Selector */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <Text strong>Second App Instance (Optional - for comparison)</Text>
            <TreeSelect
              className="w-full"
              placeholder="Select second app instance to compare"
              value={secondAppInstanceId}
              onChange={setSecondAppInstanceId}
              treeData={secondTreeData}
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
              disabled={!selectedAppInstanceId || selectedAppInstanceId === "all"}
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

          {/* Action Buttons */}
          <div className="flex flex-col gap-1">
            <Text strong>&nbsp;</Text>
            <Space>
              <Button
                icon={<HistoryOutlined />}
                onClick={() => setShowHistory(true)}
                disabled={!effectiveEnvironmentId}
              >
                Sync History
              </Button>
              <Button
                icon={<RefreshCwIcon size={16} />}
                onClick={handleRefresh}
                disabled={!effectiveEnvironmentId}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<SyncOutlined />}
                disabled={selectedServices.length === 0}
                onClick={handleSync}
              >
                Sync Selected ({selectedServices.length})
              </Button>
            </Space>
          </div>
        </div>

        {/* Show Services View or Comparison View */}
        {!isComparisonMode ? (
          <>
            {/* Stats */}
            {services && services.length > 0 && (
              <ServiceStats
                services={services || []}
                filteredServices={filteredServices}
                selectedServices={selectedServices}
                appInstances={appInstances || []}
              />
            )}

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
        ) : (
          <>
            {/* Service Comparison View */}
            <ServiceComparison
              initialSourceInstance={selectedAppInstanceId}
              initialTargetInstance={secondAppInstanceId}
            />
          </>
        )}
      </div>

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
