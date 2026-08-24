import React, { useState } from 'react';
import { User, Lock, Phone, Mail, ArrowRight } from 'lucide-react';
import { loginUser, registerUser } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onAuthSuccess: (userProfile: any, token: string) => void;
  onClose?: () => void;
  currentLang?: string;
}

export default function AuthModal({
  isOpen,
  onAuthSuccess,
  currentLang = 'en',
}: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'USER' | 'GOVERNMENT' | 'SUPER_ADMIN'>('USER');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (tab === 'login') {
        const res = await loginUser(identifier, password);
        onAuthSuccess(res.user, res.access_token);
      } else {
        const res = await registerUser({
          name: name || 'User',
          email: email || undefined,
          mobile_number: phone || undefined,
          password: password || 'password123',
          preferred_language: currentLang,
          role,
        });
        onAuthSuccess(res.user, res.access_token);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full bg-white border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition';

  return (
    <div className="modal-backdrop">
      <div className="modal-card p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #0B3D5B 0%, #0F766E 100%)' }}
          >
            <span className="text-xl">🛡️</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">ORCA Marine AI</h2>
          <p className="text-xs text-slate-500 mt-0.5">Coastal Safety & Intelligence Access</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
              tab === 'login'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null); }}
            className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
              tab === 'register'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Captain Ramesh Koli"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Mobile Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 text-sm rounded-xl px-4 py-2.5 text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 cursor-pointer transition"
                >
                  <option value="USER">Fisherman / Coastal Citizen</option>
                  <option value="GOVERNMENT">Fisheries / Port / Emergency Official</option>
                  <option value="SUPER_ADMIN">System Administrator</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              {tab === 'login' ? 'Email or Mobile Number' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={tab === 'login' ? identifier : email}
                onChange={(e) => tab === 'login' ? setIdentifier(e.target.value) : setEmail(e.target.value)}
                placeholder="email@example.com or 9876543210"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl text-white text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.97] cursor-pointer disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #0B3D5B 0%, #0F766E 100%)' }}
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{tab === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Skip Auth (Guest Access) */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-400">
            No account?{' '}
            <button
              type="button"
              onClick={() => onAuthSuccess({ name: 'Guest', role: 'USER' }, '')}
              className="text-teal-600 hover:text-teal-700 font-semibold underline underline-offset-2 cursor-pointer"
            >
              Continue as Guest
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
