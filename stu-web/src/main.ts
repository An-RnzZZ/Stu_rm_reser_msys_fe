import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import axios from 'axios'
axios.defaults.withCredentials = true
// 如果需要设置 baseURL：

// Element Plus 引入
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 创建应用实例
const app = createApp(App)

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 使用插件

app.use(router)
app.use(ElementPlus)

// 挂载应用
app.mount('#app')
