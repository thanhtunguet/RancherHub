import React, { useState, useEffect } from 'react';
import Modal from 'antd/es/modal';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Button from 'antd/es/button';
import Switch from 'antd/es/switch';
import message from 'antd/es/message';
import { UserOutlined, MailOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { usersApi } from '../../services/api';
import type { User, UpdateUserRequest } from '../../types';

interface EditUserModalProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ open, user, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && open) {
      form.setFieldsValue({
        username: user.username,
        email: user.email,
        active: user.active,
        password: '',
        adminTwoFactorToken: '',
      });
    }
  }, [user, open, form]);

  const handleSubmit = async (values: any) => {
    if (!user) return;

    setLoading(true);
    try {
      const updateUserData: UpdateUserRequest = {
        adminTwoFactorToken: values.adminTwoFactorToken,
      };

      if (values.username !== user.username) {
        updateUserData.username = values.username;
      }

      if (values.email !== user.email) {
        updateUserData.email = values.email;
      }

      if (values.password) {
        updateUserData.password = values.password;
      }

      if (values.active !== user.active) {
        updateUserData.active = values.active;
      }

      await usersApi.update(user.id, updateUserData);
      message.success('User updated successfully');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update user';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Edit User"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label="Username"
          name="username"
          rules={[
            { required: true, message: 'Please enter username' },
            { min: 3, message: 'Username must be at least 3 characters' },
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="Enter username"
            size="large"
          />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Please enter email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input
            prefix={<MailOutlined />}
            placeholder="Enter email address"
            size="large"
            type="email"
          />
        </Form.Item>

        <Form.Item
          label="New Password (leave blank to keep current)"
          name="password"
          rules={[
            { min: 8, message: 'Password must be at least 8 characters' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Enter new password (optional)"
            size="large"
          />
        </Form.Item>

        <Form.Item
          label="Active Status"
          name="active"
          valuePropName="checked"
        >
          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
        </Form.Item>

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

        <Form.Item className="mb-0">
          <div className="flex gap-2 justify-end">
            <Button onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Update User
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditUserModal;
