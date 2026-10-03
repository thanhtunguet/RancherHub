import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MonitoringRepository } from '@/repositories/monitoring.repository';
import type { MonitoredInstance, MonitoringHistoryEntry, MonitoringAlert } from '@/api/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Loader2, CheckCircle, XCircle, AlertTriangle,
  Clock, Activity,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; className: string; Icon: typeof Activity }> = {
  healthy: { label: 'Healthy', className: 'text-success', Icon: CheckCircle },
  warning: { label: 'Warning', className: 'text-yellow-500', Icon: AlertTriangle },
  critical: { label: 'Critical', className: 'text-destructive', Icon: XCircle },
  error: { label: 'Error', className: 'text-destructive', Icon: XCircle },
  paused: { label: 'Paused', className: 'text-muted-foreground', Icon: Clock },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'text-muted-foreground', Icon: Activity };
  const { Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

export default function MonitoringInstanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [instance, setInstance] = useState<MonitoredInstance | null>(null);
  const [history, setHistory] = useState<MonitoringHistoryEntry[]>([]);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [days, setDays] = useState(7);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.allSettled([
      MonitoringRepository.getInstance(id),
      MonitoringRepository.getHistory(id, days),
      MonitoringRepository.getAlerts(id),
    ]).then(([instRes, histRes, alertRes]) => {
      if (instRes.status === 'fulfilled') {
        setInstance(instRes.value);
      } else {
        setNotFound(true);
      }
      if (histRes.status === 'fulfilled') setHistory(Array.isArray(histRes.value) ? histRes.value : []);
      if (alertRes.status === 'fulfilled') setAlerts(Array.isArray(alertRes.value) ? alertRes.value : []);
      setLoading(false);
    });
  }, [id, days]);

  const resolveAlert = async (alertId: string) => {
    try {
      await MonitoringRepository.resolveAlert(alertId);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
      toast({ title: 'Alert resolved' });
    } catch {
      toast({ title: 'Error resolving alert', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !instance) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/monitoring')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <p className="text-sm text-muted-foreground">Instance not found.</p>
      </div>
    );
  }

  const activeAlerts = alerts.filter(a => !a.resolved);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/monitoring')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{instance.appInstance?.name ?? instance.appInstanceId}</h1>
          <p className="text-sm text-muted-foreground">Monitoring history</p>
        </div>
      </div>

      {/* Instance info */}
      <div className="surface-elevated rounded-lg p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4" /> Instance Details
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground block text-xs mb-0.5">Environment</span>
            <span>{instance.appInstance?.environment?.name ?? '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs mb-0.5">Cluster</span>
            <span className="font-mono text-xs">{instance.appInstance?.cluster ?? '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs mb-0.5">Namespace</span>
            <span className="font-mono text-xs">{instance.appInstance?.namespace ?? '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs mb-0.5">Check Interval</span>
            <span>Every {instance.checkIntervalMinutes}min</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs mb-0.5">Monitoring</span>
            <span className={instance.monitoringEnabled ? 'text-success' : 'text-muted-foreground'}>
              {instance.monitoringEnabled ? 'Active' : 'Paused'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs mb-0.5">Current Status</span>
            {instance.lastStatus
              ? <StatusBadge status={instance.lastStatus} />
              : <span className="text-xs text-muted-foreground">Unknown</span>}
          </div>
          {instance.lastCheckTime && (
            <div>
              <span className="text-muted-foreground block text-xs mb-0.5">Last Check</span>
              <span className="text-xs">{new Date(instance.lastCheckTime).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="surface-elevated rounded-lg p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <XCircle className="h-4 w-4" /> Alerts ({activeAlerts.length} active)
          </h2>
          <div className="space-y-2">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 rounded-md bg-background border border-border"
              >
                <div className="flex items-center gap-3">
                  {alert.resolved
                    ? <CheckCircle className="h-4 w-4 text-success" />
                    : <XCircle className="h-4 w-4 text-destructive" />}
                  <div>
                    <p className="text-sm">{alert.message ?? 'Alert'}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
                {!alert.resolved && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { void resolveAlert(alert.id); }}
                  >
                    Resolve
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div className="surface-elevated rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Check History</h2>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-1">Show last</span>
            {([7, 14, 30] as const).map(d => (
              <Button
                key={d}
                variant={days === d ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setDays(d)}
              >
                {d}d
              </Button>
            ))}
          </div>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history records for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">Time</th>
                  <th className="text-left py-2 pr-4 font-medium">Status</th>
                  <th className="text-right py-2 pr-4 font-medium">Response</th>
                  <th className="text-right py-2 pr-4 font-medium">Total</th>
                  <th className="text-right py-2 pr-4 font-medium">Healthy</th>
                  <th className="text-right py-2 pr-4 font-medium">Failed</th>
                  <th className="text-right py-2 font-medium">Paused</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map(entry => (
                  <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(entry.checkTime).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={entry.status} />
                      {entry.error && (
                        <p className="text-xs text-destructive mt-0.5 line-clamp-1">{entry.error}</p>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-xs">
                      {entry.responseTimeMs != null ? `${entry.responseTimeMs}ms` : '—'}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-xs">
                      {entry.servicesCount ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-xs text-success">
                      {entry.healthyServices ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-xs text-destructive">
                      {entry.failedServices ?? '—'}
                    </td>
                    <td className="py-2 text-right tabular-nums text-xs text-muted-foreground">
                      {entry.pausedServices ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
