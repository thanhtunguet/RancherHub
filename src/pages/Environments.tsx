import { useState, useEffect } from 'react';
import { EnvironmentsRepository } from '@/repositories/environments.repository';
import type { Environment, CreateEnvironmentDto } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Globe, Trash2, Edit, Loader2 } from 'lucide-react';
import { IconButton } from '@/components/IconButton';

export default function EnvironmentsPage() {
  const { toast } = useToast();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Environment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateEnvironmentDto>({ name: '', description: '', color: '#1890ff' });
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    try {
      const data = await EnvironmentsRepository.findAll();
      setEnvironments(Array.isArray(data) ? data : []);
    }
    catch { toast({ title: 'Error', description: 'Failed to load environments', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) { await EnvironmentsRepository.update(editing.id, form); toast({ title: 'Updated' }); }
      else { await EnvironmentsRepository.create(form); toast({ title: 'Created' }); }
      setDialogOpen(false); setEditing(null); fetch();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await EnvironmentsRepository.remove(deleteId); toast({ title: 'Deleted' }); fetch(); }
    catch { toast({ title: 'Error', variant: 'destructive' }); }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Environments</h1>
          <p className="text-sm text-muted-foreground">Manage deployment environments</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ name: '', description: '', color: '#1890ff' }); setDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Environment
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : environments.length === 0 ? (
        <div className="surface-elevated rounded-lg p-12 text-center">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No environments yet</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {environments.map((env) => (
            <div key={env.id} className="surface-elevated rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: env.color }} />
                <div>
                  <p className="font-medium text-sm">{env.name}</p>
                  {env.description && <p className="text-xs text-muted-foreground">{env.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <IconButton tooltip="Edit" onClick={() => { setEditing(env); setForm({ name: env.name, description: env.description || '', color: env.color }); setDialogOpen(true); }}>
                  <Edit className="h-4 w-4" />
                </IconButton>
                <IconButton tooltip="Delete" onClick={() => setDeleteId(env.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Environment' : 'Add Environment'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Production" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-14 rounded border border-border cursor-pointer bg-transparent" />
                <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="font-mono text-sm" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Environment</AlertDialogTitle><AlertDialogDescription>This will remove the environment permanently.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
