import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Layout from "antd/es/layout";
import Menu from "antd/es/menu";
import { Button, Dropdown, Avatar, Space, Modal } from "antd";
import { UserOutlined, LogoutOutlined, SafetyOutlined, KeyOutlined, LaptopOutlined } from "@ant-design/icons";
import {
  ServerIcon,
  LayersIcon,
  HomeIcon,
  GitBranchIcon,
  DatabaseIcon,
  HistoryIcon,
  HardDriveIcon,
  ActivityIcon,
  GitCompareIcon,
  UsersIcon,
  ShieldIcon,
  CloudIcon,
} from "lucide-react";
import { HomePage } from "./pages/HomePage";
import { LandingPage } from "./pages/LandingPage";
import { SiteManagement } from "./components/sites/SiteManagement";
import { EnvironmentManagement } from "./components/environments/EnvironmentManagement";
import { AppInstanceManagement } from "./components/app-instances/AppInstanceManagement";
import { ServiceManagement } from "./components/services/ServiceManagement";
import { ConfigMapDiffPage } from "./pages/ConfigMapDiffPage";
import { SecretDiffPage } from "./pages/SecretDiffPage";
import { StorageViewPage } from "./pages/StorageViewPage";
import { HarborSiteManagement } from "./components/harbor-sites/HarborSiteManagement";
import { HarborBrowser } from "./components/harbor-sites/HarborBrowser";
import { SyncHistoryPage } from "./pages/SyncHistoryPage";
import { MonitoringPage } from "./pages/MonitoringPage";
import UserManagement from "./pages/users/UserManagement";
import { GenericClusterSiteManagement } from "./components/generic-cluster-sites/GenericClusterSiteManagement";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { TwoFactorSetup } from "./components/auth/TwoFactorSetup";
import { ChangePassword } from "./components/auth/ChangePassword";
import { Disable2FAConfirm } from "./components/auth/Disable2FAConfirm";
import { Require2FA } from "./components/auth/Require2FA";
import { TrustedDevicesManagement } from "./components/auth/TrustedDevicesManagement";
import "./App.css";

const { Header, Content, Sider } = Layout;

function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [showTrustedDevices, setShowTrustedDevices] = useState(false);

  // Redirect to landing page if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handle2FAToggle = () => {
    if (user?.twoFactorEnabled) {
      setShowDisable2FA(true);
    } else {
      setShow2FASetup(true);
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: `Signed in as ${user?.username}`,
      disabled: true,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'change-password',
      icon: <KeyOutlined />,
      label: 'Change Password',
      onClick: () => setShowChangePassword(true),
    },
    {
      key: '2fa',
      icon: <SafetyOutlined />,
      label: user?.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA',
      onClick: handle2FAToggle,
    },
    {
      key: 'trusted-devices',
      icon: <LaptopOutlined />,
      label: 'Trusted Devices',
      onClick: () => setShowTrustedDevices(true),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Header className="bg-white border-b border-gray-200 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ServerIcon size={32} className="text-blue-500" />
          <h1 className="text-xl font-bold text-gray-900 m-0">Rancher Hub</h1>
        </div>
        
        <Space>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Button type="text" style={{ height: 'auto', padding: '4px 8px' }}>
              <Space>
                <Avatar size="small" icon={<UserOutlined />} />
                <span>{user?.username}</span>
              </Space>
            </Button>
          </Dropdown>
        </Space>
      </Header>

      <Layout>
        <Sider width={200} className="bg-white border-r border-gray-200">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            className="h-full border-r-0"
            onClick={({ key }) => handleMenuClick(key)}
            items={[
              {
                key: "/dashboard",
                icon: <HomeIcon size={16} />,
                label: "Dashboard",
              },
              {
                key: "/sites",
                icon: <ServerIcon size={16} />,
                label: "Rancher Sites",
              },
              {
                key: "/generic-cluster-sites",
                icon: <CloudIcon size={16} />,
                label: "Generic Clusters",
              },
              {
                key: "/harbor-sites",
                icon: <HardDriveIcon size={16} />,
                label: "Harbor Sites",
              },
              {
                key: "/environments",
                icon: <LayersIcon size={16} />,
                label: "Environments",
              },
              {
                key: "/app-instances",
                icon: <DatabaseIcon size={16} />,
                label: "App Instances",
              },
              {
                key: "/services",
                icon: <GitBranchIcon size={16} />,
                label: "Services",
              },
              {
                key: "/configmap-diffs",
                icon: <GitCompareIcon size={16} />,
                label: "ConfigMaps",
              },
              {
                key: "/secret-diffs",
                icon: <ShieldIcon size={16} />,
                label: "Secrets",
              },
              {
                key: "/storage",
                icon: <DatabaseIcon size={16} />,
                label: "Storage View",
              },
              {
                key: "/monitoring",
                icon: <ActivityIcon size={16} />,
                label: "Monitoring",
              },
              {
                key: "/sync-history",
                icon: <HistoryIcon size={16} />,
                label: "Sync History",
              },
              {
                key: "/users",
                icon: <UsersIcon size={16} />,
                label: "User Management",
              },
            ]}
          />
        </Sider>

        <Content className="bg-gray-50">
          <Routes>
            <Route path="/dashboard" element={<HomePage />} />
            <Route path="/sites" element={<SiteManagement />} />
            <Route
              path="/generic-cluster-sites"
              element={<GenericClusterSiteManagement />}
            />
            <Route path="/environments" element={<EnvironmentManagement />} />
            <Route
              path="/app-instances"
              element={<AppInstanceManagement />}
            />
            <Route path="/services" element={<ServiceManagement />} />
            <Route path="/configmap-diffs" element={<ConfigMapDiffPage />} />
            <Route path="/secret-diffs" element={<SecretDiffPage />} />
            <Route path="/storage" element={<StorageViewPage />} />
            <Route path="/harbor-sites" element={<HarborSiteManagement />} />
            <Route path="/harbor-sites/:siteId/browser" element={<HarborBrowser />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/sync-history" element={<SyncHistoryPage />} />
            <Route path="/users" element={<UserManagement />} />
          </Routes>
        </Content>
      </Layout>
      
      <Modal
        title="Two-Factor Authentication Setup"
        open={show2FASetup}
        onCancel={() => setShow2FASetup(false)}
        footer={null}
        width={900}
        centered
      >
        <TwoFactorSetup
          onComplete={() => setShow2FASetup(false)}
          onCancel={() => setShow2FASetup(false)}
        />
      </Modal>

      <Modal
        title="Change Password"
        open={showChangePassword}
        onCancel={() => setShowChangePassword(false)}
        footer={null}
        width={600}
        centered
      >
        <ChangePassword
          onComplete={() => setShowChangePassword(false)}
          onCancel={() => setShowChangePassword(false)}
        />
      </Modal>

      <Modal
        title="Disable Two-Factor Authentication"
        open={showDisable2FA}
        onCancel={() => setShowDisable2FA(false)}
        footer={null}
        width={600}
        centered
      >
        <Disable2FAConfirm
          onComplete={() => setShowDisable2FA(false)}
          onCancel={() => setShowDisable2FA(false)}
        />
      </Modal>

      <Modal
        title="Trusted Devices"
        open={showTrustedDevices}
        onCancel={() => setShowTrustedDevices(false)}
        footer={null}
        width={800}
        centered
      >
        <TrustedDevicesManagement />
      </Modal>
    </Layout>
  );
}

function ProtectedDashboard() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Require2FA>
      <DashboardLayout />
    </Require2FA>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/*" element={<ProtectedDashboard />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
