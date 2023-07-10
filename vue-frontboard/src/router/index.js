import { createRouter, createWebHistory } from 'vue-router'
import PageHome from '@/views/PageHome.vue'
import BoardList from '@/views/board/BoardList.vue'
import PageTest from '@/views/PageTest.vue'
import PageTest2 from '@/views/PageTest2.vue'
import PageTest3 from '@/views/PageTest3.vue'
import PageTest4 from '@/views/PageTest4.vue'
import PageTest5 from '@/views/PageTest5.vue'

const routes = [
    {
        path: '/',
        name: 'PageHome',
        component: PageHome
    },
    {
        path: '/about',
        name: 'About',
        component: () => import('../views/PageAbout.vue')
    },
    {
        path: '/board/list',
        name: 'BoardList',
        component: BoardList
    },
    {
        path: '/test',
        name: 'Test',
        component: PageTest
    },
    {
        path: '/test2',
        name: 'Test2',
        component: PageTest2
    },
    {
        path: '/test3',
        name: 'Test3',
        component: PageTest3
    },
    {
        path: '/test4',
        name: 'Test4',
        component: PageTest4
    },
    {
        path: '/test5',
        name: 'Test5',
        component: PageTest5
    }
]

const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes
})

export default router