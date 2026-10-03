import { useState, useEffect } from 'react';
import { TrustedDevicesRepository } from '@/repositories/trusted-devices.repository';
import type { TrustedDevice } from '@/api/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Smartphone, Trash2, Loader2, Monitor, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function TrustedDevicesPage() {
  const { toast } = useToast();
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const data = await TrustedDevicesRepository.getAll();
      setDevices(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: 'Failed to load trusted devices', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDevices(); }, []);

  const handleRevoke = async (id: string) => {
    setRevoking(true);
    try {
      await TrustedDevicesRepository.revoke(id);
      toast({ title: 'Device revoked' });
      setDevices(prev => prev.filter(d => d.id !== id));
    } catch {
      toast({ title: 'Failed to revoke device', variant: 'destructive' });
    } finally {
      setRevoking(false);
      setRevokeTarget(null);
    }
  };

  const handleRevokeAll = async () => {
    setRevoking(true);
    try {
      await TrustedDevicesRepository.revokeAll();
      toast({ title: 'All devices revoked' });
      setDevices([]);
    } catch {
      toast({ title: 'Failed to revoke all devices', variant: 'destructive' });
    } finally {
      setRevoking(false);
      setRevokeAllOpen(false);
    }
  };

  const fmtDate = (d?: string) => d ? format(new Date(d), 'MMM dd, yyyy HH:mm') : '—';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trusted Devices</h1>
          <p className="text-sm text-muted-foreground">Manage devices that can skip two-factor authentication</p>
        </div>
        {devices.length > 0 && (
          <Button variant="destructive" size="sm" onClick={() => setRevokeAllOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />Revoke All
          </Button>
        )}
      </div>

      <div className="surface-elevated rounded-lg border border-border">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Smartphone className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">No trusted devices</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map(device => (
                <TableRow key={device.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {device.deviceName || 'Unknown Device'}
                          {device.isCurrentDevice && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <ShieldCheck className="h-3 w-3" />Current
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{device.ipAddress || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtDate(device.lastUsedAt)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtDate(device.expiresAt)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setRevokeTarget(device.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Revoke single */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke device?</AlertDialogTitle>
            <AlertDialogDescription>This device will need to complete 2FA again on next login.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => revokeTarget && handleRevoke(revokeTarget)} disabled={revoking} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {revoking && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke all */}
      <AlertDialog open={revokeAllOpen} onOpenChange={setRevokeAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke all trusted devices?</AlertDialogTitle>
            <AlertDialogDescription>All devices will need to complete 2FA again. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeAll} disabled={revoking} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {revoking && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Revoke All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
