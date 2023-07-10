import './assets/common.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
// import webix from './webix'
import '@/assets/js/webix_9.3.2_com/codebase/webix.css';



// const app = createApp(App)
// app.use(router).mount('#app')
// webix.ready(() => {
    const app = createApp(App);
    // app.component('webix-ui', webix.ui)
    app.use(router).mount('#app');
// });