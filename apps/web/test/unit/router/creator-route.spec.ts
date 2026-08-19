import { describe, expect, it } from 'vitest';
import { createDynamicRoutes } from '@/router/routes';

describe('creator center local route', () => {
  it('requires login without depending on roles or backend menus', () => {
    const { constantRoutes, authRoutes } = createDynamicRoutes();
    const creatorRoute = authRoutes.find(route => route.name === 'creator');

    expect(constantRoutes.some(route => route.name === 'creator')).toBe(false);
    expect(creatorRoute).toMatchObject({
      path: '/creator',
      component: 'layout.base',
      meta: {
        i18nKey: 'route.creator'
      }
    });
    expect(creatorRoute?.meta?.constant).not.toBe(true);
    expect(creatorRoute?.meta?.roles).toBeUndefined();
    expect(creatorRoute?.children?.map(route => route.name)).toEqual([
      'creator_approval',
      'creator_publish-management',
      'creator_work'
    ]);
  });
});
