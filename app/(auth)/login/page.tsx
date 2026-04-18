import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Tizimga kirish</h1>
          <p className="mt-1 text-sm text-slate-500">
            EduMarkaz xodimlari uchun ichki platforma
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
