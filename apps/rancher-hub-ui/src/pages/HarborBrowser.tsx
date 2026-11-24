import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { HarborSitesRepository } from '@/repositories/harbor-sites.repository';
import type { HarborSite } from '@/api/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2, ChevronRight, Folder, Package, Tag, ArrowLeft,
  Info, Clock, HardDrive, Layers, Copy, Check, Terminal
} from 'lucide-react';

type BreadcrumbLevel = 'projects' | 'repositories' | 'tags' | 'tagDetail';

interface BreadcrumbItem {
  level: BreadcrumbLevel;
  label: string;
  path: string;
}

/** Parse the path segments after /harbor/:siteId/browse/ */
function parseBrowsePath(pathname: string, siteId: string) {
  const prefix = `/harbor/${siteId}/browse`;
  const rest = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : '';
  const segments = rest.split('/').filter(Boolean).map(decodeURIComponent);
  return segments;
}

export default function HarborBrowserPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [site, setSite] = useState<HarborSite | null>(null);
  const [loading, setLoading] = useState(true);

  // Data state
  const [projects, setProjects] = useState<any[]>([]);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [tagDetail, setTagDetail] = useState<any>(null);

  const segments = siteId ? parseBrowsePath(location.pathname, siteId) : [];
  const selectedProject = segments[0] || null;
  const selectedRepo = segments.length >= 2 ? segments.slice(1, -1).join('/') || null : null;
  const selectedTag = segments.length >= 3 ? segments[segments.length - 1] : null;

  // Determine actual level from segments
  const currentLevel: BreadcrumbLevel =
    segments.length === 0 ? 'projects' :
    segments.length === 1 ? 'repositories' :
    segments.length === 2 ? 'tags' : 'tagDetail';

  // We need to handle repo names that may contain slashes - for now use exactly 2nd segment as repo
  // Recompute: seg[0]=project, seg[1]=repo, seg[2]=tag
  const repoName = segments[1] || null;
  const tagName = segments[2] || null;
  const actualLevel: BreadcrumbLevel =
    segments.length === 0 ? 'projects' :
    segments.length === 1 ? 'repositories' :
    segments.length === 2 ? 'tags' : 'tagDetail';

  const basePath = `/harbor/${siteId}/browse`;

  // Load site info once
  useEffect(() => {
    if (!siteId) return;
    HarborSitesRepository.findOne(siteId)
      .then(setSite)
      .catch(() => {});
  }, [siteId]);

  // Load data based on URL segments
  useEffect(() => {
    if (!siteId) return;
    setLoading(true);

    const load = async () => {
      try {
        if (actualLevel === 'projects') {
          const p = await HarborSitesRepository.getProjects(siteId);
          setProjects(Array.isArray(p) ? p : []);
        } else if (actualLevel === 'repositories' && selectedProject) {
          const repos = await HarborSitesRepository.getRepositories(siteId, selectedProject);
          setRepositories(Array.isArray(repos) ? repos : []);
        } else if (actualLevel === 'tags' && selectedProject && repoName) {
          const arts = await HarborSitesRepository.getArtifacts(siteId, selectedProject, repoName);
          setTags(Array.isArray(arts) ? arts : []);
        } else if (actualLevel === 'tagDetail' && selectedProject && repoName && tagName) {
          const detail = await HarborSitesRepository.getTagDetail(siteId, selectedProject, repoName, tagName);
          setTagDetail(detail);
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [siteId, location.pathname]);

  const openProject = (projectName: string) => {
    navigate(`${basePath}/${encodeURIComponent(projectName)}`);
  };

  const openRepository = (repo: string) => {
    navigate(`${basePath}/${encodeURIComponent(selectedProject!)}/${encodeURIComponent(repo)}`);
  };

  const openTag = (tag: string) => {
    navigate(`${basePath}/${encodeURIComponent(selectedProject!)}/${encodeURIComponent(repoName!)}/${encodeURIComponent(tag)}`);
  };

  const navigateTo = (path: string) => {
    navigate(path);
  };

  // Build breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { level: 'projects', label: site?.name || 'Projects', path: basePath },
  ];
  if (selectedProject) {
    breadcrumbs.push({ level: 'repositories', label: selectedProject, path: `${basePath}/${encodeURIComponent(selectedProject)}` });
  }
  if (repoName) {
    breadcrumbs.push({ level: 'tags', label: repoName, path: `${basePath}/${encodeURIComponent(selectedProject!)}/${encodeURIComponent(repoName)}` });
  }
  if (tagName) {
    breadcrumbs.push({ level: 'tagDetail', label: tagName, path: `${basePath}/${encodeURIComponent(selectedProject!)}/${encodeURIComponent(repoName!)}/${encodeURIComponent(tagName)}` });
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (d?: string) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleString(); } catch { return d; }
  };

  // Docker pull command
  const pullCommand = site && selectedProject && repoName && tagName
    ? `docker pull ${site.url?.replace(/^https?:\/\//, '')}/${selectedProject}/${repoName}:${tagName}`
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/harbor')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Harbor Browser</h1>
          {site && <p className="text-sm text-muted-foreground font-mono">{site.url}</p>}
        </div>
      </div>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm flex-wrap">
        {breadcrumbs.map((bc, i) => (
          <span key={bc.path} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            {i < breadcrumbs.length - 1 ? (
              <button
                onClick={() => navigateTo(bc.path)}
                className="text-primary hover:underline font-medium"
              >
                {bc.label}
              </button>
            ) : (
              <span className="font-semibold text-foreground">{bc.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Projects */}
          {actualLevel === 'projects' && (
            <div className="grid gap-2">
              {projects.length === 0 ? (
                <EmptyState icon={Folder} text="No projects found" />
              ) : (
                projects.map((p: any) => {
                  const name = p.name || p.project_id?.toString() || 'unknown';
                  return (
                    <ListRow
                      key={name}
                      icon={<Folder className="h-4 w-4 text-primary" />}
                      label={name}
                      meta={p.repo_count != null ? `${p.repo_count} repositories` : undefined}
                      onClick={() => openProject(name)}
                    />
                  );
                })
              )}
            </div>
          )}

          {/* Repositories */}
          {actualLevel === 'repositories' && (
            <div className="grid gap-2">
              {repositories.length === 0 ? (
                <EmptyState icon={Package} text="No repositories found" />
              ) : (
                repositories.map((r: any) => {
                  const name = r.name || r.repository_name || 'unknown';
                  const displayName = name.includes('/') ? name.split('/').slice(1).join('/') : name;
                  return (
                    <ListRow
                      key={name}
                      icon={<Package className="h-4 w-4 text-primary" />}
                      label={displayName}
                      meta={r.artifact_count != null ? `${r.artifact_count} artifacts` : undefined}
                      onClick={() => openRepository(displayName)}
                    />
                  );
                })
              )}
            </div>
          )}

          {/* Tags */}
          {actualLevel === 'tags' && (
            <div className="grid gap-2">
              {tags.length === 0 ? (
                <EmptyState icon={Tag} text="No tags found" />
              ) : (
                tags.map((t: any, idx: number) => {
                  const tagNames: string[] = t.tags?.map((tg: any) => tg.name) || [t.tag || t.name || `artifact-${idx}`];
                  const digest = t.digest ? t.digest.substring(0, 16) + '…' : undefined;
                  return (
                    <div key={t.digest || idx} className="surface-elevated rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Tag className="h-4 w-4 text-primary shrink-0" />
                          <div className="flex flex-wrap gap-1.5">
                            {tagNames.map((tn: string) => (
                              <Badge
                                key={tn}
                                variant="secondary"
                                className="cursor-pointer hover:bg-primary/20 transition-colors"
                                onClick={() => openTag(tn)}
                              >
                                {tn}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                          {t.size != null && (
                            <span className="flex items-center gap-1">
                              <HardDrive className="h-3 w-3" />
                              {formatSize(t.size)}
                            </span>
                          )}
                          {t.push_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(t.push_time)}
                            </span>
                          )}
                        </div>
                      </div>
                      {digest && (
                        <p className="text-xs text-muted-foreground font-mono pl-7">{digest}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tag Detail */}
          {actualLevel === 'tagDetail' && tagDetail && (
            <div className="space-y-4">
              {/* Docker pull command */}
              {pullCommand && <PullCommand command={pullCommand} />}

              <div className="surface-elevated rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Info className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Tag Details</h2>
                </div>
                <DetailGrid detail={tagDetail} formatSize={formatSize} formatDate={formatDate} />
              </div>

              {tagDetail.config && (
                <CollapsibleJson title="Config" data={tagDetail.config} />
              )}
              {tagDetail.layers && Array.isArray(tagDetail.layers) && (
                <div className="surface-elevated rounded-lg p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <Layers className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Layers</h2>
                    <Badge variant="outline">{tagDetail.layers.length}</Badge>
                  </div>
                  <div className="space-y-1">
                    {tagDetail.layers.map((layer: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs font-mono py-1.5 px-3 rounded bg-muted/50">
                        <span className="truncate max-w-[70%]">{layer.digest?.substring(0, 24) || `layer-${i}`}…</span>
                        <span className="text-muted-foreground">{formatSize(layer.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <CollapsibleJson title="Raw Response" data={tagDetail} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---- Sub-components ---- */

function PullCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="surface-elevated rounded-lg p-4 flex items-center gap-3">
      <Terminal className="h-5 w-5 text-primary shrink-0" />
      <code className="text-sm font-mono flex-1 truncate">{command}</code>
      <Button variant="ghost" size="icon" onClick={copy} className="shrink-0">
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function ListRow({ icon, label, meta, onClick }: { icon: React.ReactNode; label: string; meta?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="surface-elevated rounded-lg p-4 flex items-center justify-between gap-4 w-full text-left hover:ring-1 hover:ring-primary/30 transition-all group"
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon}
        <span className="font-medium text-sm truncate">{label}</span>
        {meta && <span className="text-xs text-muted-foreground hidden sm:inline">({meta})</span>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="surface-elevated rounded-lg p-12 text-center">
      <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}

function DetailGrid({ detail, formatSize, formatDate }: { detail: any; formatSize: (b?: number) => string; formatDate: (d?: string) => string }) {
  const fields: { label: string; value: string }[] = [];

  if (detail.digest) fields.push({ label: 'Digest', value: detail.digest });
  if (detail.mediaType) fields.push({ label: 'Media Type', value: detail.mediaType });
  if (detail.architecture) fields.push({ label: 'Architecture', value: detail.architecture });
  if (detail.os) fields.push({ label: 'OS', value: detail.os });
  if (detail.size != null) fields.push({ label: 'Size', value: detail.sizeFormatted || formatSize(detail.size) });
  if (detail.push_time || detail.pushedAt) fields.push({ label: 'Pushed At', value: formatDate(detail.push_time || detail.pushedAt) });
  if (detail.pull_time) fields.push({ label: 'Last Pulled', value: formatDate(detail.pull_time) });
  if (detail.scan_overview) fields.push({ label: 'Scan Status', value: JSON.stringify(detail.scan_overview) });

  const shown = new Set(fields.map(f => f.label.toLowerCase().replace(/\s/g, '')));
  const skipKeys = new Set(['config', 'layers', 'tags', 'references', 'additions', 'labels']);
  Object.entries(detail).forEach(([k, v]) => {
    if (skipKeys.has(k)) return;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      const normalized = k.toLowerCase().replace(/[_\s]/g, '');
      if (!shown.has(normalized)) {
        fields.push({ label: k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim(), value: String(v) });
        shown.add(normalized);
      }
    }
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.label} className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{f.label}</p>
          <p className="text-sm font-mono break-all">{f.value}</p>
        </div>
      ))}
    </div>
  );
}

function CollapsibleJson({ title, data }: { title: string; data: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="surface-elevated rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <span>{title}</span>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <pre className="p-4 pt-0 text-xs font-mono text-muted-foreground overflow-auto max-h-96 whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
