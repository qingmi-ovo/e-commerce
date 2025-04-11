<template>
  <div class="payment-container">
    <el-card shadow="never" class="payment-card">
      <template #header>
        <div class="header">
          <h2>订单支付</h2>
          <div class="amount">¥{{ orderAmount }}</div>
        </div>
      </template>
      
      <!-- 支付方式选择 -->
      <div class="payment-methods">
        <h3>请选择支付方式</h3>
        <div class="method-list">
          <div 
            v-for="method in paymentMethods" 
            :key="method.id"
            class="payment-method"
            :class="{ active: paymentMethod === method.id }"
            @click="handlePaymentMethodChange(method.id)"
          >
            <img :src="getIconPath(method.icon)" :alt="method.name" />
            <div class="method-info">
              <div class="method-name">{{ method.name }}</div>
              <div class="method-desc">{{ method.description }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 支付按钮 -->
      <div class="payment-actions">
        <el-button 
          type="primary" 
          size="large" 
          :loading="loading.payment"
          :disabled="!orderNo || !paymentMethod || amountInvalid" 
          @click="createPayment"
        >
          确认支付
        </el-button>
      </div>
      
      <!-- 错误提示 -->
      <div v-if="amountInvalid" class="error-message">
        <el-alert
          title="订单金额无效，请返回重新选择商品"
          type="error"
          :closable="false"
          show-icon
        >
          <el-button size="small" @click="router.push('/cart')">返回购物车</el-button>
        </el-alert>
      </div>
      
      <!-- 支付二维码展示 -->
      <div v-if="currentPayment" class="payment-qrcode">
        <div v-if="paymentMethod === 'wechat'" class="qrcode-container">
          <p class="qrcode-title">请使用微信扫一扫</p>
          <div class="qrcode-image" v-if="currentPayment && currentPayment.qrCodeUrl">
            <img :src="currentPayment.qrCodeUrl" alt="微信支付二维码" />
          </div>
          <p class="qrcode-tip">请使用微信扫码支付</p>
        </div>
        
        <div v-else-if="paymentMethod === 'alipay'" class="qrcode-container">
          <p class="qrcode-title">请点击下方按钮跳转支付宝</p>
          <el-button type="primary" @click="handleRedirect(currentPayment && currentPayment.redirectUrl)">
            前往支付宝付款
          </el-button>
          <p class="qrcode-tip">如未跳转，请手动打开支付宝扫码</p>
        </div>
        
        <div v-else class="qrcode-container">
          <p class="qrcode-title">请点击下方按钮跳转银行页面</p>
          <el-button type="primary" @click="handleRedirect(currentPayment.redirectUrl)">
            前往银行页面付款
          </el-button>
        </div>
        
        <!-- 支付倒计时 -->
        <div class="countdown" v-if="currentPayment">
          <el-alert type="warning" :closable="false">
            <template #title>
              <div class="countdown-timer">
                <el-icon class="timer-icon"><Timer /></el-icon>
                <span class="timer-text">支付剩余时间：{{ minutes }}:{{ seconds }}</span>
              </div>
            </template>
          </el-alert>
        </div>
        
        <!-- 刷新支付状态按钮 -->
        <div class="check-status">
          <el-button 
            type="primary" 
            link
            :loading="localLoading.status"
            @click="handleCheckStatus"
          >
            我已支付，查询支付结果
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePaymentStore, paymentEvents } from '../store/usePaymentStore'
import { useCountdown } from '../composables/useCountdown'
import { ElMessage } from 'element-plus'
import { Timer } from '@element-plus/icons-vue'

// 导入图标
import wechatPayIcon from '@/common/assets/icons/wechat-pay.svg'
import alipayIcon from '@/common/assets/icons/alipay.svg'
import creditCardIcon from '@/common/assets/icons/credit-card.svg'

const router = useRouter()
const route = useRoute()
const paymentStore = usePaymentStore()

// 创建图标映射
const iconMap = {
  'wechat-pay': wechatPayIcon,
  'alipay': alipayIcon,
  'credit-card': creditCardIcon
}

