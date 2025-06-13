import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import { ServerIcon, LayersIcon, HomeIcon, GitBranchIcon, DatabaseIcon } from 'lucide-react'
import { HomePage } from './pages/HomePage'
import { SiteManagement } from './components/sites/SiteManagement'
import { EnvironmentManagement } from './components/environments/EnvironmentManagement'
import { AppInstanceManagement } from './components/app-instances/AppInstanceManagement'
import { ServiceManagement } from './components/services/ServiceManagement'
import './App.css'

const { Header, Content, Sider } = Layout

function App() {
  return (
    <Router>
      <Layout className="min-h-screen">
        <Header className="bg-white border-b border-gray-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ServerIcon size={32} className="text-blue-500" />
            <h1 className="text-xl font-bold text-gray-900 m-0">Rancher Hub</h1>
          </div>
        </Header>
        
        <Layout>
          <Sider width={200} className="bg-white border-r border-gray-200">
            <Menu
              mode="inline"
              defaultSelectedKeys={['/']}
              className="h-full border-r-0"
              items={[
                {
                  key: '/',
                  icon: <HomeIcon size={16} />,
                  label: <a href="/">Dashboard</a>,
                },
                {
                  key: '/sites',
                  icon: <ServerIcon size={16} />,
                  label: <a href="/sites">Rancher Sites</a>,
                },
                {
                  key: '/environments', 
                  icon: <LayersIcon size={16} />,
                  label: <a href="/environments">Environments</a>,
                },
                {
                  key: '/app-instances',
                  icon: <DatabaseIcon size={16} />,
                  label: <a href="/app-instances">App Instances</a>,
                },
                {
                  key: '/services',
                  icon: <GitBranchIcon size={16} />,
                  label: <a href="/services">Services</a>,
                },
              ]}
            />
          </Sider>
          
          <Content className="bg-gray-50">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/sites" element={<SiteManagement />} />
              <Route path="/environments" element={<EnvironmentManagement />} />
              <Route path="/app-instances" element={<AppInstanceManagement />} />
              <Route path="/services" element={<ServiceManagement />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Router>
  )
}

export default App