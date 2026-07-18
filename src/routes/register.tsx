import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { getSession } from "@/lib/auth/authService";
import { firstAllowedPage, normalizePageAccess, resolveAccessUser } from "@/lib/pageAccess";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Register — Medical Center" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const { state, register } = useStore();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"Administrator" | "Doctor" | "Receptionist" | "Cashier">(
    "Doctor",
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!state.authedUser) return;
    const accessUser = resolveAccessUser(state, getSession()?.user);
    navigate({ to: firstAllowedPage(accessUser) });
  }, [state.authedUser, state.users, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !username || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Register user (MariaDB)
    if (await register(username, fullName, role, password)) {
      toast.success("Account registered successfully");
      const accessUser = resolveAccessUser({ ...state, authedUser: username }, getSession()?.user);
      navigate({ to: firstAllowedPage(accessUser) });
    } else {
      toast.error("Username already taken or database unavailable");
    }
  };

  const bullets = ["Secure & Encrypted", "Fast & Reliable", "PhilHealth Integrated"];

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 bg-[#070f21] relative overflow-hidden font-sans">
      {/* Soft Grid Pattern Background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(99, 102, 241, 0.05) 1px, transparent 1px), 
                            linear-gradient(to bottom, rgba(99, 102, 241, 0.05) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Subtle Glow Overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 10% 90%, rgba(37, 99, 235, 0.06), transparent 50%), radial-gradient(circle at 90% 10%, rgba(99, 102, 241, 0.04), transparent 50%)",
        }}
      />

      {/* Main Card */}
      <div className="w-full max-w-4xl rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 z-10 border border-slate-800 shadow-2xl shadow-black/80">
        {/* Left Section - Hospital Branding */}
        <div className="hidden md:flex md:col-span-5 flex-col justify-between p-10 lg:p-12 text-white relative overflow-hidden bg-[#0a1226] border-r border-slate-800">
          <div className="relative z-10 flex flex-col">
            {/* Minimal Logo (Simple Text Font Only) */}
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xl font-light text-blue-500 select-none">+</span>
              <span className="text-lg font-bold tracking-tight text-slate-100 font-sans">
                Medical Center
              </span>
            </div>

            {/* Minimalist Subtitle */}
            <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase">
              Hospital Management System
            </p>

            <div className="w-8 h-[1px] bg-slate-800 my-6" />

            {/* Description */}
            <p className="text-slate-400 text-sm font-normal leading-relaxed max-w-xs">
              Professional healthcare management system for modern medical practices.
            </p>

            {/* Bullet List - Simple bullets, no colors */}
            <div className="space-y-3.5 mt-8">
              {bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                  <span className="text-slate-300 text-sm font-normal">{bullet}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-12 flex flex-col gap-4">
            {/* Version Badge - Clean and minimalist */}
            <div className="text-xs text-slate-500 font-medium">v2.0</div>

            {/* Footer Copy */}
            <p className="text-slate-500 text-xs font-normal">&copy; 2026 Medical Center</p>
          </div>
        </div>

        {/* Right Section - Registration Form */}
        <div className="col-span-12 md:col-span-7 bg-white p-8 sm:p-10 md:p-12 flex flex-col justify-between min-h-[500px]">
          <div>
            {/* Header Area */}
            <div className="mb-5">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Create Account
              </h2>
              <p className="text-slate-400 text-sm font-medium mt-1">
                Enter your details to register as a staff member
              </p>
            </div>
          </div>

          <div className="w-full h-[1px] bg-slate-100 my-4" />

          {/* Form */}
          <form onSubmit={onSubmit} className="flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Full Name Input */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="fullName"
                  className="text-slate-400 text-xs font-semibold tracking-wide"
                >
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border-slate-200 focus:border-slate-300 h-10 px-3.5 rounded-lg text-slate-800 placeholder:text-slate-400/80 focus-visible:ring-blue-500/10 text-sm focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:outline-none transition-all shadow-none"
                />
              </div>

              {/* Username Input */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="username"
                  className="text-slate-400 text-xs font-semibold tracking-wide"
                >
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border-slate-200 focus:border-slate-300 h-10 px-3.5 rounded-lg text-slate-800 placeholder:text-slate-400/80 focus-visible:ring-blue-500/10 text-sm focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:outline-none transition-all shadow-none"
                />
              </div>

              {/* Role Select */}
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs font-semibold tracking-wide">Role</Label>
                <Select value={role} onValueChange={(val) => setRole(val as any)}>
                  <SelectTrigger className="w-full bg-slate-50 border-slate-200 h-10 px-3.5 rounded-lg text-slate-800 focus:ring-blue-500/10 shadow-none text-sm focus:outline-none cursor-pointer">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 rounded-lg">
                    <SelectItem value="Doctor">Doctor</SelectItem>
                    <SelectItem value="Receptionist">Receptionist</SelectItem>
                    <SelectItem value="Cashier">Cashier</SelectItem>
                    <SelectItem value="Administrator">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-slate-400 text-xs font-semibold tracking-wide"
                >
                  Password
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 bg-slate-50 border-slate-200 focus:border-slate-300 h-10 px-3.5 rounded-lg text-slate-800 placeholder:text-slate-400/80 focus-visible:ring-blue-500/10 text-sm focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:outline-none transition-all shadow-none"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPassword(!showPassword)}
                    className="h-10 px-4 border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 hover:bg-slate-100/50 active:scale-95 transition-all text-slate-500 hover:text-slate-700 shadow-none font-semibold text-xs uppercase tracking-wider min-w-[70px]"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="confirmPassword"
                  className="text-slate-400 text-xs font-semibold tracking-wide"
                >
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border-slate-200 focus:border-slate-300 h-10 px-3.5 rounded-lg text-slate-800 placeholder:text-slate-400/80 focus-visible:ring-blue-500/10 text-sm focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:outline-none transition-all shadow-none"
                />
              </div>

              {/* Register Button */}
              <Button
                type="submit"
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-all duration-200 flex items-center justify-center hover:shadow-md hover:shadow-blue-500/10 active:scale-[0.99] border-none mt-2 shadow-none shrink-0"
              >
                Create Account
              </Button>
            </div>

            <div className="mt-6">
              {/* Already have an account? */}
              <div className="text-center text-xs text-slate-400">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate({ to: "/login" })}
                  className="text-blue-600 hover:underline cursor-pointer font-semibold bg-transparent border-none p-0 inline-block focus:outline-none"
                >
                  Sign in
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
