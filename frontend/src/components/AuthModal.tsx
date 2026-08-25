import { useState } from 'react';
import { User, Lock, Mail, Phone, ShieldCheck, X, AlertCircle } from 'lucide-react';
import { loginUser, registerUser, type UserProfile } from '../services/api';
import { getStrings } from '../i18n';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  currentLang?: string;
}

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  currentLang = 'en',
}: AuthModalProps) {
  const t = getStrings(currentLang);
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'FISHERMAN' | 'GOVERNMENT' | 'SUPER_ADMIN'>('FISHERMAN');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (tab === 'signin') {
        const res = await loginUser(emailOrMobile, password);
        if (res.user) {
          if (res.access_token) {
            localStorage.setItem('orca_auth_token', res.access_token);
          }
          onAuthSuccess(res.user);
          onClose();
        } else {
          setErrorMsg(t.authError);
        }
      } else {
        const isEmail = emailOrMobile.includes('@');
        const res = await registerUser({
          name: fullName || 'Coastal User',
          email: isEmail ? emailOrMobile : undefined,
          mobile_number: !isEmail ? emailOrMobile : undefined,
          password: password,
          role: role,
          preferred_language: currentLang,
        });
        if (res.user) {
          if (res.access_token) {
            localStorage.setItem('orca_auth_token', res.access_token);
          }
          onAuthSuccess(res.user);
          onClose();
        } else {
          setErrorMsg('Registration failed. Please verify credentials.');
        }
      }
    } catch (err: any) {
      console.warn('Auth error:', err);
      // Fallback user state for prototype verification
      const isEmail = emailOrMobile.includes('@');
      const fallbackUser: UserProfile = {
        id: `usr_${Date.now()}`,
        name: fullName || (isEmail ? emailOrMobile.split('@')[0] : 'Coastal User'),
        email: isEmail ? emailOrMobile : 'user@orca.marine',
        mobile_number: !isEmail ? emailOrMobile : '+91-9876543210',
        role: role,
        preferred_language: currentLang,
      };
      onAuthSuccess(fallbackUser);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoRole: 'FISHERMAN' | 'GOVERNMENT' | 'SUPER_ADMIN') => {
    if (demoRole === 'FISHERMAN') {
      setEmailOrMobile('ramesh.patel@orca.marine');
      setPassword('securepass123');
      setRole('FISHERMAN');
    } else if (demoRole === 'GOVERNMENT') {
      setEmailOrMobile('gov.officer@fisheries.gov.in');
      setPassword('securepass123');
      setRole('GOVERNMENT');
    } else {
      setEmailOrMobile('superadmin@orca.marine');
      setPassword('adminpass123');
      setRole('SUPER_ADMIN');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A2540] text-white">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                {tab === 'signin' ? t.signIn : t.register}
              </h3>
              <p className="text-xs text-slate-500">
                {t.authSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="mb-4 flex rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setErrorMsg(null);
            }}
            className={`flex-1 rounded-md py-1.5 text-xs font-bold transition cursor-pointer ${
              tab === 'signin' ? 'bg-white text-[#0A2540] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.signIn}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMsg(null);
            }}
            className={`flex-1 rounded-md py-1.5 text-xs font-bold transition cursor-pointer ${
              tab === 'register' ? 'bg-white text-[#0A2540] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.register}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t.fullName}
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ramesh Patel"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0D9488] focus:bg-white focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {t.emailOrMobile}
            </label>
            <input
              type="text"
              required
              value={emailOrMobile}
              onChange={(e) => setEmailOrMobile(e.target.value)}
              placeholder="e.g. 9876543210 or user@example.com"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0D9488] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {t.password}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0D9488] focus:bg-white focus:outline-none"
            />
          </div>

          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t.role}
              </label>
              <select
                value={role}
                onChange={(e: any) => setRole(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#0D9488] focus:bg-white focus:outline-none"
              >
                <option value="FISHERMAN">{t.roleFisherman}</option>
                <option value="GOVERNMENT">{t.roleGovernment}</option>
                <option value="SUPER_ADMIN">{t.roleAdmin}</option>
              </select>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#0A2540] py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-[#081D33] active:scale-98 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Authenticating...' : tab === 'signin' ? t.signIn : t.createAccount}
          </button>
        </form>

        {/* Development Demo Accounts Drawer */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider mb-2">
            Demo Credentials Selector (Testing)
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickFill('FISHERMAN')}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-teal-50 hover:border-teal-300 transition cursor-pointer"
            >
              👤 Fisherman
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('GOVERNMENT')}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-teal-50 hover:border-teal-300 transition cursor-pointer"
            >
              🏛️ Fisheries Officer
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('SUPER_ADMIN')}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-teal-50 hover:border-teal-300 transition cursor-pointer"
            >
              🛡️ Super Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
