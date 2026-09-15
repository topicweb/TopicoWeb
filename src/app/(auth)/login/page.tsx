"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/core/db/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const inputClassName =
  "block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-4 pr-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-[#1D5DFF] focus:outline-none focus:ring-1 focus:ring-[#1D5DFF]";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!navigator.onLine) {
      setError("Se requiere conexión a internet para iniciar sesión.");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al iniciar sesión";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <header className="flex h-16 items-center border-b border-slate-200 bg-white px-6 md:px-12">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D5DFF]"
          aria-label="Volver al inicio"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white">
            <img
              src="/logo.webp"
              alt="Logo Tópico"
              className="h-7 w-7 object-contain"
            />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
            Tópico IESTPPA
          </span>
        </Link>
      </header>

      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-white px-6 py-10 md:px-16 lg:px-24">
        <div className="flex w-full max-w-3xl items-center justify-center gap-10 lg:max-w-4xl lg:gap-14">
          <div className="hidden shrink-0 items-center justify-center md:flex">
            <img
              src="/fondoLogin.webp"
              alt="Ilustración de salud"
              width={320}
              height={320}
              className="h-auto w-[280px] object-contain lg:w-[320px]"
            />
          </div>

          <div
            className="w-full shrink-0 rounded-2xl border border-slate-100 bg-white px-8 py-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)] md:px-10 md:py-9"
            style={{ maxWidth: 400 }}
          >
            <div className="mb-7 flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white">
                <img
                  src="/logo.webp"
                  alt="Logo Tópico"
                  className="h-10 w-10 object-contain"
                />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Tópico
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Ingrese credenciales para iniciar sesión
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleLogin} noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-semibold text-slate-900"
                >
                  Correo Electrónico:
                </label>
                <div className="relative overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-[#1D5DFF] focus-within:ring-1 focus-within:ring-[#1D5DFF]">
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-1.5 bg-[#1D5DFF]"
                  />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${inputClassName} border-0 pl-4 focus:ring-0`}
                    placeholder="nombre@gmail.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-semibold text-slate-900"
                >
                  Contraseña:
                </label>
                <div className="relative overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-[#1D5DFF] focus-within:ring-1 focus-within:ring-[#1D5DFF]">
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-1.5 bg-[#1D5DFF]"
                  />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClassName} border-0 pl-4 focus:ring-0`}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#1D5DFF] px-4 py-2.5 text-base font-semibold text-white transition hover:bg-[#1648cc] focus:outline-none focus:ring-2 focus:ring-[#1D5DFF]/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
