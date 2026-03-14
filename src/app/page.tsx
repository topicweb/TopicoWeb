'use client';

import Link from 'next/link';
import { Activity, Shield, Wifi } from 'lucide-react';
import { useAuth } from '@/core/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) return null; // Or a spinner

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-white">
      <header className="container mx-auto flex items-center justify-between p-6">
        <div className="flex items-center gap-2 text-2xl font-bold text-blue-400">
          <Activity />
          <span>Tópico PWA</span>
        </div>
        <Link
          href="/login"
          className="rounded-full bg-blue-600 px-6 py-2 font-semibold transition hover:bg-blue-700"
        >
          Iniciar Sesión
        </Link>
      </header>

      <main className="container mx-auto flex flex-1 flex-col items-center justify-center text-center px-4">
        <h1 className="mb-6 text-5xl font-extrabold leading-tight md:text-6xl">
          Gestión de Salud Escolar <br />
          <span className="text-blue-500">Simplificada</span>
        </h1>
        <p className="mb-10 max-w-2xl text-lg text-slate-300">
          Una plataforma moderna y eficiente para el control de pacientes, atenciones e inventario médico.
          Diseñada para funcionar sin conexión y sincronizar datos automáticamente.
        </p>

        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-white px-8 py-3 font-bold text-slate-900 transition hover:bg-gray-100"
          >
            Comenzar Ahora
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="rounded-xl bg-slate-800 p-6">
            <div className="mb-4 flex justify-center text-blue-400"><Wifi size={40} /></div>
            <h3 className="mb-2 text-xl font-bold">Offline First</h3>
            <p className="text-slate-400">Trabaja sin interrupciones. Los datos se guardan localmente y se sincronizan cuando hay conexión.</p>
          </div>
          <div className="rounded-xl bg-slate-800 p-6">
            <div className="mb-4 flex justify-center text-green-400"><Activity size={40} /></div>
            <h3 className="mb-2 text-xl font-bold">Control Total</h3>
            <p className="text-slate-400">Gestiona historias clínicas, stock de medicamentos y reportes de atención en un solo lugar.</p>
          </div>
          <div className="rounded-xl bg-slate-800 p-6">
            <div className="mb-4 flex justify-center text-purple-400"><Shield size={40} /></div>
            <h3 className="mb-2 text-xl font-bold">Seguro</h3>
            <p className="text-slate-400">Accesos basados en roles y autenticación segura para proteger la información sensible.</p>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-slate-500">
        © {new Date().getFullYear()} Sistema de Tópico Institucional
      </footer>
    </div>
  );
}
