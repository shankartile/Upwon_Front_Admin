import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Mail, Quote, Shield, Sparkles, Timer,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Field } from '../../components/forms/Field';
import { Logo } from '../../components/common/Logo';
import { counterFor, EMAIL_MAX, emailError } from '../../lib/fieldRules';

const HIGHLIGHTS = [
  { icon: Mail,  label: 'Reset link by email',        sub: 'Sent to the address on file' },
  { icon: Timer, label: 'Expires in 30 minutes',      sub: 'For your account security' },
  { icon: Shield, label: 'Single-use, signed token',  sub: 'Old links are invalidated' },
];

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /*
   * validateForgotPassword → requiredEmail: required, max 254, and a pattern
   * stricter than the browser's type="email" (which accepts 'a@b').
   *
   * These are the only checks this screen runs: onSubmit is still the placeholder
   * timer it always was and never calls POST /auth/forgot-password. Wiring it up
   * is outside this pass - see the notes handed back with this change.
   */
  const error = emailError(email);
  const shownError = submitted || touched ? (error ?? undefined) : undefined;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (error) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-cream-100">
      {/* LEFT — branded panel */}
      <aside className="relative hidden lg:flex flex-col justify-between w-[46%] xl:w-[42%] p-10 xl:p-14 text-white bg-navy-950 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.07] pointer-events-none" />
        <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-orange-500/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-20 h-[34rem] w-[34rem] rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[22rem] w-[22rem] rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex items-center justify-between">
          <Logo />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur px-3 py-1 text-[11px] text-navy-200">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
            All systems normal
          </span>
        </div>

        <div className="relative max-w-md space-y-8">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-300">
              <Sparkles className="w-3 h-3" /> Account recovery
            </span>
            <h2 className="mt-3 font-display text-[34px] xl:text-[40px] leading-[1.1] font-semibold tracking-tight">
              Locked out?<br />Let’s get you back in.
            </h2>
            <p className="mt-3 text-sm text-navy-200 max-w-sm">
              Enter the email tied to your admin account and we’ll send a single-use reset link.
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
              “Security shouldn’t get in the way of getting back to work. Reset, sign in, ship.”
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-wider text-navy-300">
              Upwon · Admin Console principles
            </p>
          </div>
        </div>

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
                <KeyRound className="w-3 h-3" /> Reset password
              </span>
              <h1 className="mt-2 font-display text-[32px] leading-tight font-semibold text-charcoal">
                Forgot your password?
              </h1>
              <p className="mt-1.5 text-sm text-charcoal-light">
                {sent
                  ? 'Check your inbox. The link expires in 30 minutes.'
                  : 'Enter your email and we’ll send you a secure reset link.'}
              </p>
            </div>

            {sent ? (
              <div className="space-y-5">
                <div className="flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50 p-4 animate-fade-up">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-charcoal">Reset link sent</p>
                    <p className="text-xs text-charcoal-light mt-0.5">
                      If an account exists for <span className="font-medium text-charcoal">{email}</span>, you’ll receive an email shortly.
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  onClick={() => { setSent(false); setEmail(''); setTouched(false); setSubmitted(false); }}
                >
                  Use a different email
                </Button>
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1.5 text-xs text-charcoal-light hover:text-charcoal"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <Field
                  label="Email address"
                  required
                  htmlFor="email"
                  error={shownError}
                  hint={counterFor(email, EMAIL_MAX)}
                >
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="you@upwon.com"
                    leftIcon={<Mail className="w-4 h-4" />}
                    autoComplete="email"
                    invalid={!!shownError}
                    aria-invalid={!!shownError}
                  />
                </Field>

                <Button
                  type="submit"
                  variant="orange"
                  size="lg"
                  loading={loading}
                  disabled={submitted && !!error}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full"
                >
                  Send reset link
                </Button>

                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1.5 text-xs text-charcoal-light hover:text-charcoal pt-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </Link>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
