import { describe, expect, it } from 'vitest';
import { isOfflineDashboardPath } from './offlinePaths';

describe('offline dashboard shell', () => {
  it('supports only known offline dashboard routes', () => {
    expect(isOfflineDashboardPath('/dashboard')).toBe(true);
    expect(isOfflineDashboardPath('/dashboard/attentions/new')).toBe(true);
    expect(isOfflineDashboardPath('/dashboard/other')).toBe(false);
    expect(isOfflineDashboardPath('/login')).toBe(false);
  });
});
