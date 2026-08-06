// 在浏览器控制台中运行此脚本来调试菜单问题

console.log('=== 调试菜单生成 ===\n');

// 1. 检查 routeStore.menus
const routeStore = window.__PINIA_STORE__?.route;
if (!routeStore) {
  console.error('❌ 找不到 route store');
} else {
  console.log('✅ routeStore 存在');
  console.log('   menus:', routeStore.menus);
  console.log('   menus 长度:', routeStore.menus.length);

  if (routeStore.menus.length === 0) {
    console.error('❌ 菜单为空！');
    console.log('\n检查 authRoutes:');
    console.log('   authRoutes:', routeStore.authRoutes);
    console.log('   authRoutes 长度:', routeStore.authRoutes.length);

    console.log('\n检查 constantRoutes:');
    console.log('   constantRoutes:', routeStore.constantRoutes);
    console.log('   constantRoutes 长度:', routeStore.constantRoutes.length);

    console.log('\n检查 isInitAuthRoute:');
    console.log('   isInitAuthRoute:', routeStore.isInitAuthRoute);

    console.log('\n检查 isInitConstantRoute:');
    console.log('   isInitConstantRoute:', routeStore.isInitConstantRoute);
  } else {
    console.log('✅ 菜单有数据');
    console.log(JSON.stringify(routeStore.menus, null, 2));
  }
}

// 2. 检查当前路由
const route = window.__VUE_ROUTER__?.currentRoute;
if (route) {
  console.log('\n当前路由:');
  console.log('   name:', route.name);
  console.log('   path:', route.path);
  console.log('   meta:', route.meta);
}

// 3. 检查 useMenu
console.log('\n检查 useMenu.selectedKey:');
// 需要在组件上下文中运行

console.log('\n=== 调试完成 ===');