// 获取图标路径函数
const getIconPath = (iconName) => {
  return iconMap[iconName] || ''
}

// 订单信息
const orderNo = ref(route.query.orderNo || '')
// 支付编号和金额
const paymentNo = ref('')
const amount = ref(0)
// 微信支付相关
const isWechatModalVisible = ref(false)
const qrCodeRef = ref(null)
// 加载状态
const isLoading = ref(false)

// 使用computed计算正确的金额显示
const orderAmount = computed(() => {
  // 1. 尝试从路由参数获取金额
  if (route.query.amount) {
    try {
      // 直接解析
      const amount = parseFloat(route.query.amount);
      if (!isNaN(amount) && amount > 0) {
        return amount.toFixed(2);
      }
      
      console.warn('路由参数中的金额无效:', route.query.amount);
    } catch (e) {
      console.error('解析路由金额出错:', e);
    }
  } else {
    console.warn('路由参数中没有amount');
  }
  
  // 2. 尝试从localStorage恢复金额（结算页面存储的备份）
  const savedAmount = localStorage.getItem('last_order_amount');
  if (savedAmount) {
    try {
      const amount = parseFloat(savedAmount);
      if (!isNaN(amount) && amount > 0) {
        console.log('从本地存储恢复金额:', amount);
        return amount.toFixed(2);
      }
    } catch (e) {
      console.error('解析本地存储金额出错:', e);
    }
  }
  
  // 3. 尝试从currentPayment中获取金额
  if (currentPayment.value && currentPayment.value.amount) {
    try {
      const amount = parseFloat(currentPayment.value.amount);
      if (!isNaN(amount) && amount > 0) {
        console.log('从当前支付信息中获取金额:', amount);
        return amount.toFixed(2);
      }
    } catch (e) {
      console.error('解析当前支付金额出错:', e);
    }
  }
  
  // 4. 所有方法都失败，返回0
  console.error('无法获取有效金额，显示0.00');
  return '0.00';
})

// 判断金额是否有效 (小于等于0或NaN)
const amountInvalid = computed(() => {
  // 首先检查路由参数
  if (route.query.amount) {
    try {
      const amount = parseFloat(route.query.amount);
      if (!isNaN(amount) && amount > 0) {
        return false; // 有效金额
      }
    } catch (e) {
      console.error('验证路由金额出错:', e);
    }
  }
  
  // 检查本地存储
  const savedAmount = localStorage.getItem('last_order_amount');
  if (savedAmount) {
    try {
      const amount = parseFloat(savedAmount);
      if (!isNaN(amount) && amount > 0) {
        return false; // 有效金额
      }
    } catch (e) {
      console.error('验证本地存储金额出错:', e);
    }
  }
  
  // 检查当前支付信息
  if (currentPayment.value && currentPayment.value.amount) {
    try {
      const amount = parseFloat(currentPayment.value.amount);
      if (!isNaN(amount) && amount > 0) {
        return false; // 有效金额
      }
    } catch (e) {
      console.error('验证当前支付金额出错:', e);
    }
  }
  
  // 所有来源都没有有效金额
  return true;
})

// 支付方式
const paymentMethod = ref('')

// 手动设置默认支付方式，以防API未返回数据
const defaultPaymentMethods = [
  {
    id: 'wechat',
    name: '微信支付',
    icon: 'wechat-pay',
    description: '使用微信扫码支付'
  },
  {
    id: 'alipay',
    name: '支付宝',
    icon: 'alipay',
    description: '使用支付宝支付'
  },
  {
    id: 'bank',
    name: '银行卡',
    icon: 'credit-card',
    description: '使用银行卡支付'
  }
]

// 支付方式列表，使用默认值作为fallback
const paymentMethods = computed(() => {
  const methods = paymentStore.paymentMethods
  return methods && methods.length > 0 ? methods : defaultPaymentMethods
})

// 计算属性
const currentPayment = computed(() => paymentStore.currentPayment)
const loading = computed(() => paymentStore.loading)
const error = computed(() => paymentStore.error)

