import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/evaluate' },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'evaluate',
        name: 'evaluate',
        component: () => import('@/views/EvaluateView.vue'),
      },
      {
        path: 'me',
        name: 'me',
        component: () => import('@/views/MeProgressView.vue'),
      },
      {
        path: 'me/scores',
        name: 'me-scores',
        component: () => import('@/views/MeScoresView.vue'),
      },
      {
        path: 'admin/teams',
        name: 'admin-teams',
        component: () => import('@/views/AdminTeamsView.vue'),
      },
      {
        path: 'admin/judges',
        name: 'admin-judges',
        component: () => import('@/views/AdminJudgesView.vue'),
      },
      {
        path: 'admin/settings',
        name: 'admin-settings',
        component: () => import('@/views/AdminSettingsView.vue'),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const token = localStorage.getItem('nova:jwt');
  if (to.meta.requiresAuth !== false && !token) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
  if (to.name === 'login' && token) {
    return { path: '/evaluate' };
  }
  return true;
});

export default router;
