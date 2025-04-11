<template>
  <div class="order-detail-container">
    <el-breadcrumb separator="/">
      <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
      <el-breadcrumb-item :to="{ path: '/profile' }">个人中心</el-breadcrumb-item>
      <el-breadcrumb-item>订单详情</el-breadcrumb-item>
    </el-breadcrumb>
    
    <h2 class="page-title">订单详情</h2>
    
    <!-- 加载中状态 -->
    <el-skeleton :rows="10" animated v-if="loading" />
    
    <!-- 订单不存在 -->
    <el-empty v-else-if="!order" description="订单不存在或已被删除">
      <template #extra>
        <el-button type="primary" @click="$router.push('/profile')">返回个人中心</el-button>
      </template>
    </el-empty>
    
    <!-- 订单详情内容 -->
    <template v-else>
      <!-- 订单状态 -->
      <el-card class="status-card" shadow="hover">
        <div class="status-header">
          <div class="status-info">
            <h3>订单状态：<span class="status-text">{{ orderStatusText[order.status] }}</span></h3>
            <p class="order-number">订单编号：{{ order.orderNo }}</p>
            <p class="order-time">下单时间：{{ formatDate(order.createdAt) }}</p>
          </div>
          
          <div class="status-actions" v-if="canPerformActions">
            <!-- 待付款状态显示取消订单按钮 -->
            <template v-if="order.status === 1">
              <el-button 
                type="danger" 
                plain 
                size="small" 
                @click="handleCancelOrder"
                :loading="actionLoading"
              >
                取消订单
              </el-button>
              <el-button 
                type="primary" 
                size="small" 
                @click="handlePay"
              >
                去支付
              </el-button>
            </template>
            
            <!-- 待收货状态显示确认收货按钮 -->
            <template v-else-if="order.status === 3">
              <div class="receipt-countdown" v-if="receiptCountdown > 0">
                自动确认收货倒计时: {{ formatCountdown(receiptCountdown) }}
                <el-button 
                  plain
                  type="primary"
                  size="small" 
                  @click="extendReceiptTime"
                  class="extend-btn"
                >
                  延长收货
                </el-button>
              </div>
              <el-button 
                type="primary" 
                size="small" 
                @click="handleConfirmReceipt"
                :loading="actionLoading"
              >
                确认收货
              </el-button>
            </template>
            
            <!-- 已完成状态显示评价按钮 -->
            <template v-else-if="order.status === 4">
              <el-button 
                v-if="!order.isReviewed" 
                type="primary" 
                plain 
                size="small" 
                @click="goToReview"
              >
                评价商品
              </el-button>
              <el-tag v-else type="success" size="small">已评价</el-tag>
            </template>
          </div>
        </div>
        
        <!-- 订单状态步骤条 -->
        <el-steps :active="statusStepMap[order.status]" finish-status="success" class="status-steps">
          <el-step title="已提交" :description="formatDate(order.createdAt)" />
          <el-step title="已支付" :description="order.payTime ? formatDate(order.payTime) : ''" />
          <el-step title="已发货" :description="order.shipTime ? formatDate(order.shipTime) : ''" />
          <el-step title="已完成" :description="order.completeTime ? formatDate(order.completeTime) : ''" />
        </el-steps>
      </el-card>
      
      <!-- 收货信息 -->
      <el-card class="detail-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>收货信息</span>
          </div>
        </template>
        <div class="address-info">
          <p><span class="label">收货人：</span>{{ order.consignee }}</p>
          <p><span class="label">联系电话：</span>{{ order.mobile }}</p>
          <p><span class="label">收货地址：</span>{{ order.address }}</p>
        </div>
      </el-card>
      
      <!-- 物流信息 -->
      <el-card v-if="order.status >= 2" class="detail-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>物流信息</span>
          </div>
        </template>
        <div class="logistics-info">
          <div class="logistics-header">
            <p><span class="label">物流公司：</span>{{ logistics.company }}</p>
            <p>
              <span class="label">物流单号：</span>
              <span class="tracking-number">{{ logistics.number }}</span>
              <el-button plain size="small" type="primary" @click="copyTrackingNumber">复制</el-button>
            </p>
          </div>
          
          <div class="logistics-timeline">
            <el-timeline>
              <el-timeline-item
                v-for="(step, index) in logistics.steps"
                :key="index"
                :timestamp="step.time"
                :type="index === 0 ? 'primary' : ''"
              >
                {{ step.content }}
              </el-timeline-item>
            </el-timeline>
          </div>
        </div>
      </el-card>
      
      <!-- 商品信息 -->
      <el-card class="detail-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>商品信息</span>
          </div>
        </template>
        <div class="goods-list">
          <div class="goods-header">
            <span class="col-product">商品</span>
            <span class="col-price">单价</span>
            <span class="col-quantity">数量</span>
            <span class="col-subtotal">小计</span>
          </div>
          
          <div 
            v-for="item in order.items"
            :key="item.skuId"
            class="goods-item"
          >
            <div class="col-product">
              <div class="product-info">
                <img :src="item.goodsCover" :alt="item.goodsName" class="product-image" />
                <div class="product-detail">
                  <h4 class="product-title">{{ item.goodsName }}</h4>
                  <p class="product-specs">
                    <span v-for="(value, key) in formatItemSpecs(item.specs)" :key="key" class="spec-tag">
                      {{ key }}: {{ value }}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            
            <div class="col-price">
              <span class="price">¥{{ formatItemPrice(item) }}</span>
            </div>
            
            <div class="col-quantity">
              <span class="quantity">{{ formatItemQuantity(item) }}</span>
            </div>
            
            <div class="col-subtotal">
              <span class="subtotal">¥{{ calcItemSubtotal(item) }}</span>
            </div>
            
            <!-- 评价按钮（仅已完成订单显示） -->
            <div class="col-actions" v-if="order.status === 4">
              <el-button 
                v-if="!item.isReviewed" 
                type="primary" 
                plain 
                size="small" 
                @click="goToReviewItem(item.skuId)"
              >
                评价
              </el-button>
              <el-tag v-else type="success" size="small">已评价</el-tag>
            </div>
          </div>
        </div>
      </el-card>
      
      <!-- 订单金额信息 -->
      <el-card class="detail-card payment-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>付款信息</span>
          </div>
        </template>
        <div class="payment-info">
          <div class="payment-list">
            <div class="payment-item">
              <span class="label">商品总价：</span>
              <span class="value">¥{{ formatOrderAmount(order.totalAmount) }}</span>
            </div>
            <div class="payment-item">
              <span class="label">运费：</span>
              <span class="value">+¥{{ formatOrderAmount(order.shippingFee) }}</span>
            </div>
            <div class="payment-item">
              <span class="label">优惠：</span>
              <span class="value">-¥{{ formatOrderAmount(order.discountAmount) }}</span>
            </div>
            <div class="payment-item total">
              <span class="label">实付款：</span>
              <span class="value">¥{{ formatOrderAmount(order.paymentAmount) }}</span>
            </div>
          </div>
          
          <div class="payment-method" v-if="order.status >= 2">
            <div class="method-item">
              <span class="label">支付方式：</span>
              <span class="value">{{ paymentMethods[order.paymentMethod] || '未知' }}</span>
            </div>
            <div class="method-item" v-if="order.payTime">
              <span class="label">支付时间：</span>
              <span class="value">{{ formatDate(order.payTime) }}</span>
            </div>
          </div>
        </div>
      </el-card>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useOrderStore } from '../store/useOrderStore'
