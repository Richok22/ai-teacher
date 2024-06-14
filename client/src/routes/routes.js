import { createRouter, createWebHistory } from 'vue-router'
import chat from "../views/chat.vue";


export let routes = [
    {
        path: '/',
        name: 'chat',
        component: chat
    },
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

export default router