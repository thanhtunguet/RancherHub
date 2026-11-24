import { useState } from 'react';
import { getConfig, setConfig, resetClient } from '@/api/client';
import { HealthRepository } from '@/repositories/health.repository';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, Wifi, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function SettingsPage() {
  const { toast } = useToast();
  const config = getConfig();
  const [baseURL, setBaseURL] = useState(config.baseURL);
  const [env, setEnv] = useState(config.environment);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  const handleSave = () => {
    setConfig({ baseURL, environment: env });
    resetClient();
    toast({ title: 'Settings saved' });
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Temporarily apply the URL
      const oldConfig = getConfig();
      setConfig({ baseURL });
      resetClient();
      await HealthRepository.getHealth();
      setTestResult(true);
      toast({ title: 'Connection successful' });
      // Restore if not saving
      setConfig(oldConfig);
      resetClient();
    } catch {
      setTestResult(false);
      toast({ title: 'Connection failed', variant: 'destructive' });
    }
    finally { setTesting(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-sm text-muted-foreground">Configure API connection</p></div>

      <div className="surface-elevated rounded-lg p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><SettingsIcon className="h-4 w-4" /> API Configuration</h2>

        <div className="space-y-2">
          <Label>Environment</Label>
          <Select value={env} onValueChange={(v: 'development' | 'production') => setEnv(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="development">Development</SelectItem>
              <SelectItem value="production">Production</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Base URL</Label>
          <div className="flex items-center gap-2">
            <Input value={baseURL} onChange={(e) => setBaseURL(e.target.value)} placeholder="http://localhost:3000" className="font-mono text-sm" />
            <Button variant="outline" onClick={handleTest} disabled={testing} className="gap-2 shrink-0">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
              Test
            </Button>
          </div>
          {testResult !== null && (
            <div className={`flex items-center gap-2 text-sm ${testResult ? 'text-success' : 'text-destructive'}`}>
              {testResult ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {testResult ? 'Connection successful' : 'Connection failed'}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave}>Save Settings</Button>
          <Button variant="outline" onClick={() => { setBaseURL(config.baseURL); setEnv(config.environment); }}>Reset</Button>
        </div>
      </div>

      <div className="surface-elevated rounded-lg p-5 space-y-2">
        <h2 className="font-semibold">Environment Presets</h2>
        <p className="text-xs text-muted-foreground">Quick-apply common configurations</p>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => { setBaseURL('http://localhost:3000'); setEnv('development'); }}>Local Dev</Button>
          <Button variant="outline" size="sm" onClick={() => { setBaseURL('https://api.rancherhub.example.com'); setEnv('production'); }}>Production</Button>
        </div>
      </div>
    </div>
  );
}