import { orderAPI } from '../../../api/order/order'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const orderStore = useOrderStore()

// 状态
const loading = ref(false)
const actionLoading = ref(false)
const order = ref(null)
const orderNo = ref('')
const receiptCountdown = ref(0)
const countdownTimer = ref(null)


// 订单状态对应的步骤索引映射
const statusStepMap = {
  1: 1, // 待付款：已提交
  2: 2, // 待发货：已支付
  3: 3, // 待收货：已发货
  4: 4, // 已完成：全部完成
  5: 1, // 已取消：停留在已提交
  6: 2  // 已关闭：停留在已支付
}

// 支付方式映射
const paymentMethods = {
  1: '支付宝',
  2: '微信支付',
  3: '银行卡',
  4: '花呗'
}

// 模拟物流轨迹数据
const mockLogisticsSteps = [
  {
    time: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm'),
    content: '您的订单已签收，签收人：本人，感谢您使用顺丰快递'
  },
  {
    time: dayjs().subtract(6, 'hour').format('YYYY-MM-DD HH:mm'),
    content: '您的订单正在派送中，快递员：张师傅，联系电话：138****8888'
  },
  {
    time: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm'),
    content: '您的订单已到达【杭州西湖区转运中心】'
  },
  {
    time: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm'),
    content: '您的订单已从【上海转运中心】发出'
  },
  {
    time: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm'),
    content: '顺丰快递已收取您的订单'
  }
]

