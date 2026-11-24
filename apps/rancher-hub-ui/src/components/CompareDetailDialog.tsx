import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CheckCircle, AlertTriangle, XCircle, ArrowRight, Minus, Plus, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface DetailData {
  source: Record<string, unknown> | null;
  target: Record<string, unknown> | null;
  differences?: Record<string, { source?: unknown; target?: unknown }>;
  [key: string]: unknown;
}

export interface CompareDetailItem {
  title: string;
  status: string;
  detail: DetailData | null;
  loading?: boolean;
}

interface CompareDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceLabel: string;
  targetLabel: string;
  maskedKeys?: string[];
  maskValues?: boolean;
  // Single item mode (backward compatible)
  title?: string;
  status?: string;
  loading?: boolean;
  detail?: DetailData | null;
  // Multi item mode
  items?: CompareDetailItem[];
}

const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  identical: { icon: <CheckCircle className="h-4 w-4 text-success" />, label: 'Identical', color: 'bg-success/10 text-success' },
  different: { icon: <AlertTriangle className="h-4 w-4 text-warning" />, label: 'Different', color: 'bg-warning/10 text-warning' },
  missing: { icon: <XCircle className="h-4 w-4 text-destructive" />, label: 'Missing', color: 'bg-destructive/10 text-destructive' },
};

function formatValue(val: unknown, mask = false): string {
  if (val === null || val === undefined) return '';
  if (mask) return '••••••••';
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
}

function getAllKeys(source: Record<string, unknown> | null, target: Record<string, unknown> | null): string[] {
  const keys = new Set<string>();
  if (source) Object.keys(source).forEach(k => keys.add(k));
  if (target) Object.keys(target).forEach(k => keys.add(k));
  return Array.from(keys).sort();
}

type DiffType = 'identical' | 'added' | 'removed' | 'modified';

function getDiffType(srcVal: unknown, tgtVal: unknown): DiffType {
  const inSrc = srcVal !== undefined;
  const inTgt = tgtVal !== undefined;
  if (inSrc && !inTgt) return 'removed';
  if (!inSrc && inTgt) return 'added';
  if (JSON.stringify(srcVal) !== JSON.stringify(tgtVal)) return 'modified';
  return 'identical';
}

const diffStyles: Record<DiffType, { row: string; srcCell: string; tgtCell: string; icon: React.ReactNode; label: string }> = {
  identical: {
    row: '',
    srcCell: '',
    tgtCell: '',
    icon: <CheckCircle className="h-3 w-3 text-muted-foreground" />,
    label: '',
  },
  removed: {
    row: 'bg-[hsl(var(--diff-removed-bg))]',
    srcCell: 'bg-[hsl(var(--diff-removed-highlight))] text-[hsl(var(--diff-removed-fg))]',
    tgtCell: 'opacity-40',
    icon: <Minus className="h-3 w-3 text-[hsl(var(--diff-removed-fg))]" />,
    label: 'Removed',
  },
  added: {
    row: 'bg-[hsl(var(--diff-added-bg))]',
    srcCell: 'opacity-40',
    tgtCell: 'bg-[hsl(var(--diff-added-highlight))] text-[hsl(var(--diff-added-fg))]',
    icon: <Plus className="h-3 w-3 text-[hsl(var(--diff-added-fg))]" />,
    label: 'Added',
  },
  modified: {
    row: 'bg-[hsl(var(--diff-modified-bg))]',
    srcCell: 'bg-[hsl(var(--diff-removed-highlight))] text-[hsl(var(--diff-removed-fg))]',
    tgtCell: 'bg-[hsl(var(--diff-added-highlight))] text-[hsl(var(--diff-added-fg))]',
    icon: <RefreshCw className="h-3 w-3 text-[hsl(var(--diff-modified-fg))]" />,
    label: 'Modified',
  },
};

