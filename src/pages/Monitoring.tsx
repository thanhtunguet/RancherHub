import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MonitoringRepository } from '@/repositories/monitoring.repository';
import { AppInstancesRepository } from '@/repositories/app-instances.repository';
import type { MonitoringConfig, MonitoredInstance, MonitoringAlert, AppInstance } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Activity, Bell, Loader2, CheckCircle, XCircle, Plus, Pencil, Trash2 } from 'lucide-react';

export default function MonitoringPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [config, setConfig] = useState<MonitoringConfig | null>(null);
  const [instances, setInstances] = useState<MonitoredInstance[]>([]);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Add instance dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [appInstances, setAppInstances] = useState<AppInstance[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAppInstanceId, setSelectedAppInstanceId] = useState('');
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [checkInterval, setCheckInterval] = useState(5);
  const [editingInstance, setEditingInstance] = useState<MonitoredInstance | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MonitoredInstance | null>(null);
  const [actionInstanceId, setActionInstanceId] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.allSettled([
      MonitoringRepository.getConfig(),
      MonitoringRepository.getInstances(),
      MonitoringRepository.getAlerts(),
    ]).then(([configRes, instRes, alertRes]) => {
      if (configRes.status === 'fulfilled') setConfig(configRes.value);
      if (instRes.status === 'fulfilled') setInstances(Array.isArray(instRes.value) ? instRes.value : []);
      if (alertRes.status === 'fulfilled') setAlerts(Array.isArray(alertRes.value) ? alertRes.value : []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const resolveAlert = async (id: string) => {
    try {
      await MonitoringRepository.resolveAlert(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
      toast({ title: 'Alert resolved' });
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const openDialog = async (instance?: MonitoredInstance) => {
    setEditingInstance(instance || null);
    setSelectedAppInstanceId(instance?.appInstanceId || '');
    setMonitoringEnabled(instance?.monitoringEnabled ?? true);
    setCheckInterval(instance?.checkIntervalMinutes ?? 5);
    setDialogOpen(true);
    setLoadingApps(true);
    try {
      const apps = await AppInstancesRepository.findAll();
      const list = Array.isArray(apps) ? apps : [];
      const monitoredIds = new Set(instances.map(i => i.appInstanceId));
      setAppInstances(
        list.filter(a => a.id === instance?.appInstanceId || !monitoredIds.has(a.id)),
      );
    } catch {
      toast({ title: 'Failed to load app instances', variant: 'destructive' });
    } finally {
      setLoadingApps(false);
    }
  };

  const openAddDialog = () => {
    void openDialog();
  };

  const openEditDialog = (instance: MonitoredInstance) => {
    void openDialog(instance);
  };

  const handleSave = async () => {
    if (!selectedAppInstanceId) {
      toast({ title: 'Select an instance', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editingInstance) {
        await MonitoringRepository.updateInstance(editingInstance.id, {
          appInstanceId: selectedAppInstanceId,
          monitoringEnabled,
          checkIntervalMinutes: checkInterval,
        });
        toast({ title: 'Monitoring instance updated' });
      } else {
        await MonitoringRepository.createInstance({
          appInstanceId: selectedAppInstanceId,
          monitoringEnabled,
          checkIntervalMinutes: checkInterval,
        });
        toast({ title: 'Instance added to monitoring' });
      }
      setDialogOpen(false);
      setEditingInstance(null);
      fetchData();
    } catch {
      toast({ title: editingInstance ? 'Failed to update instance' : 'Failed to add instance', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMonitoring = async (instance: MonitoredInstance, enabled: boolean) => {
    setActionInstanceId(instance.id);
    try {
      await MonitoringRepository.updateInstance(instance.id, { monitoringEnabled: enabled });
      setInstances(prev => prev.map(i => (i.id === instance.id ? { ...i, monitoringEnabled: enabled } : i)));
      toast({ title: `Monitoring ${enabled ? 'enabled' : 'paused'}` });
    } catch {
      toast({ title: 'Failed to update monitoring status', variant: 'destructive' });
    } finally {
      setActionInstanceId(null);
    }
  };

  const handleDeleteInstance = async () => {
    if (!deleteTarget) return;
    setActionInstanceId(deleteTarget.id);
    try {
      await MonitoringRepository.deleteInstance(deleteTarget.id);
      setInstances(prev => prev.filter(i => i.id !== deleteTarget.id));
      toast({ title: 'Monitoring instance removed' });
    } catch {
      toast({ title: 'Failed to remove instance', variant: 'destructive' });
    } finally {
      setActionInstanceId(null);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Monitoring</h1><p className="text-sm text-muted-foreground">Health monitoring and alerts</p></div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Config status */}
          <div className="surface-elevated rounded-lg p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Activity className="h-4 w-4" /> Configuration</h2>
            {config ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div><span className="text-muted-foreground">Status:</span> <span className={config.monitoringEnabled ? 'text-success' : 'text-muted-foreground'}>{config.monitoringEnabled ? 'Enabled' : 'Disabled'}</span></div>
                <div><span className="text-muted-foreground">Schedule:</span> <span>{config.notificationSchedule}</span></div>
                <div><span className="text-muted-foreground">Threshold:</span> <span className="font-mono">{config.alertThreshold}</span></div>
                <div><span className="text-muted-foreground">Telegram:</span> <span>{config.telegramChatId ? 'Configured' : 'Not set'}</span></div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No monitoring configuration found</p>
            )}
          </div>

          {/* Monitored instances */}
          <div className="surface-elevated rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Monitored Instances ({instances.length})</h2>
              <Button size="sm" onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" /> Add Instance
              </Button>
            </div>
            {instances.length === 0 ? (
              <p className="text-sm text-muted-foreground">No instances being monitored</p>
            ) : (
              <div className="space-y-2">
                {instances.map(inst => {
                  const statusDotClass = !inst.monitoringEnabled
                    ? 'bg-muted-foreground'
                    : inst.lastStatus === 'healthy'
                    ? 'bg-success animate-pulse-glow'
                    : inst.lastStatus === 'warning'
                    ? 'bg-yellow-500 animate-pulse-glow'
                    : inst.lastStatus === 'critical' || inst.lastStatus === 'error'
                    ? 'bg-destructive'
                    : 'bg-muted-foreground';

                  return (
                  <div key={inst.id} className="flex items-center justify-between p-3 rounded-md bg-background border border-border">
                    <button
                      type="button"
                      className="flex-1 text-left min-w-0 cursor-pointer"
                      onClick={() => navigate(`/monitoring/instances/${inst.id}`)}
                    >
                      <p className="text-sm font-medium hover:underline">{inst.appInstance?.name || inst.appInstanceId}</p>
                      <p className="text-xs text-muted-foreground">
                        Every {inst.checkIntervalMinutes}min • {inst.monitoringEnabled ? 'Active' : 'Paused'}
                        {inst.lastStatus ? ` • ${inst.lastStatus}` : ''}
                      </p>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={inst.monitoringEnabled}
                        onCheckedChange={(checked) => { void handleToggleMonitoring(inst, checked); }}
                        disabled={actionInstanceId === inst.id}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(inst)}
                        disabled={actionInstanceId === inst.id}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(inst)}
                        disabled={actionInstanceId === inst.id}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      {actionInstanceId === inst.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <div className={`h-2.5 w-2.5 rounded-full ${statusDotClass}`} />
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Alerts */}
          <div className="surface-elevated rounded-lg p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Bell className="h-4 w-4" /> Alerts ({alerts.filter(a => !a.resolved).length} active)</h2>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No alerts</p>
            ) : (
              <div className="space-y-2">
                {alerts.map(alert => (
                  <div key={alert.id} className="flex items-center justify-between p-3 rounded-md bg-background border border-border">
                    <div className="flex items-center gap-3">
                      {alert.resolved ? <CheckCircle className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                      <div>
                        <p className="text-sm">{alert.message || 'Alert'}</p>
                        <p className="text-xs text-muted-foreground">{alert.createdAt ? new Date(alert.createdAt).toLocaleString() : ''}</p>
                      </div>
                    </div>
                    {!alert.resolved && (
                      <Button variant="outline" size="sm" onClick={() => resolveAlert(alert.id)}>Resolve</Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Instance Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingInstance(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingInstance ? 'Edit Monitoring Instance' : 'Add Instance to Monitoring'}</DialogTitle>
            <DialogDescription>
              Select an app instance and configure its monitoring settings
            </DialogDescription>
          </DialogHeader>
          {loadingApps ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>App Instance</Label>
                <Select value={selectedAppInstanceId} onValueChange={setSelectedAppInstanceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an instance..." />
                  </SelectTrigger>
                  <SelectContent emptyMessage={appInstances.length === 0 ? 'No available app instances' : undefined}>
                    {appInstances.map(app => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.name} — {app.namespace}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Monitoring Enabled</Label>
                  <p className="text-xs text-muted-foreground">Start monitoring immediately</p>
                </div>
                <Switch checked={monitoringEnabled} onCheckedChange={setMonitoringEnabled} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="interval">Check Interval (minutes)</Label>
                <Input
                  id="interval"
                  type="number"
                  min={1}
                  max={1440}
                  value={checkInterval}
                  onChange={e => setCheckInterval(Number(e.target.value))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !selectedAppInstanceId}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingInstance ? 'Save Changes' : 'Add to Monitoring'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove monitored instance?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop health monitoring for <strong>{deleteTarget?.appInstance?.name || deleteTarget?.appInstanceId}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actionInstanceId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { void handleDeleteInstance(); }}
              disabled={!!actionInstanceId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionInstanceId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
