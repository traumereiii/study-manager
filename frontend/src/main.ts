import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { useAppStore } from './stores/app'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/pages.css'

const app = createApp(App)
app.use(createPinia())

// 데이터를 불러온 뒤 라우터를 시작해 화면이 빈 상태로 깜빡이지 않게 합니다.
useAppStore()
  .bootstrap()
  .finally(() => {
    app.use(router)
    app.mount('#app')
  })
