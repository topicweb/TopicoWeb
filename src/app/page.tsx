'use client';

import Link from 'next/link';
import { Activity, Shield, Wifi } from 'lucide-react';
import { useAuth } from '@/core/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// ───────────────────────────────────────────────────────────────────────────────
// LANDING PAGE
// Página principal con redirección automática para usuarios autenticados
// ───────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirigir al dashboard si ya está autenticado
  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) return null;

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-800">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 md:px-12">
        <div className="flex items-center gap-3">
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
        </div>
        <Link
          href="/login"
          className="rounded-lg bg-[#1D5DFF] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1648cc] md:px-6 md:py-2.5 md:text-base"
        >
          Iniciar Sesión
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-12 md:px-12 md:py-16">
        <section className="flex flex-1 flex-col items-center justify-center gap-10 lg:flex-row lg:items-center lg:justify-center lg:gap-16">
          <div className="flex max-w-xl flex-col items-center text-center lg:items-start lg:text-left">
            <h1 className="mb-5 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-[3.25rem]">
              Gestión de Salud Escolar{' '}
              <span className="text-[#1D5DFF]">Simplificada</span>
            </h1>
            <p className="mb-8 max-w-lg text-base leading-relaxed text-slate-500 md:text-lg">
              Una plataforma moderna y eficiente para el control de pacientes, atenciones e inventario médico.
              Diseñada para funcionar sin conexión y sincronizar datos automáticamente.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-[#1D5DFF] px-8 py-3 text-base font-semibold text-white shadow-[0_8px_20px_rgba(29,93,255,0.25)] transition hover:bg-[#1648cc]"
            >
              Comenzar Ahora
            </Link>
          </div>

          <div className="hidden shrink-0 md:block">
            <img
              src="/fondoLogin.webp"
              alt="Ilustración de salud"
              width={320}
              height={320}
              className="h-auto w-[280px] object-contain lg:w-[340px]"
            />
          </div>
        </section>

        <section className="mt-16 grid grid-cols-1 gap-6 md:mt-20 md:grid-cols-3 md:gap-8">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1D5DFF]/10 text-[#1D5DFF]">
              <Wifi size={24} />
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-900">Offline First</h3>
            <p className="text-sm leading-relaxed text-slate-500">
              Trabaja sin interrupciones. Los datos se guardan localmente y se sincronizan cuando hay conexión.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1D5DFF]/10 text-[#1D5DFF]">
              <Activity size={24} />
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-900">Control Total</h3>
            <p className="text-sm leading-relaxed text-slate-500">
              Gestiona historias clínicas, stock de medicamentos y reportes de atención en un solo lugar.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1D5DFF]/10 text-[#1D5DFF]">
              <Shield size={24} />
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-900">Seguro</h3>
            <p className="text-sm leading-relaxed text-slate-500">
              Accesos basados en roles y autenticación segura para proteger la información sensible.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} Sistema de Tópico Institucional
      </footer>
    </div>
  );
}
