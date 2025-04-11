<template>
  <div class="payment-result-container">
    <el-card shadow="never" class="result-card">
      <div class="result-content">
        <!-- 成功状态 -->
        <div v-if="status === 'success'" class="result-icon success">
          <el-icon><Check /></el-icon>
        </div>
        
        <!-- 失败状态 -->
        <div v-else-if="status === 'failed'" class="result-icon failed">
          <el-icon><CircleCloseFilled /></el-icon>
        </div>
        
        <!-- 超时状态 -->
        <div v-else-if="status === 'timeout'" class="result-icon timeout">
          <el-icon><WarnTriangleFilled /></el-icon>
        </div>
        
        <!-- 关闭状态 -->
        <div v-else-if="status === 'closed'" class="result-icon closed">
          <el-icon><CircleCloseFilled /></el-icon>
        </div>
        
        <!-- 状态标题 -->
        <h2 class="result-title">{{ resultTitle }}</h2>
        <p class="result-desc">{{ resultDesc }}</p>
        
        <!-- 按钮区域 -->
        <div class="result-actions">
          <el-button @click="goToOrderDetail" v-if="status === 'success'">查看订单详情</el-button>
          <el-button type="primary" @click="goToHome">返回首页</el-button>
          <el-button @click="goToRepay" v-if="status === 'failed' || status === 'timeout' || status === 'closed'">重新支付</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePaymentStore } from '../store/usePaymentStore'
import { Check, CircleCloseFilled, WarnTriangleFilled } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const paymentStore = usePaymentStore()

// 支付状态
const status = ref(route.query.status || 'unknown')
const orderNo = ref(route.query.orderNo || '')

// 结果消息
const resultTitle = computed(() => {
  switch (status.value) {
    case 'success':
      return '支付成功'
    case 'failed':
      return '支付失败'
    case 'timeout':
      return '支付超时'
    case 'closed':
      return '订单已关闭'
    default:
      return '未知状态'
  }
})

const resultDesc = computed(() => {
  switch (status.value) {
    case 'success':
      return '您的订单已支付成功，我们将尽快为您发货'
    case 'failed':
      return '支付遇到问题，请稍后重试或选择其他支付方式'
    case 'timeout':
      return '订单支付超时，您可以重新下单或重新发起支付'
    case 'closed':
      return '此订单已关闭，您可以重新下单或查看其他商品'
    default:
      return '请返回订单中心查看订单状态'
  }
})

// 导航方法
const goToOrderDetail = () => {
  router.push(`/order/detail/${orderNo.value}`)
}

const goToHome = () => {
  router.push('/')
}

const goToRepay = () => {
  // 重置支付状态
  paymentStore.resetPayment()
  
  if (orderNo.value) {
    router.push(`/payment/pay?orderNo=${orderNo.value}`)
  } else {
    router.push('/order/list')
  }
}

// 组件挂载时清理支付状态
onMounted(() => {
  // 如果是成功状态，清理支付数据
  if (status.value === 'success') {
    paymentStore.resetPayment()
  }
  
  // 如果是未知状态，尝试从store中获取订单号
  if (!orderNo.value && paymentStore.currentPayment) {
    orderNo.value = paymentStore.currentPayment.orderNo
  }
})
</script>

<style lang="scss" scoped>
.payment-result-container {
  max-width: 600px;
  margin: 40px auto;
  
  .result-card {
    border-radius: 8px;
    padding: 20px;
    
    .result-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 30px 0;
      
      .result-icon {
        font-size: 60px;
        margin-bottom: 20px;
        
        &.success {
          color: #67C23A;
        }
        
        &.failed {
          color: #F56C6C;
        }
        
        &.timeout {
          color: #E6A23C;
        }
        
        &.closed {
          color: #909399;
        }
      }
      
      .result-title {
        font-size: 24px;
        margin: 0 0 15px;
        color: #333;
      }
      
      .result-desc {
        color: #666;
        margin-bottom: 30px;
        max-width: 80%;
      }
      
      .result-actions {
        display: flex;
        gap: 15px;
      }
    }
  }
}
</style> 