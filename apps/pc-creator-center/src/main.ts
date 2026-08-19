/**
 * 应用程序入口文件
 * 负责初始化 Vue 应用、注册插件、挂载应用
 */
import { createApp } from 'vue'
import App from './App.vue'
import { router } from "@/router"
import { createPinia } from 'pinia'
import i18n from './locales'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';



// 样式导入
import 'element-plus/dist/index.css'
import './common/assets/styles/index.scss'
import '@/modules/pixel-editor/styles/index.scss'

// 创建应用实例
const app = createApp(App)
const pinia = createPinia();

pinia.use(piniaPluginPersistedstate);

// 注册插件
app.use(pinia)
app.use(router)
app.use(i18n)

// 挂载应用
app.mount('#app')