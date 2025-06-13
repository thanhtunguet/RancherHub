import { useState, useMemo, useEffect } from "react";
import {
  Button,
  Row,
  Col,
  Input,
  Select,
  Space,
  Typography,
  Alert,
  Spin,
  Empty,
  Modal,
  Card,
  message,
  Table,
  Badge,
} from "antd";
import {
  SearchOutlined,
  SyncOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { RefreshCwIcon, GitBranchIcon } from "lucide-react";
import { ServiceCard } from "./ServiceCard";
import { SyncModal } from "./SyncModal";
import {
  useServices,
  useServicesByAppInstance,
  useSyncHistory,
  useWorkloadTypes,
} from "../../hooks/useServices";
import { useEnvironments } from "../../hooks/useEnvironments";
import { useAppInstancesByEnvironment } from "../../hooks/useAppInstances";
import { useAppStore } from "../../stores/useAppStore";
import { servicesApi } from "../../services/api";
import type { Service } from "../../types";
import { CheckCircleTwoTone, CloseCircleTwoTone, ExclamationCircleTwoTone, SyncOutlined as SyncIcon } from "@ant-design/icons";

const { Title, Text } = Typography;
const { Option } = Select;

export function ServiceManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [workloadTypeFilter, setWorkloadTypeFilter] = useState<string>("all");
  const [selectedAppInstanceId, setSelectedAppInstanceId] =
    useState<string>("all");
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedEnvironmentId, setSelectedEnvironmentId] =
    useState<string>("");

  const { selectedEnvironment } = useAppStore();
  const { data: environments } = useEnvironments();

  // Use the selected environment from global state as default, or allow manual selection
  const effectiveEnvironmentId =
    selectedEnvironmentId || selectedEnvironment?.id || "";

  // Prepare filters for API calls - only include non-default values
  const apiFilters = {
    ...(workloadTypeFilter !== "all" && { type: workloadTypeFilter }),
    ...(searchTerm && { search: searchTerm }),
  };

  // Use different hooks based on whether we're filtering by app instance or not
  const {
    data: servicesByEnvironment,
    isLoading: isLoadingByEnvironment,
    error: errorByEnvironment,
    refetch: refetchByEnvironment,
  } = useServices(effectiveEnvironmentId, apiFilters);

  const {
    data: servicesByAppInstance,
    isLoading: isLoadingByAppInstance,
    error: errorByAppInstance,
    refetch: refetchByAppInstance,
  } = useServicesByAppInstance(
    selectedAppInstanceId === "all" ? undefined : selectedAppInstanceId,
    apiFilters
  );

  // Get available workload types for the current environment
  const { data: workloadTypesData } = useWorkloadTypes(effectiveEnvironmentId);

  const { data: appInstances } = useAppInstancesByEnvironment(
    effectiveEnvironmentId
  );
  const { data: syncHistory, isLoading: historyLoading } = useSyncHistory(
    effectiveEnvironmentId
  );

  // Determine which data and loading states to use
  const services =
    selectedAppInstanceId === "all"
      ? servicesByEnvironment
      : servicesByAppInstance;
  const isLoading =
    selectedAppInstanceId === "all"
      ? isLoadingByEnvironment
      : isLoadingByAppInstance;
  const error =
    selectedAppInstanceId === "all" ? errorByEnvironment : errorByAppInstance;
  const refetch =
    selectedAppInstanceId === "all"
      ? refetchByEnvironment
      : refetchByAppInstance;

  // Debug logging
  console.log("ServiceManagement Debug:", {
    effectiveEnvironmentId,
    selectedAppInstanceId,
    services,
    isLoading,
    error,
    appInstances,
    servicesByEnvironment,
    servicesByAppInstance,
  });

  // Force refetch when environment changes
  useEffect(() => {
    if (effectiveEnvironmentId) {
      console.log(
        "ServiceManagement: Environment changed, refetching services for:",
        effectiveEnvironmentId
      );
      if (selectedAppInstanceId === "all") {
        refetchByEnvironment();
      } else {
        refetchByAppInstance();
      }
    }
  }, [
    effectiveEnvironmentId,
    selectedAppInstanceId,
    refetchByEnvironment,
    refetchByAppInstance,
  ]);

  // Filter services based on status only (search and workload type are handled by backend)
  const filteredServices = useMemo(() => {
    if (!services) return [];

    return services.filter((service) => {
      const matchesStatus =
        statusFilter === "all" ||
        service.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesStatus;
    });
  }, [services, statusFilter]);

  // Get unique statuses for filter
  const availableStatuses = useMemo(() => {
    if (!services) return [];

    const statuses = [...new Set(services.map((s) => s.status))];
    return statuses.sort();
  }, [services]);

  const handleServiceSelect = (service: Service) => {
    setSelectedServices((prev) => {
      const isSelected = prev.some((s) => s.id === service.id);
      if (isSelected) {
        return prev.filter((s) => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedServices.length === filteredServices.length) {
      setSelectedServices([]);
    } else {
      setSelectedServices([...filteredServices]);
    }
  };

  const handleSync = () => {
    if (selectedServices.length === 0) {
      return;
    }
    setShowSyncModal(true);
  };

  const handleRefresh = () => {
    console.log(
      "ServiceManagement: Manual refresh triggered for environment:",
      effectiveEnvironmentId,
      "app instance:",
      selectedAppInstanceId
    );
    if (selectedAppInstanceId === "all") {
      refetchByEnvironment();
    } else {
      refetchByAppInstance();
    }
  };

  const handleEnvironmentChange = (environmentId: string) => {
    console.log("ServiceManagement: Environment changed to:", environmentId);
    setSelectedEnvironmentId(environmentId);
    setSelectedAppInstanceId("all"); // Reset app instance filter
    setSelectedServices([]); // Clear selected services when changing environment
  };

  const handleAppInstanceChange = (appInstanceId: string) => {
    console.log(
      "ServiceManagement: App instance filter changed to:",
      appInstanceId
    );
    setSelectedAppInstanceId(appInstanceId);
    setSelectedServices([]); // Clear selected services when changing app instance filter
  };

  const handleTestApi = async () => {
    if (!selectedAppInstanceId || selectedAppInstanceId === "all") {
      message.warning("Please select an app instance to test API");
      return;
    }

    const appInstance = appInstances?.find(
      (a) => a.id === selectedAppInstanceId
    );
    if (!appInstance) {
      message.warning("Selected app instance not found");
      return;
    }

    try {
      message.loading("Testing Rancher API endpoints...", 0);
      const result = await servicesApi.testApiEndpoints(
        appInstance.rancherSiteId
      );
      message.destroy();

      if (result.success) {
        message.success(`API test successful! ${result.message}`);
        console.log("API Test Result:", result);
      } else {
        message.error(`API test failed: ${result.message}`);
        console.error("API Test Error:", result);
      }
    } catch (error) {
      message.destroy();
      message.error(
        `API test failed: ${(error as any)?.message || "Unknown error"}`
      );
      console.error("API Test Error:", error);
    }
  };

  const handleDebugAppInstances = async () => {
    if (!effectiveEnvironmentId) {
      message.warning("Please select an environment to debug");
      return;
    }

    try {
      message.loading("Fetching app instances debug info...", 0);
      const result = await servicesApi.debugAppInstances(
        effectiveEnvironmentId
      );
      message.destroy();

      message.success("Debug info fetched successfully");
      console.log("App Instances Debug Info:", result);
    } catch (error) {
      message.destroy();
      message.error(
        `Debug failed: ${(error as any)?.message || "Unknown error"}`
      );
      console.error("Debug Error:", error);
    }
  };

  const handleDebugClusters = async () => {
    if (!selectedAppInstanceId || selectedAppInstanceId === "all") {
      message.warning("Please select an app instance to debug clusters");
      return;
    }

    const appInstance = appInstances?.find(
      (a) => a.id === selectedAppInstanceId
    );
    if (!appInstance) {
      message.warning("Selected app instance not found");
      return;
    }

    try {
      message.loading("Fetching clusters debug info...", 0);
      const result = await servicesApi.debugClusters(appInstance.rancherSiteId);
      message.destroy();

      message.success("Clusters debug info fetched successfully");
      console.log("Clusters Debug Info:", result);
    } catch (error) {
      message.destroy();
      message.error(
        `Debug failed: ${(error as any)?.message || "Unknown error"}`
      );
      console.error("Debug Error:", error);
    }
  };

  const selectedEnv = environments?.find(
    (e) => e.id === effectiveEnvironmentId
  );

  const selectedAppInstance = appInstances?.find(
    (a) => a.id === selectedAppInstanceId
  );

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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Title level={2} className="mb-1">
              Services
            </Title>
            <Text className="text-gray-600">
              View and manage services across your environments
            </Text>
          </div>

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
              onClick={handleTestApi}
              disabled={
                !effectiveEnvironmentId || selectedAppInstanceId === "all"
              }
            >
              Test API
            </Button>
            <Button
              onClick={handleDebugAppInstances}
              disabled={!effectiveEnvironmentId}
            >
              Debug
            </Button>
            <Button
              onClick={handleDebugClusters}
              disabled={
                !effectiveEnvironmentId || selectedAppInstanceId === "all"
              }
            >
              Debug Clusters
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

        {/* Environment Selector */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <Text strong>Environment:</Text>
            <Select
              placeholder="Select environment to view services"
              value={effectiveEnvironmentId}
              onChange={handleEnvironmentChange}
              className="w-64"
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

          {selectedEnv && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedEnv.color }}
                />
                <Text strong>Selected: {selectedEnv.name}</Text>
                {selectedEnv.description && (
                  <Text className="text-gray-600">
                    - {selectedEnv.description}
                  </Text>
                )}
              </div>
            </div>
          )}
        </div>

        {!effectiveEnvironmentId ? (
          <Alert
            message="Select Environment"
            description="Please select an environment to view and manage services."
            type="info"
            showIcon
          />
        ) : (
          <>
            {/* App Instance Filter */}
            {appInstances && appInstances.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-4">
                  <Text strong>App Instance:</Text>
                  <Select
                    placeholder="Filter by app instance"
                    value={selectedAppInstanceId}
                    onChange={handleAppInstanceChange}
                    className="w-80"
                  >
                    <Option value="all">All App Instances</Option>
                    {appInstances.map((appInstance) => (
                      <Option key={appInstance.id} value={appInstance.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {appInstance.name}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({appInstance.cluster}/{appInstance.namespace})
                          </span>
                        </div>
                      </Option>
                    ))}
                  </Select>
                </div>

                {selectedAppInstance && selectedAppInstanceId !== "all" && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Text strong>
                        Filtered by: {selectedAppInstance.name}
                      </Text>
                      <Text className="text-gray-600">
                        ({selectedAppInstance.cluster}/
                        {selectedAppInstance.namespace})
                      </Text>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-4 mb-4">
              <Input
                placeholder="Search services..."
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />

              <Select
                placeholder="Filter by status"
                value={statusFilter}
                onChange={setStatusFilter}
                className="w-48"
              >
                <Option value="all">All Statuses</Option>
                {availableStatuses.map((status) => (
                  <Option key={status} value={status}>
                    {status}
                  </Option>
                ))}
              </Select>

              <Button
                onClick={handleSelectAll}
                disabled={filteredServices.length === 0}
              >
                {selectedServices.length === filteredServices.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <Card size="small">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {services?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Services</div>
                </div>
              </Card>

              <Card size="small">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {services?.filter(
                      (s) => s.status.toLowerCase() === "running"
                    ).length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Running</div>
                </div>
              </Card>

              <Card size="small">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {filteredServices.length}
                  </div>
                  <div className="text-sm text-gray-600">Filtered</div>
                </div>
              </Card>

              <Card size="small">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {selectedServices.length}
                  </div>
                  <div className="text-sm text-gray-600">Selected</div>
                </div>
              </Card>

              <Card size="small">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">
                    {appInstances?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">App Instances</div>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Services Table */}
      {!effectiveEnvironmentId ? null : filteredServices.length > 0 ? (
        <Table
          dataSource={filteredServices}
          rowKey="id"
          rowSelection={{
            selectedRowKeys: selectedServices.map((s) => s.id),
            onChange: (selectedRowKeys, selectedRows) => setSelectedServices(selectedRows as Service[]),
          }}
          columns={[
            { title: "Name", dataIndex: "name", key: "name" },
            {
              title: "Status",
              dataIndex: "status",
              key: "status",
              render: (status: string) => {
                let color = "default";
                let icon = null;
                if (["active", "running", "Ready"].includes(status)) {
                  color = "success";
                  icon = <CheckCircleTwoTone twoToneColor="#52c41a" />;
                } else if (["failed", "error", "CrashLoopBackOff"].includes(status)) {
                  color = "error";
                  icon = <CloseCircleTwoTone twoToneColor="#ff4d4f" />;
                } else if (["pending", "progressing", "updating"].includes(status)) {
                  color = "processing";
                  icon = <SyncIcon spin style={{ color: '#1890ff' }} />;
                } else {
                  color = "warning";
                  icon = <ExclamationCircleTwoTone twoToneColor="#faad14" />;
                }
                return <Badge status={color as any} text={<span>{icon} {status}</span>} />;
              },
            },
            { title: "Type", dataIndex: "workloadType", key: "workloadType" },
            {
              title: "Replicas",
              key: "replicas",
              render: (_: any, record: Service) => `${record.availableReplicas}/${record.replicas}`,
            },
            {
              title: "Tag",
              dataIndex: "imageTag",
              key: "imageTag",
              width: 220,
              render: (imageTag: string) => {
                if (!imageTag) return "";
                const parts = imageTag.split(":");
                let version = parts.length > 1 ? parts.slice(1).join(":") : parts[0];
                if (typeof version === "string" && (version.length === 32 || version.length === 40)) {
                  version = version.slice(0, 7);
                }
                return <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{version}</span>;
              },
            },
          ]}
          pagination={{ pageSize: 20 }}
        />
      ) : (
        <Empty
          image={<GitBranchIcon size={64} className="mx-auto text-gray-400" />}
          description={
            <div className="text-center">
              <p className="text-gray-500 mb-2">
                {searchTerm || statusFilter !== "all"
                  ? "No services match your filters"
                  : selectedAppInstanceId !== "all"
                    ? `No services found in ${selectedAppInstance?.name || "selected app instance"}`
                    : "No services found in this environment"}
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
      )}

      {/* Sync Modal */}
      <SyncModal
        open={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        selectedServices={selectedServices}
        sourceEnvironment={selectedEnv!}
        environments={environments || []}
        onSuccess={() => {
          setSelectedServices([]);
          setShowSyncModal(false);
        }}
      />

      {/* Sync History Modal */}
      <Modal
        title="Synchronization History"
        open={showHistory}
        onCancel={() => setShowHistory(false)}
        footer={null}
        width={800}
      >
        {historyLoading ? (
          <div className="flex justify-center p-8">
            <Spin size="large" />
          </div>
        ) : (
          <div className="space-y-4">
            {syncHistory && syncHistory.length > 0 ? (
              syncHistory.map((operation) => (
                <Card key={operation.id} size="small">
                  <div className="flex items-center justify-between">
                    <div>
                      <Text strong>Operation {operation.id.slice(0, 8)}</Text>
                      <div className="text-sm text-gray-600">
                        {operation.serviceIds.length} services •{" "}
                        {operation.status}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      {new Date(operation.startTime).toLocaleString()}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Empty description="No sync history found" />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