// 创建本地loading状态，避免修改计算属性
const localLoading = ref({
  status: false
})

// 倒计时，设置为30分钟
const { minutes, seconds, reset, isFinished, remainingTime } = useCountdown(30 * 60, {
  onEnd: () => {
    ElMessage.warning('支付超时，订单已关闭')
    // 根据支付方式使用不同的结果页
    if (paymentMethod.value === 'wechat') {
      router.push(`/payment/result-simple?status=timeout&orderNo=${orderNo.value}`)
    } else {
      router.push('/payment/result?status=timeout')
    }
    // 清除倒计时记录
    localStorage.removeItem(`payment_countdown_${orderNo.value}`);
  },
  autoStart: false // 不自动开始，将在计算剩余时间后手动开始
})

// 计算倒计时剩余时间并启动
const initializeCountdown = () => {
  if (!orderNo.value) return;
  
  // 从localStorage获取之前保存的倒计时信息
  const savedCountdownData = localStorage.getItem(`payment_countdown_${orderNo.value}`);
  
  if (savedCountdownData) {
    try {
      const countdownInfo = JSON.parse(savedCountdownData);
      const startTime = countdownInfo.startTime;
      const totalDuration = countdownInfo.totalDuration || 30 * 60; // 默认30分钟
      
      // 计算已经过去的时间（秒）
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      
      // 计算剩余时间
      const remaining = Math.max(0, totalDuration - elapsedSeconds);
      
      console.log('恢复倒计时:', {
        订单号: orderNo.value,
        开始时间: new Date(startTime).toLocaleString(),
        已过时间: elapsedSeconds + '秒',
        剩余时间: remaining + '秒'
      });
      
      // 如果已经过期
      if (remaining <= 0) {
        ElMessage.warning('支付已超时，订单已关闭');
        localStorage.removeItem(`payment_countdown_${orderNo.value}`);
        
        // 延迟跳转，确保消息能够显示
        setTimeout(() => {
          router.push(`/payment/result?status=timeout&orderNo=${orderNo.value}`);
        }, 1500);
        return;
      }
      
      // 重置倒计时并启动
      reset(remaining, true);
    } catch (error) {
      console.error('解析倒计时数据失败:', error);
      // 倒计时数据解析失败，使用默认值
      startNewCountdown();
    }
  } else {
    // 没有保存的倒计时，开始新的倒计时
    startNewCountdown();
  }
}

// 开始新的倒计时
const startNewCountdown = () => {
  if (!orderNo.value) return;
  
  const totalDuration = 30 * 60; // 30分钟
  
  // 保存倒计时开始信息
  const countdownInfo = {
    startTime: Date.now(),
    totalDuration: totalDuration,
    orderNo: orderNo.value
  };
  
  // 将倒计时信息保存到localStorage
  localStorage.setItem(`payment_countdown_${orderNo.value}`, JSON.stringify(countdownInfo));
  
  
  // 重置倒计时并启动
  reset(totalDuration, true);
}

// 保存倒计时状态
const updateCountdownStorage = () => {
  if (!orderNo.value || isFinished.value) return;
  
  // 获取原有数据
  const savedCountdownData = localStorage.getItem(`payment_countdown_${orderNo.value}`);
  
  if (savedCountdownData) {
    try {
      const countdownInfo = JSON.parse(savedCountdownData);
      // 更新剩余时间
      const currentRemaining = remainingTime.value;
      const elapsedSeconds = countdownInfo.totalDuration - currentRemaining;
      
      // 更新开始时间，保持剩余时间一致
      countdownInfo.startTime = Date.now() - (elapsedSeconds * 1000);
      
      // 保存更新后的数据
      localStorage.setItem(`payment_countdown_${orderNo.value}`, JSON.stringify(countdownInfo));
    } catch (error) {
      console.error('更新倒计时数据失败:', error);
    }
  }
}

// 每15秒更新一次倒计时存储状态
let countdownUpdateInterval;

// 处理支付方法选择
const handlePaymentMethodChange = method => {
  paymentMethod.value = method
}

