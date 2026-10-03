import { useState, useEffect } from 'react';
import { MessageTemplatesRepository } from '@/repositories/message-templates.repository';
import type { MessageTemplate, CreateMessageTemplateDto, UpdateMessageTemplateDto } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, RotateCcw, Eye, Mail, AlertTriangle, Activity, Send } from 'lucide-react';

const TEMPLATE_TYPES = [
  { value: 'critical_alert', label: 'Critical Alert', icon: AlertTriangle, color: 'text-destructive' },
  { value: 'daily_health_check', label: 'Daily Health Check', icon: Activity, color: 'text-success' },
  { value: 'test_connection', label: 'Test Connection', icon: Send, color: 'text-info' },
] as const;

const typeLabel = (t: string) => TEMPLATE_TYPES.find(tt => tt.value === t)?.label || t;
const TypeIcon = ({ type }: { type: string }) => {
  const found = TEMPLATE_TYPES.find(tt => tt.value === type);
  if (!found) return <Mail className="h-4 w-4" />;
  const Icon = found.icon;
  return <Icon className={`h-4 w-4 ${found.color}`} />;
};

export default function MessageTemplatesPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [templateType, setTemplateType] = useState<string>('critical_alert');
  const [templateName, setTemplateName] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewing, setPreviewing] = useState(false);

  const fetchTemplates = () => {
    setLoading(true);
    MessageTemplatesRepository.findAll()
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => toast({ title: 'Failed to load templates', variant: 'destructive' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openCreate = () => {
    setEditing(null);
    setTemplateType('critical_alert');
    setTemplateName('');
    setMessageTemplate('');
    setDescription('');
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = (t: MessageTemplate) => {
    setEditing(t);
    setTemplateType(t.templateType);
    setTemplateName(t.templateName);
    setMessageTemplate(t.messageTemplate);
    setDescription(t.description || '');
    setIsActive(t.isActive !== false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!templateName.trim() || !messageTemplate.trim()) {
      toast({ title: 'Name and template are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const dto: UpdateMessageTemplateDto = { templateName, messageTemplate, description: description || undefined, isActive };
        await MessageTemplatesRepository.update(editing.id, dto);
        toast({ title: 'Template updated' });
      } else {
        const dto: CreateMessageTemplateDto = {
          templateType: templateType as CreateMessageTemplateDto['templateType'],
          templateName,
          messageTemplate,
          description: description || undefined,
        };
        await MessageTemplatesRepository.create(dto);
        toast({ title: 'Template created' });
      }
      setDialogOpen(false);
      fetchTemplates();
    } catch {
      toast({ title: 'Failed to save template', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await MessageTemplatesRepository.restoreDefault(id);
      toast({ title: 'Restored to default' });
      fetchTemplates();
    } catch {
      toast({ title: 'Failed to restore', variant: 'destructive' });
    }
  };

  const handlePreview = async (t: MessageTemplate) => {
    setPreviewing(true);
    setPreviewOpen(true);
    try {
      const result = await MessageTemplatesRepository.preview({
        templateType: t.templateType,
        messageTemplate: t.messageTemplate,
      });
      setPreviewHtml(typeof result === 'string' ? result : (result as { preview?: string }).preview || JSON.stringify(result, null, 2));
    } catch {
      setPreviewHtml('Failed to generate preview');
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Message Templates</h1>
          <p className="text-sm text-muted-foreground">Customize notification messages for alerts and reports</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : templates.length === 0 ? (
        <div className="surface-elevated rounded-lg p-8 text-center">
          <Mail className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No templates configured yet</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Create your first template
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {TEMPLATE_TYPES.map(tt => {
            const group = templates.filter(t => t.templateType === tt.value);
            if (group.length === 0) return null;
            return (
              <div key={tt.value} className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <TypeIcon type={tt.value} /> {tt.label}
                </h2>
                {group.map(t => (
                  <div key={t.id} className="surface-elevated rounded-lg p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{t.templateName}</span>
                        <Badge variant={t.isActive !== false ? 'default' : 'secondary'} className="text-[10px]">
                          {t.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground mb-1">{t.description}</p>}
                      <pre className="text-xs font-mono text-muted-foreground bg-background rounded p-2 overflow-x-auto max-h-24 whitespace-pre-wrap">
                        {t.messageTemplate}
                      </pre>
                      {t.updatedAt && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Updated {new Date(t.updatedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(t)} title="Preview">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRestore(t.id)} title="Restore default">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Template' : 'New Template'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Modify the template content and settings' : 'Create a new notification message template'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editing && (
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map(tt => (
                      <SelectItem key={tt.value} value={tt.value}>{tt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Template Name</Label>
              <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Default Critical Alert" />
            </div>
            <div className="space-y-1.5">
              <Label>Message Template</Label>
              <Textarea
                value={messageTemplate}
                onChange={e => setMessageTemplate(e.target.value)}
                placeholder="Use {{variables}} for dynamic content..."
                className="min-h-[120px] font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Available variables: {'{{instanceName}}, {{status}}, {{timestamp}}, {{details}}, {{taggedUsers}}'}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description (optional)" />
            </div>
            {editing && (
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>Preview with sample data</DialogDescription>
          </DialogHeader>
          {previewing ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : (
            <pre className="text-xs font-mono bg-background rounded-md p-4 whitespace-pre-wrap max-h-80 overflow-y-auto border border-border">
              {previewHtml}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
