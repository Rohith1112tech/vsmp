"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import OTPForm from "./OTPForm";
import { apiClient } from "@/lib/api";

const TABS = [
  {
    id: "admin",
    label: "Admin",
    icon: "🛡️",
    gradient: "from-emerald-500 to-teal-500",
    gradientBg: "from-emerald-600 to-teal-600",
    focusRing: "focus:ring-emerald-500/20 focus:border-emerald-500/50",
    shadow: "shadow-emerald-500/20",
    hoverShadow: "hover:shadow-emerald-500/30",
    accent: "text-emerald-700",
    bgAccent: "bg-emerald-50",
    borderAccent: "border-emerald-200",
  },
  {
    id: "teacher",
    label: "Teacher",
    icon: "📚",
    gradient: "from-blue-500 to-cyan-500",
    gradientBg: "from-blue-600 to-cyan-600",
    focusRing: "focus:ring-blue-500/20 focus:border-blue-500/50",
    shadow: "shadow-blue-500/20",
    hoverShadow: "hover:shadow-blue-500/30",
    accent: "text-blue-700",
    bgAccent: "bg-blue-50",
    borderAccent: "border-blue-200",
  },
  {
    id: "parent",
    label: "Parent",
    icon: "👨‍👩‍👧",
    gradient: "from-purple-500 to-pink-500",
    gradientBg: "from-purple-600 to-pink-600",
    focusRing: "focus:ring-purple-500/20 focus:border-purple-500/50",
    shadow: "shadow-purple-500/20",
    hoverShadow: "hover:shadow-purple-500/30",
    accent: "text-purple-700",
    bgAccent: "bg-purple-50",
    borderAccent: "border-purple-200",
  },
];

