import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HarborSitesRepository } from '@/repositories/harbor-sites.repository';
import type { HarborSite, CreateHarborSiteDto, UpdateHarborSiteDto } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Container, Wifi, Trash2, Edit, Zap, ZapOff, Loader2, FolderOpen } from 'lucide-react';
import { IconButton } from '@/components/IconButton';

export default function HarborSitesPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sites, setSites] = useState<HarborSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HarborSite | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateHarborSiteDto>({ name: '', url: '', username: '', password: '', active: true });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const data = await HarborSitesRepository.findAll();
      setSites(Array.isArray(data) ? data : []);
    }
    catch { toast({ title: 'Error', description: 'Failed to load harbor sites', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const updateDto: UpdateHarborSiteDto = { name: form.name, url: form.url, username: form.username, active: form.active };
        // Only send password if user typed a new one; avoid clearing existing password
        if (form.password.trim()) {
          updateDto.password = form.password;
        }
        await HarborSitesRepository.update(editing.id, updateDto);
      } else {
        await HarborSitesRepository.create(form);
      }
      toast({ title: editing ? 'Updated' : 'Created' });
      setDialogOpen(false); setEditing(null); fetchData();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await HarborSitesRepository.remove(deleteId); toast({ title: 'Deleted' }); fetchData(); }
    catch { toast({ title: 'Error', variant: 'destructive' }); }
    setDeleteId(null);
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try { const res = await HarborSitesRepository.testSiteConnection(id); toast({ title: 'Test result', description: JSON.stringify(res) }); }
    catch { toast({ title: 'Connection failed', variant: 'destructive' }); }
    setTestingId(null);
  };

  const handleToggle = async (site: HarborSite) => {
    const nextActive = !site.active;
    setTogglingId(site.id);
    try {
      if (nextActive) { await HarborSitesRepository.activate(site.id); }
      else { await HarborSitesRepository.deactivate(site.id); }
      toast({ title: nextActive ? 'Harbor site activated' : 'Harbor site deactivated' });
      fetchData();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setTogglingId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Harbor Sites</h1><p className="text-sm text-muted-foreground">Manage container registries</p></div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', url: '', username: '', password: '', active: true }); setDialogOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Add Harbor</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : sites.length === 0 ? (
        <div className="surface-elevated rounded-lg p-12 text-center"><Container className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No harbor sites yet</p></div>
      ) : (
        <div className="grid gap-3">
          {sites.map((site) => (
            <div key={site.id} className="surface-elevated rounded-lg p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${site.active ? 'bg-success' : 'bg-muted-foreground'}`} />
                <div className="min-w-0">
                  <p className="font-medium text-sm">{site.name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{site.url}</p>
                  <p className="text-xs text-muted-foreground">User: {site.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <IconButton tooltip="Browse registry" onClick={() => navigate(`/harbor/${site.id}/browse`)}>
                  <FolderOpen className="h-4 w-4" />
                </IconButton>
                <IconButton tooltip="Test connection" onClick={() => handleTest(site.id)} disabled={testingId === site.id}>
                  {testingId === site.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                </IconButton>
                <IconButton tooltip={site.active ? 'Deactivate' : 'Activate'} onClick={() => handleToggle(site)} disabled={togglingId === site.id}>
                  {togglingId === site.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : site.active
                      ? <Zap className="h-4 w-4 text-success" />
                      : <ZapOff className="h-4 w-4 text-muted-foreground" />}
                </IconButton>
                <IconButton tooltip="Edit" onClick={() => { setEditing(site); setForm({ name: site.name, url: site.url, username: site.username, password: '', active: site.active }); setDialogOpen(true); }}>
                  <Edit className="h-4 w-4" />
                </IconButton>
                <IconButton tooltip="Delete" onClick={() => setDeleteId(site.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Harbor Site' : 'Add Harbor Site'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Harbor Registry" /></div>
            <div className="space-y-2"><Label>URL</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://harbor.example.com" className="font-mono text-sm" /></div>
            <div className="space-y-2"><Label>Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
            <div className="space-y-2"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing?.hasPassword ? '••• configured (leave blank to keep)' : ''} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Harbor Site</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
