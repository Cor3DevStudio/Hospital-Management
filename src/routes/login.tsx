import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Eye,
  EyeOff,
  HeartPulse,
  Loader2,
  Lock,
  ShieldCheck,
  Stethoscope,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/useAuth";
import { getSession } from "@/lib/auth/authService";
import {
  isLoginFormValid,
  validateLoginForm,
  type LoginFieldErrors,
} from "@/lib/auth/validation";
import { firstAllowedPage, resolveAccessUser } from "@/lib/pageAccess";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Medical Center" }] }),
  component: LoginPage,
});

const FLOATING_ICONS = [
  { Icon: HeartPulse, className: "top-[12%] left-[8%] text-rose-400/30", delay: "0s", size: 28 },
  { Icon: Stethoscope, className: "top-[22%] right-[12%] text-sky-400/25", delay: "1.2s", size: 32 },
  { Icon: Activity, className: "bottom-[28%] left-[14%] text-emerald-400/25", delay: "2.1s", size: 26 },
  { Icon: ShieldCheck, className: "top-[55%] right-[8%] text-indigo-400/25", delay: "0.6s", size: 30 },
  { Icon: Zap, className: "bottom-[14%] right-[22%] text-amber-400/20", delay: "1.8s", size: 24 },
  { Icon: HeartPulse, className: "top-[70%] left-[6%] text-rose-300/20", delay: "2.8s", size: 22 },
  { Icon: Activity, className: "top-[8%] right-[28%] text-cyan-400/20", delay: "0.9s", size: 20 },
  { Icon: Stethoscope, className: "bottom-[40%] left-[4%] text-blue-300/20", delay: "3.2s", size: 24 },
] as const;

const FEATURES = [
  { Icon: ShieldCheck, label: "Secure & Encrypted", desc: "Bank-grade protection" },
  { Icon: Zap, label: "Fast & Reliable", desc: "Always ready when you are" },
  { Icon: Activity, label: "PhilHealth Integrated", desc: "Claims in one place" },
] as const;

