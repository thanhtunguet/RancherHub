import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { AuthRepository } from '@/repositories/auth.repository';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Shield, Lock, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const requires2FASetup = !user?.twoFactorEnabled;

  // Change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // 2FA
  const [setting2FA, setSetting2FA] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [disableToken, setDisableToken] = useState('');

  const handleChangePassword = async () => {
    setChangingPassword(true);
    try {
      await AuthRepository.changePassword({ currentPassword, newPassword });
      toast({ title: 'Password changed' });
      setCurrentPassword(''); setNewPassword('');
    } catch { toast({ title: 'Failed to change password', variant: 'destructive' }); }
    finally { setChangingPassword(false); }
  };

  const handleSetup2FA = async () => {
    setSetting2FA(true);
    try {
      const res = await AuthRepository.setup2FA();
      setQrCode(res.qrCode);
      setSecret(res.secret);
    } catch { toast({ title: 'Failed to setup 2FA', variant: 'destructive' }); }
    finally { setSetting2FA(false); }
  };

  const handleVerify2FA = async () => {
    try {
      await AuthRepository.verify2FA({ token: verifyToken });
      toast({ title: '2FA enabled' });
      setQrCode(''); setSecret(''); setVerifyToken('');
      refreshProfile();
    } catch { toast({ title: 'Invalid code', variant: 'destructive' }); }
  };

  const handleDisable2FA = async () => {
    try {
      await AuthRepository.disable2FA({ token: disableToken });
      toast({ title: '2FA disabled' });
      setDisableToken('');
      refreshProfile();
    } catch { toast({ title: 'Failed', variant: 'destructive' }); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="text-2xl font-bold">Profile</h1><p className="text-sm text-muted-foreground">Manage your account settings</p></div>

      {requires2FASetup && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-medium">Two-factor authentication is required before continuing.</p>
          <p className="mt-1 text-amber-100/80">Set up 2FA below to secure your account and unlock the full dashboard.</p>
        </div>
      )}

      {/* User info */}
      <div className="surface-elevated rounded-lg p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center"><User className="h-6 w-6 text-primary" /></div>
          <div>
            <p className="font-semibold">{user?.username}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Shield className={`h-4 w-4 ${user?.twoFactorEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
          <span>2FA: {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>

      {/* Change password */}
      <div className="surface-elevated rounded-lg p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Lock className="h-4 w-4" /> Change Password</h2>
        <div className="space-y-2"><Label>Current Password</Label><Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></div>
        <div className="space-y-2"><Label>New Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
        <Button onClick={handleChangePassword} disabled={changingPassword || !currentPassword || !newPassword}>
          {changingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Change Password
        </Button>
      </div>

      {/* 2FA */}
      <div className="surface-elevated rounded-lg p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4" /> Two-Factor Authentication</h2>
        {user?.twoFactorEnabled ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter your authenticator code to disable 2FA</p>
            <Input value={disableToken} onChange={(e) => setDisableToken(e.target.value)} placeholder="000000" className="font-mono tracking-widest max-w-xs" maxLength={6} />
            <Button variant="destructive" onClick={handleDisable2FA} disabled={!disableToken}>Disable 2FA</Button>
          </div>
        ) : qrCode ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Scan this QR code with Google Authenticator:</p>
            <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded border border-border" />
            <div className="text-xs font-mono text-muted-foreground bg-muted p-2 rounded break-all">Secret: {secret}</div>
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <Input value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="000000" className="font-mono tracking-widest max-w-xs" maxLength={6} />
            </div>
            <Button onClick={handleVerify2FA} disabled={!verifyToken}>Verify & Enable</Button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-3">Add an extra layer of security to your account</p>
            <Button onClick={handleSetup2FA} disabled={setting2FA}>
              {setting2FA && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Setup 2FA
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