// 创建支付
const createPayment = async () => {
  isLoading.value = true
  
  try {
    // 准备支付所需参数
    const params = {
      orderNo: orderNo.value,
      method: paymentMethod.value,
      returnUrl: window.location.origin + '/payment/result'
    }
    

    
    // 调用支付接口
    const response = await paymentStore.createPayment(params)

    
    if (response.success) {
      paymentNo.value = response.data.paymentNo
      amount.value = response.data.amount
      
      // 根据不同支付方式，处理支付逻辑
      if (paymentMethod.value === 'alipay') {
        // 支付宝支付 - 保存当前支付信息到会话存储
        sessionStorage.setItem('current_pay_order_no', orderNo.value)
        
        // 重定向到支付宝支付页面
        window.location.href = response.data.payUrl
      } else {
        // 微信支付 - 显示二维码
        startWechatPay(response.data.payUrl)
      }
    } else {
      ElMessage.error(response.message || '创建支付失败，请重试')
      isLoading.value = false
    }
  } catch (error) {
    console.error('创建支付异常:', error)
    ElMessage.error('创建支付时发生错误，请稍后再试')
    isLoading.value = false
  }
}

// 处理跳转支付
const handleRedirect = (url) => {
  if (!url) {
    ElMessage.error('跳转链接不存在')
    return
  }
  
  // 记录支付方式，用于返回时识别
  if (paymentMethod.value === 'alipay') {
    sessionStorage.setItem('paymentSource', 'alipay')
    sessionStorage.setItem('paymentOrderNo', orderNo.value)
  }
  
  window.open(url, '_blank')
}

// 组件挂载时获取支付方式和处理参数
onMounted(async () => {
  
  try {
    // 获取支付方式
    await paymentStore.fetchPaymentMethods()
    
    // 处理URL参数，优先使用URL参数
    const urlOrderNo = route.query.orderNo
    const urlAmount = route.query.amount
    const fromSource = route.query.from // 'direct_buy' 或 'checkout' 或 undefined
    
    // 检查当前是从哪个流程进入支付页面
    let isFromDirectBuy = fromSource === 'direct_buy'
    let isFromCart = fromSource === 'checkout'
    let isFromCheckout = fromSource === 'checkout'
    
    
    // 订单号处理
    if (urlOrderNo) {
      orderNo.value = urlOrderNo
      
      // 保存当前处理的订单号到本地存储
      localStorage.setItem('current_paying_order_no', urlOrderNo)
    } else {
      // 如果URL没有订单号，尝试从localStorage恢复
      const savedOrderNo = localStorage.getItem('last_order_no')
      if (savedOrderNo) {
        orderNo.value = savedOrderNo
      }
    }
    
    // 初始化倒计时
    initializeCountdown();
    
    // 设置一个定时器，定期更新localStorage中的倒计时状态
    countdownUpdateInterval = setInterval(updateCountdownStorage, 15000);
    
    // 如果当前没有有效金额，但有订单号，尝试从订单系统获取详情
    if (amountInvalid.value && orderNo.value) {
      try {
        
        // 如果有订单API，可以调用获取订单详情
        const orderStore = await import('../../order/store/useOrderStore').then(m => m.useOrderStore())
        if (orderStore) {
          const orderInfo = await orderStore.getOrderDetail(orderNo.value)
          
          if (orderInfo) {
            // 尝试更新金额信息
            const retrievedAmount = orderInfo.paymentAmount || orderInfo.totalAmount
            if (retrievedAmount && !isNaN(parseFloat(retrievedAmount))) {
              localStorage.setItem('last_order_amount', retrievedAmount.toString())
            }
          }
        }
      } catch (err) {
        console.error('获取订单详情失败:', err)
      }
    }
    
    
    // 注册支付成功事件监听
    const unsubscribe = paymentStore.onPaymentSuccess((paymentData) => {
      handlePaymentSuccess(paymentData)
    })
    
    // 将取消订阅函数保存到外部变量，以便在组件卸载时使用
    window._paymentUnsubscribe = unsubscribe
    
    // 如果是从结算页面过来，自动选择默认支付方式
    if (isFromCheckout && paymentMethods.value && paymentMethods.value.length > 0) {
      paymentMethod.value = paymentMethods.value[0].id
      
      // 检查金额是否有效，避免创建无效的支付
      const amount = parseFloat(orderAmount.value)
      if (isNaN(amount) || amount <= 0) {
        console.error('订单金额无效:', orderAmount.value, '原始amount参数:', urlAmount)
        ElMessage.warning('订单金额无效，请重新选择商品')
        // 增加延迟，确保消息显示
        setTimeout(() => router.push('/cart'), 2000)
        return
      }
      
      // 自动发起支付
      createPayment()
    }
    // 如果是从直接购买过来，同样自动选择支付方式
    else if (isFromDirectBuy && paymentMethods.value && paymentMethods.value.length > 0) {
      paymentMethod.value = paymentMethods.value[0].id
      
      // 检查金额是否有效，避免创建无效的支付
      const amount = parseFloat(orderAmount.value)
      if (isNaN(amount) || amount <= 0) {
        console.error('订单金额无效:', orderAmount.value, '原始amount参数:', urlAmount)
        ElMessage.warning('订单金额无效，请重新选择商品')
        // 增加延迟，确保消息显示
        setTimeout(() => router.push('/goods'), 2000)
        return
      }
      
      // 自动发起支付
      createPayment()
    }
    // 如果有持久化的支付信息，恢复状态
    else if (currentPayment.value && currentPayment.value.paymentNo) {
      paymentMethod.value = currentPayment.value.method
      
      // 恢复轮询
      paymentStore.startPolling()
      
      // 检查当前支付状态，如果已经支付成功，则直接跳转
      const currentStatus = await paymentStore.manualCheckStatus()
      if (currentStatus && currentStatus.status === 'PAID') {
        handlePaymentSuccess(currentStatus)
      }
    } else {
      console.log('新支付会话，等待用户选择支付方式')
    }
  } catch (error) {
    ElMessage.error('加载支付信息失败，请返回重试')
  }
})

