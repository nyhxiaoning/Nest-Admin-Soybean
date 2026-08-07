// VFormDesigner UMD 包类型声明
// vform3-builds 是纯 UMD 包，没有 ESM 类型声明
declare module 'vform3-builds' {
  import type { DefineComponent } from 'vue';
  const VFormDesigner: DefineComponent<{}, {}, {}>;
  export { VFormDesigner };
}

declare module 'vform3-builds/dist/designer.umd.js' {
  import type { DefineComponent } from 'vue';
  const VFormDesigner: DefineComponent<{}, {}, {}>;
  export default VFormDesigner;
}
