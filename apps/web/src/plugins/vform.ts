import type { App } from 'vue';
import ElementPlus from 'element-plus';
import VForm3 from 'vform3-builds';
import 'element-plus/dist/index.css';
import 'vform3-builds/dist/designer.style.css';

export function setupVForm(app: App) {
  app.use(ElementPlus);
  app.use(VForm3);
}
