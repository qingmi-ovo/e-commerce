import dayjs from 'dayjs'
import { nanoid } from 'nanoid'
import Mock from 'mockjs'

// 订单状态枚举
const OrderStatus = {
  PENDING_PAYMENT: 1, // 待付款
  PENDING_SHIPMENT: 2, // 待发货
  PENDING_RECEIPT: 3, // 待收货
  COMPLETED: 4, // 已完成
  CANCELLED: 5, // 已取消
  CLOSED: 6, // 已关闭
}

// 支付方式枚举
const PaymentMethod = {
  ALIPAY: 1, // 支付宝
  WECHAT: 2, // 微信支付
  CREDIT_CARD: 3, // 信用卡
  DEBIT_CARD: 4, // 借记卡
}

// 模拟订单列表数据
const ordersMock = Mock.mock({
  'orders|15': [{
    orderNo: () => `ORD${dayjs().format('YYYYMMDD')}${nanoid(8).toUpperCase()}`,
    'status|1': Object.values(OrderStatus),
    totalAmount: () => Mock.Random.float(50, 10000, 2, 2),
    totalQuantity: () => Mock.Random.integer(1, 10),
    paymentAmount: function() { 
      // 支付金额 = 总金额 - 优惠金额
      return (this.totalAmount - this.discountAmount).toFixed(2)
    },
    discountAmount: () => Mock.Random.float(0, 100, 2, 2),
    shippingFee: () => Mock.Random.float(0, 20, 2, 2),
    'paymentMethod|1': Object.values(PaymentMethod),
    consignee: '@cname',
    mobile: /^1[3-9]\d{9}$/,
    address: '@province @city @county @ctitle(10, 30)',
    zipCode: /^\d{6}$/,
    createdAt: '@datetime("yyyy-MM-dd HH:mm:ss")',
    payTime: function() {
      // 只有已支付的订单才有支付时间
      if (this.status > OrderStatus.PENDING_PAYMENT) {
        return dayjs(this.createdAt).add(Mock.Random.integer(5, 30), 'minute').format('YYYY-MM-DD HH:mm:ss')
      }
      return null
    },
    shipTime: function() {
      // 只有已发货的订单才有发货时间
      if (this.status >= OrderStatus.PENDING_RECEIPT) {
        return dayjs(this.payTime).add(Mock.Random.integer(1, 2), 'day').format('YYYY-MM-DD HH:mm:ss')
      }
      return null
    },
    completeTime: function() {
      // 只有已完成的订单才有完成时间
      if (this.status === OrderStatus.COMPLETED) {
        return dayjs(this.shipTime).add(Mock.Random.integer(1, 5), 'day').format('YYYY-MM-DD HH:mm:ss')
      }
      return null
    },
    closeTime: function() {
      // 只有已取消/已关闭的订单才有关闭时间
      if (this.status === OrderStatus.CANCELLED || this.status === OrderStatus.CLOSED) {
        return dayjs(this.createdAt).add(Mock.Random.integer(1, 60), 'minute').format('YYYY-MM-DD HH:mm:ss')
      }
      return null
    },
    remark: '@cparagraph(1, 3)',
    'items|1-5': [{
      skuId: () => nanoid(),
      goodsId: () => nanoid(),
      goodsName: '@ctitle(5, 20)',
      goodsCover: '@image("200x200", "#3498db", "#fff", "商品")',
      quantity: () => Mock.Random.integer(1, 5),
      price: () => Mock.Random.float(10, 2000, 2, 2),
      specs: () => {
        const specCount = Mock.Random.integer(1, 3)
        const specs = {}
        
        for (let i = 0; i < specCount; i++) {
          // 根据索引选择不同的规格名
          let specName = ''
          if (i === 0) specName = '颜色'
          else if (i === 1) specName = '尺寸'
          else specName = '版本'
          
          let specValue = ''
          if (specName === '颜色') {
            specValue = Mock.Random.pick(['红色', '蓝色', '黑色', '白色', '粉色', '灰色'])
          } else if (specName === '尺寸') {
            specValue = Mock.Random.pick(['S', 'M', 'L', 'XL', 'XXL', '均码'])
          } else {
            specValue = Mock.Random.pick(['标准版', '豪华版', '限定版', '纪念版'])
          }
          
          specs[specName] = specValue
        }
        
        return specs
      }
    }]
  }]
})

// 深拷贝订单列表，避免修改原始模拟数据
let orders = JSON.parse(JSON.stringify(ordersMock.orders))

// 按照时间排序，最新的订单在前面
orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

