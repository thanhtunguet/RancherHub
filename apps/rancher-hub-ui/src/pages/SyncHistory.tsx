import { useState, useEffect } from 'react';
import { ServicesRepository } from '@/repositories/services.repository';
import type { SyncHistoryEntry } from '@/api/types';
import { useToast } from '@/hooks/use-toast';
import { History, Loader2 } from 'lucide-react';

export default function SyncHistoryPage() {
  const { toast } = useToast();
  const [history, setHistory] = useState<SyncHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ServicesRepository.getDetailedSyncHistory()
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => toast({ title: 'Error loading history', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Sync History</h1><p className="text-sm text-muted-foreground">View all synchronization records</p></div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : history.length === 0 ? (
        <div className="surface-elevated rounded-lg p-12 text-center">
          <History className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No sync history yet</p>
        </div>
      ) : (
        <div className="surface-elevated rounded-lg overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">User</th>
              <th className="text-left p-3 font-medium">Services</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr></thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3 text-xs font-mono text-muted-foreground">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}</td>
                  <td className="p-3 text-xs">{entry.type || 'services'}</td>
                  <td className="p-3 text-xs">{entry.user?.username || '—'}</td>
                  <td className="p-3 text-xs font-mono">{entry.serviceIds?.length || 0} service(s)</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${entry.status === 'success' ? 'bg-success/20 text-success' : entry.status === 'failed' ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground'}`}>{entry.status || 'unknown'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
