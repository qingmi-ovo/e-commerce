import { defineStore } from 'pinia'
import { ref, reactive, watch } from 'vue'
import { paymentAPI } from '../../../api/payment/payment'

// 创建自定义事件总线，用于跨组件通信
const paymentEventBus = new EventTarget()

/**
 * 支付模块状态管理
 */
export const usePaymentStore = defineStore('payment', () => {
  // 从localStorage获取持久化数据
  const getLocalData = (key, defaultValue = null) => {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : defaultValue
    } catch (error) {
      console.error(`读取本地存储的${key}失败:`, error)
      return defaultValue
    }
  }

  // 状态定义
  const paymentMethods = ref(getLocalData('paymentMethods', []))
  const currentPayment = ref(getLocalData('currentPayment', null))
  const paymentStatus = ref(getLocalData('paymentStatus', ''))
  
  // 轮询状态管理
  const statusPolling = ref(null) // 轮询定时器引用
  const pollingCount = ref(0) // 轮询次数计数
  const pollingMaxRetries = 60 // 最大轮询次数 (3秒轮询，最多3分钟)
  
  // 错误状态管理
  const error = ref(null)
  const loading = ref({
    methods: false,
    payment: false,
    status: false
  })
  
  // 添加模拟支付成功标志
  const simulateSuccessfulPayment = true // 设置为true表示始终模拟支付成功
  
  // 数据持久化
  watch(paymentMethods, (newValue) => {
    localStorage.setItem('paymentMethods', JSON.stringify(newValue))
  }, { deep: true })
  
  watch(currentPayment, (newValue) => {
    localStorage.setItem('currentPayment', JSON.stringify(newValue))
  }, { deep: true })
  
  watch(paymentStatus, (newValue) => {
    localStorage.setItem('paymentStatus', JSON.stringify(newValue))
  })
  
  /**
   * 设置错误状态
   * @param {string} message - 错误消息
   * @param {Error} [originalError] - 原始错误对象
   */
  const setError = (message, originalError = null) => {
    if (originalError) {
      console.error(message, originalError)
    }
    error.value = { message, timestamp: new Date().getTime() }
    // 3秒后自动清除错误
    setTimeout(() => {
      if (error.value && error.value.timestamp === error.value.timestamp) {
        error.value = null
      }
    }, 3000)
  }
  
  /**
   * 清除错误状态
   */
  const clearError = () => {
    error.value = null
  }
  
  /**
   * 获取支付方式列表
   * @returns {Promise<boolean>} - 是否成功
   */
  const fetchPaymentMethods = async () => {
    loading.value.methods = true
    clearError()
    
    try {
      const res = await paymentAPI.getMethods()
      if (res.code === 200) {
        paymentMethods.value = res.data
        return true
      } else {
        setError(res.msg || '获取支付方式失败')
        return false
      }
    } catch (error) {
      setError('获取支付方式失败', error)
      return false
    } finally {
      loading.value.methods = false
    }
  }
  
  /**
   * 初始化支付
   * @param {string} orderNo - 订单号
   * @param {string} method - 支付方式
   * @param {number} [amount] - 支付金额（可选）
   * @returns {Promise<object|null>} - 支付数据或null
   */
  const initPayment = async (orderNo, method, amount) => {
    console.log('开始初始化支付:', { orderNo, method, amount })
    
    if (!orderNo) {
      setError('订单号不能为空')
      return null
    }
    
    if (!method) {
      setError('支付方式不能为空')
      return null
    }
    
    loading.value.payment = true
    clearError()
    
    try {
      // 清除之前的轮询
      clearPolling()
      
      // 构建支付请求参数
      const paymentParams = { 
        orderNo, 
        method,
      }
      
      // 如果提供了金额，添加到请求参数中
      if (amount && !isNaN(parseFloat(amount))) {
        paymentParams.amount = parseFloat(amount)
      } else {
        // 如果没有提供金额，尝试从localStorage获取
        const savedAmount = localStorage.getItem('last_order_amount')
        if (savedAmount && !isNaN(parseFloat(savedAmount))) {
          paymentParams.amount = parseFloat(savedAmount)
        }
      }
      
      console.log('创建支付请求:', paymentParams)
      const res = await paymentAPI.createPayment(orderNo, method)
      console.log('创建支付响应:', res)
      
      if (res.code === 200 && res.data) {
        // 适配新的Mock数据格式
        const paymentData = {
          paymentNo: res.data.no || res.data.paymentNo || `PAY${Date.now()}`,
          orderNo,
          method,
          amount: paymentParams.amount || res.data.amount || 0,
          qrCodeUrl: method === 'wechat' ? (res.data.qrcode || res.data.qrCodeUrl) : null,
          redirectUrl: method === 'alipay' ? (res.data.redirectUrl || res.data.url) : null,
          expiresIn: res.data.expiresIn || 1800,
          createTime: new Date().toISOString()
        }
        
        console.log('格式化后的支付数据:', paymentData)
        
        currentPayment.value = paymentData
        paymentStatus.value = 'UNPAID'
        pollingCount.value = 0
        
        // 启动轮询检查支付状态
        startPolling()
        
        return paymentData
      } else {
        const errorMessage = res.msg || '创建支付失败'
        console.error('创建支付失败:', errorMessage)
        setError(errorMessage)
        return null
      }
    } catch (error) {
      console.error('创建支付请求异常:', error)
      setError('创建支付失败', error)
      return null
    } finally {
      loading.value.payment = false
    }
  }
  
  /**
   * 创建支付
   * @param {Object} params - 支付参数
   * @param {string} params.orderNo - 订单号
   * @param {string} params.method - 支付方式
   * @param {string} params.returnUrl - 支付成功后的回调URL
   * @returns {Promise<object>} - 支付响应数据
   */
  const createPayment = async (params) => {
    console.log('创建支付:', params)
    
    if (!params.orderNo) {
      return { success: false, message: '订单号不能为空' }
    }
    
    if (!params.method) {
      return { success: false, message: '支付方式不能为空' }
    }
    
    loading.value.payment = true
    clearError()
    
    try {
      // 清除之前的轮询
      clearPolling()
      
      // 调用支付API
      const res = await paymentAPI.createPayment(params.orderNo, params.method)
      console.log('创建支付响应:', res)
      
      if (res.code === 200 && res.data) {
        // 格式化支付数据
        const paymentData = {
          paymentNo: res.data.no || res.data.paymentNo || `PAY${Date.now()}`,
          orderNo: params.orderNo,
          method: params.method,
          amount: res.data.amount || 0,
          payUrl: params.method === 'wechat' 
            ? (res.data.qrcode || res.data.qrCodeUrl) 
            : (res.data.redirectUrl || res.data.url),
          expiresIn: res.data.expiresIn || 1800,
          createTime: new Date().toISOString()
        }
        
        console.log('格式化后的支付数据:', paymentData)
        
        currentPayment.value = {
          ...paymentData,
          status: 'UNPAID'
        }
        
        paymentStatus.value = 'UNPAID'
        pollingCount.value = 0
        
        return { 
          success: true, 
          data: {
            paymentNo: paymentData.paymentNo,
            orderNo: paymentData.orderNo,
            amount: paymentData.amount,
            payUrl: paymentData.payUrl
          }
        }
      } else {
        const errorMessage = res.msg || '创建支付失败'
        console.error('创建支付失败:', errorMessage)
        setError(errorMessage)
        return { success: false, message: errorMessage }
      }
    } catch (error) {
      console.error('创建支付请求异常:', error)
      const errorMessage = error?.message || '创建支付时发生错误'
      setError(errorMessage, error)
      return { success: false, message: errorMessage }
    } finally {
      loading.value.payment = false
    }
  }
  
  /**
   * 开始轮询检查支付状态
   */
  const startPolling = () => {
    if (!currentPayment.value || !currentPayment.value.paymentNo) {
      console.error('无法启动轮询：缺少支付信息')
      return
    }
    
    // 清除已有的轮询
    clearPolling()
    
    // 重置轮询计数
    pollingCount.value = 0
    
    // 设置3秒轮询间隔
    statusPolling.value = setInterval(async () => {
      try {
        pollingCount.value++
        
        // 如果超过最大重试次数，停止轮询
        if (pollingCount.value > pollingMaxRetries) {
          console.log('支付状态轮询超时，停止轮询')
          clearPolling()
          return
        }
        
        // 添加错误捕获，确保单次轮询失败不会中断整个轮询过程
        try {
          await checkPaymentStatus()
        } catch (innerError) {
          console.error('本次轮询检查失败，将在下次继续尝试:', innerError)
        }
      } catch (error) {
        console.error('轮询检查支付状态失败:', error)
        // 出错时不立即停止轮询，给几次重试机会
        if (pollingCount.value > 5) {
          clearPolling()
        }
      }
    }, 3000)
    
    // 防止页面关闭时轮询未清除，在beforeunload事件中清除轮询
    window.addEventListener('beforeunload', clearPolling)
  }
  
  /**
   * 检查支付状态
   * @param {string} [paymentId] - 支付单号（可选，不提供则使用当前支付）
   * @returns {Promise<object|null>} - 支付状态数据或null
   */
  const checkPaymentStatus = async (paymentId) => {
    // 使用提供的paymentId或当前支付单号
    const paymentNo = paymentId || (currentPayment.value ? currentPayment.value.paymentNo : null)
    
    if (!paymentNo) return null
    
    loading.value.status = true
    
    try {
      const res = await paymentAPI.checkStatus(paymentNo)
      
      // 处理API错误响应
      if (!res || res.code !== 200) {
        console.error('检查支付状态失败:', res ? res.msg : '无响应')
        
        // 创建一个默认的响应对象，确保轮询可以继续
        return {
          paymentNo: paymentNo,
          orderNo: currentPayment.value ? currentPayment.value.orderNo : '',
          status: 'UNPAID',
          statusText: '待支付',
          method: currentPayment.value ? currentPayment.value.method : '',
          amount: currentPayment.value ? currentPayment.value.amount : 0,
          createTime: currentPayment.value ? currentPayment.value.createTime : new Date().toISOString(),
          payTime: null
        };
      }
      
      // 获取基础状态数据
      let statusData = {
        paymentNo: res.data.paymentNo || paymentNo,
        orderNo: res.data.orderNo || (currentPayment.value ? currentPayment.value.orderNo : ''),
        status: res.data.status,
        statusText: res.data.statusText,
        method: currentPayment.value ? currentPayment.value.method : '',
        amount: res.data.amount || (currentPayment.value ? currentPayment.value.amount : 0),
        createTime: currentPayment.value ? currentPayment.value.createTime : new Date().toISOString(),
        payTime: res.data.paidAt || null
      }
      
      // 如果设置了模拟支付成功标志，并且状态是UNPAID，则模拟支付成功
      if (simulateSuccessfulPayment && statusData.status === 'UNPAID' && pollingCount.value >= 3) {
        statusData.status = 'PAID'
        statusData.statusText = '支付成功'
        statusData.payTime = new Date().toISOString()
        console.log('模拟支付成功:', statusData)
      }

      // 更新支付状态
      paymentStatus.value = statusData.status
      
      // 如果支付成功或退款或关闭，停止轮询
      if (['PAID', 'REFUNDED', 'CLOSED'].includes(statusData.status)) {
        clearPolling()
        
        // 支付成功时，触发全局事件和执行后续逻辑
        if (statusData.status === 'PAID') {
          console.log('支付成功，触发支付成功事件')
          
          // 1. 保存成功支付信息到localStorage，确保可以在不同页面获取
          const paymentData = {
            paymentNo: statusData.paymentNo,
            orderNo: statusData.orderNo,
            amount: statusData.amount,
            method: statusData.method,
            payTime: statusData.payTime,
            timestamp: new Date().getTime()
          }
          localStorage.setItem('last_successful_payment', JSON.stringify(paymentData))
          
          // 1.1 尝试同时更新订单存储中的数据
          try {
            const orderStoreModule = await import('../../order/store/useOrderStore')
            if (orderStoreModule) {
              const orderStore = orderStoreModule.useOrderStore()
              if (orderStore && statusData.orderNo) {
                // 获取当前订单信息
                const orderData = await orderStore.getOrderDetail(statusData.orderNo)
                if (orderData) {
                  console.log('支付成功后已获取并更新订单信息:', orderData.orderNo)
                }
              }
            }
          } catch (err) {
            console.warn('更新订单存储数据失败:', err)
          }
          
          // 2. 触发全局支付成功事件
          const paymentSuccessEvent = new CustomEvent('payment:success', { 
            detail: statusData 
          })
          paymentEventBus.dispatchEvent(paymentSuccessEvent)
          
          // 3. 可以考虑调用外部提供的回调函数（如果有的话）
          if (window.onPaymentSuccess && typeof window.onPaymentSuccess === 'function') {
            try {
              window.onPaymentSuccess(statusData)
            } catch (e) {
              console.error('执行外部支付成功回调出错:', e)
            }
          }
        }
      }
      
      return statusData
    } catch (error) {
      console.error('检查支付状态请求失败:', error)
      
      // 即使出错也返回一个默认状态，确保轮询可以继续
      return {
        paymentNo: paymentNo,
        orderNo: currentPayment.value ? currentPayment.value.orderNo : '',
        status: 'UNPAID',
        statusText: '待支付',
        method: currentPayment.value ? currentPayment.value.method : '',
        amount: currentPayment.value ? currentPayment.value.amount : 0,
        createTime: currentPayment.value ? currentPayment.value.createTime : new Date().toISOString(),
        payTime: null
      };
    } finally {
      loading.value.status = false;
    }
  }
  
  /**
   * 手动检查支付状态（用于用户手动刷新）
   * @returns {Promise<object|null>} - 支付状态数据或null
   */
  const manualCheckStatus = async () => {
    clearError()
    return await checkPaymentStatus()
  }
  
  /**
   * 清除轮询定时器
   */
  const clearPolling = () => {
    if (statusPolling.value) {
      clearInterval(statusPolling.value)
      statusPolling.value = null
    }
    
    // 移除beforeunload事件监听
    window.removeEventListener('beforeunload', clearPolling)
  }
  
  /**
   * 重置支付状态
   */
  const resetPayment = () => {
    clearPolling()
    currentPayment.value = null
    paymentStatus.value = ''
    
    // 清除本地存储
    localStorage.removeItem('currentPayment')
    localStorage.removeItem('paymentStatus')
  }
  
  /**
   * 订阅支付成功事件
   * @param {Function} callback - 事件回调函数
   * @returns {Function} - 取消订阅的函数
   */
  const onPaymentSuccess = (callback) => {
    if (typeof callback !== 'function') {
      console.error('onPaymentSuccess: 回调必须是函数')
      return () => {}
    }
    
    const handler = (event) => {
      callback(event.detail)
    }
    
    paymentEventBus.addEventListener('payment:success', handler)
    
    // 返回取消订阅的函数
    return () => {
      paymentEventBus.removeEventListener('payment:success', handler)
    }
  }
  
  return { 
    // 状态
    paymentMethods,
    currentPayment,
    paymentStatus,
    error,
    loading,
    
    // 方法
    fetchPaymentMethods,
    initPayment,
    createPayment,
    checkPaymentStatus,
    manualCheckStatus,
    startPolling,
    clearPolling,
    resetPayment,
    setError,
    clearError,
    onPaymentSuccess
  }
})

// 导出事件总线，便于外部直接使用
export const paymentEvents = paymentEventBus 