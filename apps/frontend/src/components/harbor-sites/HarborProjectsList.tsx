import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Table,
  Button,
  Typography,
  Alert,
  Space,
  Tag,
  Tooltip,
  Select,
  message,
  Breadcrumb,
  Input,
} from "antd";
import {
  DatabaseOutlined,
  ReloadOutlined,
  FolderOutlined,
  TeamOutlined,
  CalendarOutlined,
  ArrowRightOutlined,
  HomeOutlined,
  HddOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { HarborSite, HarborProject } from "../../types";
import { harborSitesApi } from "../../services/api";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;
const { Option } = Select;

interface HarborProjectsListProps {
  harborSiteId?: string;
  onSelectProject?: (project: HarborProject, harborSite: HarborSite) => void;
}

export const HarborProjectsList: React.FC<HarborProjectsListProps> = ({
  harborSiteId,
  onSelectProject,
}) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<HarborProject[]>([]);
  const [harborSites, setHarborSites] = useState<HarborSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(
    harborSiteId || null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");

  useEffect(() => {
    if (harborSiteId) {
      // If harborSiteId is provided via props, use it directly
      setSelectedSiteId(harborSiteId);
      fetchHarborSites();
    } else {
      // Otherwise, fetch sites and auto-select
      fetchHarborSites();
    }
  }, [harborSiteId]);

  useEffect(() => {
    if (selectedSiteId) {
      fetchProjects(selectedSiteId);
    }
  }, [selectedSiteId]);

  const fetchHarborSites = async () => {
    try {
      const sites = await harborSitesApi.getAll();
      setHarborSites(sites);

      // Only auto-select if harborSiteId is not provided via props
      if (!harborSiteId) {
        // Auto-select active site if available
        const activeSite = sites.find((site) => site.active);
        if (activeSite) {
          setSelectedSiteId(activeSite.id);
        } else if (sites.length > 0) {
          setSelectedSiteId(sites[0].id);
        }
      }
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch Harbor sites";
      setError(errorMessage);
    }
  };

  const fetchProjects = async (siteId: string) => {
    try {
      setLoading(true);
      setError(null);

      const data = await harborSitesApi.getProjects(siteId);
      setProjects(data);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch projects";
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (selectedSiteId) {
      fetchProjects(selectedSiteId);
    }
  };

  const handleViewRepositories = (project: HarborProject) => {
    const harborSite = harborSites.find((site) => site.id === selectedSiteId);
    if (harborSite && onSelectProject) {
      onSelectProject(project, harborSite);
    }
  };

  // Filter projects based on search text
  const filteredProjects = useMemo(() => {
    if (!searchText.trim()) {
      return projects;
    }

    const searchLower = searchText.toLowerCase().trim();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(searchLower) ||
        project.owner_name.toLowerCase().includes(searchLower),
    );
  }, [projects, searchText]);

  const columns: ColumnsType<HarborProject> = [
    {
      title: "Project Name",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: HarborProject) => (
        <Space>
          <FolderOutlined style={{ color: "#1890ff" }} />
          <Text strong>{name}</Text>
          {record.public && <Tag color="green">Public</Tag>}
          {!record.public && <Tag color="orange">Private</Tag>}
        </Space>
      ),
    },
    {
      title: "Owner",
      dataIndex: "owner_name",
      key: "owner_name",
      render: (owner: string) => (
        <Space>
          <TeamOutlined />
          <Text>{owner}</Text>
        </Space>
      ),
    },
    {
      title: "Repositories",
      dataIndex: "repo_count",
      key: "repo_count",
      align: "center",
      render: (count: number) => <Tag color="blue">{count} repos</Tag>,
    },
    {
      title: "Charts",
      dataIndex: "chart_count",
      key: "chart_count",
      align: "center",
      render: (count?: number) => <Tag color="purple">{count || 0} charts</Tag>,
    },
    {
      title: "Created",
      dataIndex: "creation_time",
      key: "creation_time",
      render: (date: string) => (
        <Tooltip title={new Date(date).toLocaleString()}>
          <Space>
            <CalendarOutlined />
            <Text type="secondary">{new Date(date).toLocaleDateString()}</Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      render: (_, record: HarborProject) => (
        <Button
          type="link"
          icon={<ArrowRightOutlined />}
          onClick={() => handleViewRepositories(record)}
        >
          View Repositories
        </Button>
      ),
    },
  ];

  const selectedSite = harborSites.find((site) => site.id === selectedSiteId);

  const breadcrumbItems = [
    {
      title: (
        <a onClick={() => navigate("/")}>
          <HomeOutlined /> Home
        </a>
      ),
    },
    {
      title: (
        <a onClick={() => navigate("/harbor-sites")}>
          <HddOutlined /> Harbor Sites
        </a>
      ),
    },
  ];

  if (selectedSite) {
    breadcrumbItems.push({
      title: <span>{selectedSite.name}</span>,
    });
  }

  return (
    <div style={{ padding: "24px" }}>
      <Breadcrumb items={breadcrumbItems} style={{ marginBottom: "16px" }} />
      <Card>
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div>
              <Title
                level={3}
                style={{
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <DatabaseOutlined />
                Harbor Projects
              </Title>
              <Text type="secondary">
                Browse projects in your Harbor registries
              </Text>
            </div>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
                disabled={!selectedSiteId}
              >
                Refresh
              </Button>
            </Space>
          </div>

          {!harborSiteId && (
            <div style={{ marginBottom: "16px" }}>
              <Text strong style={{ marginRight: "8px" }}>
                Harbor Site:
              </Text>
              <Select
                style={{ width: 300 }}
                placeholder="Select a Harbor site"
                value={selectedSiteId}
                onChange={setSelectedSiteId}
                loading={!harborSites.length}
              >
                {harborSites.map((site) => (
                  <Option key={site.id} value={site.id}>
                    <Space>
                      <DatabaseOutlined />
                      {site.name}
                      {site.active && <Tag color="green">Active</Tag>}
                    </Space>
                  </Option>
                ))}
              </Select>
            </div>
          )}

          {selectedSiteId && (
            <div style={{ marginBottom: "16px" }}>
              <Input
                placeholder="Search by project name or owner..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ width: 400 }}
              />
            </div>
          )}

          {selectedSite && (
            <Alert
              message={`Connected to ${selectedSite.name}`}
              description={selectedSite.url}
              type="info"
              showIcon
              style={{ marginBottom: "16px" }}
            />
          )}
        </div>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
            style={{ marginBottom: "16px" }}
            action={
              <Button onClick={handleRefresh} size="small">
                Retry
              </Button>
            }
          />
        )}

        {!selectedSiteId ? (
          <Alert
            message="No Harbor Site Selected"
            description="Please select a Harbor site to view projects."
            type="warning"
            showIcon
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredProjects}
            rowKey="project_id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} projects`,
            }}
            size="middle"
          />
        )}
      </Card>
    </div>
  );
};
