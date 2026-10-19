import { createRouter, createWebHistory } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** 상단 경로 표시용 이름 */
    title?: string
    /** 사이드바에서 강조할 메뉴 */
    nav?: 'books' | 'stats' | 'settings'
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/books' },
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
