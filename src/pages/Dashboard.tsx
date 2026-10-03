import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { EnvironmentsRepository } from '@/repositories/environments.repository';
import { SitesRepository } from '@/repositories/sites.repository';
import { AppInstancesRepository } from '@/repositories/app-instances.repository';
import type { Environment, Site } from '@/api/types';
import { Server, Globe, Box, Layers, Activity, AlertTriangle } from 'lucide-react';

interface StatCard {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [instanceCount, setInstanceCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      EnvironmentsRepository.findAll(),
      SitesRepository.findAll(),
      AppInstancesRepository.findAll(),
    ]).then(([envRes, sitesRes, instancesRes]) => {
      if (envRes.status === 'fulfilled') setEnvironments(Array.isArray(envRes.value) ? envRes.value : []);
      if (sitesRes.status === 'fulfilled') setSites(Array.isArray(sitesRes.value) ? sitesRes.value : []);
      if (instancesRes.status === 'fulfilled') setInstanceCount(Array.isArray(instancesRes.value) ? instancesRes.value.length : 0);
      setLoading(false);
    });
  }, []);

  const stats: StatCard[] = [
    { label: 'Rancher Sites', value: sites.length, icon: Server, color: 'text-primary' },
    { label: 'Environments', value: environments.length, icon: Globe, color: 'text-info' },
    { label: 'App Instances', value: instanceCount, icon: Box, color: 'text-success' },
    { label: 'Active Sites', value: sites.filter(s => s.active).length, icon: Activity, color: 'text-warning' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, <span className="text-primary font-mono">{user?.username}</span>
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="surface-elevated rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-bold mt-1 font-mono">
                  {loading ? '—' : stat.value}
                </p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color} opacity-50`} />
            </div>
          </div>
        ))}
      </div>

      {/* Environments overview */}
      <div className="surface-elevated rounded-lg p-5">
        <h2 className="text-lg font-semibold mb-4">Environments</h2>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : environments.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <AlertTriangle className="h-4 w-4" />
            No environments configured yet
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {environments.map((env) => (
              <div key={env.id} className="flex items-center gap-3 p-3 rounded-md bg-background border border-border">
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: env.color }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{env.name}</p>
                  {env.description && (
                    <p className="text-xs text-muted-foreground truncate">{env.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent sites */}
      <div className="surface-elevated rounded-lg p-5">
        <h2 className="text-lg font-semibold mb-4">Rancher Sites</h2>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : sites.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <AlertTriangle className="h-4 w-4" />
            No sites configured yet
          </div>
        ) : (
          <div className="space-y-2">
            {sites.map((site) => (
              <div key={site.id} className="flex items-center justify-between p-3 rounded-md bg-background border border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <Server className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{site.name}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{site.url}</p>
                  </div>
                </div>
                <div className={`h-2 w-2 rounded-full shrink-0 ${site.active ? 'bg-success' : 'bg-muted-foreground'}`} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
