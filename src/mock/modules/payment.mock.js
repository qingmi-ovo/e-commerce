import { mock } from 'mockjs'
import Mock from 'mockjs'
import { param2Obj } from '../../common/utils/format'

// 生成随机的支付单号
const generatePaymentNo = () => {
  return 'PAY' + Mock.mock('@integer(10000000, 99999999)') + Mock.mock('@integer(1000, 9999)')
}

// 生成随机的微信支付二维码URL
const generateWeChatQRCode = () => {
  return `https://api.weixin.qq.com/pay/qrcode/${Mock.mock('@guid')}`
}

// 生成随机的支付宝跳转链接
const generateAlipayURL = () => {
  return `https://openapi.alipay.com/gateway.do?${Mock.mock('@guid')}`
}

// 生成随机二维码图片URL
const generateQRCodeImage = () => {
  return Mock.mock('@image("200x200", "#4A7BF7", "支付二维码")')
}

// Mock API数据
const mockData = {
  // 支付方式列表
  methods: [
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
      description: '使用支付宝扫码支付'
    },
    {
      id: 'bank',
      name: '银行卡',
      icon: 'credit-card',
      description: '使用储蓄卡或信用卡支付'
    }
  ],
  
  // 支付状态列表
  statuses: {
    'UNPAID': '待支付',
    'PAID': '已支付',
    'REFUNDING': '退款中',
    'REFUNDED': '已退款',
    'CLOSED': '已关闭'
  },
  
  // 模拟的支付记录，用于存储创建的支付
  payments: []
}

// 支付创建接口 - 符合要求的简化版本
Mock.mock('/payment/create', 'post', function(options) {
  console.log('Mock: 收到创建支付请求', options)
  
  let body = {}
  try {
    body = JSON.parse(options.body || '{}')
  } catch (e) {
    console.error('Mock: 解析请求体失败', e)
    body = {}
  }
  
  const method = body.method || 'wechat'
  const orderNo = body.orderNo || Mock.mock('@string("number", 10)')
  
  console.log('Mock: 创建支付参数', {method, orderNo})
  
  // 生成支付信息
  const paymentNo = generatePaymentNo()
  const amount = Mock.mock('@float(100, 5000, 2, 2)')
  
  // 不同支付方式的特定数据
  let qrcode = generateQRCodeImage()
  let redirectUrl = null
  
  if (method === 'wechat') {
    qrcode = generateWeChatQRCode()
  } else if (method === 'alipay') {
    redirectUrl = generateAlipayURL()
  }
  
  // 存储支付记录（用于状态查询）
  const payment = {
    paymentNo,
    orderNo,
    method,
    amount,
    status: 'UNPAID',
    createTime: new Date().toISOString()
  }
  
  mockData.payments.push(payment)
  console.log('Mock: 已保存支付记录', payment)
  
  // 根据要求的格式返回数据
  const response = {
    code: 200,
    msg: '创建支付成功',
    data: {
      no: paymentNo,
      method: method,
      qrcode: qrcode,
      redirectUrl: redirectUrl,
      amount: amount,
      orderNo: orderNo
    }
  }
  
  console.log('Mock: 返回支付创建响应', response)
  return response
})

// 支付状态接口 - 符合要求的简化版本
Mock.mock(/\/payment\/status\/[A-Za-z0-9]+/, 'get', function(options) {
  console.log('Mock: 收到支付状态查询请求', options)
  
  // 从URL提取支付单号
  const match = options.url.match(/\/payment\/status\/([^/]+)/)
  if (!match) {
    console.error('Mock: 无法从URL中提取支付单号', options.url)
    return {
      code: 400,
      msg: '支付单号格式错误',
      data: null
    }
  }
  
  const paymentNo = match[1]
  console.log('Mock: 查询支付单号', paymentNo)
  
  // 查找支付记录
  const payment = mockData.payments.find(p => p.paymentNo === paymentNo)
  
  if (!payment) {
    console.log('Mock: 未找到支付记录，使用模拟数据')
  }
  
  const paymentData = payment || {
    paymentNo,
    orderNo: `ORD${Date.now()}`,
    status: Mock.mock('@pick(["UNPAID", "PAID", "CLOSED"])'),
    amount: Mock.mock('@float(100, 5000, 2, 2)'),
    createTime: Mock.mock('@datetime("yyyy-MM-dd HH:mm:ss")'),
    payTime: null
  }
  
  // 模拟支付状态变化 - 增大成功概率并添加详细日志
  if (paymentData.status === 'UNPAID') {
    // 增加成功概率到25%，并增加随着时间推移增加成功率的逻辑
    // 检查是否有 X-Payment-Query-Count 头，如果有则累加查询次数
    let queryCount = 1
    if (options.headers && options.headers['X-Payment-Query-Count']) {
      queryCount = parseInt(options.headers['X-Payment-Query-Count']) + 1
    }
    
    // 随着查询次数增加，支付成功概率提高
    // 从第3次查询开始，成功概率每次增加5%
    let successRate = 0.25
    if (queryCount >= 3) {
      successRate += (queryCount - 2) * 0.05
      // 最高成功概率为80%
      if (successRate > 0.8) successRate = 0.8
    }
    
    console.log(`Mock: 模拟支付状态变化 (查询次数: ${queryCount}, 成功概率: ${successRate * 100}%)`)
    
    if (Math.random() < successRate) {
      paymentData.status = 'PAID'
      paymentData.payTime = new Date().toISOString()
      
      // 如果是存储的支付记录，更新其状态
      if (payment) {
        payment.status = 'PAID'
        payment.payTime = paymentData.payTime
      }
      
      console.log('Mock: 模拟支付成功，状态已更新')
    } else {
      console.log('Mock: 保持未支付状态')
    }
  }
  
  // 按照要求格式返回数据
  const response = {
    code: 200,
    msg: '查询成功',
    data: {
      status: paymentData.status,
      statusText: mockData.statuses[paymentData.status],
      paidAt: paymentData.payTime || null,
      orderNo: paymentData.orderNo,
      paymentNo: paymentData.paymentNo,
      amount: paymentData.amount
    }
  }
  
  console.log('Mock: 返回支付状态查询响应', response)
  return response
})

