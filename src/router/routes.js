const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: 'route/:tuyenId', component: () => import('pages/IndexPage.vue') },
      { path: 'sid/:sid', component: () => import('pages/SidRouteDiagram.vue') },
      { path: 'map', component: () => import('pages/CableMapPage.vue') }, // NEW: GIS map page
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