// 物流信息
const logistics = computed(() => {
  // 如果已有订单中的物流信息，则直接使用
  if (order.value?.logistics?.company && order.value?.logistics?.number) {
    return {
      company: order.value.logistics.company,
      number: order.value.logistics.number,
      steps: order.value.logistics.steps || mockLogisticsSteps
    }
  }
  
  // 否则使用模拟数据
  return {
    company: '顺丰快递',
    number: 'SF' + Math.floor(100000000 + Math.random() * 900000000),
    steps: mockLogisticsSteps
  }
})

// 当前用户是否可以操作订单
const canPerformActions = computed(() => {
  if (!order.value) return false
  return [1, 3, 4].includes(order.value.status) // 待付款、待收货、已完成状态可操作
})

// 获取订单状态文本
const orderStatusText = {
  1: '待付款',
  2: '待发货',
  3: '待收货',
  4: '已完成',
  5: '已取消',
  6: '已关闭'
}

// 时间格式化
const formatDate = (date) => {
  if (!date) return '暂无'
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

// 规格格式化，处理不同格式的规格数据
const formatItemSpecs = (specs) => {
  if (!specs) return {}
  
  const formattedSpecs = {}
  
  try {
    // 如果是字符串，尝试解析为对象
    if (typeof specs === 'string') {
      try {
        specs = JSON.parse(specs);
      } catch (e) {
        return { '规格': specs };
      }
    }
    
    // 如果有备份的规格信息，尝试使用
    if (specs._originalSpecs) {
      try {
        const originalSpecs = JSON.parse(specs._originalSpecs);
        specs = originalSpecs;
      } catch (e) {
        // 解析失败时继续使用原始数据
      }
    }
    
    // 遍历规格
    for (const [key, value] of Object.entries(specs)) {
      // 跳过内部调试字段
      if (key.startsWith('_')) continue;
      
      if (value === null || value === undefined) {
        continue; // 跳过空值
      }
      
      if (typeof value === 'object') {
        // 处理包含 label 和 value 的复杂规格对象 {颜色: {label: '红色', value: 'red'}}
        if (value.label) {
          formattedSpecs[key] = value.label;
        } else if (value.value) {
          formattedSpecs[key] = value.value;
        } else if (value.name) { // 有些数据可能使用name作为显示字段
          formattedSpecs[key] = value.name;
        } else {
          // 其他复杂对象，尝试获取其第一个非对象属性作为显示值
          const firstValue = Object.values(value).find(v => typeof v !== 'object');
          if (firstValue) {
            formattedSpecs[key] = firstValue;
          } else {
            formattedSpecs[key] = JSON.stringify(value);
          }
        }
      } else {
        // 处理简单的键值对 {颜色: '红色'}
        formattedSpecs[key] = value;
      }
    }
    
    return formattedSpecs;
  } catch (error) {
    return { '错误': '规格格式化失败' };
  }
}

// 商品价格格式化
const formatItemPrice = (item) => {
  // 先尝试从price字段获取
  let price = item.price;
  
  // 如果没有或值非法，尝试其他可能的字段
  if (price === undefined || price === null || isNaN(Number(price))) {
    price = item.unitPrice || item.salePrice || item._originalPrice || 0;
  }
  
  // 确保是数字
  price = Number(price);
  
  return price.toFixed(2);
}

// 订单金额格式化
const formatOrderAmount = (amount) => {
  // 处理可能的非数字或undefined值
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return '0.00';
  }
  
  // 确保是数字
  const numAmount = Number(amount);
  return numAmount.toFixed(2);
}

// 商品数量格式化
const formatItemQuantity = (item) => {
  // 尝试不同的数量字段名
  let quantity = item.quantity || item.count || item.num || item._originalCount || 1;
  
  // 确保是数字
  quantity = Number(quantity);
  
  return quantity;
}

// 计算商品小计
const calcItemSubtotal = (item) => {
  const price = Number(formatItemPrice(item));
  const quantity = Number(formatItemQuantity(item));
  return (price * quantity).toFixed(2);
}

