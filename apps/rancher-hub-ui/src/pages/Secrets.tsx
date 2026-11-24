import { useState, useEffect, useCallback } from 'react';
import { SecretsRepository } from '@/repositories/secrets.repository';
import type { AppInstance, Secret, SecretCompareResult, SecretComparison, SecretDetailResult } from '@/api/types';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2, CheckCircle, AlertTriangle, XCircle, Eye, RefreshCw } from 'lucide-react';
import { InstanceSelector } from '@/components/InstanceSelector';
import { CompareDetailDialog, type CompareDetailItem } from '@/components/CompareDetailDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

function toSecretDetail(item: SecretDetailResult): CompareDetailItem['detail'] {
  return {
    source: item.source?.data ?? null,
    target: item.target?.data ?? null,
  };
}

export default function SecretsPage() {
  const { toast } = useToast();
  const [source, setSource] = useState<AppInstance | null>(null);
  const [target, setTarget] = useState<AppInstance | null>(null);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [compareResult, setCompareResult] = useState<SecretCompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);

  const isCompareMode = !!source && !!target;

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItems, setDetailItems] = useState<CompareDetailItem[]>([]);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchDetails = async (names: { name: string; status: string }[]) => {
    if (!source || !target) return;
    setDetailOpen(true);
    setDetailItems(names.map(n => ({ title: n.name, status: n.status, detail: null, loading: true })));

    const results = await Promise.allSettled(
      names.map(n => SecretsRepository.getDetails(n.name, source.id, target.id))
    );

    setDetailItems(names.map((n, i) => {
      const r = results[i];
      const data = r.status === 'fulfilled' ? r.value : null;
      const detail = data ? toSecretDetail(data) : null;
      return { title: n.name, status: n.status, detail, loading: false };
    }));
  };

  const openDetail = (name: string, status: string) => fetchDetails([{ name, status }]);

  const openMultiDetail = () => {
    if (!compareResult) return;
    const items = (compareResult.comparisons ?? [])
      .filter(c => selectedNames.includes(c.secretName))
      .map(c => ({ name: c.secretName, status: c.status }));
    if (items.length > 0) fetchDetails(items);
  };

  const handleSelectionChange = useCallback((s: AppInstance | null, t: AppInstance | null) => {
    setSource(s); setTarget(t);
    setSecrets([]); setCompareResult(null); setSelectedNames([]);
  }, []);

  const toggleSelection = (name: string) => {
    setSelectedNames(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const isSyncableComparison = (comparison: SecretComparison) =>
    comparison.source !== null && comparison.status !== 'identical';

  const refreshCompare = async () => {
    if (!source || !target) return;
    const updated = await SecretsRepository.compareByInstance(source.id, target.id);
    setCompareResult(updated);
  };

  const syncSingleSecret = async (secretName: string) => {
    if (!source || !target) return false;

    const details = await SecretsRepository.getDetails(secretName, source.id, target.id);
    const sourceData = details.source?.data ?? {};
    const keysToSync: Record<string, string> = {};

    for (const keyComparison of details.keyComparisons ?? []) {
      if (!keyComparison.identical && keyComparison.sourceExists) {
        const sourceValue = sourceData[keyComparison.key];
        if (typeof sourceValue === 'string') {
          keysToSync[keyComparison.key] = sourceValue;
        }
      }
    }

    const keys = Object.keys(keysToSync);
    if (keys.length === 0) return false;

    if (keys.length === 1) {
      const [key] = keys;
      await SecretsRepository.syncKey({
        sourceAppInstanceId: source.id,
        targetAppInstanceId: target.id,
        secretName,
        key,
        value: keysToSync[key],
      });
      return true;
    }

    await SecretsRepository.syncKeys({
      sourceAppInstanceId: source.id,
      targetAppInstanceId: target.id,
      secretName,
      keys: keysToSync,
    });
    return true;
  };

  const handleSyncSelected = async () => {
    if (!source || !target || selectedNames.length === 0) return;
    setSyncing(true);

    let synced = 0;
    let skipped = 0;
    let failed = 0;

    for (const name of selectedNames) {
      try {
        const done = await syncSingleSecret(name);
        if (done) synced += 1;
        else skipped += 1;
      } catch {
        failed += 1;
      }
    }

    setSyncing(false);
    setSyncDialogOpen(false);
    setSelectedNames([]);

    if (failed > 0) {
      toast({
        title: `Sync completed with errors`,
        description: `Synced: ${synced}, Skipped: ${skipped}, Failed: ${failed}`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: `Sync completed`,
        description: `Synced: ${synced}${skipped > 0 ? `, Skipped: ${skipped}` : ''}`,
      });
    }

    try {
      await refreshCompare();
    } catch {
      toast({ title: 'Failed to refresh comparison', variant: 'destructive' });
    }
  };

  // Single instance
  useEffect(() => {
    if (!source || target) return;
    setLoading(true);
    SecretsRepository.getByAppInstance(source.id)
      .then((data) => setSecrets(Array.isArray(data) ? data : []))
      .catch(() => toast({ title: 'Error loading secrets', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [source, target]);

  // Compare
  useEffect(() => {
    if (!source || !target) return;
    setLoading(true);
    SecretsRepository.compareByInstance(source.id, target.id)
      .then(setCompareResult)
      .catch(() => toast({ title: 'Compare failed', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [source, target]);

  const statusIcon = (s: string) => {
    if (s === 'identical') return <CheckCircle className="h-4 w-4 text-success" />;
    if (s === 'different') return <AlertTriangle className="h-4 w-4 text-warning" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Secrets</h1><p className="text-sm text-muted-foreground">View or compare Secrets between instances (values masked)</p></div>

      <InstanceSelector onSelectionChange={handleSelectionChange} />

      {!source && (
        <div className="surface-elevated rounded-lg p-12 text-center">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Select an app instance to view Secrets</p>
        </div>
      )}

      {loading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

      {/* Single instance table */}
      {!loading && source && !target && secrets.length > 0 && (
        <div className="surface-elevated rounded-lg overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Keys</th>
            </tr></thead>
            <tbody>
              {secrets.map((s) => (
                <tr key={s.name} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3 text-sm font-mono font-medium">{s.name}</td>
                  <td className="p-3 text-xs text-muted-foreground">{s.type || '—'}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {(s.dataKeys ?? s.keys)?.map((k) => <span key={k} className="inline-block bg-muted px-1.5 py-0.5 rounded mr-1 font-mono">••• {k}</span>) || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && source && !target && secrets.length === 0 && (
        <div className="surface-elevated rounded-lg p-12 text-center"><p className="text-muted-foreground">No Secrets found</p></div>
      )}

      {/* Compare mode */}
      {!loading && isCompareMode && compareResult && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: compareResult.summary.totalSecrets ?? 0 },
              { label: 'Identical', value: compareResult.summary.identical, color: 'text-success' },
              { label: 'Different', value: compareResult.summary.different, color: 'text-warning' },
              { label: 'Missing Source', value: compareResult.summary.missingInSource, color: 'text-destructive' },
              { label: 'Missing Target', value: compareResult.summary.missingInTarget, color: 'text-info' },
            ].map(s => (
              <div key={s.label} className="surface-elevated rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold font-mono ${s.color || ''}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {selectedNames.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-sm">{selectedNames.length} item(s) selected</span>
              <Button onClick={openMultiDetail} className="gap-2" size="sm"><Eye className="h-4 w-4" /> View Differences</Button>
              <Button onClick={() => setSyncDialogOpen(true)} className="gap-2" size="sm" variant="secondary">
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync Selected
              </Button>
            </div>
          )}

          <div className="surface-elevated rounded-lg overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                <th className="p-3 w-10"></th>
                <th className="text-left p-3 font-medium">Secret</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Keys</th>
              </tr></thead>
              <tbody>
                {(compareResult.comparisons ?? []).map(c => (
                  <tr key={c.secretName} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => openDetail(c.secretName, c.status)}>
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedNames.includes(c.secretName)}
                        disabled={!isSyncableComparison(c)}
                        onCheckedChange={() => {
                          if (isSyncableComparison(c)) {
                            toggleSelection(c.secretName);
                          }
                        }}
                      />
                    </td>
                    <td className="p-3 text-sm font-mono">{c.secretName}</td>
                    <td className="p-3"><div className="flex items-center gap-2">{statusIcon(c.status)}<span className="text-xs capitalize">{c.status}</span></div></td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {c.differences ? Object.keys(c.differences).map(k => <span key={k} className="inline-block bg-muted px-1.5 py-0.5 rounded mr-1 font-mono">••• {k}</span>) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <CompareDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        items={detailItems}
        sourceLabel={source?.name || 'Source'}
        targetLabel={target?.name || 'Target'}
        maskValues
      />

      <AlertDialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Secret Sync</AlertDialogTitle>
            <AlertDialogDescription>
              Sync changed keys for {selectedNames.length} selected Secret(s) from {source?.name || 'source'} to {target?.name || 'target'}?
              This will overwrite target values for synced keys.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={syncing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSyncSelected} disabled={syncing}>
              {syncing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Sync Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
