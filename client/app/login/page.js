import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "Login — School Management Platform",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center gradient-mesh relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative group/logo">
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-2xl shadow-slate-200 border border-slate-100 transform group-hover/logo:scale-105 transition-transform duration-300">
                <img src="/logo.png" alt="Logo" className="w-13 h-13 object-contain" />
              </div>
              <div className="absolute -inset-1.5 rounded-2xl bg-emerald-500/10 opacity-20 blur-lg group-hover/logo:opacity-30 transition-opacity duration-300" />
            </div>
          </div>

          <h1 className="text-2xl font-black mb-1.5 tracking-wider bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 bg-clip-text text-transparent uppercase">
            SCHOOL MANAGEMENT PLATFORM
          </h1>
          <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            SIGN IN TO ACCESS YOUR DASHBOARD
          </p>
        </div>

        {/* Login Form */}
        <LoginForm />
      </div>
    </div>
  );
}