// 获取支付方式接口 - 保留原有实现
Mock.mock('/payment/methods', 'get', function() {
  return {
    code: 200,
    msg: '获取成功',
    data: mockData.methods
  }
})

// 保持兼容原有的导出格式，以防有其他地方引用
export default [
  // 创建支付
  {
    url: '/payment/create',
    method: 'post',
    response: (request) => {
      const { orderNo, method } = request.body
      
      if (!orderNo || !method) {
        return {
          code: 400,
          msg: '缺少订单号或支付方式',
          data: null
        }
      }
      
      // 检查支付方式是否有效
      const paymentMethod = mockData.methods.find(m => m.id === method)
      if (!paymentMethod) {
        return {
          code: 400,
          msg: '无效的支付方式',
          data: null
        }
      }
      
      // 生成支付信息
      const paymentNo = generatePaymentNo()
      const payment = {
        paymentNo,
        orderNo,
        method,
        amount: Mock.mock('@float(100, 5000, 2, 2)'),
        status: 'UNPAID',
        createTime: new Date().toISOString()
      }
      
      // 存储支付记录
      mockData.payments.push(payment)
      
      // 根据支付方式返回不同的结果
      let result = null
      if (method === 'wechat') {
        result = {
          paymentNo,
          qrCodeUrl: generateWeChatQRCode(),
          expiresIn: 1800 // 30分钟过期
        }
      } else if (method === 'alipay') {
        result = {
          paymentNo,
          redirectUrl: generateAlipayURL(),
          expiresIn: 1800 // 30分钟过期
        }
      } else {
        result = {
          paymentNo,
          redirectUrl: `/payment/gateway/${method}/${paymentNo}`,
          expiresIn: 1800 // 30分钟过期
        }
      }
      
      return {
        code: 200,
        msg: '创建支付成功',
        data: result
      }
    }
  },
  
  // 查询支付状态
  {
    url: /\/payment\/status\/([^/]+)/,
    method: 'get',
    response: (request) => {
      const paymentNo = request.url.match(/\/payment\/status\/([^/]+)/)[1]
      
      if (!paymentNo) {
        return {
          code: 400,
          msg: '缺少支付单号',
          data: null
        }
      }
      
      // 查找支付记录
      const payment = mockData.payments.find(p => p.paymentNo === paymentNo)
      
      // 即使找不到支付记录，也返回一个模拟数据，而不是404错误
      const paymentData = payment || {
        paymentNo,
        orderNo: `ORD${Date.now()}`,
        status: 'UNPAID',
        method: 'wechat',
        amount: 999.99,
        createTime: new Date().toISOString(),
        payTime: null
      }
      
      // 模拟支付状态变化 (有10%的概率支付成功)
      if (paymentData.status === 'UNPAID' && Math.random() < 0.1) {
        paymentData.status = 'PAID'
        paymentData.payTime = new Date().toISOString()
        
        // 如果存在原始支付记录，也更新它
        if (payment) {
          payment.status = 'PAID'
          payment.payTime = paymentData.payTime
        }
      }
      
      return {
        code: 200,
        msg: '查询成功',
        data: {
          paymentNo: paymentData.paymentNo,
          orderNo: paymentData.orderNo,
          status: paymentData.status,
          statusText: mockData.statuses[paymentData.status],
          method: paymentData.method,
          amount: paymentData.amount,
          createTime: paymentData.createTime,
          payTime: paymentData.payTime || null
        }
      }
    }
  },
  
  // 获取支付方式
  {
    url: '/payment/methods',
    method: 'get',
    response: () => {
      return {
        code: 200,
        msg: '获取成功',
        data: mockData.methods
      }
    }
  }
] 