// 重构组件卸载逻辑，确保清除所有订阅和定时器
onBeforeUnmount(() => {
  
  // 清除支付状态轮询
  paymentStore.clearPolling()
  
  // 清除倒计时更新定时器
  if (countdownUpdateInterval) {
    clearInterval(countdownUpdateInterval);
  }
  
  // 保存当前倒计时状态
  updateCountdownStorage();
  
  // 清除支付成功事件订阅
  if (window._paymentUnsubscribe && typeof window._paymentUnsubscribe === 'function') {
    window._paymentUnsubscribe()
    window._paymentUnsubscribe = null
  }
  
  // 清除可能的其他全局状态
  if (window.onPaymentSuccess) {
    window.onPaymentSuccess = null
  }
})

// 处理支付成功逻辑
const handlePaymentSuccess = async (paymentResult) => {
  
  // 停止轮询
  paymentStore.clearPolling()
  isWechatModalVisible.value = false
  isLoading.value = false
  
  // 清除倒计时记录
  localStorage.removeItem(`payment_countdown_${orderNo.value}`);
  
  // 确保有支付成功的时间记录
  const payTime = paymentResult?.paidAt || new Date().toISOString()
  
  // 从URL参数中获取订单数据
  let orderData = {}
  try {
    // 1. 首先尝试从URL参数获取
    const orderDataStr = route.query.orderData
    if (orderDataStr) {
      orderData = JSON.parse(decodeURIComponent(orderDataStr))
    } 
    
    // 2. 如果URL参数中没有完整数据，尝试从localStorage恢复
    if (!orderData || !orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      console.log('URL中没有订单数据，尝试从localStorage恢复')
      const savedOrderData = localStorage.getItem('last_checkout_order')
      if (savedOrderData) {
        try {
          const parsedData = JSON.parse(savedOrderData)
          if (parsedData && parsedData.items && Array.isArray(parsedData.items)) {
            console.log('从localStorage恢复到订单数据')
            orderData = parsedData
          }
        } catch (err) {
          console.error('解析localStorage中的订单数据失败:', err)
        }
      }
    }
    
    // 3. 尝试从订单API获取订单详情
    if (!orderData?.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      try {
        console.log('尝试从订单API获取订单数据')
        const orderStore = await import('../../order/store/useOrderStore').then(m => m.useOrderStore())
        if (orderStore && orderNo.value) {
          const orderInfo = await orderStore.getOrderDetail(orderNo.value)
          if (orderInfo && orderInfo.items && Array.isArray(orderInfo.items)) {
            console.log('从订单API获取到订单数据')
            orderData = orderInfo
          }
        }
      } catch (err) {
        console.error('从订单API获取订单数据失败:', err)
      }
    }
    
    // 4. 如果所有方法都失败，创建一个空的items数组，避免后续代码出错
    if (!orderData.items) {
      orderData.items = []
    }
  } catch (err) {
    console.error('处理订单数据失败:', err)
    // 确保有一个空的items数组
    orderData.items = []
  }
  
  // 保存支付成功的数据（合并订单信息和支付信息）
  const paymentInfo = {
    orderNo: orderNo.value,
    paymentNo: paymentNo.value,
    amount: amount.value,
    payTime: payTime,
    method: paymentMethod.value || 'wechat',
    timestamp: new Date().getTime(),
    // 合并订单数据
    totalAmount: orderData.totalAmount,
    shippingFee: orderData.shippingFee,
    discountAmount: orderData.discountAmount,
    items: orderData.items,
    address: orderData.address
  }
  
  // 保存到本地存储，供其他页面使用
  localStorage.setItem('last_successful_payment', JSON.stringify(paymentInfo))
  
  // 从购物车中删除已购买的商品
  try {
    const cartStore = await import('../../cart/store/useCartStore').then(m => m.useCartStore())
    if (cartStore && orderData && orderData.items && Array.isArray(orderData.items) && orderData.items.length > 0) {
      console.log('从购物车移除商品:', orderData.items.length, '项')
      cartStore.removeItems(orderData.items.map(item => item.skuId))
    } else {
      console.warn('清理购物车: 订单商品数据不完整或为空，跳过清理', orderData)
    }
  } catch (error) {
    console.error('清理购物车失败:', error)
  }
  
  // 更新订单状态
  try {
    const orderStore = await import('../../order/store/useOrderStore').then(m => m.useOrderStore())
    if (orderData && orderData.items && Array.isArray(orderData.items) && orderData.items.length > 0) {
      console.log('更新订单状态:', orderData.items.length, '项商品')
      // 合并支付信息和订单信息
      const updatedOrderData = {
        ...orderData,
        paymentNo: paymentNo.value,
        payTime: payTime,
        paymentMethod: paymentMethod.value || 'wechat',
        status: 2, // 更新为待发货状态
        items: orderData.items.map(item => {
          // 尝试从原始备份中恢复商品信息
          const originalItem = item._originalItem || {}
          return {
            ...item,
            // 优先使用原始备份的商品信息
            skuId: originalItem.skuId || item.skuId,
            goodsId: originalItem.goodsId || item.goodsId,
            goodsName: originalItem.goodsName || item.goodsName || item.title,
            goodsCover: originalItem.goodsCover || item.goodsCover || item.cover || item.imageUrl,
            price: Number(item.price) || Number(item._originalPrice) || 0,
            quantity: Number(item.quantity) || Number(item._originalCount) || 1,
            specs: originalItem.specs || item.specs || JSON.parse(item._originalSpecs || '{}') || {},
            subtotal: (Number(item.price) || 0) * (Number(item.quantity) || 1)
          }
        })
      }
      
      // 更新订单存储中的当前订单
      orderStore.currentOrder = updatedOrderData
      
      // 仅保存成功支付的记录用于恢复
      localStorage.setItem('last_successful_payment', JSON.stringify(updatedOrderData))
    } else {
      console.warn('更新订单: 订单商品数据不完整或为空，仅保存基本支付信息', orderData)
      // 至少保存支付基本信息
      localStorage.setItem('last_successful_payment', JSON.stringify(paymentInfo))
    }
  } catch (error) {
    console.error('更新订单存储失败:', error)
  }
  
  // 触发全局支付成功事件
  window.dispatchEvent(new CustomEvent('payment-success', { detail: paymentInfo }))
  
  // 延迟后导航到结果页
  setTimeout(() => {
    if (paymentMethod.value === 'alipay') {
      // 支付宝直接跳转到标准结果页
      router.push({
        path: '/payment/result',
        query: {
          orderNo: orderNo.value,
          amount: amount.value,
          payTime: payTime,
          status: 'success',
          from: 'alipay'
        }
      })
    } else {
      // 微信支付跳转到简化版结果页
      router.push({
        path: '/payment/result-simple',
        query: {
          orderNo: orderNo.value,
          amount: amount.value,
          payTime: payTime,
          status: 'success',
          from: 'wechat'
        }
      })
    }
  }, 1000)
}

