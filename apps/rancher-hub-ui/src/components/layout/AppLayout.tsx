import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/IconButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Server, Globe, Layers, Container, Box, History,
  Users, Settings, ChevronLeft, ChevronRight, User, LogOut,
  Activity, Database, Lock, LayoutDashboard, Anchor, Bell, Mail, Smartphone
} from 'lucide-react';
import { getConfig } from '@/api/client';

type NavItem = { label: string; icon: React.ElementType; path: string };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: (NavItem | NavGroup)[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  {
    label: 'Sites',
    items: [
      { label: 'Rancher', icon: Server, path: '/sites' },
      { label: 'Harbor', icon: Anchor, path: '/harbor' },
      { label: 'Generic Clusters', icon: Database, path: '/clusters' },
    ],
  },
  {
    label: 'Apps',
    items: [
      { label: 'Environments', icon: Globe, path: '/environments' },
      { label: 'App Instances', icon: Box, path: '/app-instances' },
    ],
  },
  {
    label: 'State Management',
    items: [
      { label: 'Services', icon: Layers, path: '/services' },
      { label: 'Storage View', icon: Container, path: '/storage' },
      { label: 'ConfigMaps', icon: Settings, path: '/configmaps' },
      { label: 'Secrets', icon: Lock, path: '/secrets' },
      { label: 'Sync History', icon: History, path: '/sync-history' },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { label: 'Monitored Instances', icon: Activity, path: '/monitoring' },
      { label: 'Configuration', icon: Bell, path: '/monitoring/config' },
      { label: 'Message Templates', icon: Mail, path: '/monitoring/templates' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Users', icon: Users, path: '/users' },
    ],
  },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const config = getConfig();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen border-r border-border bg-sidebar flex flex-col z-30 transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
          <Server className="h-5 w-5 text-primary shrink-0" />
          {!collapsed && <span className="font-bold text-sm text-gradient truncate">RancherHub</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {navGroups.map((entry, i) => {
            if ('path' in entry) {
              const item = entry as NavItem;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                  activeClassName="bg-sidebar-accent text-primary font-medium"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            }
            const group = entry as NavGroup;
            return (
              <div key={group.label} className={i > 0 ? 'pt-3' : ''}>
                {!collapsed && (
                  <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </span>
                )}
                <div className="mt-1 space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border p-2 shrink-0">
          <IconButton
            tooltip={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center text-muted-foreground"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </IconButton>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-all duration-200 ${collapsed ? 'ml-16' : 'ml-56'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse-glow" />
              <span className="text-muted-foreground">{config.environment}</span>
            </div>
            <span className="text-border">|</span>
            <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">{config.baseURL}</span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-sm">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-3 w-3 text-primary" />
                  </div>
                  <span className="hidden sm:inline text-foreground">{user?.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/trusted-devices')}>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Trusted Devices
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
