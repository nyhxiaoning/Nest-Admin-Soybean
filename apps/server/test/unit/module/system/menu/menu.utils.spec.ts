import { buildMenus } from '@/module/system/menu/utils';

const baseMenu = {
  tenantId: '000000',
  query: '',
  isFrame: '1',
  isCache: '0',
  visible: '0',
  status: '0',
  perms: '',
  icon: '',
};

describe('buildMenus', () => {
  it('builds code generator page routes without exposing button permissions as routes', () => {
    const routes = buildMenus([
      {
        ...baseMenu,
        menuId: 3,
        parentId: 0,
        orderNum: 3,
        menuName: '系统工具',
        path: 'tool',
        component: undefined,
        menuType: 'M',
      },
      {
        ...baseMenu,
        menuId: 116,
        parentId: 3,
        orderNum: 2,
        menuName: '代码生成',
        path: 'gen',
        component: undefined,
        menuType: 'M',
      },
      {
        ...baseMenu,
        menuId: 121,
        parentId: 116,
        orderNum: 1,
        menuName: '数据源管理',
        path: 'datasource',
        component: 'tool/gen/datasource/index',
        menuType: 'C',
      },
      {
        ...baseMenu,
        menuId: 122,
        parentId: 116,
        orderNum: 2,
        menuName: '模板管理',
        path: 'template',
        component: 'tool/gen/template/index',
        menuType: 'C',
      },
      {
        ...baseMenu,
        menuId: 1055,
        parentId: 116,
        orderNum: 1,
        menuName: '生成查询',
        path: '#',
        component: '',
        menuType: 'F',
        perms: 'tool:gen:query',
      },
    ] as Parameters<typeof buildMenus>[0]);

    const codegenRoute = routes[0].children?.[0];

    expect(codegenRoute?.component).toBe('ParentView');
    expect(codegenRoute?.children?.map((route) => route.component)).toEqual([
      'tool/gen/datasource/index',
      'tool/gen/template/index',
    ]);
  });
});