export default function LoginForm() {
  const [activeTab, setActiveTab] = useState("admin");
  const [formData, setFormData] = useState({
    email: "",
    employeeId: "",
    mobile: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetForm, setResetForm] = useState({
    employeeId: "",
    mobile: "",
    resetCode: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const router = useRouter();
  const { login } = useAuth();

  const currentTab = TABS.find((t) => t.id === activeTab);

  const handleInputChange = (e) => {
    let val = e.target.value;
    if (e.target.name === "employeeId") {
      val = val.toUpperCase();
    }
    setFormData((prev) => ({ ...prev, [e.target.name]: val }));
    setError("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      const form = e.target.form;
      if (!form) return;
      
      const index = Array.prototype.indexOf.call(form.elements, e.target);
      if (index === -1) return;
      
      let nextIndex = index + 1;
      while (nextIndex < form.elements.length) {
        const nextEl = form.elements[nextIndex];
        if (
          nextEl &&
          !nextEl.disabled &&
          nextEl.type !== "hidden" &&
          (nextEl.tagName === "INPUT" || nextEl.tagName === "BUTTON")
        ) {
          if (nextEl.type === "submit") {
            return;
          }
          if (nextEl.type === "button" && nextEl.className.includes("absolute")) {
            nextIndex++;
            continue;
          }
          e.preventDefault();
          nextEl.focus();
          return;
        }
        nextIndex++;
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate inputs locally
    if (activeTab === "admin") {
      if (!formData.email || !formData.password) {
        setError("Please fill in all fields");
        return;
      }
    } else if (activeTab === "teacher") {
      if (!formData.employeeId || !formData.password) {
        setError("Please fill in all fields");
        return;
      }
    } else if (activeTab === "parent") {
      if (!formData.mobile || !formData.password) {
        setError("Please fill in all fields");
        return;
      }
      if (!/^\d{10}$/.test(formData.mobile.trim())) {
        setError("Mobile number must be a 10-digit number");
        return;
      }
    }

    setLoading(true);
    try {
      let auth_identifier = "";
      if (activeTab === "admin") {
        auth_identifier = formData.email.trim();
      } else if (activeTab === "teacher") {
        auth_identifier = formData.employeeId.trim();
      } else {
        auth_identifier = formData.mobile.trim();
      }

      const payload = {
        auth_identifier,
        password: formData.password,
        role: activeTab.toUpperCase()
      };

      // Pass the fully normalized payload down to your context's login runner
      await login(payload);
      router.push(`/${activeTab}/dashboard`);
    } catch (err) {
      setError(err.data?.error || err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const isTeacher = activeTab === "teacher";
    const identifier = isTeacher ? resetForm.employeeId.trim() : resetForm.mobile.trim();

    if (!identifier || !resetForm.resetCode.trim() || !resetForm.newPassword) {
      setError("All fields are required");
      return;
    }

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      if (isTeacher) {
        const res = await apiClient.post("/auth/teacher-reset-password", {
          empId: identifier,
          resetCode: resetForm.resetCode.trim(),
          newPassword: resetForm.newPassword,
        });
        setSuccessMessage(res.message || "Password reset successfully. You can now login.");
        setIsResettingPassword(false);
        setFormData((prev) => ({ ...prev, employeeId: identifier }));
      } else {
        const res = await apiClient.post("/auth/parent-reset-password", {
          mobile: identifier,
          resetCode: resetForm.resetCode.trim(),
          newPassword: resetForm.newPassword,
        });
        setSuccessMessage(res.message || "Password reset successfully. You can now login.");
        setIsResettingPassword(false);
        setFormData((prev) => ({ ...prev, mobile: identifier }));
      }
      setResetForm({ employeeId: "", mobile: "", resetCode: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(err.data?.error || err.message || "Failed to reset password. Please verify your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in-up">
      {/* Card */}
      <div className="glass-strong rounded-2xl overflow-hidden">
        {/* Tab Bar */}
        <div className="flex border-b border-slate-100">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setError("");
                setSuccessMessage("");
                setIsResettingPassword(false);
                setShowPassword(false);
                setShowResetPassword(false);
              }}
              className={`flex-1 py-4 px-3 text-sm font-medium transition-all duration-300 relative ${
                activeTab === tab.id
                  ? "text-slate-900 font-semibold"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </span>
              {/* Active indicator */}
              {activeTab === tab.id && (
                <div
                  className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${tab.gradient} transition-all duration-300`}
                />
              )}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="p-8">
          {/* Role badge */}
          <div className="flex justify-center mb-6">
            <div
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${currentTab.bgAccent} border ${currentTab.borderAccent}`}
            >
              <span className="text-sm">{currentTab.icon}</span>
              <span className={`text-xs font-semibold ${currentTab.accent} uppercase tracking-wider`}>
                {currentTab.label} Login
              </span>
            </div>
          </div>

          {/* Admin Form */}
          {activeTab === "admin" && (
            <form onSubmit={handleSubmit} className="space-y-5 tab-content-enter">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder=""
                  className={`w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none ${currentTab.focusRing} focus:ring-2 transition-all duration-200`}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder=""
                    className={`w-full pl-4 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none ${currentTab.focusRing} focus:ring-2 transition-all duration-200`}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none select-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" x2="22" y1="2" y2="22" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <span className="text-red-600 text-sm flex-shrink-0">⚠</span>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 bg-gradient-to-r ${currentTab.gradientBg} hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${currentTab.shadow} ${currentTab.hoverShadow} hover:scale-[1.01] active:scale-[0.99]`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          )}

          {/* Teacher & Parent Forms */}
          {(activeTab === "teacher" || activeTab === "parent") && (
            isResettingPassword ? (
              <form onSubmit={handleResetSubmit} className="space-y-5 tab-content-enter">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">Reset Password</h3>
                  <p className="text-[11px] text-slate-500 mb-2 leading-normal">
                    {activeTab === "teacher" 
                      ? "Enter your Employee ID and secret reset code to set a new password."
                      : "Enter your registered Mobile Number and secret reset code to set a new password."}
                  </p>
                </div>
                {activeTab === "teacher" ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={resetForm.employeeId}
                      onChange={(e) => setResetForm({ ...resetForm, employeeId: e.target.value.toUpperCase() })}
                      onKeyDown={handleKeyDown}
                      placeholder=""
                      className={`w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none ${currentTab.focusRing} focus:ring-2 transition-all duration-200`}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={resetForm.mobile}
                      onChange={(e) => setResetForm({ ...resetForm, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      onKeyDown={handleKeyDown}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      className={`w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none ${currentTab.focusRing} focus:ring-2 transition-all duration-200`}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Secret Reset Code
                  </label>
                  <input
                    type="text"
                    value={resetForm.resetCode}
                    onChange={(e) => setResetForm({ ...resetForm, resetCode: e.target.value.toUpperCase() })}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. ABC123"
                    className={`w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none ${currentTab.focusRing} focus:ring-2 transition-all duration-200`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showResetPassword ? "text" : "password"}
                      value={resetForm.newPassword}
                      onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                      onKeyDown={handleKeyDown}
                      placeholder=""
                      className={`w-full pl-4 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none ${currentTab.focusRing} focus:ring-2 transition-all duration-200`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none select-none"
                      title={showResetPassword ? "Hide password" : "Show password"}
                    >
                      {showResetPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" x2="22" y1="2" y2="22" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showResetPassword ? "text" : "password"}
                      value={resetForm.confirmPassword}
                      onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                      onKeyDown={handleKeyDown}
                      placeholder=""
                      className={`w-full pl-4 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none ${currentTab.focusRing} focus:ring-2 transition-all duration-200`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none select-none"
                      title={showResetPassword ? "Hide password" : "Show password"}
                    >
                      {showResetPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" x2="22" y1="2" y2="22" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <span className="text-red-600 text-sm flex-shrink-0">⚠</span>
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3.5 bg-gradient-to-r ${currentTab.gradientBg} hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${currentTab.shadow} ${currentTab.hoverShadow}`}
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResettingPassword(false);
                      setError("");
                    }}
                    className="w-full py-1 text-slate-500 hover:text-slate-700 text-xs transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 tab-content-enter">
                {activeTab === "teacher" ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder=""
                      className={`w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none ${currentTab.focusRing} focus:ring-2 transition-all duration-200`}
                      autoComplete="username"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      onKeyDown={handleKeyDown}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      className={`w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none ${currentTab.focusRing} focus:ring-2 transition-all duration-200`}
                      autoComplete="username"
                    />
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsResettingPassword(true);
                        setError("");
                        setSuccessMessage("");
                        if (activeTab === "teacher") {
                          setResetForm((prev) => ({ ...prev, employeeId: formData.employeeId }));
                        } else {
                          setResetForm((prev) => ({ ...prev, mobile: formData.mobile }));
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 transition-colors focus:outline-none"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder=""
                      className={`w-full pl-4 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none ${currentTab.focusRing} focus:ring-2 transition-all duration-200`}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none select-none"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" x2="22" y1="2" y2="22" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {successMessage && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-emerald-600 text-sm flex-shrink-0">✓</span>
                    <p className="text-sm text-emerald-800">{successMessage}</p>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <span className="text-red-600 text-sm flex-shrink-0">⚠</span>
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 bg-gradient-to-r ${currentTab.gradientBg} hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${currentTab.shadow} ${currentTab.hoverShadow} hover:scale-[1.01] active:scale-[0.99]`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>
            )
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-slate-600 mt-6">
        Secure login powered by JWT authentication
      </p>
    </div>
  );
}