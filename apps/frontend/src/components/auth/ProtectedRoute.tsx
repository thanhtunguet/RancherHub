import React from 'react';
import Spin from 'antd/es/spin';
import { useAuth } from '../../contexts/AuthContext';
import { LandingPage } from '../../pages/LandingPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <>{children}</>;
};