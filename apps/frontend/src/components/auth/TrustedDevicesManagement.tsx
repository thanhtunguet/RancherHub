import React, { useState, useEffect } from 'react';
import List from 'antd/es/list';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import Typography from 'antd/es/typography';
import Space from 'antd/es/space';
import Modal from 'antd/es/modal';
import message from 'antd/es/message';
import Tag from 'antd/es/tag';
import Spin from 'antd/es/spin';
import Empty from 'antd/es/empty';
import {
  LaptopOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { trustedDevicesService } from '../../services/trustedDevices';
import type { TrustedDevice } from '../../types/auth';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

export const TrustedDevicesManagement: React.FC = () => {
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const data = await trustedDevicesService.getTrustedDevices();
      setDevices(data);
    } catch (error) {
      message.error('Failed to load trusted devices');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeDevice = (deviceId: string, deviceName: string) => {
    Modal.confirm({
      title: 'Revoke Trusted Device',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to revoke "${deviceName}"? You will need to verify 2FA next time you login from this device.`,
      okText: 'Revoke',
      okType: 'danger',
      onOk: async () => {
        try {
          await trustedDevicesService.revokeDevice(deviceId);
          message.success('Device revoked successfully');
          loadDevices();
        } catch (error) {
          message.error('Failed to revoke device');
        }
      },
    });
  };

  const handleRevokeAll = () => {
    Modal.confirm({
      title: 'Revoke All Trusted Devices',
      icon: <ExclamationCircleOutlined />,
      content:
        'Are you sure you want to revoke all trusted devices? You will need to verify 2FA on all devices next time you login.',
      okText: 'Revoke All',
      okType: 'danger',
      onOk: async () => {
        try {
          const result = await trustedDevicesService.revokeAllDevices();
          message.success(`${result.count} device(s) revoked successfully`);
          loadDevices();
        } catch (error) {
          message.error('Failed to revoke devices');
        }
      },
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Trusted Devices
            </Title>
            <Text type="secondary">
              Devices where you've chosen to skip 2FA for 30 days. Maximum 3
              devices.
            </Text>
          </div>
          {devices.length > 0 && (
            <Button danger onClick={handleRevokeAll}>
              Revoke All
            </Button>
          )}
        </div>

        {devices.length === 0 ? (
          <Empty
            description="No trusted devices. Enable 'Trust this device' during login to skip 2FA."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            dataSource={devices}
            renderItem={(device) => {
              const isExpiringSoon =
                dayjs(device.expiresAt).diff(dayjs(), 'day') <= 3;
              const isCurrentDevice = device.isCurrentDevice;

              return (
                <List.Item
                  actions={[
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() =>
                        handleRevokeDevice(device.id, device.deviceName)
                      }
                    >
                      Revoke
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<LaptopOutlined style={{ fontSize: 24 }} />}
                    title={
                      <Space>
                        {device.deviceName}
                        {isCurrentDevice && (
                          <Tag icon={<CheckCircleOutlined />} color="success">
                            Current Device
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size="small">
                        {device.ipAddress && (
                          <Text type="secondary">IP: {device.ipAddress}</Text>
                        )}
                        <Text type="secondary">
                          Last used: {dayjs(device.lastUsedAt).fromNow()}
                        </Text>
                        <Text type={isExpiringSoon ? 'warning' : 'secondary'}>
                          Expires: {dayjs(device.expiresAt).fromNow()}
                          {isExpiringSoon && ' (expiring soon)'}
                        </Text>
                        <Text type="secondary">
                          Added: {dayjs(device.createdAt).format('MMM D, YYYY')}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}

        {devices.length >= 3 && (
          <Card type="inner" style={{ backgroundColor: '#fffbe6' }}>
            <Text type="warning">
              You've reached the maximum of 3 trusted devices. Adding a new
              device will remove the oldest one.
            </Text>
          </Card>
        )}
      </Space>
    </Card>
  );
};
