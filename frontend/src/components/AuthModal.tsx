import React, { useState } from 'react';
import { User, Lock, Phone, Mail, Shield, ArrowRight } from 'lucide-react';
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
  const [identifier, setIdentifier] = useState('fisherman@orca.marine');
  const [password, setPassword] = useState('password123');
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
          name: name || 'Fisherman',
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

  const handleQuickDemo = async (demoEmail: string, demoPass: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await loginUser(demoEmail, demoPass);
      onAuthSuccess(res.user, res.access_token);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl text-white">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-11 h-11 rounded-2xl bg-teal-950/80 border border-teal-500/40 flex items-center justify-center text-teal-400 mx-auto mb-2.5 shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-white tracking-tight">ORCA Marine AI Portal</h2>
          <p className="text-xs text-slate-400">Coastal Safety & Role-Based Access</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-950/70 p-1 border border-slate-800 mb-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
              tab === 'login' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null); }}
            className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
              tab === 'register' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Register Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === 'register' && (
            <>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Captain Ramesh Koli"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Mobile Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Role / Persona</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="USER">Fisherman / Coastal Citizen</option>
                  <option value="GOVERNMENT">Fisheries / Port / Emergency Official</option>
                  <option value="SUPER_ADMIN">System Administrator</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              {tab === 'login' ? 'Email or Mobile Number' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={tab === 'login' ? identifier : email}
                onChange={(e) => tab === 'login' ? setIdentifier(e.target.value) : setEmail(e.target.value)}
                placeholder="e.g. fisherman@orca.marine"
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>{tab === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Logins Row */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 text-center font-bold">
            ⚡ Quick Demo Logins (SIH Evaluators)
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('fisherman@orca.marine', 'password123')}
              className="px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-teal-950 border border-slate-800 hover:border-teal-500 text-[10px] text-teal-300 font-semibold transition cursor-pointer text-center"
            >
              ⚓ Fisherman
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('officer@fisheries.gov.in', 'govpassword123')}
              className="px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-sky-950 border border-slate-800 hover:border-sky-500 text-[10px] text-sky-300 font-semibold transition cursor-pointer text-center"
            >
              🏛️ Government
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('admin@orca.marine', 'adminpassword123')}
              className="px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-purple-950 border border-slate-800 hover:border-purple-500 text-[10px] text-purple-300 font-semibold transition cursor-pointer text-center"
            >
              👑 Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
