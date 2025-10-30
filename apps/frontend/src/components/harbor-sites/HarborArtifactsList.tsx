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
  Descriptions,
  Collapse,
  List,
} from 'antd';
import {
  DatabaseOutlined,
  ReloadOutlined,
  ContainerOutlined,
  TagOutlined,
  CalendarOutlined,
  HomeOutlined,
  FolderOutlined,
  CloudDownloadOutlined,
  InfoCircleOutlined,
  SafetyOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import { HarborSite, HarborArtifact, HarborRepository, HarborProject } from '../../types';
import { harborSitesApi } from '../../services/api';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface HarborArtifactsListProps {
  harborSite: HarborSite;
  project: HarborProject;
  repository: HarborRepository;
  onBack?: () => void;
}

export const HarborArtifactsList: React.FC<HarborArtifactsListProps> = ({ 
  harborSite, 
  project, 
  repository,
  onBack 
}) => {
  const [artifacts, setArtifacts] = useState<HarborArtifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArtifacts();
  }, [harborSite.id, project.name, repository.name]);

  const fetchArtifacts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await harborSitesApi.getArtifacts(harborSite.id, project.name, repository.name);
      setArtifacts(data);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to fetch artifacts';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchArtifacts();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getImageCommand = (projectName: string, repositoryName: string, tag: string): string => {
    const harborDomain = harborSite.url.replace(/^https?:\/\//, '');
    return `docker pull ${harborDomain}/${projectName}/${repositoryName}:${tag}`;
  };

  const columns: ColumnsType<HarborArtifact> = [
    {
      title: 'Tags',
      key: 'tags',
      render: (_, artifact: HarborArtifact) => (
        <Space direction="vertical" size="small">
          {artifact.tags && artifact.tags.length > 0 ? (
            artifact.tags.map(tag => (
              <Tag key={tag.id} color="blue" style={{ marginBottom: '2px' }}>
                <Space>
                  <TagOutlined />
                  {tag.name}
                  {tag.signed && <SafetyOutlined style={{ color: '#52c41a' }} />}
                  {tag.immutable && <InfoCircleOutlined style={{ color: '#faad14' }} />}
                </Space>
              </Tag>
            ))
          ) : (
            <Tag color="default">No tags</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Type & Architecture',
      key: 'type',
      render: (_, artifact: HarborArtifact) => (
        <Space direction="vertical" size="small">
          <Tag color="purple">{artifact.type}</Tag>
          {artifact.extra_attrs?.architecture && (
            <Tag color="cyan">{artifact.extra_attrs.architecture}</Tag>
          )}
          {artifact.extra_attrs?.os && (
            <Tag color="green">{artifact.extra_attrs.os}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      align: 'center',
      render: (size: number) => (
        <Space>
          <FileImageOutlined />
          <Text strong>{formatBytes(size)}</Text>
        </Space>
      ),
    },
    {
      title: 'Pushed',
      dataIndex: 'push_time',
      key: 'push_time',
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
      title: 'Last Pulled',
      dataIndex: 'pull_time',
      key: 'pull_time',
      render: (date: string) => (
        <Tooltip title={date ? new Date(date).toLocaleString() : 'Never pulled'}>
          <Space>
            <CloudDownloadOutlined />
            <Text type="secondary">
              {date ? new Date(date).toLocaleDateString() : 'Never'}
            </Text>
          </Space>
        </Tooltip>
      ),
    },
  ];

  const expandedRowRender = (artifact: HarborArtifact) => {
    const primaryTag = artifact.tags?.[0]?.name || 'latest';
    const dockerCommand = getImageCommand(project.name, repository.name, primaryTag);

    return (
      <div style={{ padding: '16px', background: '#fafafa' }}>
        <Collapse>
          <Panel header="Docker Pull Command" key="docker">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text code copyable style={{ fontSize: '12px', padding: '8px' }}>
                {dockerCommand}
              </Text>
            </Space>
          </Panel>
          
          <Panel header="Artifact Details" key="details">
            <Descriptions size="small" column={2}>
              <Descriptions.Item label="Digest">
                <Text code style={{ fontSize: '11px' }}>
                  {artifact.digest.substring(0, 32)}...
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Media Type">
                {artifact.media_type}
              </Descriptions.Item>
              <Descriptions.Item label="Manifest Type">
                {artifact.manifest_media_type}
              </Descriptions.Item>
              {artifact.extra_attrs?.author && (
                <Descriptions.Item label="Author">
                  {artifact.extra_attrs.author}
                </Descriptions.Item>
              )}
              {artifact.extra_attrs?.created && (
                <Descriptions.Item label="Created">
                  {new Date(artifact.extra_attrs.created).toLocaleString()}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Panel>

          {artifact.extra_attrs?.config && (
            <Panel header="Configuration" key="config">
              <Descriptions size="small" column={1}>
                {artifact.extra_attrs.config.User && (
                  <Descriptions.Item label="User">
                    <Text code>{artifact.extra_attrs.config.User}</Text>
                  </Descriptions.Item>
                )}
                {artifact.extra_attrs.config.WorkingDir && (
                  <Descriptions.Item label="Working Directory">
                    <Text code>{artifact.extra_attrs.config.WorkingDir}</Text>
                  </Descriptions.Item>
                )}
                {artifact.extra_attrs.config.Cmd && (
                  <Descriptions.Item label="Command">
                    <Text code>{artifact.extra_attrs.config.Cmd.join(' ')}</Text>
                  </Descriptions.Item>
                )}
                {artifact.extra_attrs.config.Entrypoint && (
                  <Descriptions.Item label="Entrypoint">
                    <Text code>{artifact.extra_attrs.config.Entrypoint.join(' ')}</Text>
                  </Descriptions.Item>
                )}
                {artifact.extra_attrs.config.Env && (
                  <Descriptions.Item label="Environment Variables">
                    <List
                      size="small"
                      dataSource={artifact.extra_attrs.config.Env}
                      renderItem={(env: string) => (
                        <List.Item>
                          <Text code style={{ fontSize: '11px' }}>{env}</Text>
                        </List.Item>
                      )}
                    />
                  </Descriptions.Item>
                )}
                {artifact.extra_attrs.config.ExposedPorts && (
                  <Descriptions.Item label="Exposed Ports">
                    <Space wrap>
                      {Object.keys(artifact.extra_attrs.config.ExposedPorts).map(port => (
                        <Tag key={port} color="orange">{port}</Tag>
                      ))}
                    </Space>
                  </Descriptions.Item>
                )}
                {artifact.extra_attrs.config.Labels && (
                  <Descriptions.Item label="Labels">
                    <Space wrap>
                      {Object.entries(artifact.extra_attrs.config.Labels).map(([key, value]) => (
                        <Tag key={key} color="geekblue">
                          {key}: {value}
                        </Tag>
                      ))}
                    </Space>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Panel>
          )}
        </Collapse>
      </div>
    );
  };

  const totalSize = artifacts.reduce((sum, artifact) => sum + artifact.size, 0);
  const totalTags = artifacts.reduce((sum, artifact) => sum + (artifact.tags?.length || 0), 0);

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <Breadcrumb style={{ marginBottom: '16px' }}>
            <Breadcrumb.Item>
              <Button type="link" icon={<HomeOutlined />} onClick={onBack}>
                Harbor Sites
              </Button>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <Space>
                <DatabaseOutlined />
                {harborSite.name}
              </Space>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <Space>
                <FolderOutlined />
                {project.name}
              </Space>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <Space>
                <ContainerOutlined />
                {repository.name}
              </Space>
            </Breadcrumb.Item>
          </Breadcrumb>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '16px' 
          }}>
            <div>
              <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <TagOutlined />
                Artifacts in {repository.name}
              </Title>
              <Text type="secondary">
                Container image artifacts and tags
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
            message={`Repository: ${project.name}/${repository.name}`}
            description={`${repository.description || 'No description available'} | Harbor Site: ${harborSite.url}`}
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />

          {artifacts.length > 0 && (
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Total Artifacts"
                    value={artifacts.length}
                    prefix={<FileImageOutlined />}
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
                    title="Total Size"
                    value={formatBytes(totalSize)}
                    prefix={<CloudDownloadOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Repository Pulls"
                    value={repository.pull_count}
                    prefix={<CloudDownloadOutlined />}
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
          dataSource={artifacts}
          rowKey="id"
          loading={loading}
          expandable={{
            expandedRowRender,
            rowExpandable: () => true,
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} artifacts`,
          }}
          size="middle"
        />
      </Card>
    </div>
  );
};