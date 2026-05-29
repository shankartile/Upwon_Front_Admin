import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles, AlertCircle,
  BarChart3, Boxes, Inbox, Quote,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Field } from '../../components/forms/Field';
import { Logo } from '../../components/common/Logo';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DEMO_CREDS } from '../../config/constants';

const HIGHLIGHTS = [
  { icon: Boxes,     label: '7 products & 10 industries',   sub: 'Manage every page from one place' },
  { icon: Inbox,     label: 'Lead inbox with status flow',   sub: 'Triage demos and proposals fast' },
  { icon: BarChart3, label: 'Live traffic & funnel widgets', sub: 'See what’s working at a glance' },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState(DEMO_CREDS.email);
  const [password, setPassword] = useState(DEMO_CREDS.password);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);

  useEffect(() => { if (user) navigate('/dashboard', { replace: true }); }, [user, navigate]);

  const doLogin = async (em: string, pw: string) => {
    setError(null);
    setLoading(true);
    try {
      await login(em, pw);
      toast.success('Welcome back!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin(email, password);
  };

  return (
    <div className="min-h-screen flex bg-cream-100">
      {/* LEFT — branded panel */}
      <aside className="relative hidden lg:flex flex-col justify-between w-[46%] xl:w-[42%] p-10 xl:p-14 text-white bg-navy-950 overflow-hidden">
        {/* background layers */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.07] pointer-events-none" />
        <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-orange-500/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-20 h-[34rem] w-[34rem] rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[22rem] w-[22rem] rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />

        {/* top */}
        <div className="relative flex items-center justify-between">
          <Logo />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur px-3 py-1 text-[11px] text-navy-200">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
            All systems normal
          </span>
        </div>

        {/* middle — pitch + highlights */}
        <div className="relative max-w-md space-y-8">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-300">
              <Sparkles className="w-3 h-3" /> Admin Console
            </span>
            <h2 className="mt-3 font-display text-[34px] xl:text-[40px] leading-[1.1] font-semibold tracking-tight">
              Run the marketing<br />surface of Upwon.
            </h2>
            <p className="mt-3 text-sm text-navy-200 max-w-sm">
              Pages, products, industries, leads — every touchpoint of the public site, edited in one place.
            </p>
          </div>

          <ul className="space-y-3">
            {HIGHLIGHTS.map((h) => {
              const Icon = h.icon;
              return (
                <li key={h.label} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur p-3">
                  <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/15 text-orange-300">
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{h.label}</p>
                    <p className="text-xs text-navy-200">{h.sub}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur p-4">
            <Quote className="w-4 h-4 text-orange-300 mb-2" />
            <p className="text-sm leading-relaxed text-white/90">
              “We moved from spreadsheets to certainty in 90 days — reporting that took weeks now takes hours.”
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-wider text-navy-300">
              CFO, Aurora Mills · case study client
            </p>
          </div>
        </div>

        {/* bottom */}
        <p className="relative text-[11px] text-navy-300 tracking-wide">
          © Upwon Enterprise · Powered by Byte Elephants Technologies
        </p>
      </aside>

      {/* RIGHT — form panel */}
      <section className="flex-1 flex flex-col">
        <header className="px-6 sm:px-10 pt-6 lg:hidden">
          <Logo onDark={false} />
        </header>

        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-10">
          <div className="w-full max-w-[420px] animate-fade-up">
            <div className="mb-7">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">
                Sign in
              </span>
              <h1 className="mt-2 font-display text-[32px] leading-tight font-semibold text-charcoal">
                Welcome back.
              </h1>
              <p className="mt-1.5 text-sm text-charcoal-light">
                Enter your credentials or jump in with a demo role.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="Email address" required htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@upwon.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  autoComplete="email"
                  required
                />
              </Field>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-medium text-charcoal">
                    Password<span className="text-orange-600 ml-0.5">*</span>
                  </label>
                  <Link to="/forgot-password" className="text-[11px] font-medium text-orange-600 hover:text-orange-700">
                    Forgot?
                  </Link>
                </div>
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-4 h-4" />}
                  autoComplete="current-password"
                  required
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      className="p-1 mr-0.5 rounded text-charcoal-light hover:text-charcoal hover:bg-cream-200"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-charcoal-light select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="accent-orange-500"
                />
                Keep me signed in on this device
              </label>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-orange-50 border border-orange-100 px-3 py-2 animate-fade-up">
                  <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-orange-800">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="orange"
                size="lg"
                loading={loading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full"
              >
                Sign in
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
