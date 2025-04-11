<template>
  <div class="result-container">
    <div class="result-content">
      <!-- 结果图标 -->
      <div class="result-icon" :class="statusInfo.type">
        <el-icon v-if="statusInfo.icon"><component :is="statusInfo.icon" /></el-icon>
      </div>
      
      <!-- 结果标题 -->
      <h2 class="result-title">{{ statusInfo.title }}</h2>
      
      <!-- 结果描述 -->
      <p class="result-desc">{{ statusInfo.description }}</p>
      
      <!-- 订单编号 -->
      <div class="order-no" v-if="orderNo">
        订单编号：{{ orderNo }}
      </div>
      
      <!-- 操作按钮 -->
      <div class="actions">
        <el-button type="primary" v-if="orderNo" @click="handleViewOrder">查看订单</el-button>
        <el-button @click="handleBackToHome">返回首页</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePaymentStore } from '../store/usePaymentStore'
import { ElMessage } from 'element-plus'
import {
  CircleCheckFilled,
  WarningFilled,
  CircleCloseFilled
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const paymentStore = usePaymentStore()

// 订单编号
const orderNo = ref(route.query.orderNo || '')

// 倒计时相关
const countdown = ref(3)
const countdownTimer = ref(null)
const shouldAutoRedirect = ref(true)

// 清空购物车相关商品
const clearCartItems = async () => {
  try {
    // 获取下单商品ID列表
    const checkoutItemsStr = localStorage.getItem('checkout_items');
    if (!checkoutItemsStr) {
      return;
    }
    
    const checkoutItems = JSON.parse(checkoutItemsStr);
    
    // 导入购物车模块
    const cartStoreModule = await import('../../cart/store/useCartStore');
    const cartStore = cartStoreModule.useCartStore();
    
    // 获取所有选中商品的ID
    const itemIds = checkoutItems.map(item => item.id || item.skuId);
    
    // 从购物车中移除这些商品
    if (itemIds.length > 0) {
      for (const id of itemIds) {
        if (id) {
          await cartStore.removeItem(id);
        }
      }
      ElMessage.success('已清空购物车中的相关商品');
    }
  } catch (error) {
    // 清空购物车失败时静默处理
  }
}

// 根据状态参数计算显示信息
const statusInfo = computed(() => {
  const status = route.query.status || 'processing'
  
  switch (status) {
    case 'success':
      return {
        type: 'success',
        icon: 'CircleCheckFilled',
        title: '支付成功',
        description: `您的订单已支付完成，感谢您的购买！${shouldAutoRedirect.value && countdown.value > 0 ? countdown.value + '秒后自动查看订单' : ''}`
      }
    case 'timeout':
      return {
        type: 'timeout',
        icon: 'WarningFilled',
        title: '支付超时',
        description: '支付已超时，请重新下单'
      }
    case 'closed':
      return {
        type: 'failed',
        icon: 'CircleCloseFilled',
        title: '订单已关闭',
        description: '订单已关闭，如需购买请重新下单'
      }
    case 'failed':
      return {
        type: 'failed',
        icon: 'CircleCloseFilled',
        title: '支付失败',
        description: '支付失败，请稍后重试'
      }
    default:
      return {
        type: 'processing',
        icon: 'Loading',
        title: '处理中',
        description: '正在处理您的支付，请稍候...'
      }
  }
})

// 开始倒计时
const startCountdown = () => {
  // 清除可能存在的定时器
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
  }
  
  countdown.value = 3 // 重置为3秒
  shouldAutoRedirect.value = true // 重置跳转标志
  
  // 设置定时器
  countdownTimer.value = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    } else {
      // 倒计时结束
      clearInterval(countdownTimer.value)
      // 如果没有被取消，执行跳转
      if (shouldAutoRedirect.value && orderNo.value) {
        handleViewOrder()
      }
    }
  }, 1000)
}

// 检查实际支付状态（用于微信支付回调）
const checkRealStatus = async () => {
  if (route.query.from === 'wechat') {
    try {
      const result = await paymentStore.manualCheckStatus()
      if (result && result.status === 'PAID') {
        // 如果支付成功，更新路由状态参数
        router.replace({
          query: {
            ...route.query,
            status: 'success'
          }
        })
      }
    } catch (error) {
      // 检查支付状态失败时静默处理
    }
  }
}

// 查看订单
const handleViewOrder = () => {
  if (orderNo.value) {
    router.push({
      name: 'OrderDetail',
      params: { orderNo: orderNo.value }
    });
  } else {
    ElMessage.warning('订单信息不完整，无法查看')
  }
}

// 返回首页
const handleBackToHome = () => {
  // 取消自动跳转
  shouldAutoRedirect.value = false
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
    countdownTimer.value = null
  }
  router.push('/')
}

// 清理函数
onBeforeUnmount(() => {
  // 确保在组件卸载时清除定时器
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
    countdownTimer.value = null
  }
})

// 组件加载时处理
onMounted(async () => {
  // 1. 首先从URL参数中获取信息
  const { orderNo: urlOrderNo, amount: urlAmount, payTime: urlPayTime } = route.query
  
  // 如果URL有这些参数，更新订单信息并保存到localStorage
  if (urlOrderNo) {
    orderNo.value = urlOrderNo
    
    // 将这些信息保存到last_successful_payment
    const paymentInfo = {
      orderNo: urlOrderNo,
      paymentNo: '',
      amount: urlAmount || 0,
      method: route.query.from || 'wechat', // 简化版主要用于微信支付
      payTime: urlPayTime || new Date().toISOString(),
      timestamp: new Date().getTime()
    }
    
    localStorage.setItem('last_successful_payment', JSON.stringify(paymentInfo))
  }
  
  // 2. 获取支付成功的数据并更新订单信息
  const savedPaymentStr = localStorage.getItem('last_successful_payment')
  if (savedPaymentStr) {
    try {
      const savedPayment = JSON.parse(savedPaymentStr)
      
      // 更新订单编号
      if (savedPayment.orderNo) {
        orderNo.value = savedPayment.orderNo
        
        // 将支付成功信息保存到订单缓存中
        try {
          // 获取订单缓存
          const orderStoreModule = await import('../../order/store/useOrderStore')
          const orderStore = orderStoreModule.useOrderStore()
          
          // 尝试获取完整订单信息
          await orderStore.getOrderDetail(savedPayment.orderNo)
        } catch (error) {
          // 获取订单信息失败时静默处理
        }
      }
    } catch (error) {
      // 解析last_successful_payment失败时静默处理
    }
  }
  
  // 3. 检查实际支付状态
  await checkRealStatus()
  
  // 4. 如果支付成功，执行清空购物车和自动跳转
  if (route.query.status === 'success' && orderNo.value) {
    // 清空购物车中的相关商品
    await clearCartItems();
    
    // 开始倒计时自动跳转到订单详情页
    ElMessage.success(`支付成功，${countdown.value}秒后将跳转到订单详情页...`)
    startCountdown()
  }
})
</script>

<style lang="scss" scoped>
@use '../style/payment.scss' as *;

.result-container {
  max-width: 500px;
  margin: 40px auto;
  padding: 30px 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  
  .result-content {
    text-align: center;
    
    .order-no {
      margin: 20px 0;
      padding: 10px;
      background-color: #f8f8f8;
      border-radius: 4px;
      font-family: monospace;
    }
    
    .actions {
      margin-top: 30px;
      display: flex;
      justify-content: center;
      gap: 15px;
    }
  }
}
</style> 