// 生成订单详情响应
const generateOrderDetail = (orderNo) => {
  // 查找对应订单
  const order = orders.find(item => item.orderNo === orderNo)
  
  if (!order) {
    return {
      code: 404,
      message: '订单不存在',
      data: null
    }
  }
  
  // 添加物流信息
  let logisticsInfo = null;
  if (order.status >= OrderStatus.PENDING_SHIPMENT) {
    logisticsInfo = {
      company: Mock.Random.pick(['顺丰快递', '中通快递', '圆通快递', '韵达快递', '申通快递']),
      number: `SF${Mock.mock('@string("number", 10)')}`,
      status: order.status >= OrderStatus.COMPLETED ? 4 : order.status,
      traces: []
    }
    
    // 根据订单状态生成物流跟踪记录
    if (order.status >= OrderStatus.PENDING_RECEIPT) {
      // 已发货
      logisticsInfo.traces.push({
        time: order.shipTime,
        content: '您的订单已由【配送中心】发出，正在配送中'
      })
      
      // 在途
      if (order.status >= OrderStatus.PENDING_RECEIPT) {
        const enRouteTime = dayjs(order.shipTime).add(1, 'day').format('YYYY-MM-DD HH:mm:ss')
        logisticsInfo.traces.push({
          time: enRouteTime, 
          content: '您的订单已到达【配送城市转运中心】'
        })
      }
      
      // 派送中
      if (order.status >= OrderStatus.PENDING_RECEIPT && 
          (order.status === OrderStatus.COMPLETED || Math.random() > 0.3)) {
        const deliveryTime = dayjs(order.shipTime).add(2, 'day').format('YYYY-MM-DD HH:mm:ss')
        logisticsInfo.traces.push({
          time: deliveryTime,
          content: `您的订单已由快递员【${Mock.Random.cname()}】接收，正在为您派送`
        })
      }
      
      // 已签收
      if (order.status === OrderStatus.COMPLETED) {
        logisticsInfo.traces.push({
          time: order.completeTime,
          content: '您的订单已签收，感谢您使用我们的服务'
        })
      }
      
      // 按时间倒序排列
      logisticsInfo.traces.sort((a, b) => new Date(b.time) - new Date(a.time))
    }
  }
  
  const orderDetail = {
    ...order,
    logistics: logisticsInfo
  }
  
  return {
    code: 200,
    message: 'success',
    data: orderDetail
  }
}

// 生成订单列表响应
const generateOrderList = (params) => {
  const { pageSize = 10, pageNum = 1, status } = params
  
  // 筛选出符合状态条件的订单
  let filteredOrders = orders
  if (status) {
    filteredOrders = orders.filter(order => order.status === parseInt(status))
  }
  
  // 计算分页信息
  const start = (pageNum - 1) * pageSize
  const end = start + pageSize
  const records = filteredOrders.slice(start, end)
  
  return {
    code: 200,
    message: 'success',
    data: {
      totalCount: filteredOrders.length,
      pageSize: parseInt(pageSize),
      pageNum: parseInt(pageNum),
      records
    }
  }
}

// 创建订单响应
const createOrder = (data) => {
  const { items, address, addressId } = data
  
  // 检查必要参数
  if (!items || !items.length) {
    return {
      code: 400,
      message: '参数错误：缺少商品信息',
      data: null
    }
  }
  
  if (!address && !addressId) {
    return {
      code: 400,
      message: '参数错误：缺少收货地址',
      data: null
    }
  }
  
  // 模拟创建新订单
  const newOrder = Mock.mock({
    orderNo: `ORD${dayjs().format('YYYYMMDD')}${nanoid(8).toUpperCase()}`,
    status: OrderStatus.PENDING_PAYMENT,
    totalAmount: () => {
      // 计算总金额
      return items.reduce((sum, item) => sum + (item.price || 99) * item.count, 0).toFixed(2)
    },
    totalQuantity: () => items.reduce((sum, item) => sum + item.count, 0),
    paymentAmount: function() { 
      // 支付金额 = 总金额 - 优惠金额 + 运费
      return (parseFloat(this.totalAmount) - this.discountAmount + this.shippingFee).toFixed(2)
    },
    discountAmount: () => Mock.Random.float(0, 100, 2, 2),
    shippingFee: () => Mock.Random.float(0, 20, 2, 2),
    paymentMethod: null, // 尚未支付
    consignee: address?.name || '@cname',
    mobile: address?.phone || /^1[3-9]\d{9}$/,
    address: address ? `${address.province} ${address.city} ${address.district} ${address.address}` : '@province @city @county @ctitle(10, 30)',
    zipCode: /^\d{6}$/,
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    payTime: null,
    shipTime: null,
    completeTime: null,
    closeTime: null,
    remark: '',
    items: items.map(item => ({
      skuId: item.skuId,
      goodsId: nanoid(), // 模拟商品ID
      goodsName: Mock.Random.ctitle(5, 20),
      goodsCover: Mock.Random.image('200x200', '#3498db', '#fff', '商品'),
      quantity: item.count,
      price: item.price || Mock.Random.float(10, 2000, 2, 2),
      specs: (() => {
        const specs = {}
        specs['颜色'] = Mock.Random.pick(['红色', '蓝色', '黑色', '白色', '粉色', '灰色'])
        specs['尺寸'] = Mock.Random.pick(['S', 'M', 'L', 'XL', 'XXL', '均码'])
        return specs
      })()
    }))
  })
  
  // 将新订单添加到订单列表
  orders.unshift(newOrder)
  
  return {
    code: 200,
    message: 'success',
    data: {
      orderNo: newOrder.orderNo,
      createTime: newOrder.createdAt,
      totalAmount: newOrder.totalAmount,
      paymentAmount: newOrder.paymentAmount,
      status: newOrder.status,
      items: newOrder.items.map(item => ({
        skuId: item.skuId,
        title: item.goodsName,
        price: item.price,
        count: item.quantity,
        cover: item.goodsCover
      }))
    }
  }
}

