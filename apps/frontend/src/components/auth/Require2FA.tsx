import React, { useState } from 'react';
import Modal from 'antd/es/modal';
import Typography from 'antd/es/typography';
import Alert from 'antd/es/alert';
import { SafetyOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { TwoFactorSetup } from './TwoFactorSetup';

const { Title, Paragraph } = Typography;

interface Require2FAProps {
  children: React.ReactNode;
}

export const Require2FA: React.FC<Require2FAProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [setupComplete, setSetupComplete] = useState(false);

  // If not authenticated, show children (login page)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // If user has 2FA enabled or just completed setup, show children (main app)
  if (user?.twoFactorEnabled || setupComplete) {
    return <>{children}</>;
  }

  // User is authenticated but doesn't have 2FA - show mandatory setup
  return (
    <>
      {children}
      <Modal
        open={true}
        closable={false}
        maskClosable={false}
        keyboard={false}
        footer={null}
        width={900}
        centered
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <SafetyOutlined style={{ fontSize: 72, color: '#faad14' }} />
          <Title level={2} style={{ marginTop: 16, marginBottom: 8 }}>
            Two-Factor Authentication Required
          </Title>
          <Paragraph type="secondary" style={{ fontSize: 16 }}>
            For your security, you must enable 2FA to continue using Rancher Hub
          </Paragraph>
        </div>

        <Alert
          message="Security Policy"
          description="Two-factor authentication (2FA) is mandatory for all users to protect sensitive infrastructure data. Please set up 2FA now to continue."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <TwoFactorSetup
          onComplete={() => {
            setSetupComplete(true);
          }}
          onCancel={undefined}
        />
      </Modal>
    </>
  );
};
