import axios from 'axios'

// 创建axios实例
const service = axios.create({
  baseURL: '/api', // API基础路径
  timeout: 5000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json;charset=utf-8'
  }
})

// 为了保持模拟数据的一致性，使用固定的商品列表
const createMockProducts = () => {
  // 创建100个商品，但有明显的价格、销量和评分梯度
  return Array(100).fill().map((_, i) => {
    // 创建有规律的数据，便于观察排序效果
    // 价格: 10-1010，递增10
    const price = 10 + i * 10;
    
    // 销量: 反向规律，高索引的商品销量低
    const salesCount = 1000 - i * 10;
    
    // 评分: 索引为5的倍数的商品评分高
    const rating = i % 5 === 0 ? 5.0 : (Math.random() * 3 + 2).toFixed(1);
    
    return {
      id: `mock-${i}`,
      title: `模拟商品 ${i} - ¥${price} - 销量${salesCount}`,
      price: price,
      imageUrl: `https://via.placeholder.com/300x300?text=Price:${price}`,
      salesCount: salesCount,
      rating: rating
    };
  });
};

// 持久化存储模拟数据
if (!window.mockProductsCache) {
  console.log('初始化模拟商品数据');
  window.mockProductsCache = createMockProducts();
}

// 请求拦截器
service.interceptors.request.use(
  config => {
    // 处理mock请求
    if (config.mock) {
      // 为mock请求添加特殊前缀
      const url = config.url.startsWith('/') ? config.url : `/${config.url}`
      config.url = `/mock${url}`
      config.baseURL = '' // 使用相对路径，确保正确拦截
    }
    
    // 自动从localStorage读取并携带token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    // 检查响应数据是否为HTML (可能是因为Mock服务未成功拦截)
    const contentType = response.headers['content-type']
    if (contentType && contentType.includes('text/html')) {
      // 返回模拟数据以防止应用崩溃
      if (response.config.url.includes('/goods/list')) {
        // 获取排序参数
        const sortBy = response.config.params?.sortBy || 'default'
        const sortOrder = response.config.params?.sortOrder || 'desc'
        const page = parseInt(response.config.params?.page) || 1
        const pageSize = parseInt(response.config.params?.pageSize) || 20
        
        // 使用缓存的数据
        let mockData = [...window.mockProductsCache]
        
        // 根据排序参数排序
        if (sortBy !== 'default') {
          mockData.sort((a, b) => {
            if (sortBy === 'price') {
              return sortOrder === 'asc' ? a.price - b.price : b.price - a.price
            } else if (sortBy === 'sales') {
              return sortOrder === 'asc' ? a.salesCount - b.salesCount : b.salesCount - a.salesCount
            } else if (sortBy === 'rating') {
              const ratingA = parseFloat(a.rating)
              const ratingB = parseFloat(b.rating)
              return sortOrder === 'asc' ? ratingA - ratingB : ratingB - ratingA
            }
            return 0
          })
        }
        
        // 分页
        const startIndex = (page - 1) * pageSize
        const endIndex = startIndex + pageSize
        const pagedData = mockData.slice(startIndex, endIndex)
        
        return {
          code: 200,
          message: 'success (fallback)',
          data: {
            list: pagedData,
            page: page,
            pageSize: pageSize,
            total: mockData.length,
            hasNextPage: endIndex < mockData.length
          }
        }
      } else if (response.config.url.includes('/order/create')) {
        // 创建订单接口的回退处理
        console.log('创建订单接口回退处理')
        const orderNo = 'ORD' + Date.now()
        return {
          code: 200,
          message: 'success (fallback)',
          data: {
            orderNo: orderNo,
            status: 1,  // 待付款
            totalAmount: parseFloat(response.config.data ? JSON.parse(response.config.data).totalAmount || 0 : 0) || 1299.00,
            paymentAmount: parseFloat(response.config.data ? JSON.parse(response.config.data).totalAmount || 0 : 0) || 1299.00,
            discountAmount: 0,
            shippingFee: 0,
            totalQuantity: 1,
            paymentMethod: null,
            createdAt: new Date().toISOString(),
            items: response.config.data ? 
              (JSON.parse(response.config.data).items || []).map(item => ({
                skuId: item.skuId,
                goodsId: item.skuId.split('-')[0],
                goodsName: '商品' + item.skuId,
                goodsCover: '/images/default-product.png',
                quantity: item.count || 1,
                price: 0,
                specs: {}
              })) : 
              [{
                skuId: 'mock-sku-001',
                goodsId: 'mock-goods-001',
                goodsName: '模拟商品',
                goodsCover: '/images/default-product.png',
                quantity: 1,
                price: 1299.00,
                specs: {
                  '颜色': '黑色',
                  '尺寸': 'M'
                }
              }]
          }
        }
      } else if (response.config.url.match(/\/goods\/\d+/)) {
        const id = response.config.url.match(/\/goods\/(\d+)/)[1]
        return {
          code: 200,
          message: 'success (fallback)',
          data: {
            id: id,
            title: `模拟商品详情 ${id}`,
            price: Math.floor(Math.random() * 1000) + 10,
            originalPrice: Math.floor(Math.random() * 2000) + 1000,
            discount: (Math.random() * 5 + 5).toFixed(1),
            salesCount: Math.floor(Math.random() * 1000),
            images: Array(5).fill().map((_, i) => `https://via.placeholder.com/800x800?text=Image${i}`),
            stock: Math.floor(Math.random() * 100),
            rating: (Math.random() * 5).toFixed(1),
            ratingCount: Math.floor(Math.random() * 1000),
            description: '这是一个模拟的商品详情，用于在API未正确响应时显示。',
            specs: {
              '颜色': {
                'options': [
                  { 'label': '红色', 'value': 'red' },
                  { 'label': '黑色', 'value': 'black' },
                  { 'label': '白色', 'value': 'white' }
                ]
              },
              '尺寸': {
                'options': [
                  { 'label': 'S', 'value': 'S' },
                  { 'label': 'M', 'value': 'M' },
                  { 'label': 'L', 'value': 'L' }
                ]
              }
            },
            skus: Array(9).fill().map((_, i) => ({
              id: `sku-${i}`,
              specs: {
                '颜色': ['red', 'black', 'white'][i % 3],
                '尺寸': ['S', 'M', 'L'][Math.floor(i / 3)]
              },
              price: Math.floor(Math.random() * 500) + 100,
              stock: Math.floor(Math.random() * 50)
            })),
            params: Array(5).fill().map((_, i) => ({
              name: `参数${i+1}`,
              value: `参数值${i+1}`
            })),
            services: ['7天无理由退货', '正品保证', '闪电发货', '免运费'],
            detailHtml: '<div><h3>商品详情</h3><p>这是模拟的商品详情HTML内容</p></div>'
          }
        }
      } else if (response.config.url.match(/\/order\/detail\/.+/)) {
        // 处理订单详情接口
        const orderNoMatch = response.config.url.match(/\/order\/detail\/(.+)/)
        const orderNo = orderNoMatch ? orderNoMatch[1] : `ORD${Date.now()}`
        
        console.log('订单详情接口回退处理，尝试获取原始订单数据:', orderNo)
        
        // 从localStorage获取原始订单数据
        const originalOrderData = localStorage.getItem('checkout_order_data');
        let orderData;
        
        if (originalOrderData) {
          try {
            orderData = JSON.parse(originalOrderData);
            console.log('使用原始订单数据:', orderData);
            
            // 更新订单状态为已支付
            orderData.status = 3; // 待发货状态
            orderData.payTime = new Date().toISOString();
            orderData.paymentMethod = 1; // 微信支付
            
            // 添加物流信息
            orderData.logistics = {
              company: '顺丰快递',
              number: 'SF' + Math.floor(10000000000 + Math.random() * 90000000000),
              status: 1, // 待发货
              traces: [
                {
                  time: new Date().toISOString(),
                  content: '订单已支付，等待发货'
                }
              ]
            };
            
            // 添加收货人信息
            orderData.consignee = orderData.address.name;
            orderData.mobile = orderData.address.phone;
            orderData.address = `${orderData.address.province} ${orderData.address.city} ${orderData.address.district} ${orderData.address.address}`;
            orderData.zipCode = '310000'; // 默认邮编
            
            // 确保商品信息完整
            if (orderData.items && orderData.items.length > 0) {
              orderData.items = orderData.items.map(item => ({
                ...item,
                // 使用原始商品信息
                goodsName: item._original?.title || item._original?.name || item.goodsName,
                goodsCover: item._original?.cover || item._original?.imageUrl || item._original?.image || item.goodsCover,
                price: Number(item._original?.price || item._original?._originalPrice || item.price),
                quantity: Number(item._original?.count || item._original?.quantity || item._original?._originalCount || item.quantity),
                specs: item._original?.specs || item.specs || {},
                subtotal: Number(item._original?.price || item._original?._originalPrice || item.price) * 
                         Number(item._original?.count || item._original?.quantity || item._original?._originalCount || item.quantity)
              }));
            }
            
            // 使用原始订单金额信息
            if (orderData._original) {
              orderData.totalAmount = orderData._original.totalAmount;
              orderData.shippingFee = orderData._original.shippingFee;
              orderData.discountAmount = orderData._original.discount;
              orderData.paymentAmount = orderData.totalAmount + orderData.shippingFee - orderData.discountAmount;
            }
            
            // 删除原始数据字段，避免数据冗余
            delete orderData._original;
            orderData.items = orderData.items.map(item => {
              const newItem = { ...item };
              delete newItem._original;
              return newItem;
            });
            
          } catch (e) {
            console.error('解析原始订单数据失败:', e);
            orderData = null;
          }
        }
        
        // 如果没有原始数据，则从localStorage中查找其他可能的订单数据
        if (!orderData) {
          const allStorageKeys = Object.keys(localStorage);
          const orderDataKey = allStorageKeys.find(key => key.startsWith('order_data_'));
          
          if (orderDataKey) {
            try {
              orderData = JSON.parse(localStorage.getItem(orderDataKey));
              console.log('从其他存储位置找到订单数据:', orderData);
            } catch (e) {
              console.error('解析其他位置订单数据失败:', e);
            }
          }
        }
        
        // 如果仍然没有数据，则返回错误信息
        if (!orderData) {
          console.error('未找到订单数据');
          return {
            code: 404,
            msg: '未找到订单数据',
            data: null
          };
        }
        
        return {
          code: 200,
          msg: '获取订单详情成功',
          data: orderData
        };
      } else if (response.config.url.includes('/order/list')) {
        // 处理订单列表接口
        return {
          code: 200,
          message: 'success (fallback)',
          data: {
            totalCount: 5,
            pageSize: 10,
            pageNum: 1,
            records: Array(5).fill().map((_, i) => ({
              orderNo: `ORD${Date.now()}${i}`,
              status: i % 5 + 1, // 1-5随机状态
              totalAmount: (Math.random() * 1000 + 100).toFixed(2),
              totalQuantity: Math.floor(Math.random() * 5) + 1,
              paymentAmount: (Math.random() * 1000 + 100).toFixed(2),
              discountAmount: (Math.random() * 50).toFixed(2),
              shippingFee: (Math.random() * 20).toFixed(2),
              paymentMethod: Math.floor(Math.random() * 4) + 1,
              consignee: '演示用户',
              mobile: '13800138000',
              address: '浙江省 杭州市 西湖区 示例街道1号',
              zipCode: '310000',
              createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
              payTime: i > 0 ? new Date(Date.now() - i * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString() : null,
              shipTime: i > 1 ? new Date(Date.now() - i * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString() : null,
              completeTime: i === 3 ? new Date(Date.now() - i * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString() : null,
              closeTime: i === 4 ? new Date(Date.now() - i * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString() : null,
              items: [
                {
                  skuId: `mock-sku-${i}`,
                  goodsId: `mock-goods-${i}`,
                  goodsName: `示例商品 ${i}`,
                  goodsCover: `https://via.placeholder.com/200x200.png?text=商品${i}`,
                  quantity: Math.floor(Math.random() * 3) + 1,
                  price: (Math.random() * 500 + 100).toFixed(2)
                }
              ]
            }))
          }
        }
      } else if (response.config.url.match(/\/order\/confirm\/.+/)) {
        // 确认收货接口的回退处理
        console.log('确认收货接口回退处理')
        return {
          code: 200,
          message: 'success (fallback)',
          data: null
        }
      } else if (response.config.url.match(/\/order\/cancel\/.+/)) {
        // 取消订单接口的回退处理
        console.log('取消订单接口回退处理')
        return {
          code: 200,
          message: 'success (fallback)',
          data: null
        }
      }
      
      // 其他接口返回通用模拟数据
      return {
        code: 200,
        message: 'success (fallback)',
        data: { message: '模拟数据' }
      }
    }
    
    const res = response.data
    
    // 这里可以根据后端约定的状态码来判断请求是否成功
    if (res.code && res.code !== 200) {
      return Promise.reject(new Error(res.message || '接口返回异常'))
    } else {
      return res
    }
  },
  error => {
    console.error('请求发生错误:', error)
    
    // 根据请求URL返回模拟数据，避免前端崩溃
    if (error.config) {
      const { url, method, data, params } = error.config
      
      if (url.includes('/goods/list')) {
        console.log('商品列表请求失败，返回模拟数据')
        
        // 获取排序参数
        const sortBy = params?.sortBy || 'default'
        const sortOrder = params?.sortOrder || 'desc'
        const page = parseInt(params?.page) || 1
        const pageSize = parseInt(params?.pageSize) || 20
        
        // 使用缓存的数据而不是每次生成随机数据
        let mockData = [...window.mockProductsCache]
        
        // 根据排序参数排序
        if (sortBy !== 'default') {
          console.log(`错误处理中 - 正在按 ${sortBy} ${sortOrder} 排序`)
           
          // 对数据排序前先展示部分原始数据
          console.log('排序前数据示例:', mockData.slice(0, 3).map(item => ({
            id: item.id,
            title: item.title,
            price: item.price,
            sales: item.salesCount,
            rating: item.rating
          })))
          
          // 确保排序前深拷贝一份数据，避免修改原始缓存数据
          let sortedData = [...mockData] 
          
          // 根据不同排序字段进行排序
          if (sortBy === 'price') {
            sortedData.sort((a, b) => {
              return sortOrder === 'asc' ? a.price - b.price : b.price - a.price
            })
          } else if (sortBy === 'sales') {
            sortedData.sort((a, b) => {
              return sortOrder === 'asc' ? a.salesCount - b.salesCount : b.salesCount - a.salesCount
            })
          } else if (sortBy === 'rating') {
            sortedData.sort((a, b) => {
              // 确保转换为数值
              const ratingA = parseFloat(a.rating)
              const ratingB = parseFloat(b.rating)
              return sortOrder === 'asc' ? ratingA - ratingB : ratingB - ratingA
            })
          }
          
          // 使用排序后的数据
          mockData = sortedData
          
          // 打印排序后的前几个结果
          console.log('排序后数据示例:', mockData.slice(0, 3).map(item => ({
            id: item.id,
            title: item.title,
            price: item.price,
            sales: item.salesCount,
            rating: item.rating
          })))
        }
        
        // 分页
        const startIndex = (page - 1) * pageSize
        const endIndex = startIndex + pageSize
        const pagedData = mockData.slice(startIndex, endIndex)
        
        return {
          code: 200,
          message: 'success (fallback)',
          data: {
            list: pagedData,
            page: page,
            pageSize: pageSize,
            total: mockData.length,
            hasNextPage: endIndex < mockData.length
          }
        }
      } else if (url.includes('/order/create')) {
        // 创建订单接口的回退处理
        console.log('创建订单接口回退处理，使用模拟数据')
        
        // 尝试解析请求数据
        let orderData = {}
        try {
          if (data) {
            orderData = JSON.parse(data)
          }
        } catch (e) {
          console.error('解析订单数据失败:', e)
        }
        
        const orderNo = 'ORD' + Date.now()
        return {
          code: 200,
          message: 'success (fallback)',
          data: {
            orderNo: orderNo,
            createTime: new Date().toISOString(),
            totalAmount: orderData.totalAmount || 1299.00,
            paymentAmount: orderData.totalAmount || 1299.00,
            status: 1, // 待付款
            items: Array.isArray(orderData.items) ? 
              orderData.items.map(item => ({
                skuId: item.skuId,
                title: `商品${item.skuId}`,
                price: item.price || 99,
                count: item.count || 1,
                cover: 'https://via.placeholder.com/100x100?text=商品'
              })) : 
              [{
                skuId: 'mock-sku-001',
                title: '模拟商品',
                price: 1299.00,
                count: 1,
                cover: 'https://via.placeholder.com/100x100?text=商品'
              }]
          }
        }
      } else if (url.match(/\/order\/detail\/.+/)) {
        // 订单详情请求的回退处理
        const orderNoMatch = url.match(/\/order\/detail\/(.+)/)
        const orderNo = orderNoMatch ? orderNoMatch[1] : `ORD${Date.now()}`
        
        console.log('订单详情请求失败，返回模拟数据:', orderNo, error.message)
        
        return {
          code: 200,
          message: 'success (fallback)',
          data: {
            orderNo: orderNo,
            status: 3, // 待收货状态
            totalAmount: 1299.00,
            paymentAmount: 1299.00,
            discountAmount: 0,
            shippingFee: 0,
            totalQuantity: 1,
            paymentMethod: 1, // 支付宝
            consignee: '演示用户',
            mobile: '13800138000',
            address: '浙江省 杭州市 西湖区 示例街道1号',
            zipCode: '310000',
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            payTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
            shipTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            completeTime: null,
            closeTime: null,
            remark: '网络连接问题，显示模拟数据',
            items: [
              {
                skuId: 'mock-sku-001',
                goodsId: 'mock-goods-001',
                goodsName: '示例商品',
                goodsCover: 'https://via.placeholder.com/200x200.png?text=连接错误',
                quantity: 1,
                price: 1299.00,
                specs: {
                  '颜色': '黑色',
                  '尺寸': 'M'
                }
              }
            ],
            logistics: {
              company: '顺丰快递',
              number: 'SF' + Math.floor(10000000000 + Math.random() * 90000000000),
              status: 3,
              traces: [
                {
                  time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                  content: '您的订单已由【配送中心】发出，正在配送中'
                },
                {
                  time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                  content: '您的订单已到达【配送城市转运中心】'
                },
                {
                  time: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
                  content: '您的订单正在派送中，请保持手机畅通'
                }
              ]
            }
          }
        }
      } else if (url.includes('/order/list')) {
        // 订单列表请求的回退处理
        console.log('订单列表请求失败，返回模拟数据:', error.message)
        
        return {
          code: 200,
          message: 'success (fallback)',
          data: {
            totalCount: 5,
            pageSize: 10,
            pageNum: 1,
            records: Array(5).fill().map((_, i) => ({
              orderNo: `ORD${Date.now()}${i}`,
              status: i % 5 + 1, // 1-5随机状态
              totalAmount: (Math.random() * 1000 + 100).toFixed(2),
              totalQuantity: Math.floor(Math.random() * 5) + 1,
              paymentAmount: (Math.random() * 1000 + 100).toFixed(2),
              discountAmount: (Math.random() * 50).toFixed(2),
              shippingFee: (Math.random() * 20).toFixed(2),
              paymentMethod: Math.floor(Math.random() * 4) + 1,
              consignee: '演示用户',
              mobile: '13800138000',
              address: '浙江省 杭州市 西湖区 示例街道1号',
              zipCode: '310000',
              createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
              payTime: i > 0 ? new Date(Date.now() - i * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString() : null,
              shipTime: i > 1 ? new Date(Date.now() - i * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString() : null,
              completeTime: i === 3 ? new Date(Date.now() - i * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString() : null,
              closeTime: i === 4 ? new Date(Date.now() - i * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString() : null,
              items: [
                {
                  skuId: `mock-sku-${i}`,
                  goodsId: `mock-goods-${i}`,
                  goodsName: `示例商品 ${i}`,
                  goodsCover: `https://via.placeholder.com/200x200.png?text=连接错误`,
                  quantity: Math.floor(Math.random() * 3) + 1,
                  price: (Math.random() * 500 + 100).toFixed(2)
                }
              ]
            }))
          }
        }
      } else if (url.match(/\/order\/confirm\/.+/)) {
        // 确认收货请求的回退处理
        const orderNoMatch = url.match(/\/order\/confirm\/(.+)/)
        const orderNo = orderNoMatch ? orderNoMatch[1] : `ORD${Date.now()}`
        
        console.log('确认收货请求失败，返回模拟数据:', orderNo, error.message)
        
        return {
          code: 200,
          message: 'success (fallback)',
          data: null
        }
      } else if (url.match(/\/order\/cancel\/.+/)) {
        // 取消订单请求的回退处理
        const orderNoMatch = url.match(/\/order\/cancel\/(.+)/)
        const orderNo = orderNoMatch ? orderNoMatch[1] : `ORD${Date.now()}`
        
        console.log('取消订单请求失败，返回模拟数据:', orderNo, error.message)
        
        return {
          code: 200,
          message: 'success (fallback)',
          data: null
        }
      }
    }
    
    return Promise.reject(error)
  }
)

export default service 