function DetailSection({ item, sourceLabel, targetLabel, maskedKeys = [], maskValues = false }: {
  item: CompareDetailItem;
  sourceLabel: string;
  targetLabel: string;
  maskedKeys?: string[];
  maskValues?: boolean;
}) {
  const cfg = statusConfig[item.status] || statusConfig.missing;
  const allKeys = item.detail ? getAllKeys(item.detail.source, item.detail.target) : [];

  const sortOrder: Record<DiffType, number> = { modified: 0, added: 1, removed: 2, identical: 3 };
  const sortedKeys = item.detail
    ? [...allKeys].sort((a, b) => {
        const da = getDiffType(item.detail!.source?.[a], item.detail!.target?.[a]);
        const db = getDiffType(item.detail!.source?.[b], item.detail!.target?.[b]);
        return (sortOrder[da] ?? 9) - (sortOrder[db] ?? 9) || a.localeCompare(b);
      })
    : [];

  const counts = { identical: 0, modified: 0, added: 0, removed: 0 };
  if (item.detail) {
    for (const key of allKeys) {
      counts[getDiffType(item.detail.source?.[key], item.detail.target?.[key])]++;
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <h3 className="font-mono text-sm font-semibold">{item.title}</h3>
        <Badge variant="outline" className={cfg.color}>
          <span className="flex items-center gap-1.5">{cfg.icon} {cfg.label}</span>
        </Badge>
        <div className="flex items-center gap-3 text-[11px] ml-auto">
          {counts.modified > 0 && (
            <span className="flex items-center gap-1 text-[hsl(var(--diff-modified-fg))]">
              <RefreshCw className="h-3 w-3" /> {counts.modified}
            </span>
          )}
          {counts.added > 0 && (
            <span className="flex items-center gap-1 text-[hsl(var(--diff-added-fg))]">
              <Plus className="h-3 w-3" /> {counts.added}
            </span>
          )}
          {counts.removed > 0 && (
            <span className="flex items-center gap-1 text-[hsl(var(--diff-removed-fg))]">
              <Minus className="h-3 w-3" /> {counts.removed}
            </span>
          )}
          {counts.identical > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <CheckCircle className="h-3 w-3" /> {counts.identical}
            </span>
          )}
        </div>
      </div>

      {item.loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : !item.detail ? (
        <p className="text-sm text-muted-foreground text-center py-4">No detail data available</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-2 w-6"></th>
                <th className="text-left p-2 font-medium text-xs uppercase tracking-wider w-[22%]">Key</th>
                <th className="text-left p-2 font-medium text-xs uppercase tracking-wider w-[36%]">{sourceLabel}</th>
                <th className="text-left p-2 font-medium text-xs uppercase tracking-wider w-[36%]">{targetLabel}</th>
              </tr>
            </thead>
            <tbody>
              {sortedKeys.map(key => {
                const isMasked = maskValues || maskedKeys.includes(key);
                const srcVal = item.detail!.source?.[key];
                const tgtVal = item.detail!.target?.[key];
                const diffType = getDiffType(srcVal, tgtVal);
                const style = diffStyles[diffType];

                return (
                  <tr key={key} className={`border-b border-border/30 ${style.row}`}>
                    <td className="p-2 text-center align-top">{style.icon}</td>
                    <td className="p-2 font-mono text-xs font-medium align-top">{key}</td>
                    <td className={`p-2 font-mono text-xs align-top whitespace-pre-wrap break-all ${style.srcCell}`}>
                      {formatValue(srcVal, isMasked) || <span className="text-muted-foreground/40 italic">—</span>}
                    </td>
                    <td className={`p-2 font-mono text-xs align-top whitespace-pre-wrap break-all ${style.tgtCell}`}>
                      {formatValue(tgtVal, isMasked) || <span className="text-muted-foreground/40 italic">—</span>}
                    </td>
                  </tr>
                );
              })}
              {sortedKeys.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No keys to display</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function CompareDetailDialog({
  open, onOpenChange, sourceLabel, targetLabel, maskedKeys = [], maskValues = false,
  title, status, loading, detail,
  items,
}: CompareDetailDialogProps) {
  // Normalize to items array
  const resolvedItems: CompareDetailItem[] = items && items.length > 0
    ? items
    : title
      ? [{ title: title!, status: status || 'missing', detail: detail ?? null, loading }]
      : [];

  const isMulti = resolvedItems.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-lg">
              {isMulti ? `Comparing ${resolvedItems.length} items` : resolvedItems[0]?.title || 'Details'}
            </DialogTitle>
            {!isMulti && resolvedItems[0] && (() => {
              const cfg = statusConfig[resolvedItems[0].status] || statusConfig.missing;
              return (
                <Badge variant="outline" className={cfg.color}>
                  <span className="flex items-center gap-1.5">{cfg.icon} {cfg.label}</span>
                </Badge>
              );
            })()}
          </div>
          <p className="text-xs text-muted-foreground">
            {sourceLabel} <ArrowRight className="inline h-3 w-3 mx-1" /> {targetLabel}
          </p>
        </DialogHeader>

        <div className="overflow-y-auto -mx-6 px-6" style={{ maxHeight: 'calc(85vh - 140px)' }}>
          <div className="space-y-6">
            {resolvedItems.map((item, idx) => (
              <div key={item.title + idx}>
                {isMulti && idx > 0 && <Separator className="mb-6" />}
                <DetailSection
                  item={item}
                  sourceLabel={sourceLabel}
                  targetLabel={targetLabel}
                  maskedKeys={maskedKeys}
                  maskValues={maskValues}
                />
              </div>
            ))}
            {resolvedItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No items to display</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
