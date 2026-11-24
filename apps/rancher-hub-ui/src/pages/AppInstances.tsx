import { useState, useEffect, useMemo } from 'react';
import { AppInstancesRepository } from '@/repositories/app-instances.repository';
import { EnvironmentsRepository } from '@/repositories/environments.repository';
import { SitesRepository } from '@/repositories/sites.repository';
import { GenericClustersRepository } from '@/repositories/generic-clusters.repository';
import type { AppInstance, CreateAppInstanceDto, Environment, Site, GenericCluster } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Box, Trash2, Edit, Loader2 } from 'lucide-react';
import { IconButton } from '@/components/IconButton';

export default function AppInstancesPage() {
  const { toast } = useToast();
  const [instances, setInstances] = useState<AppInstance[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [clusters, setClusters] = useState<GenericCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AppInstance | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateAppInstanceDto>({
    name: '', cluster: '', namespace: '', clusterType: 'rancher', environmentId: '',
  });
  const activeSites = useMemo(() => sites.filter((site) => site.active), [sites]);
  const activeClusters = useMemo(
    () => clusters.filter((cluster) => cluster.active),
    [clusters],
  );

  const fetchData = async () => {
    try {
      const [inst, envs, ss, cls] = await Promise.all([
        AppInstancesRepository.findAll(),
        EnvironmentsRepository.findAll(),
        SitesRepository.findAll(),
        GenericClustersRepository.findAll(),
      ]);
      setInstances(Array.isArray(inst) ? inst : []);
      setEnvironments(Array.isArray(envs) ? envs : []);
      setSites(Array.isArray(ss) ? ss : []);
      setClusters(Array.isArray(cls) ? cls : []);
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const dto: CreateAppInstanceDto = form.clusterType === 'rancher'
        ? { ...form, genericClusterSiteId: undefined }
        : { ...form, rancherSiteId: undefined };

      if (
        dto.clusterType === 'rancher' &&
        !activeSites.some((site) => site.id === dto.rancherSiteId)
      ) {
        toast({ title: 'Please select an active Rancher site', variant: 'destructive' });
        return;
      }

      if (
        dto.clusterType === 'generic' &&
        !activeClusters.some((cluster) => cluster.id === dto.genericClusterSiteId)
      ) {
        toast({ title: 'Please select an active generic cluster', variant: 'destructive' });
        return;
      }

      if (editing) { await AppInstancesRepository.update(editing.id, dto); }
      else { await AppInstancesRepository.create(dto); }
      toast({ title: editing ? 'Updated' : 'Created' });
      setDialogOpen(false); setEditing(null); fetchData();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await AppInstancesRepository.remove(deleteId); toast({ title: 'Deleted' }); fetchData(); }
    catch { toast({ title: 'Error', variant: 'destructive' }); }
    setDeleteId(null);
  };

  const getEnvName = (id: string) => environments.find(e => e.id === id)?.name || id;
  const getEnvColor = (id: string) => environments.find(e => e.id === id)?.color || '#888';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">App Instances</h1><p className="text-sm text-muted-foreground">Manage namespace instances across sites</p></div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', cluster: '', namespace: '', clusterType: 'rancher', environmentId: '' }); setDialogOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Add Instance</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : instances.length === 0 ? (
        <div className="surface-elevated rounded-lg p-12 text-center"><Box className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No app instances yet</p></div>
      ) : (
        <div className="grid gap-3">
          {instances.map((inst) => (
            <div key={inst.id} className="surface-elevated rounded-lg p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: getEnvColor(inst.environmentId) }} />
                <div className="min-w-0">
                  <p className="font-medium text-sm">{inst.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{inst.namespace}</span>
                    <span>•</span>
                    <span>{getEnvName(inst.environmentId)}</span>
                    <span>•</span>
                    <span className="capitalize">{inst.clusterType}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <IconButton tooltip="Edit" onClick={() => {
                  setEditing(inst);
                  setForm({
                    name: inst.name, cluster: inst.cluster, namespace: inst.namespace,
                    clusterType: inst.clusterType, environmentId: inst.environmentId,
                    rancherSiteId: inst.rancherSiteId, genericClusterSiteId: inst.genericClusterSiteId,
                  });
                  setDialogOpen(true);
                }}><Edit className="h-4 w-4" /></IconButton>
                <IconButton tooltip="Delete" onClick={() => setDeleteId(inst.id)}><Trash2 className="h-4 w-4 text-destructive" /></IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit App Instance' : 'Add App Instance'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Web Frontend Dev" /></div>
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select value={form.environmentId} onValueChange={(v) => setForm({ ...form, environmentId: v })}>
                <SelectTrigger><SelectValue placeholder="Select environment" /></SelectTrigger>
                <SelectContent emptyMessage={environments.length === 0 ? 'No environments available' : undefined}>
                  {environments.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cluster Type</Label>
              <Select value={form.clusterType} onValueChange={(v: 'rancher' | 'generic') => setForm({ ...form, clusterType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rancher">Rancher</SelectItem>
                  <SelectItem value="generic">Generic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.clusterType === 'rancher' && (
              <div className="space-y-2">
                <Label>Rancher Site</Label>
                <Select value={form.rancherSiteId || ''} onValueChange={(v) => setForm({ ...form, rancherSiteId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                  <SelectContent emptyMessage={activeSites.length === 0 ? 'No active Rancher sites available' : undefined}>
                    {activeSites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.clusterType === 'generic' && (
              <div className="space-y-2">
                <Label>Generic Cluster</Label>
                <Select value={form.genericClusterSiteId || ''} onValueChange={(v) => setForm({ ...form, genericClusterSiteId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select cluster" /></SelectTrigger>
                  <SelectContent emptyMessage={activeClusters.length === 0 ? 'No active generic clusters available' : undefined}>
                    {activeClusters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2"><Label>Cluster ID</Label><Input value={form.cluster} onChange={(e) => setForm({ ...form, cluster: e.target.value })} placeholder="c-12345:p-67890" className="font-mono text-sm" /></div>
            <div className="space-y-2"><Label>Namespace</Label><Input value={form.namespace} onChange={(e) => setForm({ ...form, namespace: e.target.value })} placeholder="frontend-dev" className="font-mono text-sm" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete App Instance</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
