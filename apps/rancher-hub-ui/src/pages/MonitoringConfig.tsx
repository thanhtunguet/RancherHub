import { useState, useEffect } from 'react';
import { MonitoringRepository } from '@/repositories/monitoring.repository';
import type { MonitoringConfig, TestTelegramConnectionDto } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Send, Plus, X, Shield, Wifi } from 'lucide-react';

export default function MonitoringConfigPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(3);
  const [notificationSchedule, setNotificationSchedule] = useState<string>('immediate');

  // Telegram
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [hasTelegramBotToken, setHasTelegramBotToken] = useState(false);

  // Tagged users
  const [taggedUsers, setTaggedUsers] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // SOCKS5 proxy
  const [proxyHost, setProxyHost] = useState('');
  const [proxyPort, setProxyPort] = useState<number | ''>('');
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');
  const [hasProxyPassword, setHasProxyPassword] = useState(false);

  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    MonitoringRepository.getConfig()
      .then((cfg: MonitoringConfig) => {
        setHasExisting(true);
        setMonitoringEnabled(cfg.monitoringEnabled);
        setAlertThreshold(cfg.alertThreshold);
        setNotificationSchedule(cfg.notificationSchedule);
        // Sensitive fields are not returned by the API; use presence flags instead
        setHasTelegramBotToken(cfg.hasTelegramBotToken || false);
        setTelegramChatId(cfg.telegramChatId || '');
        setTaggedUsers(cfg.taggedUsers || []);
        setProxyHost(cfg.proxyHost || '');
        setProxyPort(cfg.proxyPort || '');
        setProxyUsername(cfg.proxyUsername || '');
        setHasProxyPassword(cfg.hasProxyPassword || false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !taggedUsers.includes(tag)) {
      setTaggedUsers(prev => [...prev, tag]);
      setNewTag('');
    }
  };

  const removeTag = (t: string) => setTaggedUsers(prev => prev.filter(u => u !== t));

  const handleSave = async () => {
    setSaving(true);
    try {
      const dto: Record<string, unknown> = {
        monitoringEnabled,
        alertThreshold,
        notificationSchedule: notificationSchedule as 'immediate' | 'hourly' | 'daily',
        telegramChatId: telegramChatId || undefined,
        taggedUsers,
        proxyHost: proxyHost || undefined,
        proxyPort: proxyPort ? Number(proxyPort) : undefined,
        proxyUsername: proxyUsername || undefined,
      };

      // Only send sensitive fields if the user provided a new value
      if (telegramBotToken.trim()) {
        dto.telegramBotToken = telegramBotToken;
      }
      if (proxyPassword.trim()) {
        dto.proxyPassword = proxyPassword;
      }

      if (hasExisting) {
        await MonitoringRepository.updateConfig(dto as Parameters<typeof MonitoringRepository.updateConfig>[0]);
      } else {
        await MonitoringRepository.createOrUpdateConfig(dto as Parameters<typeof MonitoringRepository.createOrUpdateConfig>[0]);
        setHasExisting(true);
      }
      toast({ title: 'Configuration saved' });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramChatId || (!telegramBotToken && !hasTelegramBotToken)) {
      toast({ title: 'Bot Token and Chat ID are required', variant: 'destructive' });
      return;
    }
    setTesting(true);
    try {
      const dto: TestTelegramConnectionDto = {
        telegramChatId,
        proxyHost: proxyHost || undefined,
        proxyPort: proxyPort ? Number(proxyPort) : undefined,
        proxyUsername: proxyUsername || undefined,
        proxyPassword: proxyPassword || undefined,
        taggedUsers,
      };
      // Only include bot token if the user typed a new one; otherwise server uses stored one
      if (telegramBotToken.trim()) {
        dto.telegramBotToken = telegramBotToken;
      }
      await MonitoringRepository.testTelegram(dto);
      toast({ title: 'Telegram test sent successfully' });
    } catch {
      toast({ title: 'Telegram test failed', variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Monitoring Configuration</h1>
        <p className="text-sm text-muted-foreground">Configure monitoring alerts and notifications</p>
      </div>

      {/* General Settings */}
      <section className="surface-elevated rounded-lg p-5 space-y-5">
        <h2 className="font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> General Settings
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <Label>Enable Monitoring</Label>
            <p className="text-xs text-muted-foreground">Activate health checks and alerting</p>
          </div>
          <Switch checked={monitoringEnabled} onCheckedChange={setMonitoringEnabled} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="threshold">Alert Threshold</Label>
            <Input
              id="threshold"
              type="number"
              min={1}
              max={100}
              value={alertThreshold}
              onChange={e => setAlertThreshold(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">Consecutive failures before alerting</p>
          </div>

          <div className="space-y-1.5">
            <Label>Notification Schedule</Label>
            <Select value={notificationSchedule} onValueChange={setNotificationSchedule}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Telegram Settings */}
      <section className="surface-elevated rounded-lg p-5 space-y-5">
        <h2 className="font-semibold flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" /> Telegram
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="botToken">Bot Token</Label>
            <Input
              id="botToken"
              type="password"
              placeholder={hasTelegramBotToken ? '••• configured (leave blank to keep)' : '123456:ABC-DEF...'}
              value={telegramBotToken}
              onChange={e => setTelegramBotToken(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chatId">Chat ID</Label>
            <Input
              id="chatId"
              placeholder="-1001234567890"
              value={telegramChatId}
              onChange={e => setTelegramChatId(e.target.value)}
            />
          </div>
        </div>

        {/* Tagged Users */}
        <div className="space-y-2">
          <Label>Tagged Users</Label>
          <p className="text-xs text-muted-foreground">Telegram usernames to tag in alert messages</p>
          <div className="flex gap-2">
            <Input
              placeholder="@username"
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
              className="max-w-xs"
            />
            <Button variant="outline" size="icon" onClick={addTag} type="button">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {taggedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {taggedUsers.map(t => (
                <Badge key={t} variant="secondary" className="gap-1 pr-1">
                  {t}
                  <button onClick={() => removeTag(t)} className="ml-0.5 hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={handleTestTelegram} disabled={testing}>
          {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
          Test Connection
        </Button>
      </section>

      {/* SOCKS5 Proxy */}
      <section className="surface-elevated rounded-lg p-5 space-y-5">
        <h2 className="font-semibold flex items-center gap-2">
          <Wifi className="h-4 w-4 text-primary" /> SOCKS5 Proxy
        </h2>
        <p className="text-xs text-muted-foreground">Optional proxy for Telegram API requests</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="proxyHost">Host</Label>
            <Input id="proxyHost" placeholder="proxy.example.com" value={proxyHost} onChange={e => setProxyHost(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proxyPort">Port</Label>
            <Input id="proxyPort" type="number" placeholder="1080" value={proxyPort} onChange={e => setProxyPort(e.target.value ? Number(e.target.value) : '')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proxyUser">Username</Label>
            <Input id="proxyUser" placeholder="optional" value={proxyUsername} onChange={e => setProxyUsername(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proxyPass">Password</Label>
            <Input id="proxyPass" type="password" placeholder={hasProxyPassword ? '••• configured (leave blank to keep)' : 'optional'} value={proxyPassword} onChange={e => setProxyPassword(e.target.value)} />
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