// 倒计时格式化（转为天时分秒）
const formatCountdown = (seconds) => {
  const days = Math.floor(seconds / (3600 * 24))
  const hours = Math.floor((seconds % (3600 * 24)) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  return `${days}天${hours}小时${minutes}分${secs}秒`
}

// 复制物流单号
const copyTrackingNumber = () => {
  navigator.clipboard.writeText(logistics.value.number)
    .then(() => {
      ElMessage.success('物流单号已复制到剪贴板')
    })
    .catch(() => {
      ElMessage.error('复制失败，请手动复制')
    })
}

// 延长收货时间
const extendReceiptTime = () => {
  receiptCountdown.value += 3 * 24 * 3600 // 延长3天
  ElMessage.success('已延长收货时间3天')
}

// 开始收货倒计时
const startReceiptCountdown = () => {
  // 默认7天自动收货
  receiptCountdown.value = 7 * 24 * 3600
  
  // 如果已经有发货时间，则根据发货时间计算剩余收货时间
  if (order.value && order.value.shipTime) {
    const shipTime = dayjs(order.value.shipTime)
    const autoReceiptTime = shipTime.add(7, 'day')
    const now = dayjs()
    
    if (autoReceiptTime.isAfter(now)) {
      receiptCountdown.value = autoReceiptTime.diff(now, 'second')
    } else {
      receiptCountdown.value = 0 // 已过期
    }
  }
  
  // 启动倒计时
  countdownTimer.value = setInterval(() => {
    if (receiptCountdown.value > 0) {
      receiptCountdown.value--
    } else {
      clearInterval(countdownTimer.value)
    }
  }, 1000)
}

// 获取订单详情
const getOrderDetail = async () => {
  if (!orderNo.value) {
    ElMessage.warning('订单号不能为空')
    router.push('/profile')
    return
  }
  
  loading.value = true
  
  try {
    // 从API获取订单详情
    const result = await orderStore.getOrderDetail(orderNo.value)
    
    if (result) {
      // 将API返回的订单详情同步到本地
      order.value = orderStore.currentOrder
      
      // 确保订单数据完整性
      if (order.value) {
        // 检查并修复商品信息
        order.value.items = order.value.items.map(item => ({
          ...item,
          skuId: item.skuId,
          goodsId: item.goodsId,
          goodsName: item.goodsName || item.title,
          goodsCover: item.goodsCover || item.cover || item.imageUrl,
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          specs: item.specs || {},
          subtotal: (Number(item.price) || 0) * (Number(item.quantity) || 1)
        }))
        
        // 确保金额信息完整性
        order.value.totalAmount = Number(order.value.totalAmount) || 0
        order.value.paymentAmount = Number(order.value.paymentAmount) || 0
        order.value.shippingFee = Number(order.value.shippingFee) || 0
        order.value.discountAmount = Number(order.value.discountAmount) || 0
      }
      
      // 加载物流信息
      if (order.value.status >= 2) {
        loadLogisticsInfo(orderNo.value)
      }
      
      // 如果订单状态为已发货，开始收货倒计时
      if (order.value.status === 3 && order.value.shipTime) {
        startReceiptCountdown()
      }
    } else {
      ElMessage.warning('未找到对应订单，请稍后再试')
      router.push('/profile')
      return
    }
  } catch (error) {
    ElMessage.error('获取订单详情失败，请稍后再试')
    router.push('/profile')
    return
  } finally {
    loading.value = false
  }
}

// 加载物流信息
const loadLogisticsInfo = async (orderNo) => {
  try {
    const res = await orderAPI.fetchLogistics(orderNo)
    if (res && res.data) {
      // 更新订单中的物流信息
      if (!order.value.logistics) {
        order.value.logistics = {}
      }
      order.value.logistics.company = res.data.company
      order.value.logistics.number = res.data.number
      order.value.logistics.steps = res.data.steps
      
      // 更新订单存储
      orderStore.currentOrder = { ...orderStore.currentOrder, logistics: order.value.logistics }
    }
  } catch (error) {
    ElMessage.warning('加载物流信息失败，显示模拟数据')
  }
}

// 取消订单
const handleCancelOrder = async () => {
  if (!order.value || order.value.status !== 1) return
  
  try {
    await ElMessageBox.confirm(
      '确定要取消该订单吗？',
      '取消订单',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    actionLoading.value = true
    
    try {
      // 尝试通过API取消订单
      await orderStore.cancelOrder(order.value.orderNo)
      
      // 更新本地订单状态
      order.value.status = 5 // 已取消
      order.value.closeTime = new Date().toISOString()
      
      ElMessage.success('订单已取消')
    } catch (apiError) {
      console.error('取消订单失败:', apiError)
      
      // API调用失败时，执行本地取消
      try {
        const result = await ElMessageBox.confirm(
          '网络连接失败，是否继续在本地取消订单？（注意：可能需要稍后再次同步）',
          '网络错误',
          {
            confirmButtonText: '继续取消',
            cancelButtonText: '取消操作',
            type: 'warning'
          }
        )
        
        // 手动更新本地状态
        order.value.status = 5 // 已取消
        order.value.closeTime = new Date().toISOString()
        
        // 更新订单存储
        orderStore.currentOrder = { ...order.value }
        
        ElMessage({
          type: 'success',
          message: '已在本地取消订单（离线模式）',
          duration: 5000
        })
      } catch (e) {
        // 用户取消了操作
        ElMessage.info('已取消操作')
      }
    } finally {
      actionLoading.value = false
    }
  } catch (e) {
    // 用户取消确认
  }
}

// 确认收货
const handleConfirmReceipt = async () => {
  if (!order.value || order.value.status !== 3) return
  
  try {
    await ElMessageBox.confirm(
      '确认已收到商品吗？',
      '确认收货',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    actionLoading.value = true
    
    try {
      // 尝试通过API确认收货
      await orderStore.confirmReceipt(order.value.orderNo)
      
      // 更新本地订单状态
      order.value.status = 4 // 已完成
      order.value.completeTime = new Date().toISOString()
      
      // 清除倒计时
      clearInterval(countdownTimer.value)
      receiptCountdown.value = 0
      
      ElMessage.success('已确认收货')
    } catch (apiError) {
      console.error('确认收货失败:', apiError)
      
      // API调用失败时，执行本地确认收货
      try {
        const result = await ElMessageBox.confirm(
          '网络连接失败，是否继续在本地确认收货？（注意：可能需要稍后再次同步）',
          '网络错误',
          {
            confirmButtonText: '继续确认',
            cancelButtonText: '取消操作',
            type: 'warning'
          }
        )
        
        // 手动更新本地状态
        order.value.status = 4 // 已完成
        order.value.completeTime = new Date().toISOString()
        
        // 更新订单存储
        orderStore.currentOrder = { ...order.value }
        
        // 清除倒计时
        clearInterval(countdownTimer.value)
        receiptCountdown.value = 0
        
        ElMessage({
          type: 'success',
          message: '已在本地确认收货（离线模式）',
          duration: 5000
        })
      } catch (e) {
        // 用户取消了操作
        ElMessage.info('已取消操作')
      }
    } finally {
      actionLoading.value = false
    }
  } catch (e) {
    // 用户取消确认
  }
}

// 去支付
const handlePay = () => {
  if (!order.value || order.value.status !== 1) return
  
  router.push({
    path: '/payment/pay',
    query: {
      orderNo: order.value.orderNo,
      amount: order.value.paymentAmount.toString(),
      from: 'order_detail'
    }
  })
}

// 跳转到评价页面
const goToReview = () => {
  ElMessage.info('评价功能正在开发中...')
  // 实际项目中可以跳转到评价页面
  // router.push(`/review/order/${order.value.orderNo}`)
}

// 评价单个商品
const goToReviewItem = (skuId) => {
  ElMessage.info('评价功能正在开发中...')
  // 实际项目中可以跳转到单品评价页面
  // router.push(`/review/item/${skuId}?orderNo=${order.value.orderNo}`)
}

// 生命周期钩子
onMounted(() => {
  // 从路由参数中获取订单号
  const urlOrderNo = route.query.orderNo
  if (urlOrderNo) {
    orderNo.value = urlOrderNo
  } else {
    // 如果URL中没有订单号，尝试从localStorage获取
    const savedOrderNo = localStorage.getItem('last_order_no')
    if (savedOrderNo) {
      orderNo.value = savedOrderNo
    } else {
      ElMessage.warning('未找到订单信息')
      router.push('/profile')
      return
    }
  }
  
  // 获取订单详情
  getOrderDetail()
})

onUnmounted(() => {
  // 清除倒计时
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
    countdownTimer.value = null
  }
})
</script>

<style lang="scss" scoped>
.order-detail-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  
  .page-title {
    margin: 20px 0;
    font-size: 24px;
    font-weight: 500;
    color: #333;
  }
  
  .status-card,
  .detail-card {
    margin-bottom: 20px;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 16px;
      font-weight: 500;
    }
  }
  
  .status-card {
    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      
      .status-info {
        h3 {
          margin: 0 0 10px;
          font-size: 18px;
          font-weight: 500;
          
          .status-text {
            color: #ff5000;
          }
        }
        
        .order-number,
        .order-time {
          margin: 5px 0;
          font-size: 14px;
          color: #666;
        }
      }
      
      .status-actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
        
        .receipt-countdown {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
          
          .extend-btn {
            padding: 4px 8px;
            margin-left: 5px;
            border: none;
            background: transparent;
            
            &:hover {
              background-color: rgba(64, 158, 255, 0.1);
            }
          }
        }
      }
    }
    
    .status-steps {
      margin-top: 20px;
    }
  }
  
  .address-info,
  .logistics-info {
    p {
      margin: 10px 0;
      color: #333;
      
      .label {
        color: #999;
        display: inline-block;
        width: 80px;
      }
      
      .tracking-number {
        font-weight: 500;
      }
      
      .el-button.is-plain {
        padding: 4px 8px;
        margin-left: 5px;
        border: none;
        background: transparent;
        
        &:hover {
          background-color: rgba(64, 158, 255, 0.1);
        }
      }
    }
  }
  
  .logistics-info {
    .logistics-header {
      margin-bottom: 20px;
    }
    
    .logistics-timeline {
      padding-left: 10px;
    }
  }
  
  .goods-list {
    .goods-header {
      display: flex;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
      font-weight: 500;
      color: #666;
      
      .col-product {
        flex: 3;
      }
      
      .col-price,
      .col-quantity,
      .col-subtotal,
      .col-actions {
        flex: 1;
        text-align: center;
      }
    }
    
    .goods-item {
      display: flex;
      padding: 15px 0;
      border-bottom: 1px solid #eee;
      
      .col-product {
        flex: 3;
        
        .product-info {
          display: flex;
          
          .product-image {
            width: 80px;
            height: 80px;
            object-fit: cover;
            margin-right: 15px;
            border: 1px solid #eee;
          }
          
          .product-detail {
            .product-title {
              margin: 0 0 10px;
              font-size: 14px;
              font-weight: normal;
              color: #333;
              line-height: 1.4;
            }
            
            .product-specs {
              font-size: 12px;
              color: #999;
              margin: 8px 0;
              
              .spec-tag {
                display: inline-block;
                margin-right: 10px;
                margin-bottom: 5px;
                background-color: #f5f7fa;
                padding: 2px 8px;
                border-radius: 4px;
                color: #666;
              }
            }
          }
        }
      }
      
      .col-price,
      .col-quantity,
      .col-subtotal,
      .col-actions {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      
      .col-subtotal {
        .subtotal {
          color: #ff5000;
          font-weight: 500;
        }
      }
    }
  }
  
  .payment-card {
    .payment-info {
      display: flex;
      justify-content: space-between;
      
      .payment-list {
        flex: 2;
        
        .payment-item {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 10px;
          
          .label {
            font-size: 14px;
            color: #666;
            padding-right: 20px;
          }
          
          .value {
            font-size: 14px;
            color: #333;
            min-width: 100px;
            text-align: right;
          }
          
          &.total {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #eee;
            
            .label {
              font-size: 16px;
              font-weight: 500;
              color: #333;
            }
            
            .value {
              font-size: 20px;
              font-weight: 500;
              color: #ff5000;
            }
          }
        }
      }
      
      .payment-method {
        flex: 3;
        border-left: 1px solid #eee;
        padding-left: 20px;
        
        .method-item {
          margin-bottom: 10px;
          
          .label {
            font-size: 14px;
            color: #666;
            display: inline-block;
            width: 80px;
          }
          
          .value {
            font-size: 14px;
            color: #333;
          }
        }
      }
    }
  }
}

// 响应式布局
@media (max-width: 768px) {
  .order-detail-container {
    padding: 10px;
    
    .status-card {
      .status-header {
        flex-direction: column;
        
        .status-actions {
          width: 100%;
          flex-direction: row;
          justify-content: space-between;
          margin-top: 15px;
        }
      }
    }
    
    .payment-card {
      .payment-info {
        flex-direction: column;
        
        .payment-method {
          border-left: none;
          border-top: 1px solid #eee;
          padding-left: 0;
          padding-top: 15px;
          margin-top: 15px;
        }
      }
    }
    
    .goods-list {
      .goods-item {
        flex-wrap: wrap;
        
        .col-product {
          flex: 1 0 100%;
          margin-bottom: 15px;
        }
        
        .col-price,
        .col-quantity,
        .col-subtotal {
          flex: 1;
        }
        
        .col-actions {
          flex: 1 0 100%;
          justify-content: flex-end;
          margin-top: 10px;
        }
      }
    }
  }
}
</style>
