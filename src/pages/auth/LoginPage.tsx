import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
import { env } from '../../config/env';
import { ApiError, errorMessage } from '../../lib/http';
import { serverFieldErrors } from '../../lib/formErrors';
import { emailError, secretError } from '../../lib/fieldRules';

// The demo credentials only exist in mock mode; against the real API they
// always fail and burn the per-email login rate limit.
const INITIAL_CREDS = env.useMocks ? DEMO_CREDS : { email: '', password: '' };

/**
 * Where to go once signed in: back to the page the visitor asked for, which
 * ProtectedRoute saved on its way here, or the dashboard.
 *
 * Only a path of our own is accepted - anything else (an absolute URL, a
 * protocol-relative //host) would turn the login screen into an open redirect
 * for anyone who can put a link in front of an admin.
 */
function destination(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === 'string' && /^\/(?![/\\])/.test(from) ? from : '/dashboard';
}

const HIGHLIGHTS = [
  { icon: Boxes,     label: '7 products & 10 industries',   sub: 'Manage every page from one place' },
  { icon: Inbox,     label: 'Lead inbox with status flow',   sub: 'Triage demos and proposals fast' },
  { icon: BarChart3, label: 'Live traffic & funnel widgets', sub: 'See what’s working at a glance' },
];

type FieldName = 'email' | 'password';

/**
 * What the banner should say when a failure is not about one field.
 *
 * A 422 already names its fields and shows under them, so it gets no banner.
 * The rest are told apart by code rather than by message, so a rate limit does
 * not read like a wrong password.
 *
 * @returns null when the inline field errors already explain the failure.
 */
function loginBanner(error: unknown, fields: Record<string, string>): string | null {
  if (Object.keys(fields).length > 0) return null;
  if (!(error instanceof ApiError)) return errorMessage(error);

  switch (error.code) {
    case 'RATE_LIMIT_EXCEEDED':
      return 'Too many sign-in attempts from this device. Wait a few minutes and try again.';
    case 'INVALID_CREDENTIALS':
      return 'Email or password is incorrect.';
    case 'ACCOUNT_NOT_ACTIVE':
      return 'This account is not active. Ask an administrator to re-enable it.';
    default:
      return errorMessage(error);
  }
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const toast = useToast();
  const next = destination(state);
  const [email, setEmail] = useState(INITIAL_CREDS.email);
  const [password, setPassword] = useState(INITIAL_CREDS.password);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  useEffect(() => { if (user) navigate(next, { replace: true }); }, [user, navigate, next]);

  /*
   * validateLogin on the server: requiredEmail (max 254, and a pattern the
   * browser's own type="email" does not enforce - it accepts 'a@b') and
   * requiredString { min: 1, max: 128 } for the password.
   *
   * Deliberately NOT the 12-character policy: auth.validator.ts:16 explains
   * that applying it at sign-in leaks the policy and refuses legacy passwords
   * before they can be verified.
   */
  const errors = useMemo(
    () => ({
      email: emailError(email),
      password: secretError(password),
    }),
    [email, password],
  );
  const hasErrors = Boolean(errors.email || errors.password);

  const errorFor = (name: FieldName): string | undefined =>
    serverErrors[name] ?? (submitted || touched[name] ? (errors[name] ?? undefined) : undefined);

  const touch = (name: FieldName) => setTouched((t) => ({ ...t, [name]: true }));

  /** A server error belongs to the value that caused it, so editing clears it. */
  const clearServerError = (name: FieldName) =>
    setServerErrors((current) => {
      if (!(name in current)) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });

  const doLogin = async (em: string, pw: string) => {
    setError(null);
    setServerErrors({});
    setLoading(true);
    try {
      await login(em, pw);
      toast.success('Welcome back!');
      navigate(next, { replace: true });
    } catch (err) {
      // A 422's error.details name the fields they belong to, so they land
      // under the inputs rather than collapsing into "Validation failed".
      const fields = serverFieldErrors(err);
      setServerErrors(fields);
      setError(loginBanner(err, fields));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors) {
      setError('Fix the highlighted fields to continue.');
      return;
    }
    void doLogin(email, password);
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
              <Field label="Email address" required htmlFor="email" error={errorFor('email')}>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearServerError('email');
                  }}
                  onBlur={() => touch('email')}
                  placeholder="you@upwon.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  autoComplete="email"
                  invalid={!!errorFor('email')}
                  aria-invalid={!!errorFor('email')}
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearServerError('password');
                  }}
                  onBlur={() => touch('password')}
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-4 h-4" />}
                  autoComplete="current-password"
                  invalid={!!errorFor('password')}
                  aria-invalid={!!errorFor('password')}
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
                {/* The password box sits in a plain div rather than a Field, so
                    its message has to carry the shared error styling itself -
                    including the dark variant, without which it renders nearly
                    black on the dark card. */}
                {errorFor('password') && (
                  <p className="text-xs text-orange-700 dark:text-orange-400">
                    {errorFor('password')}
                  </p>
                )}
              </div>

              {/*
                "Keep me signed in on this device". /auth/login takes only
                email, password and deviceName, so the box does not yet change
                anything about the session - the refresh-token cookie is what
                keeps a signed-in admin signed in across a reload. It stays
                because removing a control the admin has always seen is not
                this pass's business; wiring it up is a separate change.
              */}
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
                disabled={submitted && hasErrors}
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