function LoginPage() {
  const { state } = useStore();
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [touched, setTouched] = useState({ username: false, password: false });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!state.authedUser) return;
    const accessUser = resolveAccessUser(state, getSession()?.user);
    navigate({ to: firstAllowedPage(accessUser) });
  }, [state.authedUser, state.users, navigate, state]);

  const showFieldError = (field: keyof LoginFieldErrors) =>
    (touched[field] || submitted) && fieldErrors[field];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const errors = validateLoginForm(username, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const result = await login({ username: username.trim(), password });

    if (result.success) {
      toast.success(`Welcome back, ${result.user?.fullName ?? username}`);
      navigate({
        to: firstAllowedPage(
          result.user
            ? { role: result.user.role, pageAccess: result.user.pageAccess }
            : undefined
        ),
      });
      return;
    }

    toast.error(result.message ?? "Invalid username or password");
  };

  const formValid = isLoginFormValid(username, password);
  const signInDisabled = !formValid || isLoading;

  return (
    <div className="login-page min-h-screen w-full flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans">
      <style>{`
        .login-page {
          background: #050b18;
        }

        @keyframes loginFadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loginLogoPop {
          0% { transform: scale(0.7) rotate(-8deg); opacity: 0; }
          60% { transform: scale(1.08) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes loginFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-14px) rotate(4deg); }
          66% { transform: translateY(8px) rotate(-3deg); }
        }
        @keyframes loginPulseOrb {
          0%, 100% { transform: scale(1); opacity: 0.45; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }
        @keyframes loginPulseOrbAlt {
          0%, 100% { transform: scale(1.1); opacity: 0.35; }
          50% { transform: scale(0.95); opacity: 0.6; }
        }
        @keyframes loginGridDrift {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 40px); }
        }
        @keyframes loginShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes loginHeartbeat {
          0%, 100% { transform: scale(1); }
          14% { transform: scale(1.12); }
          28% { transform: scale(1); }
          42% { transform: scale(1.08); }
          56% { transform: scale(1); }
        }
        @keyframes loginRingPulse {
          0% { transform: scale(0.85); opacity: 0.55; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes loginScanLine {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 0.4; }
          90% { opacity: 0.4; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        @keyframes loginFeatureIn {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes loginGlowSweep {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.85; }
        }
        @keyframes loginParticle {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          15% { opacity: 0.7; }
          85% { opacity: 0.5; }
          100% { transform: translateY(-100vh) scale(0.4); opacity: 0; }
        }

        .login-fade-up { animation: loginFadeUp 0.65s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .login-logo-pop { animation: loginLogoPop 0.75s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        .login-float { animation: loginFloat 7s ease-in-out infinite; }
        .login-orb-a { animation: loginPulseOrb 8s ease-in-out infinite; }
        .login-orb-b { animation: loginPulseOrbAlt 10s ease-in-out infinite; }
        .login-grid { animation: loginGridDrift 20s linear infinite; }
        .login-heartbeat { animation: loginHeartbeat 1.8s ease-in-out infinite; }
        .login-ring { animation: loginRingPulse 2.4s ease-out infinite; }
        .login-feature { animation: loginFeatureIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .login-glow-sweep { animation: loginGlowSweep 4s ease-in-out infinite; }
        .login-particle { animation: loginParticle linear infinite; }

        .login-shimmer-btn {
          background-size: 200% auto;
          background-image: linear-gradient(
            110deg,
            #2563eb 0%,
            #2563eb 40%,
            #60a5fa 50%,
            #2563eb 60%,
            #2563eb 100%
          );
        }
        .login-shimmer-btn:not(:disabled):hover {
          animation: loginShimmer 1.4s linear infinite;
        }

        .login-input-wrap:focus-within {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
          border-color: rgb(147, 197, 253);
        }

        .login-card-glow {
          box-shadow:
            0 0 0 1px rgba(99, 102, 241, 0.12),
            0 25px 50px -12px rgba(0, 0, 0, 0.55),
            0 0 80px -20px rgba(37, 99, 235, 0.35);
        }

        @media (prefers-reduced-motion: reduce) {
          .login-fade-up,
          .login-logo-pop,
          .login-float,
          .login-orb-a,
          .login-orb-b,
          .login-grid,
          .login-heartbeat,
          .login-ring,
          .login-feature,
          .login-glow-sweep,
          .login-particle,
          .login-shimmer-btn:not(:disabled):hover {
            animation: none !important;
          }
        }
      `}</style>

      {/* Animated grid */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
        <div
          className="login-grid absolute -inset-[40px] opacity-[0.18]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(99, 102, 241, 0.35) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(99, 102, 241, 0.35) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Gradient orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="login-orb-a absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-blue-600/30 blur-[100px]" />
        <div className="login-orb-b absolute -bottom-40 -right-20 h-[480px] w-[480px] rounded-full bg-indigo-500/25 blur-[110px]" />
        <div
          className="login-orb-a absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[90px]"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* Rising particles */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="login-particle absolute bottom-0 rounded-full bg-sky-300/40"
            style={{
              left: `${6 + i * 7}%`,
              width: i % 3 === 0 ? 3 : 2,
              height: i % 3 === 0 ? 3 : 2,
              animationDuration: `${8 + (i % 5) * 2}s`,
              animationDelay: `${i * 0.55}s`,
            }}
          />
        ))}
      </div>

      {/* Floating medical icons */}
      <div className="absolute inset-0 z-0 pointer-events-none hidden sm:block" aria-hidden>
        {FLOATING_ICONS.map(({ Icon, className, delay, size }, i) => (
          <div
            key={i}
            className={`login-float absolute ${className}`}
            style={{ animationDelay: delay, animationDuration: `${6 + (i % 4)}s` }}
          >
            <Icon size={size} strokeWidth={1.5} />
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="login-fade-up login-card-glow w-full max-w-5xl rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-12 z-10 border border-white/10">
        {/* Left branding panel */}
        <div className="hidden md:flex md:col-span-5 flex-col justify-between p-10 lg:p-12 text-white relative overflow-hidden bg-gradient-to-br from-[#0a162f] via-[#0c1a38] to-[#0a1226]">
          {/* Scan line */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            aria-hidden
            style={{
              background:
                "linear-gradient(to bottom, transparent, rgba(56, 189, 248, 0.08), transparent)",
              animation: "loginScanLine 8s ease-in-out infinite",
            }}
          />

          {/* Soft corner glow */}
          <div
            className="login-glow-sweep absolute -top-20 -right-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl"
            aria-hidden
          />
          <div
            className="login-glow-sweep absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl"
            style={{ animationDelay: "1.5s" }}
            aria-hidden
          />

          <div className="relative z-10 flex flex-col">
            <div className="login-logo-pop flex items-center gap-3 mb-8">
              <div className="relative flex h-12 w-12 items-center justify-center">
                <span className="login-ring absolute inset-0 rounded-2xl border border-blue-400/40" />
                <span
                  className="login-ring absolute inset-0 rounded-2xl border border-sky-400/30"
                  style={{ animationDelay: "0.8s" }}
                />
                <div className="login-heartbeat relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/40">
                  <HeartPulse className="h-6 w-6 text-white" strokeWidth={2.2} />
                </div>
              </div>
              <div>
                <span className="block text-lg font-bold tracking-tight text-white">
                  Medical Center
                </span>
                <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300/80">
                  Hospital System
                </span>
              </div>
            </div>

            <h1
              className="login-fade-up text-2xl lg:text-3xl font-bold leading-tight text-white"
              style={{ animationDelay: "120ms" }}
            >
              Care that moves
              <span className="block bg-gradient-to-r from-sky-300 to-blue-400 bg-clip-text text-transparent">
                as fast as you do
              </span>
            </h1>

            <p
              className="login-fade-up mt-4 text-sm leading-relaxed text-slate-400 max-w-xs"
              style={{ animationDelay: "220ms" }}
            >
              Professional healthcare management for modern medical practices —
              admissions, billing, PhilHealth, and more.
            </p>

            <div className="mt-10 space-y-3">
              {FEATURES.map(({ Icon, label, desc }, idx) => (
                <div
                  key={label}
                  className="login-feature group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-3 backdrop-blur-sm transition-colors hover:border-sky-400/30 hover:bg-white/[0.06]"
                  style={{ animationDelay: `${320 + idx * 100}ms` }}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-sky-300 transition-transform group-hover:scale-110">
                    <Icon className="h-4.5 w-4.5" size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="login-fade-up relative z-10 mt-10 flex items-center justify-between text-xs text-slate-500"
            style={{ animationDelay: "620ms" }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-medium text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              v2.0 Online
            </span>
            <span>&copy; 2026 Medical Center</span>
          </div>
        </div>

        {/* Right form panel */}
        <div
          className="login-fade-up col-span-12 md:col-span-7 bg-white p-8 sm:p-10 md:p-12 lg:p-14 flex flex-col justify-center min-h-[520px] relative"
          style={{ animationDelay: "80ms" }}
        >
          {/* Mobile logo */}
          <div className="login-logo-pop mb-8 flex items-center gap-2.5 md:hidden">
            <div className="login-heartbeat flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/30">
              <HeartPulse className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-bold text-slate-900">Medical Center</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="mt-1.5 text-sm font-medium text-slate-400">
              Sign in to continue to your workspace
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col" noValidate>
            <div className="space-y-5">
              <div
                className="login-fade-up space-y-1.5"
                style={{ animationDelay: "180ms" }}
              >
                <Label
                  htmlFor="username"
                  className="text-xs font-semibold tracking-wide text-slate-500"
                >
                  Username
                </Label>
                <div className="login-input-wrap flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition-all">
                  <User className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (submitted || touched.username) {
                        setFieldErrors(validateLoginForm(e.target.value, password));
                      }
                    }}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, username: true }));
                      setFieldErrors(validateLoginForm(username, password));
                    }}
                    autoComplete="username"
                    aria-invalid={!!showFieldError("username")}
                    className="h-11 flex-1 border-0 bg-transparent px-0 text-sm text-slate-800 shadow-none placeholder:text-slate-400/80 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                {showFieldError("username") && (
                  <p className="text-xs text-red-600" role="alert">
                    {fieldErrors.username}
                  </p>
                )}
              </div>

              <div
                className="login-fade-up space-y-1.5"
                style={{ animationDelay: "280ms" }}
              >
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold tracking-wide text-slate-500"
                >
                  Password
                </Label>
                <div className="login-input-wrap flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition-all">
                  <Lock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (submitted || touched.password) {
                        setFieldErrors(validateLoginForm(username, e.target.value));
                      }
                    }}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, password: true }));
                      setFieldErrors(validateLoginForm(username, password));
                    }}
                    autoComplete="current-password"
                    aria-invalid={!!showFieldError("password")}
                    className="h-11 flex-1 border-0 bg-transparent px-0 text-sm text-slate-800 shadow-none placeholder:text-slate-400/80 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {showFieldError("password") && (
                  <p className="text-xs text-red-600" role="alert">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="login-fade-up" style={{ animationDelay: "380ms" }}>
                <Button
                  type="submit"
                  disabled={signInDisabled}
                  className="login-shimmer-btn mt-1 h-12 w-full rounded-xl border-none text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-blue-500/40 active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none disabled:shadow-none"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Signing in…
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </div>
            </div>

            <div
              className="login-fade-up mt-8"
              style={{ animationDelay: "480ms" }}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  or
                </span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              <p className="text-center text-xs text-slate-400">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate({ to: "/register" })}
                  className="inline-block border-none bg-transparent p-0 font-semibold text-blue-600 transition-colors hover:text-blue-700 hover:underline focus:outline-none"
                >
                  Create one
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
