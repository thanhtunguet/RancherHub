import { useState, useEffect } from 'react';
import { GenericClustersRepository } from '@/repositories/generic-clusters.repository';
import type { GenericCluster, CreateGenericClusterSiteDto, UpdateGenericClusterSiteDto } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Database, Wifi, Trash2, Edit, Zap, Loader2 } from 'lucide-react';
import { IconButton } from '@/components/IconButton';

export default function GenericClustersPage() {
  const { toast } = useToast();
  const [clusters, setClusters] = useState<GenericCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GenericCluster | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateGenericClusterSiteDto>({ name: '', kubeconfig: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const data = await GenericClustersRepository.findAll();
      setClusters(Array.isArray(data) ? data : []);
    }
    catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const updateDto: UpdateGenericClusterSiteDto = { name: form.name };
        // Only send kubeconfig if user provided a new value; avoid clearing existing config
        if (form.kubeconfig.trim()) {
          updateDto.kubeconfig = form.kubeconfig;
        }
        await GenericClustersRepository.update(editing.id, updateDto);
      } else {
        await GenericClustersRepository.create(form);
      }
      toast({ title: editing ? 'Updated' : 'Created' });
      setDialogOpen(false); setEditing(null); fetchData();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await GenericClustersRepository.remove(deleteId); toast({ title: 'Deleted' }); fetchData(); }
    catch { toast({ title: 'Error', variant: 'destructive' }); }
    setDeleteId(null);
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try { await GenericClustersRepository.testConnection(id); toast({ title: 'Connection successful' }); }
    catch { toast({ title: 'Connection failed', variant: 'destructive' }); }
    setTestingId(null);
  };

  const handleToggle = async (cluster: GenericCluster) => {
    const nextActive = !cluster.active;
    setTogglingId(cluster.id);
    try {
      await GenericClustersRepository.setActive(cluster.id, nextActive);
      toast({ title: nextActive ? 'Cluster activated' : 'Cluster deactivated' });
      fetchData();
    }
    catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setTogglingId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Generic Clusters</h1><p className="text-sm text-muted-foreground">Manage Kubernetes clusters</p></div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', kubeconfig: '' }); setDialogOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Add Cluster</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : clusters.length === 0 ? (
        <div className="surface-elevated rounded-lg p-12 text-center"><Database className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No clusters yet</p></div>
      ) : (
        <div className="grid gap-3">
          {clusters.map((c) => (
            <div key={c.id} className="surface-elevated rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${c.active ? 'bg-success' : 'bg-muted-foreground'}`} />
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">ID: {c.id.slice(0, 8)}...</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <IconButton tooltip="Test connection" onClick={() => handleTest(c.id)} disabled={testingId === c.id}>
                  {testingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                </IconButton>
                <IconButton tooltip={c.active ? 'Deactivate' : 'Set active'} onClick={() => handleToggle(c)} disabled={togglingId === c.id}>
                  {togglingId === c.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Zap className={`h-4 w-4 ${c.active ? 'text-success' : 'text-muted-foreground'}`} />}
                </IconButton>
                <IconButton tooltip="Edit" onClick={() => { setEditing(c); setForm({ name: c.name, kubeconfig: '' }); setDialogOpen(true); }}>
                  <Edit className="h-4 w-4" />
                </IconButton>
                <IconButton tooltip="Delete" onClick={() => setDeleteId(c.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Cluster' : 'Add Cluster'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Production EKS" /></div>
            <div className="space-y-2"><Label>Kubeconfig</Label><Textarea value={form.kubeconfig} onChange={(e) => setForm({ ...form, kubeconfig: e.target.value })} placeholder={editing?.hasKubeconfig ? '••• configured (leave blank to keep current)' : 'Paste kubeconfig YAML...'} className="font-mono text-xs min-h-[200px]" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Cluster</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
