export const OFFLINE_DASHBOARD_PATHS = [
  '/dashboard',
  '/dashboard/patients',
  '/dashboard/inventory',
  '/dashboard/attentions',
  '/dashboard/attentions/new',
  '/dashboard/users',
  '/dashboard/movements',
] as const;

export function isOfflineDashboardPath(pathname: string): pathname is (typeof OFFLINE_DASHBOARD_PATHS)[number] {
  return (OFFLINE_DASHBOARD_PATHS as readonly string[]).includes(pathname);
}
