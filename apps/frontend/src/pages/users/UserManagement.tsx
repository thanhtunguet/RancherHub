import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Modal,
  message,
  Tooltip,
  Switch,
  Statistic,
  Row,
  Col,
  Form,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SafetyOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { usersApi } from '../../services/api';
import type { User, QueryUserParams } from '../../types';
import CreateUserModal from '../../components/users/CreateUserModal';
import EditUserModal from '../../components/users/EditUserModal';

const { Search } = Input;

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    with2FA: 0,
  });

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteForm] = Form.useForm();

  const fetchUsers = async (params?: Partial<QueryUserParams>) => {
    setLoading(true);
    try {
      const queryParams: QueryUserParams = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText || undefined,
        active: activeFilter,
        ...params,
      };

      const response = await usersApi.getAll(queryParams);
      setUsers(response.data);
      setPagination({
        current: response.page,
        pageSize: response.limit,
        total: response.total,
      });
    } catch (error: any) {
      message.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await usersApi.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
    fetchUsers({ search: value, page: 1 });
  };

  const handleActiveFilterChange = (checked: boolean) => {
    const newFilter = checked ? true : undefined;
    setActiveFilter(newFilter);
    setPagination({ ...pagination, current: 1 });
    fetchUsers({ active: newFilter, page: 1 });
  };

  const handleTableChange = (newPagination: any) => {
    setPagination(newPagination);
    fetchUsers({
      page: newPagination.current,
      limit: newPagination.pageSize,
    });
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      const values = await deleteForm.validateFields();
      await usersApi.delete(userToDelete.id, {
        adminTwoFactorToken: values.adminTwoFactorToken,
      });
      message.success('User deleted successfully');
      deleteForm.resetFields();
      setDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
      fetchStats();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete user';
      message.error(errorMessage);
    }
  };

  const handleRefresh = () => {
    fetchUsers();
    fetchStats();
  };

  const columns: ColumnsType<User> = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      render: (text, record) => (
        <Space>
          <UserOutlined />
          <span className="font-medium">{text}</span>
          {record.twoFactorEnabled && (
            <Tooltip title="2FA Enabled">
              <SafetyOutlined style={{ color: '#52c41a' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean) => (
        <Tag
          icon={active ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={active ? 'success' : 'error'}
        >
          {active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'First Login',
      dataIndex: 'isFirstLogin',
      key: 'isFirstLogin',
      render: (isFirstLogin: boolean) => (
        <Tag color={isFirstLogin ? 'warning' : 'default'}>
          {isFirstLogin ? 'Pending' : 'Completed'}
        </Tag>
      ),
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (date: string | null) =>
        date ? new Date(date).toLocaleString() : 'Never',
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit User">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Delete User">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteClick(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">User Management</h1>

        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Users"
                value={stats.total}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Active Users"
                value={stats.active}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Inactive Users"
                value={stats.inactive}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="With 2FA"
                value={stats.with2FA}
                prefix={<SafetyOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        <Card>
          <div className="mb-4 flex justify-between items-center">
            <Space>
              <Search
                placeholder="Search by username or email"
                allowClear
                onSearch={handleSearch}
                style={{ width: 300 }}
                prefix={<SearchOutlined />}
              />
              <span className="text-gray-600">Show Active Only:</span>
              <Switch
                checked={activeFilter === true}
                onChange={handleActiveFilterChange}
              />
            </Space>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalOpen(true)}
              >
                Create User
              </Button>
            </Space>
          </div>

          <Table
            columns={columns}
            dataSource={users}
            rowKey="id"
            loading={loading}
            pagination={pagination}
            onChange={handleTableChange}
          />
        </Card>
      </div>

      <CreateUserModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          fetchUsers();
          fetchStats();
        }}
      />

      <EditUserModal
        open={editModalOpen}
        user={selectedUser}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={() => {
          fetchUsers();
          fetchStats();
        }}
      />

      <Modal
        title="Delete User"
        open={deleteModalOpen}
        onOk={handleDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setUserToDelete(null);
          deleteForm.resetFields();
        }}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <p className="mb-4">
          Are you sure you want to delete user <strong>{userToDelete?.username}</strong>?
          This action cannot be undone.
        </p>
        <Form form={deleteForm} layout="vertical">
          <Form.Item
            label="Your 2FA Code"
            name="adminTwoFactorToken"
            rules={[
              { required: true, message: 'Please enter your 2FA code' },
              { len: 6, message: '2FA code must be 6 digits' },
            ]}
            extra="Enter the 6-digit code from your authenticator app to authorize this action"
          >
            <Input
              prefix={<SafetyOutlined />}
              placeholder="Enter 6-digit 2FA code"
              size="large"
              maxLength={6}
              style={{ letterSpacing: '0.5em', fontWeight: 'bold' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