// 取消订单响应
const cancelOrder = (orderNo) => {
  // 查找对应订单
  const orderIndex = orders.findIndex(item => item.orderNo === orderNo)
  
  if (orderIndex === -1) {
    return {
      code: 404,
      message: '订单不存在',
      data: null
    }
  }
  
  const order = orders[orderIndex]
  
  // 只有待付款和待发货的订单可以取消
  if (order.status !== OrderStatus.PENDING_PAYMENT && order.status !== OrderStatus.PENDING_SHIPMENT) {
    return {
      code: 400,
      message: '当前订单状态不可取消',
      data: null
    }
  }
  
  // 更新订单状态为已取消
  order.status = OrderStatus.CANCELLED
  order.closeTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
  
  return {
    code: 200,
    message: 'success',
    data: null
  }
}

// 确认收货响应
const confirmReceipt = (orderNo) => {
  // 查找对应订单
  const orderIndex = orders.findIndex(item => item.orderNo === orderNo)
  
  if (orderIndex === -1) {
    return {
      code: 404,
      message: '订单不存在',
      data: null
    }
  }
  
  const order = orders[orderIndex]
  
  // 只有待收货的订单可以确认收货
  if (order.status !== OrderStatus.PENDING_RECEIPT) {
    return {
      code: 400,
      message: '当前订单状态不可确认收货',
      data: null
    }
  }
  
  // 更新订单状态为已完成
  order.status = OrderStatus.COMPLETED
  order.completeTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
  
  return {
    code: 200,
    message: 'success',
    data: null
  }
}

// 定义订单模块的Mock接口
export default [
  // 创建订单 - mock前缀路径
  {
    url: '/mock/order/create',
    method: 'post',
    response: ({ body }) => createOrder(body)
  },
  
  // 创建订单 - 直接路径
  {
    url: '/order/create',
    method: 'post',
    response: ({ body }) => createOrder(body)
  },
  
  // 获取订单详情
  {
    url: '/mock/order/detail/:orderNo',
    method: 'get',
    response: ({ params }) => generateOrderDetail(params.orderNo)
  },
  
  // 兼容简单请求格式的订单创建接口
  {
    url: '/order/create',
    method: 'post',
    response: () => {
      return {
        code: 200,
        data: {
          orderNo: Mock.mock('@string("number", 15)'),
          createTime: Mock.mock('@datetime'),
          totalAmount: Mock.mock('@float(100,5000,2,2)'),
          status: 1, // 1-待支付 2-已支付 3-已发货 4-已完成
          items: [{
            skuId: Mock.mock('@id'),
            title: Mock.mock('@ctitle'),
            price: Mock.mock('@float(10,1000,2,2)'),
            count: Mock.mock('@integer(1,5)'),
            cover: Mock.mock('@image("100x100")')
          }]
        }
      }
    }
  },
  
  // 兼容简单请求格式的订单详情接口
  {
    url: /\/order\/detail\/\d+/,
    method: 'get',
    response: (options) => {
      const status = options.url.split('/').pop() % 4 + 1
      return { 
        code: 200,
        data: {
          orderNo: Mock.mock('@string("number", 15)'),
          createTime: Mock.mock('@datetime'),
          totalAmount: Mock.mock('@float(100,5000,2,2)'),
          status,
          paymentAmount: Mock.mock('@float(100,5000,2,2)'),
          discountAmount: Mock.mock('@float(0,100,2,2)'),
          shippingFee: Mock.mock('@float(0,20,2,2)'),
          consignee: Mock.mock('@cname'),
          mobile: Mock.mock(/^1[3-9]\d{9}$/),
          address: Mock.mock('@province @city @county @ctitle(10, 30)'),
          items: [
            {
              skuId: Mock.mock('@id'),
              goodsName: Mock.mock('@ctitle'),
              price: Mock.mock('@float(10,1000,2,2)'),
              quantity: Mock.mock('@integer(1,5)'),
              goodsCover: Mock.mock('@image("100x100")')
            }
          ],
          logistics: {
            company: ['顺丰快递','中通快递','圆通快递'][status % 3],
            number: 'SF' + Mock.mock('@string("number", 10)')
          }
        }
      }
    }
  },
  
  // 获取订单列表
  {
    url: '/mock/order/list',
    method: 'get',
    response: ({ query }) => generateOrderList(query)
  },
  
  // 取消订单
  {
    url: '/mock/order/cancel/:orderNo',
    method: 'post',
    response: ({ params }) => cancelOrder(params.orderNo)
  },
  
  // 确认收货
  {
    url: '/mock/order/confirm/:orderNo',
    method: 'post',
    response: ({ params }) => confirmReceipt(params.orderNo)
  }
] 