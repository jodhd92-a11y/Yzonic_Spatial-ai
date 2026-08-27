import { createRouter, createWebHistory } from 'vue-router'
import ChatView from '@/views/ChatView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/chat' },
    { path: '/chat', name: 'chat-new', component: ChatView },
    { path: '/chat/:id', name: 'chat-conversation', component: ChatView, props: true },
  ],
})
