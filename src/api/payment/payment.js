import request from '../../common/utils/request'

/**
 * 通用请求错误处理
 * @param {Error} error - 错误对象
 * @param {string} message - 自定义错误消息
 * @returns {Promise} - 返回被拒绝的Promise
 */
const handleRequestError = (error, message = '网络异常') => {
  console.error(`${message}:`, error)
  
  // 获取更详细的错误信息
  let errorMsg = message
  if (error && error.message) {
    errorMsg = `${message}: ${error.message}`
  }
  
  // 返回统一格式的错误对象
  return Promise.resolve({ 
    code: 500, 
    msg: errorMsg,
    success: false,
    data: null 
  })
}

/**
 * 支付API服务
 */
export const paymentAPI = {
  /**
   * 发起支付
   * @param {string} orderNo - 订单号
   * @param {string} method - 支付方式（如：wechat, alipay）
   * @returns {Promise} - 微信支付返回模拟二维码URL，支付宝支付返回跳转链接
   */
  createPayment: (orderNo, method) => request({
    url: '/payment/create',
    method: 'post',
    data: { orderNo, method },
    mock: true
  }).catch(error => handleRequestError(error, '创建支付失败')),

  /**
   * 查询支付状态
   * @param {string} paymentNo - 支付单号
   * @returns {Promise} - 返回支付状态信息
   */
  checkStatus: (paymentNo) => request({
    url: `/payment/status/${paymentNo}`,
    mock: true
  }).catch(error => handleRequestError(error, '查询支付状态失败')),

  /**
   * 获取支付方式
   * @returns {Promise} - 返回可用的支付方式列表
   */
  getMethods: () => request({
    url: '/payment/methods',
    mock: true
  }).catch(error => handleRequestError(error, '获取支付方式失败'))
} 