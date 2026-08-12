const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: 'route/:tuyenId', component: () => import('pages/IndexPage.vue') },
      { path: 'sid/:sid', component: () => import('pages/SidRouteDiagram.vue') },
      { path: 'map', component: () => import('pages/CableMapPage.vue') },
      { path: 'route/map/:maTuyen', component: () => import('pages/CableMapPage.vue') },
      { path: 'sid/map/:sid', component: () => import('pages/SidMapPage.vue') },
    ],
  },

  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes