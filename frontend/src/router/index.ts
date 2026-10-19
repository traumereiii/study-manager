import { createRouter, createWebHistory } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    /** 상단 경로 표시용 이름 */
    title?: string
    /** 사이드바에서 강조할 메뉴 */
    nav?: 'books' | 'stats' | 'settings'
    /** 로그인하지 않아도 볼 수 있는 화면(로그인 화면) */
    public?: boolean
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/books' },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true, title: '로그인' },
    },
    {
      path: '/books',
      name: 'books',
      component: () => import('@/views/BookListView.vue'),
      meta: { nav: 'books' },
    },
    {
      path: '/books/new',
      name: 'book-new',
      component: () => import('@/views/BookFormView.vue'),
      meta: { nav: 'books', title: '문제집 만들기' },
    },
    {
      path: '/books/:bookId',
      name: 'book',
      component: () => import('@/views/BookDetailView.vue'),
      props: true,
      meta: { nav: 'books' },
    },
    {
      path: '/books/:bookId/edit',
      name: 'book-edit',
      component: () => import('@/views/BookFormView.vue'),
      props: true,
      meta: { nav: 'books', title: '문제집 수정' },
    },
    {
      path: '/books/:bookId/manage',
      name: 'manage',
      component: () => import('@/views/ManageView.vue'),
      props: true,
      meta: { nav: 'books', title: '문제 관리' },
    },
    {
      path: '/books/:bookId/cards/new',
      name: 'card-new',
      component: () => import('@/views/CardFormView.vue'),
      props: true,
      meta: { nav: 'books', title: '새 문제 만들기' },
    },
    {
      path: '/books/:bookId/cards/:cardId/edit',
      name: 'card-edit',
      component: () => import('@/views/CardFormView.vue'),
      props: true,
      meta: { nav: 'books', title: '문제 수정' },
    },
    {
      path: '/books/:bookId/study',
      name: 'study',
      component: () => import('@/views/StudyView.vue'),
      props: true,
      meta: { nav: 'books', title: '학습' },
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('@/views/StatsView.vue'),
      meta: { nav: 'stats', title: '학습 통계' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { nav: 'settings', title: '설정' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/books' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

/** 로그인 후 돌아갈 경로. 같은 사이트 안의 경로만 허용해 외부 주소로 보내지 않습니다. */
export function safeRedirect(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/login')
    ? value
    : '/books'
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.restore()

  if (to.meta.public) {
    // 이미 로그인했다면 로그인 화면 대신 원래 가려던 곳으로 보냅니다.
    return auth.authenticated ? safeRedirect(to.query.redirect) : true
  }
  if (!auth.authenticated) return { name: 'login', query: { redirect: to.fullPath } }

  // 로그인 직후나 이전에 불러오지 못했다면 데이터를 불러옵니다(실패하면 다음 이동 때 다시 시도).
  const app = useAppStore()
  if (!app.loaded) await app.bootstrap()
  return true
})
