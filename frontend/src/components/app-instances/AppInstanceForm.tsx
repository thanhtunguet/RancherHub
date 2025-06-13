import { useState, useEffect } from "react";
import { Form, Input, Select, Button, Space, Alert, Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { sitesApi } from "../../services/api";
import type {
  CreateAppInstanceRequest,
  RancherSite,
  Environment,
} from "../../types";

const { Option } = Select;

interface AppInstanceFormProps {
  initialValues?: Partial<CreateAppInstanceRequest>;
  onSubmit: (values: CreateAppInstanceRequest) => void;
  onCancel: () => void;
  loading?: boolean;
  environments: Environment[];
  sites: RancherSite[];
}

export function AppInstanceForm({
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
  environments,
  sites,
}: AppInstanceFormProps) {
  const [form] = Form.useForm();

  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [selectedClusterId, setSelectedClusterId] = useState<string>("");

  // Fetch clusters when site is selected
  const { data: clusters, isLoading: clustersLoading } = useQuery({
    queryKey: ["clusters", selectedSiteId],
    queryFn: () => sitesApi.getClusters(selectedSiteId),
    enabled: !!selectedSiteId,
  });

  // Fetch namespaces when cluster is selected
  const {
    data: namespaces,
    isLoading: namespacesLoading,
    error: namespacesError,
  } = useQuery({
    queryKey: ["namespaces", selectedSiteId, selectedClusterId],
    queryFn: () => sitesApi.getNamespaces(selectedSiteId, selectedClusterId),
    enabled: !!selectedSiteId && !!selectedClusterId,
  });

  // Reset form and state when initialValues change (create vs edit mode)
  useEffect(() => {
    if (initialValues) {
      // Set the form values and state
      form.setFieldsValue(initialValues);
      setSelectedSiteId(initialValues.rancherSiteId || "");
      setSelectedClusterId(initialValues.cluster || "");
    } else {
      // Reset everything to default values
      form.resetFields();
      setSelectedSiteId("");
      setSelectedClusterId("");
    }
  }, [initialValues, form]);

  const handleSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId);
    setSelectedClusterId("");
    form.setFieldsValue({
      cluster: undefined,
      namespace: undefined,
    });
  };

  const handleClusterChange = (clusterId: string) => {
    setSelectedClusterId(clusterId);
    form.setFieldsValue({
      cluster: clusterId,
      namespace: undefined,
    });
  };

  const handleSubmit = (values: any) => {
    onSubmit(values as CreateAppInstanceRequest);
  };

  const handleCancel = () => {
    // Reset form and state before closing
    form.resetFields();
    setSelectedSiteId("");
    setSelectedClusterId("");
    onCancel();
  };

  const activeSites = sites.filter((site) => site.active);

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

      <Form.Item
        label="Rancher Site"
        name="rancherSiteId"
        rules={[{ required: true, message: "Please select a Rancher site" }]}
      >
        <Select
          placeholder="Select Rancher site"
          onChange={handleSiteChange}
          value={selectedSiteId}
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
            !selectedSiteId
              ? "Select a site first"
              : clustersLoading
                ? "Loading clusters..."
                : "Select cluster"
          }
          disabled={!selectedSiteId}
          loading={clustersLoading}
          onChange={handleClusterChange}
          notFoundContent={
            clustersLoading ? <Spin size="small" /> : "No clusters found"
          }
        >
          {clusters?.map((cluster) => (
            <Option key={cluster.id} value={cluster.id}>
              <div className="flex items-center justify-between">
                <span className="font-medium truncate">{cluster.name}</span>
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
            !selectedClusterId
              ? "Select a cluster first"
              : namespacesLoading
                ? "Loading namespaces..."
                : "Select namespace"
          }
          disabled={!selectedClusterId}
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
                <span className="font-medium truncate">{namespace.name}</span>
                <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                  {namespace.id}
                </span>
              </div>
            </Option>
          ))}
        </Select>
      </Form.Item>

      {selectedSiteId && clusters?.length === 0 && !clustersLoading && (
        <Alert
          message="No Clusters Found"
          description="This Rancher site has no accessible clusters. Please check your permissions or contact your administrator."
          type="warning"
          showIcon
          className="mb-4"
        />
      )}

      {selectedClusterId && namespaces?.length === 0 && !namespacesLoading && (
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

      <Form.Item className="mb-0">
        <Space className="w-full justify-end">
          <Button onClick={handleCancel}>Cancel</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={activeSites.length === 0}
          >
            {initialValues ? "Update" : "Create"} App Instance
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
