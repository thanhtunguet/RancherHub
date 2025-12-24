import React, { useState } from 'react';
import { MonitoringDashboard } from '../components/monitoring/MonitoringDashboard';
import { AlertDetailPage } from '../components/monitoring/AlertDetailPage';

export const MonitoringDashboardPage: React.FC = () => {
  const [showAlertDetail, setShowAlertDetail] = useState(false);

  return (
    <div style={{ padding: '24px' }}>
      {showAlertDetail ? (
        <AlertDetailPage onBack={() => setShowAlertDetail(false)} />
      ) : (
        <MonitoringDashboard onNavigateToAlerts={() => setShowAlertDetail(true)} />
      )}
    </div>
  );
};