import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LeaseView from '@/views/LeaseView.vue'
import OsgopView from '@/views/OsgopView.vue'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/lease', name: 'lease', component: LeaseView },
    { path: '/osgop', name: 'osgop', component: OsgopView },
  ],
})
