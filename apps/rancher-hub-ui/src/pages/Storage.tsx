import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppInstanceTreeItem, ServiceWithImageSize } from '@/api/types';
import { ServicesRepository } from '@/repositories/services.repository';
import { HarborSitesRepository } from '@/repositories/harbor-sites.repository';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Database, RefreshCw, Bug, Loader2, Cloud, AlertTriangle } from 'lucide-react';

interface HarborImageSizeResult {
  sizeFormatted?: string;
}

interface HarborImageSizeTestResponse {
  result?: HarborImageSizeResult;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const e = error as { response?: { data?: { message?: string } }; message?: string };
  return e.response?.data?.message || e.message || fallback;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes) return 'Unknown';
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / (k ** i)).toFixed(2))} ${sizes[i]}`;
}

function getSizePillClass(size?: number | null): string {
  if (!size) return 'text-muted-foreground bg-muted';

  const sizeInMb = size / (1024 * 1024);
  if (sizeInMb > 1000) return 'text-destructive bg-destructive/10';
  if (sizeInMb > 500) return 'text-warning bg-warning/10';
  if (sizeInMb > 100) return 'text-info bg-info/10';
  return 'text-success bg-success/10';
}

function getStatusPillClass(status?: string): string {
  if (status === 'running') return 'text-success bg-success/10';
  if (status === 'pending') return 'text-warning bg-warning/10';
  if (status === 'failed') return 'text-destructive bg-destructive/10';
  return 'text-muted-foreground bg-muted';
}

function getSourcePillClass(source?: string | null): string {
  if (source === 'Harbor') return 'text-info bg-info/10';
  if (source === 'DockerHub') return 'text-warning bg-warning/10';
  return 'text-muted-foreground bg-muted';
}

export default function StoragePage() {
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceWithImageSize[]>([]);
  const [appInstanceTree, setAppInstanceTree] = useState<AppInstanceTreeItem[]>([]);
  const [selectedAppInstanceId, setSelectedAppInstanceId] = useState('');
  const [treeLoading, setTreeLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAppInstanceTree = useCallback(async () => {
    try {
      setTreeLoading(true);
      setError(null);
      const tree = await ServicesRepository.getAppInstancesTree();
      setAppInstanceTree(Array.isArray(tree) ? tree : []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load app instances'));
    } finally {
      setTreeLoading(false);
    }
  }, []);

  const fetchServicesWithSizes = useCallback(async (appInstanceId: string) => {
    if (!appInstanceId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await ServicesRepository.getWithImageSizes(appInstanceId);
      setServices(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load services with image sizes'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAppInstanceTree();
  }, [fetchAppInstanceTree]);

  useEffect(() => {
    if (!selectedAppInstanceId) {
      setServices([]);
      setError(null);
      return;
    }

    void fetchServicesWithSizes(selectedAppInstanceId);
  }, [selectedAppInstanceId, fetchServicesWithSizes]);

  const selectedInfo = useMemo(() => {
    for (const env of appInstanceTree) {
      const instance = (env.appInstances ?? []).find((ai) => ai.id === selectedAppInstanceId);
      if (instance) {
        return { environment: env.name, instance };
      }
    }
    return null;
  }, [appInstanceTree, selectedAppInstanceId]);

  const totalSize = useMemo(
    () => services.reduce((sum, service) => sum + (service.imageSize || 0), 0),
    [services],
  );
  const servicesWithSize = useMemo(() => services.filter((s) => !!s.imageSize).length, [services]);
  const servicesWithoutSize = services.length - servicesWithSize;
  const sortedServices = useMemo(
    () => [...services].sort((a, b) => (b.imageSize || 0) - (a.imageSize || 0)),
    [services],
  );

  const handleRefresh = () => {
    if (!selectedAppInstanceId) return;
    void fetchServicesWithSizes(selectedAppInstanceId);
  };

  const handleDebugHarborApi = async () => {
    if (!selectedAppInstanceId) return;

    try {
      setDebugLoading(true);
      const harborSite = await HarborSitesRepository.getActiveSite();
      if (!harborSite) {
        toast({ title: 'No active Harbor site found', variant: 'destructive' });
        return;
      }

      const sampleService = services.find((svc) => !!svc.imageTag);
      if (!sampleService?.imageTag) {
        toast({ title: 'No sample image available to test', description: 'Select an instance with at least one service image.' });
        return;
      }

      const result = await HarborSitesRepository.testImageSize(
        harborSite.id,
        sampleService.imageTag,
      ) as HarborImageSizeTestResponse;

      if (result.result?.sizeFormatted) {
        toast({
          title: 'Harbor API is working',
          description: `Sample image size: ${result.result.sizeFormatted}`,
        });
      } else {
        toast({
          title: 'Harbor API responded',
          description: 'No size was returned for the sample image.',
        });
      }
    } catch (err: unknown) {
      toast({
        title: 'Harbor API test failed',
        description: getErrorMessage(err, 'Unknown error'),
        variant: 'destructive',
      });
    } finally {
      setDebugLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Storage View</h1>
        <p className="text-sm text-muted-foreground">
          Analyze container image footprint for each app instance.
        </p>
      </div>

      <div className="surface-elevated rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-xl space-y-1.5">
            <p className="text-sm font-medium">App Instance</p>
            <Select
              value={selectedAppInstanceId}
              onValueChange={setSelectedAppInstanceId}
              disabled={treeLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={treeLoading ? 'Loading app instances...' : 'Select an app instance'} />
              </SelectTrigger>
              <SelectContent
                emptyMessage={appInstanceTree.some((env) => (env.appInstances ?? []).length > 0) ? undefined : 'No app instances available'}
              >
                {appInstanceTree.map((env) => (
                  <SelectGroup key={env.id}>
                    <SelectLabel>{env.name}</SelectLabel>
                    {(env.appInstances ?? []).map((instance) => (
                      <SelectItem key={instance.id} value={instance.id}>
                        {instance.name} ({instance.cluster}/{instance.namespace})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={!selectedAppInstanceId || loading}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => { void handleDebugHarborApi(); }}
              disabled={!selectedAppInstanceId || debugLoading}
            >
              {debugLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bug className="h-4 w-4 mr-2" />}
              Test Harbor API
            </Button>
          </div>
        </div>

        {selectedInfo && (
          <div className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground font-mono">
            env: <span className="text-foreground">{selectedInfo.environment}</span> | cluster: <span className="text-foreground">{selectedInfo.instance.cluster}</span> | namespace: <span className="text-foreground">{selectedInfo.instance.namespace}</span>
          </div>
        )}
      </div>

      {!selectedAppInstanceId && !treeLoading && (
        <div className="surface-elevated rounded-lg p-12 text-center">
          <Cloud className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Select an app instance to inspect storage usage</p>
        </div>
      )}

      {selectedAppInstanceId && (
        <>
          {loading ? (
            <div className="surface-elevated rounded-lg p-12 flex flex-col items-center gap-3">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Loading image size data...</p>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Failed to load storage view</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>{error}</span>
                <Button size="sm" variant="outline" onClick={handleRefresh}>Retry</Button>
              </AlertDescription>
            </Alert>
          ) : services.length === 0 ? (
            <Alert>
              <Database className="h-4 w-4" />
              <AlertTitle>No services found</AlertTitle>
              <AlertDescription>
                No services are available for the selected app instance.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="surface-elevated rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Services</p>
                  <p className="text-2xl font-bold font-mono">{services.length}</p>
                </div>
                <div className="surface-elevated rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Storage</p>
                  <p className="text-2xl font-bold font-mono text-success">{formatBytes(totalSize)}</p>
                </div>
                <div className="surface-elevated rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">With Size Info</p>
                  <p className="text-2xl font-bold font-mono text-info">{servicesWithSize}</p>
                </div>
                <div className="surface-elevated rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Unknown Size</p>
                  <p className="text-2xl font-bold font-mono text-warning">{servicesWithoutSize}</p>
                </div>
              </div>

              <div className="surface-elevated rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="text-left p-3 font-medium">Service</th>
                      <th className="text-left p-3 font-medium">Image</th>
                      <th className="text-left p-3 font-medium">Size</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Replicas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedServices.map((service) => {
                      const replicas = service.replicas || 0;
                      const availableReplicas = service.availableReplicas || 0;
                      const replicaPercent = replicas > 0
                        ? Math.round((availableReplicas / replicas) * 100)
                        : 0;

                      return (
                        <tr key={service.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <p className="text-sm font-medium">{service.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{service.workloadType || '—'}</p>
                          </td>
                          <td className="p-3">
                            <p
                              className="text-xs font-mono text-muted-foreground truncate max-w-[360px]"
                              title={service.imageTag || '—'}
                            >
                              {service.imageTag || '—'}
                            </p>
                            {service.imageSource ? (
                              <span className={`inline-flex mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${getSourcePillClass(service.imageSource)}`}>
                                {service.imageSource}
                              </span>
                            ) : null}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getSizePillClass(service.imageSize)}`}>
                              {service.imageSizeFormatted || 'Unknown'}
                            </span>
                            {service.compressedImageSizeFormatted ? (
                              <p className="text-[11px] text-muted-foreground mt-1">
                                compressed: {service.compressedImageSizeFormatted}
                              </p>
                            ) : null}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusPillClass(service.status)}`}>
                              {service.status || 'unknown'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="w-28">
                              <Progress value={replicaPercent} className="h-2" />
                              <p className="mt-1 text-[11px] text-muted-foreground font-mono">
                                {availableReplicas}/{replicas}
                              </p>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
