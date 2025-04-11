import { createRouter, createWebHistory } from 'vue-router'

// 使用懒加载导入组件
const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../modules/home/view/Home.vue'),
    meta: {
      title: '首页',
      requiresAuth: false
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../modules/user/view/Login.vue'),
    meta: {
      title: '登录',
      requiresAuth: false
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../modules/user/view/Register.vue'),
    meta: {
      title: '注册',
      requiresAuth: false
    }
  },
  {
    path: '/goods',
    name: 'Goods',
    component: () => import('../modules/goods/view/GoodsList.vue'),
    meta: {
      title: '商品列表',
      requiresAuth: false
    }
  },
  {
    path: '/goods/:id',
    name: 'GoodsDetail',
    component: () => import('../modules/goods/view/GoodsDetail.vue'),
    meta: {
      title: '商品详情',
      requiresAuth: false
    }
  },
  {
    path: '/cart',
    name: 'Cart',
    component: () => import('../modules/cart/view/Cart.vue'),
    meta: {
      title: '购物车',
      requiresAuth: true
    }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../modules/user/view/Profile.vue'),
    meta: {
      title: '个人中心',
      requiresAuth: true
    }
  },
  {
    path: '/checkout',
    name: 'Checkout',
    component: () => import('../modules/order/view/Checkout.vue'),
    meta: {
      title: '订单结算',
      requiresAuth: true
    }
  },
  {
    path: '/order/detail/:orderNo',
    name: 'OrderDetail',
    component: () => import('../modules/order/view/OrderDetail.vue'),
    meta: {
      title: '订单详情',
      requiresAuth: true
    }
  },
  {
    path: '/payment/pay',
    name: 'Pay',
    component: () => import('../modules/payment/view/Pay.vue'),
    meta: {
      title: '订单支付',
      requiresAuth: true
    }
  },
  {
    path: '/payment/result',
    name: 'PaymentResult',
    component: () => import('../modules/payment/view/ResultSimple.vue'),
    meta: {
      title: '支付结果',
      requiresAuth: true
    }
  },
  {
    path: '/payment/result-simple',
    name: 'PaymentResultSimple',
    component: () => import('../modules/payment/view/ResultSimple.vue'),
    meta: {
      title: '支付结果',
      requiresAuth: true
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/goods'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 电商平台` : '电商平台'
  
  // 登录验证逻辑
  const isAuthenticated = localStorage.getItem('token')
  
  // 如果页面需要登录但用户未登录，重定向到登录页
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ 
      name: 'Login',
      query: { redirect: to.fullPath } // 保存原始请求路径用于登录后重定向
    })
  } else {
    // 如果用户已登录且尝试访问登录页，重定向到个人中心页
    if (to.name === 'Login' && isAuthenticated) {
      next({ name: 'Profile' })
    } else {
      next()
    }
  }
})

export default router

