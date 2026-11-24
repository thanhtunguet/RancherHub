import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Server, Lock, User, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';
import { getDeviceFingerprint, getDeviceName } from '@/lib/device-fingerprint';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initDeviceContext = async () => {
      try {
        const fingerprint = await getDeviceFingerprint();
        setDeviceFingerprint(fingerprint);
      } catch {
        setDeviceFingerprint('');
      }
      setDeviceName(getDeviceName());
    };

    void initDeviceContext();
  }, []);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login({
        username,
        password,
        deviceFingerprint: deviceFingerprint || undefined,
        deviceName: deviceName || navigator.userAgent,
        userAgent: navigator.userAgent,
      });
      if (result.requires2FA) {
        setStep('otp');
        toast({ title: '2FA Required', description: 'Enter your authenticator code to continue' });
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorToken.length !== 6) return;
    setLoading(true);
    try {
      const result = await login({
        username,
        password,
        twoFactorToken,
        trustDevice,
        deviceFingerprint: deviceFingerprint || undefined,
        deviceName: deviceName || navigator.userAgent,
        userAgent: navigator.userAgent,
      });
      if (!result.requires2FA) {
        navigate('/');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid code';
      toast({ title: 'Verification Failed', description: message, variant: 'destructive' });
      setTwoFactorToken('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center px-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center gap-3 mb-8">
            <Server className="h-12 w-12 text-primary" />
            <h1 className="text-5xl font-bold tracking-tight text-gradient">RancherHub</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-md">
            Unified management for Rancher, Kubernetes clusters, and container registries across all environments.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 max-w-sm mx-auto">
            {['Sites', 'Clusters', 'Services'].map((item) => (
              <div key={item} className="surface-elevated rounded-lg p-4 text-center">
                <div className="text-sm font-mono text-primary">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <Server className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-gradient">RancherHub</h1>
          </div>

          {step === 'credentials' ? (
            <div className="surface-elevated rounded-lg p-8">
              <h2 className="text-xl font-semibold mb-1">Sign in</h2>
              <p className="text-sm text-muted-foreground mb-6">Enter your credentials to continue</p>

              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 bg-background"
                      placeholder="username"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-background"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>
            </div>
          ) : (
            <div className="surface-elevated rounded-lg p-8">
              <button
                type="button"
                onClick={() => { setStep('credentials'); setTwoFactorToken(''); setTrustDevice(false); }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Two-Factor Authentication</h2>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-8">
                Enter the 6-digit code from your authenticator app
              </p>

              <form onSubmit={handleOTPSubmit} className="space-y-6">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={twoFactorToken}
                    onChange={setTwoFactorToken}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <span className="text-muted-foreground text-2xl">-</span>
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <Checkbox checked={trustDevice} onCheckedChange={(checked) => setTrustDevice(checked === true)} />
                  Trust this device for 30 days
                </label>

                <Button type="submit" className="w-full" disabled={loading || twoFactorToken.length !== 6}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify & Sign in'
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
