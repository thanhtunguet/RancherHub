import { useState, useEffect, useCallback } from 'react';
import { ServicesRepository } from '@/repositories/services.repository';
import { HarborSitesRepository } from '@/repositories/harbor-sites.repository';
import type { Service, AppInstance, CompareResult, ImageTag, SyncServicesDto, HarborSite } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Layers, Search, Tag, Loader2, RefreshCw, CheckCircle, AlertTriangle, XCircle, Eye } from 'lucide-react';
import { IconButton } from '@/components/IconButton';
import { InstanceSelector } from '@/components/InstanceSelector';
import { CompareDetailDialog, type CompareDetailItem } from '@/components/CompareDetailDialog';

export default function ServicesPage() {
  const { toast } = useToast();
  const [source, setSource] = useState<AppInstance | null>(null);
  const [target, setTarget] = useState<AppInstance | null>(null);

  // Single-instance mode
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Compare mode
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [selectedServiceNames, setSelectedServiceNames] = useState<string[]>([]);
  const [sourceServiceIdByName, setSourceServiceIdByName] = useState<Record<string, string>>({});
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Tag update dialog
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [tags, setTags] = useState<ImageTag[]>([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [tagsLoading, setTagsLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [tagPage, setTagPage] = useState(0);
  const TAGS_PER_PAGE = 10;

  // Double confirmation
  const [confirmStep, setConfirmStep] = useState(0); // 0=none, 1=first confirm, 2=second confirm

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItems, setDetailItems] = useState<CompareDetailItem[]>([]);

  const openDetails = async (names: { name: string; status: string }[]) => {
    if (!source || !target || !compareResult) return;
    setDetailOpen(true);
    setDetailItems(names.map(n => {
      const match = (compareResult.comparisons ?? []).find(c => c.serviceName === n.name);
      return {
        title: n.name,
        status: n.status,
        detail: match ? { source: match.source, target: match.target, differences: match.differences } : null,
      };
    }));
  };

  const openDetail = (name: string, status: string) => openDetails([{ name, status }]);

  const openMultiDetail = () => {
    if (!compareResult) return;
    const items = (compareResult.comparisons ?? [])
      .filter(c => selectedServiceNames.includes(c.serviceName))
      .map(c => ({ name: c.serviceName, status: c.status }));
    if (items.length > 0) openDetails(items);
  };

  const isCompareMode = !!source && !!target;

  const handleSelectionChange = useCallback((s: AppInstance | null, t: AppInstance | null) => {
    setSource(s);
    setTarget(t);
    setServices([]);
    setCompareResult(null);
    setSelectedServiceNames([]);
    setSourceServiceIdByName({});
  }, []);

  // Fetch single-instance services
  const fetchServices = useCallback(async () => {
    if (!source || target) return;
    setLoading(true);
    try {
      const data = await ServicesRepository.getByAppInstance(source.id, undefined, search || undefined);
      setServices(Array.isArray(data) ? data : []);
    } catch { toast({ title: 'Error loading services', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [source, target, search]);

  useEffect(() => { if (source && !target) fetchServices(); }, [source, target]);

  // Fetch comparison
  const fetchComparison = useCallback(async () => {
    if (!source || !target) return;
    setLoading(true);
    try {
      const [comparison, sourceServices] = await Promise.all([
        ServicesRepository.compareByInstance(source.id, target.id),
        ServicesRepository.getByAppInstance(source.id),
      ]);

      const idByName: Record<string, string> = {};
      const sourceList = Array.isArray(sourceServices) ? sourceServices : [];
      sourceList.forEach((svc) => {
        idByName[svc.name] = svc.id;
      });

      setSourceServiceIdByName(idByName);
      setCompareResult(comparison);
      setSelectedServiceNames((prev) => prev.filter((name) => !!idByName[name]));
    } catch { toast({ title: 'Compare failed', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [source, target]);

  useEffect(() => { if (source && target) fetchComparison(); }, [source, target]);

  const handleSync = async () => {
    if (!source || !target || selectedServiceNames.length === 0) return;
    const serviceIds = selectedServiceNames
      .map((name) => sourceServiceIdByName[name])
      .filter((id): id is string => Boolean(id));

    if (serviceIds.length === 0) {
      toast({ title: 'No syncable services selected', description: 'Only services available in source can be synced.', variant: 'destructive' });
      return;
    }

    if (serviceIds.length < selectedServiceNames.length) {
      toast({
        title: 'Some selected services were skipped',
        description: `${selectedServiceNames.length - serviceIds.length} item(s) are missing in source and cannot be synced.`,
      });
    }

    setSyncing(true);
    try {
      const dto: SyncServicesDto = {
        sourceEnvironmentId: source.environmentId,
        targetEnvironmentId: target.environmentId,
        serviceIds,
        targetAppInstanceIds: [target.id],
      };
      const result = await ServicesRepository.syncServices(dto);
      if (result?.status === 'partial') {
        toast({ title: 'Sync completed with errors', description: 'Some services could not be synced. Check sync history for details.' });
      } else {
        toast({ title: 'Sync complete', description: `${serviceIds.length} service(s) synced successfully` });
      }
      setSyncDialogOpen(false);
      setSelectedServiceNames([]);
      fetchComparison();
    } catch { toast({ title: 'Sync failed', variant: 'destructive' }); }
    finally { setSyncing(false); }
  };

  const toggleSelection = (name: string) => {
    setSelectedServiceNames((prev) => (
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    ));
  };

  const parseHarborImage = (imageRepo: string, harborSite: HarborSite): { project: string; repository: string } | null => {
    if (!imageRepo) return null;
    const harborHost = new URL(harborSite.url).host;
    // imageRepo format: harbor.example.com/project/repo or harbor.example.com/project/sub/repo
    if (!imageRepo.startsWith(harborHost)) return null;
    const path = imageRepo.slice(harborHost.length + 1); // remove host + leading slash
    const parts = path.split('/');
    if (parts.length < 2) return null;
    const project = parts[0];
    const repository = parts.slice(1).join('/');
    return { project, repository };
  };

  const openTagDialog = async (service: Service) => {
    setSelectedService(service);
    setTagDialogOpen(true);
    setTagsLoading(true);
    setTags([]);
    setSelectedTag('');
    try {
      // Try to detect if this is a harbor image
      let harborParsed: { project: string; repository: string } | null = null;
      let activeSite: HarborSite | null = null;
      if (service.imageRepo) {
        try {
          activeSite = await HarborSitesRepository.getActiveSite();
          if (activeSite) {
            harborParsed = parseHarborImage(service.imageRepo, activeSite);
          }
        } catch {
          // No active harbor site, fall back to default
        }
      }

      if (harborParsed && activeSite) {
        // Fetch tags from harbor
        const artifacts = await HarborSitesRepository.getArtifacts(activeSite.id, harborParsed.project, harborParsed.repository);
        // Map harbor artifacts to ImageTag format
        const harborTags: ImageTag[] = (artifacts || []).flatMap((artifact: { tags?: { name: string }[]; push_time?: string; pushedAt?: string; size?: number }) =>
          (artifact.tags || []).map((tag: { name: string }) => ({
            name: tag.name,
            pushedAt: artifact.push_time || artifact.pushedAt,
            size: artifact.size,
            sizeFormatted: artifact.size ? `${(artifact.size / 1024 / 1024).toFixed(1)} MB` : undefined,
          }))
        );
        setTags(harborTags);
      } else {
        // DockerHub or fallback
        const imageTags = await ServicesRepository.getImageTags(service.id);
        setTags(Array.isArray(imageTags) ? imageTags : []);
      }
    } catch { toast({ title: 'Failed to load tags', variant: 'destructive' }); }
    finally { setTagsLoading(false); }
  };

  const handleDeployClick = () => {
    if (!selectedTag) return;
    setConfirmStep(1);
  };

  const handleConfirmFirst = () => {
    setConfirmStep(2);
  };

  const handleConfirmSecond = async () => {
    setConfirmStep(0);
    if (!selectedService || !selectedTag) return;
    setUpdating(true);
    try {
      await ServicesRepository.updateServiceImage(selectedService.id, selectedTag);
      toast({ title: 'Image updated', description: `${selectedService.name} → ${selectedTag}` });
      setTagDialogOpen(false);
      fetchServices();
    } catch { toast({ title: 'Update failed', variant: 'destructive' }); }
    finally { setUpdating(false); }
  };

  const statusIcon = (s: string) => {
    if (s === 'identical') return <CheckCircle className="h-4 w-4 text-success" />;
    if (s === 'different') return <AlertTriangle className="h-4 w-4 text-warning" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  const getComparisonStringField = (service: Record<string, unknown> | null, field: string): string | null => {
    if (!service) return null;
    const value = service[field];
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  };

  const formatImageTag = (fullImageTag: string | null): string => {
    if (!fullImageTag) return '—';
    const lastSlashIndex = fullImageTag.lastIndexOf('/');
    if (lastSlashIndex === -1) return fullImageTag;
    return fullImageTag.substring(lastSlashIndex + 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Services</h1>
        <p className="text-sm text-muted-foreground">View deployments or compare between instances</p>
      </div>

      <InstanceSelector onSelectionChange={handleSelectionChange} />

      {/* Search bar for single mode */}
      {source && !target && (
        <div className="flex gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchServices()} placeholder="Search services..." className="pl-10" />
          </div>
          <IconButton tooltip="Refresh" variant="outline" onClick={fetchServices}><RefreshCw className="h-4 w-4" /></IconButton>
        </div>
      )}

      {/* Empty state */}
      {!source && (
        <div className="surface-elevated rounded-lg p-12 text-center">
          <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Select an app instance to view services</p>
        </div>
      )}

      {loading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

      {/* Single instance table */}
      {!loading && source && !target && services.length > 0 && (
        <div className="surface-elevated rounded-lg overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Image</th>
              <th className="text-left p-3 font-medium">Tag</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {services.map(svc => (
                <tr key={svc.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-sm font-medium">{svc.name}</td>
                  <td className="p-3 text-xs text-muted-foreground font-mono">{svc.workloadType || '—'}</td>
                  <td className="p-3 text-xs text-muted-foreground font-mono truncate max-w-[200px]">{svc.imageRepo || '—'}</td>
                  <td className="p-3"><span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">{svc.imageTag || '—'}</span></td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openTagDialog(svc)} className="gap-1 text-xs"><Tag className="h-3 w-3" /> Change Tag</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && source && !target && services.length === 0 && (
        <div className="surface-elevated rounded-lg p-12 text-center"><p className="text-muted-foreground">No services found</p></div>
      )}

      {/* Compare mode */}
      {!loading && isCompareMode && compareResult && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: compareResult.summary.totalServices ?? 0 },
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

          {selectedServiceNames.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-sm">{selectedServiceNames.length} service(s) selected</span>
              <Button onClick={openMultiDetail} className="gap-2" size="sm"><Eye className="h-4 w-4" /> View Differences</Button>
              <Button onClick={() => setSyncDialogOpen(true)} className="gap-2"><RefreshCw className="h-4 w-4" /> Sync Selected</Button>
            </div>
          )}

          <div className="surface-elevated rounded-lg overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead><tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                <th className="p-3 w-10"></th>
                <th className="text-left p-3 font-medium">Service</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Source Image Tag</th>
                <th className="text-left p-3 font-medium">Target Image Tag</th>
                <th className="text-left p-3 font-medium">Differences</th>
              </tr></thead>
              <tbody>
                {(compareResult.comparisons ?? []).map(c => (
                  <tr key={c.serviceName} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openDetail(c.serviceName, c.status)}>
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      {c.status !== 'identical' && sourceServiceIdByName[c.serviceName] && (
                        <Checkbox
                          checked={selectedServiceNames.includes(c.serviceName)}
                          onCheckedChange={() => toggleSelection(c.serviceName)}
                        />
                      )}
                    </td>
                    <td className="p-3 text-sm font-medium font-mono">{c.serviceName}</td>
                    <td className="p-3 text-xs text-muted-foreground">{c.workloadType || '—'}</td>
                    <td className="p-3"><div className="flex items-center gap-2">{statusIcon(c.status)}<span className="text-xs capitalize">{c.status}</span></div></td>
                    <td className="p-3 align-top">
                      {!c.source ? (
                        <span className="text-xs text-muted-foreground italic">Not found</span>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="text-xs font-mono">{formatImageTag(getComparisonStringField(c.source, 'imageTag'))}</div>
                          <div className="text-[11px] text-muted-foreground">Status: {getComparisonStringField(c.source, 'status') || '—'}</div>
                        </div>
                      )}
                    </td>
                    <td className="p-3 align-top">
                      {!c.target ? (
                        <span className="text-xs text-muted-foreground italic">Not found</span>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="text-xs font-mono">{formatImageTag(getComparisonStringField(c.target, 'imageTag'))}</div>
                          <div className="text-[11px] text-muted-foreground">Status: {getComparisonStringField(c.target, 'status') || '—'}</div>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground font-mono">
                      {c.status === 'different' && c.differences ? (
                        <div className="max-w-xs truncate">{Object.entries(c.differences).map(([k, v]) => <div key={k}>{k}: {JSON.stringify(v)}</div>)}</div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tag dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={(open) => { setTagDialogOpen(open); if (!open) { setTagPage(0); setSelectedTag(''); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Update Image Tag — {selectedService?.name}</DialogTitle></DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">
              Current: <span className="font-mono text-primary">{selectedService?.imageTag}</span>
              {selectedService?.imageRepo && <span className="ml-2 text-xs font-mono text-muted-foreground">({selectedService.imageRepo})</span>}
            </p>
            {tagsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : tags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No tags found</p>
            ) : (
              <>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead><tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider bg-muted/30">
                      <th className="text-left p-3 font-medium w-8"></th>
                      <th className="text-left p-3 font-medium">Tag</th>
                      <th className="text-left p-3 font-medium">Pushed</th>
                      <th className="text-right p-3 font-medium">Size</th>
                    </tr></thead>
                    <tbody>
                      {tags.slice(tagPage * TAGS_PER_PAGE, (tagPage + 1) * TAGS_PER_PAGE).map(tag => (
                        <tr
                          key={tag.name}
                          onClick={() => setSelectedTag(tag.name)}
                          className={`border-b border-border/50 cursor-pointer transition-colors ${selectedTag === tag.name ? 'bg-primary/10' : 'hover:bg-muted/30'}`}
                        >
                          <td className="p-3">
                            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${selectedTag === tag.name ? 'border-primary' : 'border-muted-foreground/30'}`}>
                              {selectedTag === tag.name && <div className="h-2 w-2 rounded-full bg-primary" />}
                            </div>
                          </td>
                          <td className="p-3 text-sm font-mono">{tag.name}</td>
                          <td className="p-3 text-xs text-muted-foreground">{tag.pushedAt ? new Date(tag.pushedAt).toLocaleDateString() : '—'}</td>
                          <td className="p-3 text-xs text-muted-foreground text-right">{tag.sizeFormatted || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {tags.length > TAGS_PER_PAGE && (
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-muted-foreground">{tags.length} tags total — page {tagPage + 1} of {Math.ceil(tags.length / TAGS_PER_PAGE)}</p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" disabled={tagPage === 0} onClick={() => setTagPage(p => p - 1)}>Previous</Button>
                      <Button variant="outline" size="sm" disabled={(tagPage + 1) * TAGS_PER_PAGE >= tags.length} onClick={() => setTagPage(p => p + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeployClick} disabled={!selectedTag || updating}>{updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Deploy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* First confirmation */}
      <AlertDialog open={confirmStep === 1} onOpenChange={(open) => { if (!open) setConfirmStep(0); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Image Update</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to update <span className="font-mono font-semibold">{selectedService?.name}</span> to tag <span className="font-mono font-semibold">{selectedTag}</span>. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmFirst}>Yes, Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Second confirmation */}
      <AlertDialog open={confirmStep === 2} onOpenChange={(open) => { if (!open) setConfirmStep(0); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">⚠️ Final Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              This action will deploy tag <span className="font-mono font-semibold">{selectedTag}</span> to <span className="font-mono font-semibold">{selectedService?.name}</span>. This cannot be undone easily. Proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSecond} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Deploy Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Compare detail */}
      <CompareDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        items={detailItems}
        sourceLabel={source?.name || 'Source'}
        targetLabel={target?.name || 'Target'}
      />

      {/* Sync confirmation */}
      <AlertDialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Sync</AlertDialogTitle>
            <AlertDialogDescription>Sync {selectedServiceNames.length} service(s) from source to target? This will update image tags on the target.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSync} disabled={syncing}>{syncing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Sync Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
