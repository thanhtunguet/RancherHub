import { useState, useEffect } from 'react';
import { UsersRepository } from '@/repositories/users.repository';
import type { User, CreateUserDto, UserStats } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Users as UsersIcon, Trash2, Edit, Shield, Loader2, Search } from 'lucide-react';
import { IconButton } from '@/components/IconButton';

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });

  const fetchData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        UsersRepository.findAll({ search: search || undefined }),
        UsersRepository.getStats(),
      ]);
      setUsers(Array.isArray(usersRes) ? usersRes : (usersRes as any).data || []);
      setStats(statsRes);
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await UsersRepository.update(editing.id, { ...form, adminTwoFactorToken: adminToken });
      } else {
        await UsersRepository.create({ ...form, adminTwoFactorToken: adminToken } as CreateUserDto);
      }
      toast({ title: editing ? 'User updated' : 'User created' });
      setDialogOpen(false); setEditing(null); setAdminToken(''); fetchData();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await UsersRepository.remove(deleteId, { adminTwoFactorToken: adminToken }); toast({ title: 'User deleted' }); fetchData(); }
    catch { toast({ title: 'Error', variant: 'destructive' }); }
    setDeleteId(null); setAdminToken('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Users</h1><p className="text-sm text-muted-foreground">Manage user accounts</p></div>
        <Button onClick={() => { setEditing(null); setForm({ username: '', email: '', password: '' }); setAdminToken(''); setDialogOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Add User</Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Active', value: stats.active, color: 'text-success' },
            { label: 'Inactive', value: stats.inactive, color: 'text-muted-foreground' },
            { label: '2FA Enabled', value: stats.twoFactorEnabled, color: 'text-primary' },
          ].map(s => (
            <div key={s.label} className="surface-elevated rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold font-mono ${s.color || ''}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchData()} placeholder="Search users..." className="pl-10" />
      </div>

      {/* Users list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : users.length === 0 ? (
        <div className="surface-elevated rounded-lg p-12 text-center"><UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No users found</p></div>
      ) : (
        <div className="surface-elevated rounded-lg overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
              <th className="text-left p-3 font-medium">Username</th>
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">2FA</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3 text-sm font-medium">{u.username}</td>
                  <td className="p-3 text-sm text-muted-foreground">{u.email}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${u.active ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>{u.active ? 'Active' : 'Inactive'}</span></td>
                  <td className="p-3">{u.twoFactorEnabled ? <Shield className="h-4 w-4 text-primary" /> : <span className="text-xs text-muted-foreground">Off</span>}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <IconButton tooltip="Edit" onClick={() => { setEditing(u); setForm({ username: u.username, email: u.email, password: '' }); setAdminToken(''); setDialogOpen(true); }}><Edit className="h-4 w-4" /></IconButton>
                      <IconButton tooltip="Delete" onClick={() => { setDeleteId(u.id); setAdminToken(''); }}><Trash2 className="h-4 w-4 text-destructive" /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit User' : 'Create User'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" /></div>
            <div className="space-y-2"><Label>Password {editing && '(leave blank to keep)'}</Label><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" /></div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Admin 2FA Code</Label>
              <Input value={adminToken} onChange={(e) => setAdminToken(e.target.value)} placeholder="000000" className="font-mono tracking-widest" maxLength={6} />
              <p className="text-xs text-muted-foreground">Required: Enter your authenticator code</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !adminToken}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete User</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. Enter your admin 2FA code to confirm.</AlertDialogDescription></AlertDialogHeader>
          <div className="py-2">
            <Input value={adminToken} onChange={(e) => setAdminToken(e.target.value)} placeholder="000000" className="font-mono tracking-widest" maxLength={6} />
          </div>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={!adminToken} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