// 检查支付状态
const handleCheckStatus = async () => {
  try {
    localLoading.value.status = true
    const result = await paymentStore.manualCheckStatus()
    
    if (result) {
      if (result.status === 'PAID') {
        handlePaymentSuccess(result)
      } else if (result.status === 'UNPAID') {
        ElMessage.info('订单待支付，请完成支付')
      } else if (result.status === 'CLOSED') {
        ElMessage.warning('订单已关闭')
        router.push('/payment/result?status=closed')
      }
    }
  } catch (error) {
    console.error('检查支付状态失败:', error)
    ElMessage.error('检查支付状态失败，请稍后重试')
  } finally {
    localLoading.value.status = false
  }
}

// 启动微信支付逻辑
const startWechatPay = async (url) => {
  isWechatModalVisible.value = true
  
  // 保存当前订单号到会话存储，以便支付完成后使用
  sessionStorage.setItem('current_pay_order_no', orderNo.value)
  
  // 保存重要信息到本地存储，确保支付成功后可以使用
  const paymentData = {
    orderNo: orderNo.value,
    paymentNo: paymentNo.value,
    amount: amount.value,
    method: 'wechat',
    payTime: null,  // 支付成功时会更新
    timestamp: new Date().getTime()
  }
  localStorage.setItem('current_payment_data', JSON.stringify(paymentData))
  
  // 开始轮询支付状态
  paymentStore.startPolling()
  
  // 生成二维码
  await nextTick()
  if (qrCodeRef.value) {
    // 清除之前的二维码
    qrCodeRef.value.innerHTML = ''
    new QRCode(qrCodeRef.value, {
      text: url,
      width: 200,
      height: 200
    })
  }

  // 4秒后自动进入支付成功状态
  setTimeout(() => {
    handlePaymentSuccess({
      status: 'PAID',
      paidAt: new Date().toISOString()
    })
  }, 4000)
}

// 处理在支付流程中取消
const cancelPayment = () => {
  isWechatModalVisible.value = false
  paymentStore.clearPolling()
  
  // 导航到简化版结果页，标记为取消
  router.push({
    path: '/payment/result-simple',
    query: {
      orderNo: orderNo.value,
      amount: amount.value,
      status: 'cancelled',
      from: 'wechat'
    }
  })
}
</script>

<style lang="scss" scoped>
@use '../style/payment.scss' as *;

.payment-container {
  max-width: 600px;
  margin: 20px auto;
  
  .payment-card {
    border-radius: 8px;
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      h2 {
        margin: 0;
        color: #333;
      }
      
      .amount {
        font-size: 20px;
        font-weight: bold;
        color: #FF5000;
      }
    }
    
    .payment-methods {
      margin-bottom: 20px;
      
      h3 {
        margin-top: 0;
        margin-bottom: 15px;
        font-size: 16px;
        color: #666;
      }
      
      .method-list {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
    }
    
    .check-status {
      margin-top: 20px;
    }
  }
}
</style> 