import { useState, useEffect } from "react";
import Form from "antd/es/form";
import Input from "antd/es/input";
import Select from "antd/es/select";
import Button from "antd/es/button";
import Space from "antd/es/space";
import Alert from "antd/es/alert";
import Spin from "antd/es/spin";
import Radio from "antd/es/radio";
import { useQuery } from "@tanstack/react-query";
import { sitesApi, genericClusterSitesApi } from "../../services/api";
import type {
  CreateAppInstanceRequest,
  RancherSite,
  Environment,
  GenericClusterSite,
  GenericClusterNamespace,
} from "../../types";

const { Option } = Select;

interface AppInstanceFormProps {
  initialValues?: Partial<CreateAppInstanceRequest>;
  onSubmit: (values: CreateAppInstanceRequest) => void;
  onCancel: () => void;
  loading?: boolean;
  environments: Environment[];
  sites: RancherSite[];
  genericClusterSites: GenericClusterSite[];
}

export function AppInstanceForm({
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
  environments,
  sites,
  genericClusterSites,
}: AppInstanceFormProps) {
  const [form] = Form.useForm();

  const [clusterType, setClusterType] = useState<"rancher" | "generic">(
    initialValues?.clusterType || "rancher",
  );
  const [selectedRancherSiteId, setSelectedRancherSiteId] =
    useState<string>("");
  const [selectedRancherClusterId, setSelectedRancherClusterId] =
    useState<string>("");
  const [selectedGenericSiteId, setSelectedGenericSiteId] =
    useState<string>("");

  // Fetch clusters when site is selected
  const { data: clusters, isLoading: clustersLoading } = useQuery({
    queryKey: ["clusters", selectedRancherSiteId],
    queryFn: () => sitesApi.getClusters(selectedRancherSiteId),
    enabled: clusterType === "rancher" && !!selectedRancherSiteId,
  });

  // Fetch namespaces when cluster is selected
  const {
    data: namespaces,
    isLoading: namespacesLoading,
    error: namespacesError,
  } = useQuery({
    queryKey: ["namespaces", selectedRancherSiteId, selectedRancherClusterId],
    queryFn: () =>
      sitesApi.getNamespaces(selectedRancherSiteId, selectedRancherClusterId),
    enabled:
      clusterType === "rancher" &&
      !!selectedRancherSiteId &&
      !!selectedRancherClusterId,
  });

  // Generic cluster namespaces
  const {
    data: genericNamespaces,
    isLoading: genericNamespacesLoading,
    error: genericNamespacesError,
  } = useQuery({
    queryKey: ["generic-namespaces", selectedGenericSiteId],
    queryFn: (): Promise<GenericClusterNamespace[]> =>
      genericClusterSitesApi.getNamespaces(selectedGenericSiteId),
    enabled: clusterType === "generic" && !!selectedGenericSiteId,
  });

  // Reset form and state when initialValues change (create vs edit mode)
  useEffect(() => {
    if (initialValues) {
      // Set the form values and state
      form.setFieldsValue(initialValues);
      const ct = initialValues.clusterType || "rancher";
      setClusterType(ct);
      if (ct === "rancher") {
        setSelectedRancherSiteId(initialValues.rancherSiteId || "");
        setSelectedRancherClusterId(initialValues.cluster || "");
        setSelectedGenericSiteId("");
      } else {
        setSelectedRancherSiteId("");
        setSelectedRancherClusterId("");
        setSelectedGenericSiteId(initialValues.genericClusterSiteId || "");
      }
    } else {
      // Reset everything to default values
      form.resetFields();
      setClusterType("rancher");
      setSelectedRancherSiteId("");
      setSelectedRancherClusterId("");
      setSelectedGenericSiteId("");
    }
  }, [initialValues, form]);

  const handleClusterTypeChange = (value: "rancher" | "generic") => {
    setClusterType(value);
    form.setFieldsValue({
      clusterType: value,
      rancherSiteId: undefined,
      genericClusterSiteId: undefined,
      cluster: undefined,
      namespace: undefined,
    });
    setSelectedRancherSiteId("");
    setSelectedRancherClusterId("");
    setSelectedGenericSiteId("");
  };

  const handleRancherSiteChange = (siteId: string) => {
    setSelectedRancherSiteId(siteId);
    setSelectedRancherClusterId("");
    form.setFieldsValue({
      cluster: undefined,
      namespace: undefined,
    });
  };

  const handleClusterChange = (clusterId: string) => {
    setSelectedRancherClusterId(clusterId);
    form.setFieldsValue({
      cluster: clusterId,
      namespace: undefined,
    });
  };

  const handleGenericSiteChange = (siteId: string) => {
    setSelectedGenericSiteId(siteId);
    form.setFieldsValue({
      genericClusterSiteId: siteId,
      namespace: undefined,
    });
  };

  const handleSubmit = (values: any) => {
    const base: CreateAppInstanceRequest = {
      ...(values as CreateAppInstanceRequest),
      clusterType,
    };

    if (clusterType === "rancher") {
      base.genericClusterSiteId = undefined;
    } else {
      base.rancherSiteId = undefined;
      const selectedSite = genericClusterSites.find(
        (s) => s.id === base.genericClusterSiteId,
      );
      base.cluster = selectedSite?.clusterName || "generic-cluster";
    }

    onSubmit(base);
  };

  const handleCancel = () => {
    // Reset form and state before closing
    form.resetFields();
    setClusterType("rancher");
    setSelectedRancherSiteId("");
    setSelectedRancherClusterId("");
    setSelectedGenericSiteId("");
    onCancel();
  };

  const activeSites = sites.filter((site) => site.active);
  const activeGenericSites = genericClusterSites.filter((site) => site.active);

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Form.Item
        label="Name"
        name="name"
        rules={[
          { required: true, message: "Please enter app instance name" },
          { min: 2, message: "Name must be at least 2 characters" },
        ]}
      >
        <Input placeholder="e.g., Web Frontend Dev" />
      </Form.Item>

      <Form.Item
        label="Cluster Type"
        name="clusterType"
        initialValue={clusterType}
      >
        <Radio.Group
          value={clusterType}
          onChange={(e) => handleClusterTypeChange(e.target.value)}
        >
          <Radio.Button value="rancher">Rancher</Radio.Button>
          <Radio.Button value="generic">Generic Kubernetes</Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Form.Item
        label="Environment"
        name="environmentId"
        rules={[{ required: true, message: "Please select an environment" }]}
      >
        <Select placeholder="Select environment">
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
      </Form.Item>

      {clusterType === "rancher" && (
        <>
          <Form.Item
            label="Rancher Site"
            name="rancherSiteId"
            rules={[
              { required: true, message: "Please select a Rancher site" },
            ]}
          >
            <Select
              placeholder="Select Rancher site"
              onChange={handleRancherSiteChange}
              value={selectedRancherSiteId}
            >
              {activeSites.map((site) => (
                <Option key={site.id} value={site.id}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{site.name}</span>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                      {site.url}
                    </span>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {activeSites.length === 0 && (
            <Alert
              message="No Active Rancher Sites"
              description="You need to add and activate at least one Rancher site before creating app instances."
              type="warning"
              showIcon
              className="mb-4"
            />
          )}

          <Form.Item
            label="Cluster"
            name="cluster"
            rules={[{ required: true, message: "Please select a cluster" }]}
          >
            <Select
              placeholder={
                !selectedRancherSiteId
                  ? "Select a site first"
                  : clustersLoading
                    ? "Loading clusters..."
                    : "Select cluster"
              }
              disabled={!selectedRancherSiteId}
              loading={clustersLoading}
              onChange={handleClusterChange}
              notFoundContent={
                clustersLoading ? <Spin size="small" /> : "No clusters found"
              }
            >
              {clusters?.map((cluster) => (
                <Option key={cluster.id} value={cluster.id}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">
                      {cluster.name}
                    </span>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                      {cluster.state}
                    </span>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Namespace"
            name="namespace"
            rules={[{ required: true, message: "Please select a namespace" }]}
          >
            <Select
              placeholder={
                !selectedRancherClusterId
                  ? "Select a cluster first"
                  : namespacesLoading
                    ? "Loading namespaces..."
                    : "Select namespace"
              }
              disabled={!selectedRancherClusterId}
              loading={namespacesLoading}
              notFoundContent={
                namespacesLoading ? <Spin size="small" /> : "No namespaces found"
              }
              showSearch
              filterOption={(input, option) =>
                String(option?.children || "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {namespaces?.map((namespace) => (
                <Option key={namespace.id} value={namespace.name}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">
                      {namespace.name}
                    </span>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                      {namespace.id}
                    </span>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {selectedRancherSiteId &&
            clusters?.length === 0 &&
            !clustersLoading && (
              <Alert
                message="No Clusters Found"
                description="This Rancher site has no accessible clusters. Please check your permissions or contact your administrator."
                type="warning"
                showIcon
                className="mb-4"
              />
            )}

          {selectedRancherClusterId &&
            namespaces?.length === 0 &&
            !namespacesLoading && (
              <Alert
                message="No Namespaces Found"
                description="This cluster has no accessible namespaces. Please check your permissions or contact your administrator."
                type="warning"
                showIcon
                className="mb-4"
              />
            )}

          {namespacesError ? (
            <Alert
              message="Error Loading Namespaces"
              description={`Failed to load namespaces: ${(namespacesError as any)?.response?.data?.message || "Unknown error"}`}
              type="error"
              showIcon
              className="mb-4"
            />
          ) : null}
        </>
      )}

      {clusterType === "generic" && (
        <>
          <Form.Item
            label="Generic Cluster"
            name="genericClusterSiteId"
            rules={[
              {
                required: true,
                message: "Please select a generic cluster",
              },
            ]}
          >
            <Select
              placeholder="Select generic cluster"
              onChange={handleGenericSiteChange}
              value={selectedGenericSiteId}
            >
              {activeGenericSites.map((site) => (
                <Option key={site.id} value={site.id}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{site.name}</span>
                    {site.clusterName && (
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {site.clusterName}
                      </span>
                    )}
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {activeGenericSites.length === 0 && (
            <Alert
              message="No Generic Clusters"
              description="You need to add at least one generic cluster before creating generic app instances."
              type="warning"
              showIcon
              className="mb-4"
            />
          )}

          <Form.Item
            label="Namespace"
            name="namespace"
            rules={[
              { required: true, message: "Please select a namespace" },
            ]}
          >
            <Select
              placeholder={
                !selectedGenericSiteId
                  ? "Select a generic cluster first"
                  : genericNamespacesLoading
                    ? "Loading namespaces..."
                    : "Select namespace"
              }
              disabled={!selectedGenericSiteId}
              loading={genericNamespacesLoading}
              notFoundContent={
                genericNamespacesLoading ? (
                  <Spin size="small" />
                ) : (
                  "No namespaces found"
                )
              }
              showSearch
              filterOption={(input, option) =>
                String(option?.children || "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {genericNamespaces?.map((namespace) => (
                <Option key={namespace.id} value={namespace.name}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">
                      {namespace.name}
                    </span>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                      {namespace.id}
                    </span>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {selectedGenericSiteId &&
            genericNamespaces?.length === 0 &&
            !genericNamespacesLoading && (
              <Alert
                message="No Namespaces Found"
                description="This cluster has no accessible namespaces. Please check your permissions or contact your administrator."
                type="warning"
                showIcon
                className="mb-4"
              />
            )}

          {genericNamespacesError ? (
            <Alert
              message="Error Loading Namespaces"
              description={`Failed to load namespaces: ${(genericNamespacesError as any)?.response?.data?.message || "Unknown error"}`}
              type="error"
              showIcon
              className="mb-4"
            />
          ) : null}
        </>
      )}

      <Form.Item className="mb-0">
        <Space className="w-full justify-end">
          <Button onClick={handleCancel}>Cancel</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
          >
            {initialValues ? "Update" : "Create"} App Instance
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
