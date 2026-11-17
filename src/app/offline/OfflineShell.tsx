'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import DashboardLayout from '../(dashboard)/layout';
import { isOfflineDashboardPath } from './offlinePaths';

const pageModules = {
  '/dashboard': dynamic(() => import('../(dashboard)/dashboard/page')),
  '/dashboard/patients': dynamic(() => import('../(dashboard)/dashboard/patients/page')),
  '/dashboard/inventory': dynamic(() => import('../(dashboard)/dashboard/inventory/page')),
  '/dashboard/attentions': dynamic(() => import('../(dashboard)/dashboard/attentions/page')),
  '/dashboard/attentions/new': dynamic(() => import('../(dashboard)/dashboard/attentions/new/page')),
  '/dashboard/users': dynamic(() => import('../(dashboard)/dashboard/users/page')),
  '/dashboard/movements': dynamic(() => import('../(dashboard)/dashboard/movements/page')),
} satisfies Record<string, ComponentType>;

export default function OfflineShell() {
  const pathname = usePathname();
  const Page = isOfflineDashboardPath(pathname) ? pageModules[pathname] : undefined;

  if (!Page) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-900 p-6 text-center text-white">
        <h1 className="text-2xl font-semibold">Sin conexión</h1>
        <p>Esta pantalla requiere conexión. Vuelve a intentarlo cuando estés en línea.</p>
        <a className="rounded bg-blue-600 px-4 py-2" href="/login">Volver a iniciar sesión</a>
      </main>
    );
  }

  return <DashboardLayout><Page /></DashboardLayout>;
}
