import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '../stores/user';
import HomeView from '../views/HomeView.vue';
import RoomView from '../views/RoomView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/room/:roomCode', component: RoomView },
  ],
});

// 首次导航时从 localStorage 恢复用户身份（确保 Pinia 已初始化）
let userLoaded = false;
router.beforeEach(() => {
  if (!userLoaded) {
    userLoaded = true;
    const userStore = useUserStore();
    userStore.loadUser();
  }
});

export default router;
