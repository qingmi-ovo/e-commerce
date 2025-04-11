// 处理支付结果
const handlePayResult = (result) => {
  if (result.success) {
    // 支付成功
    ElMessage.success('支付成功')
    // 跳转到订单列表
    router.push('/order/list')
  } else {
    // 支付失败
    ElMessage.error(result.message || '支付失败，请重试')
  }
}

// 处理支付错误
const handlePayError = (error) => {
  ElMessage.error(error.message || '支付出错，请重试')
}

// 处理支付取消
const handlePayCancel = () => {
  ElMessage.warning('支付已取消')
}

// 处理支付超时
const handlePayTimeout = () => {
  ElMessage.warning('支付超时，请重试')
}

// 处理支付异常
const handlePayException = (error) => {
  ElMessage.error(error.message || '支付异常，请重试')
}

// 处理支付关闭
const handlePayClose = () => {
  ElMessage.warning('支付已关闭')
}

// 处理支付中断
const handlePayInterrupt = () => {
  ElMessage.warning('支付已中断')
}

// 处理支付重试
const handlePayRetry = () => {
  ElMessage.warning('支付重试中')
}

// 处理支付等待
const handlePayWaiting = () => {
  ElMessage.warning('等待支付结果')
}

// 处理支付验证
const handlePayVerify = () => {
  ElMessage.warning('正在验证支付结果')
}

// 处理支付回调
const handlePayCallback = (result) => {
  if (result.success) {
    ElMessage.success('支付成功')
    router.push('/order/list')
  } else {
    ElMessage.error(result.message || '支付失败，请重试')
  }
}

// 处理支付通知
const handlePayNotify = (result) => {
  if (result.success) {
    ElMessage.success('支付成功')
    router.push('/order/list')
  } else {
    ElMessage.error(result.message || '支付失败，请重试')
  }
}

// 处理支付状态
const handlePayStatus = (status) => {
  switch (status) {
    case 'success':
      ElMessage.success('支付成功')
      router.push('/order/list')
      break
    case 'fail':
      ElMessage.error('支付失败，请重试')
      break
    case 'cancel':
      ElMessage.warning('支付已取消')
      break
    case 'timeout':
      ElMessage.warning('支付超时，请重试')
      break
    case 'exception':
      ElMessage.error('支付异常，请重试')
      break
    case 'close':
      ElMessage.warning('支付已关闭')
      break
    case 'interrupt':
      ElMessage.warning('支付已中断')
      break
    case 'retry':
      ElMessage.warning('支付重试中')
      break
    case 'waiting':
      ElMessage.warning('等待支付结果')
      break
    case 'verify':
      ElMessage.warning('正在验证支付结果')
      break
    default:
      ElMessage.warning('未知支付状态')
  }
} 