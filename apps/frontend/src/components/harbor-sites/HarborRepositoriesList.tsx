import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Typography,
  Alert,
  Space,
  Tag,
  Tooltip,
  Breadcrumb,
  message,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  DatabaseOutlined,
  ReloadOutlined,
  ContainerOutlined,
  StarOutlined,
  DownloadOutlined,
  TagOutlined,
  CalendarOutlined,
  ArrowRightOutlined,
  HomeOutlined,
  FolderOutlined,
  HddOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { HarborSite, HarborRepository, HarborProject } from '../../types';
import { harborSitesApi } from '../../services/api';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface HarborRepositoriesListProps {
  harborSite: HarborSite;
  project: HarborProject;
  onSelectRepository?: (repository: HarborRepository, project: HarborProject, harborSite: HarborSite) => void;
  onBack?: () => void;
}

export const HarborRepositoriesList: React.FC<HarborRepositoriesListProps> = ({
  harborSite,
  project,
  onSelectRepository,
  onBack
}) => {
  const navigate = useNavigate();
  const [repositories, setRepositories] = useState<HarborRepository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRepositories();
  }, [harborSite.id, project.name]);

  const fetchRepositories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await harborSitesApi.getRepositories(harborSite.id, project.name);
      setRepositories(data);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to fetch repositories';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchRepositories();
  };

  const handleViewArtifacts = (repository: HarborRepository) => {
    if (onSelectRepository) {
      onSelectRepository(repository, project, harborSite);
    }
  };


  const columns: ColumnsType<HarborRepository> = [
    {
      title: 'Repository Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: HarborRepository) => (
        <Space direction="vertical" size="small">
          <Space>
            <ContainerOutlined style={{ color: '#1890ff' }} />
            <Text strong>{name}</Text>
          </Space>
          {record.description && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.description}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Tags',
      dataIndex: 'tags_count',
      key: 'tags_count',
      align: 'center',
      render: (count: number) => (
        <Space>
          <TagOutlined />
          <Tag color="blue">{count}</Tag>
        </Space>
      ),
    },
    {
      title: 'Pull Count',
      dataIndex: 'pull_count',
      key: 'pull_count',
      align: 'center',
      render: (count: number) => (
        <Space>
          <DownloadOutlined />
          <Tag color="green">{count.toLocaleString()}</Tag>
        </Space>
      ),
    },
    {
      title: 'Stars',
      dataIndex: 'star_count',
      key: 'star_count',
      align: 'center',
      render: (count: number) => (
        <Space>
          <StarOutlined style={{ color: '#faad14' }} />
          <Tag color="gold">{count}</Tag>
        </Space>
      ),
    },
    {
      title: 'Last Updated',
      dataIndex: 'update_time',
      key: 'update_time',
      render: (date: string) => (
        <Tooltip title={new Date(date).toLocaleString()}>
          <Space>
            <CalendarOutlined />
            <Text type="secondary">
              {new Date(date).toLocaleDateString()}
            </Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record: HarborRepository) => (
        <Button
          type="link"
          icon={<ArrowRightOutlined />}
          onClick={() => handleViewArtifacts(record)}
        >
          View Tags
        </Button>
      ),
    },
  ];

  const totalPulls = repositories.reduce((sum, repo) => sum + repo.pull_count, 0);
  const totalTags = repositories.reduce((sum, repo) => sum + repo.tags_count, 0);
  const totalStars = repositories.reduce((sum, repo) => sum + repo.star_count, 0);

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <Breadcrumb
            style={{ marginBottom: '16px' }}
            items={[
              {
                title: (
                  <a onClick={() => navigate('/')}>
                    <HomeOutlined /> Home
                  </a>
                ),
              },
              {
                title: (
                  <a onClick={() => navigate('/harbor-sites')}>
                    <HddOutlined /> Harbor Sites
                  </a>
                ),
              },
              {
                title: (
                  <a onClick={onBack}>
                    <DatabaseOutlined /> {harborSite.name}
                  </a>
                ),
              },
              {
                title: (
                  <span>
                    <FolderOutlined /> {project.name}
                  </span>
                ),
              },
            ]}
          />

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '16px' 
          }}>
            <div>
              <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ContainerOutlined />
                Repositories in {project.name}
              </Title>
              <Text type="secondary">
                Container repositories in this Harbor project
              </Text>
            </div>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRefresh}
                loading={loading}
              >
                Refresh
              </Button>
            </Space>
          </div>

          <Alert
            message={`Project: ${project.name} (${project.public ? 'Public' : 'Private'})`}
            description={`Owner: ${project.owner_name} | Harbor Site: ${harborSite.url}`}
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />

          {repositories.length > 0 && (
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Total Repositories"
                    value={repositories.length}
                    prefix={<ContainerOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Total Tags"
                    value={totalTags}
                    prefix={<TagOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Total Pulls"
                    value={totalPulls}
                    prefix={<DownloadOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Total Stars"
                    value={totalStars}
                    prefix={<StarOutlined />}
                  />
                </Card>
              </Col>
            </Row>
          )}
        </div>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
            style={{ marginBottom: '16px' }}
            action={
              <Button onClick={handleRefresh} size="small">
                Retry
              </Button>
            }
          />
        )}

        <Table
          columns={columns}
          dataSource={repositories}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} repositories`,
          }}
          size="middle"
        />
      </Card>
    </div>
  );
};