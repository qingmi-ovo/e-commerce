import Mock from 'mockjs'

const Random = Mock.Random

// 扩展随机图片类别
Random.extend({
  goodsImage() {
    const categories = ['electronics', 'fashion', 'home', 'beauty', 'sports']
    const category = Random.pick(categories)
    
    // 生成随机颜色代码
    const color = Random.color()
    const colorCode = color.replace('#', '')
    
    // 为每个商品生成唯一标识，确保不同商品有不同的图片
    const uniqueId = Random.natural(1000, 9999)
    
    // 构建带有随机颜色背景的图片URL
    const imageUrl = `https://source.unsplash.com/300x300/?${category},product&bg=${colorCode}&sig=${uniqueId}`
    
    // 添加本地备用解决方案：如果外部图片无法加载，生成本地数据URI
    const backupImage = {
      url: imageUrl,
      color: color,
      category: category,
      uniqueId: uniqueId
    }
    
    return imageUrl
  }
})

// 创建一个函数用于生成本地图片DataURI (备用方案)
function generateLocalImageUri(color, text) {
  // 创建一个1x1像素的带颜色背景图片
  // 这是最简单可靠的方式，浏览器会自动拉伸它
  return `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`;
}

// 用于存储历史搜索记录
const searchHistoryList = []

// 创建一个商品仓库，用于存储所有生成的商品
const goodsRepository = {
  // 按ID存储商品 { id: 商品信息 }
  items: {},
  
  // 获取商品，如果不存在则创建
  getOrCreate(id) {
    if (!this.items[id]) {
      // 生成随机颜色和图片相关信息
      const productColor = Random.color()
      const productCategory = Random.pick(["电子产品", "服装", "家居", "美妆", "运动"])
      const englishCategory = {
        "电子产品": "electronics",
        "服装": "fashion",
        "家居": "home",
        "美妆": "beauty",
        "运动": "sports"
      }[productCategory]
      
      // 生成唯一标识，保证同一ID商品始终使用相同的图片
      const uniqueId = parseInt(id.slice(-4)) || Random.natural(1000, 9999)
      
      // 构建带有随机颜色背景的图片URL
      const imageUrl = `https://source.unsplash.com/300x300/?${englishCategory},product&bg=${productColor.replace('#', '')}&sig=${uniqueId}`
      
      // 生成基本信息
      const baseInfo = {
        id: id,
        title: Random.ctitle(10, 30),
        price: Random.float(10, 5000, 2, 2),
        originalPrice: Random.float(5000, 10000, 2, 2),
        discount: Random.float(1, 9, 1, 1),
        salesCount: Random.integer(100, 9999),
        imageUrl: imageUrl,
        themeColor: productColor,
        uniqueImageId: uniqueId,
        stock: Random.integer(0, 100),
        category: productCategory,
        rating: Random.float(0, 5, 1, 1),
        ratingCount: Random.integer(0, 1000),
        deliveryFee: Random.float(0, 20, 2, 2),
        shopName: Random.cword(3,8) + '店',
        description: Random.cparagraph(3),
        detailHtml: '<div><h3>商品详情</h3><p>' + Random.cparagraph() + '</p><img src="' + Random.image('800x600', productColor,'商品详情图') + '" /><p>' + Random.cparagraph() + '</p><img src="' + Random.image('800x600', productColor,'商品详情图') + '" /></div>',
        services: ['7天无理由退货', '正品保证', '闪电发货', '免运费']
      }
      
      // 生成规格信息
      const specs = {
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
      }
      
      // 生成SKU
      const skus = []
      const colorOptions = specs['颜色'].options
      const sizeOptions = specs['尺寸'].options
      
      colorOptions.forEach(color => {
        sizeOptions.forEach(size => {
          skus.push({
            id: Random.id(),
            specs: {
              '颜色': color.value,
              '尺寸': size.value
            },
            price: Random.float(100, 500, 2, 2),
            stock: Random.integer(0, 50)
          })
        })
      })
      
      // 生成参数
      const params = []
      const paramCount = Random.integer(5, 10)
      
      for (let i = 0; i < paramCount; i++) {
        params.push({
          name: Random.cword(3,8),
          value: Random.cword(5,15)
        })
      }
      
      // 生成详情图片
      const images = Array(5).fill().map(() => baseInfo.imageUrl)
      
      // 存储完整的商品信息
      this.items[id] = {
        ...baseInfo,
        specs,
        skus,
        params,
        images
      }
      
      console.log(`生成并存储新商品 (ID: ${id})`)
    }
    
    return this.items[id]
  },
  
  // 获取商品详情
  getDetail(id) {
    return this.getOrCreate(id)
  },
  
  // 获取商品列表摘要信息
  getList(ids) {
    return ids.map(id => {
      const item = this.getOrCreate(id)
      // 返回列表需要的摘要信息
      return {
        id: item.id,
        title: item.title,
        price: item.price,
        originalPrice: item.originalPrice,
        discount: item.discount,
        salesCount: item.salesCount,
        imageUrl: item.imageUrl,
        themeColor: item.themeColor,
        uniqueImageId: item.uniqueImageId,
        stock: item.stock,
        category: item.category,
        rating: item.rating,
        ratingCount: item.ratingCount,
        deliveryFee: item.deliveryFee,
        shopName: item.shopName
      }
    })
  }
}

// 用于缓存商品列表查询结果的键值对
const goodsListCache = {}

// 商品列表接口
Mock.mock(/\/mock\/goods\/list(\?.*)?$/, 'get', (options) => {
  const { url } = options
  const params = new URLSearchParams(url.split('?')[1] || '')
  const page = parseInt(params.get('page') || '1')
  const pageSize = parseInt(params.get('pageSize') || '20')
  const category = params.get('category') || ''
  const keyword = params.get('keyword') || ''
  const sortBy = params.get('sortBy') || 'default'
  const sortOrder = params.get('sortOrder') || 'desc'
  
  console.log('Mock商品列表请求参数:', { page, pageSize, category, keyword, sortBy, sortOrder })
  
  // 生成固定格式的ID列表
  const idList = Array(pageSize).fill().map((_, index) => {
    // 使用固定格式的ID，确保对应页码和商品位置
    return `${page}${String(index + 1).padStart(4, '0')}`
  })
  
  // 获取商品列表数据
  let mockData = goodsRepository.getList(idList)
  
  // 根据排序参数排序
  switch(sortBy) {
    case 'sales':
      mockData.sort((a, b) => sortOrder === 'desc' ? b.salesCount - a.salesCount : a.salesCount - b.salesCount)
      break
    case 'price':
      mockData.sort((a, b) => sortOrder === 'desc' ? b.price - a.price : a.price - b.price)
      break
    case 'rating':
      mockData.sort((a, b) => sortOrder === 'desc' ? b.rating - a.rating : a.rating - b.rating)
      break
    default:
      // 默认排序保持原样
      break
  }
  
  // 记录排序后的数据
  console.log('排序后的商品列表:', mockData.map(item => ({
    id: item.id,
    title: item.title,
    price: item.price,
    salesCount: item.salesCount,
    rating: item.rating
  })))
  
  return {
    code: 200,
    message: 'success',
    data: {
      list: mockData,
      page,
      pageSize,
      total: 100,
      hasNextPage: page < 5 // 模拟5页数据
    }
  }
})

// 商品详情接口
Mock.mock(/\/(?:mock\/)?goods\/\d+/, 'get', (options) => {
  const url = options.url
  const idMatch = url.match(/\/(?:mock\/)?goods\/(\d+)/)
  const id = idMatch ? idMatch[1] : null
  
  if (!id) {
    console.error('无法从URL提取商品ID:', url)
    return {
      code: 404,
      message: 'ID format error',
      data: null
    }
  }
  
  // 从商品仓库获取详情
  const goodsDetail = goodsRepository.getDetail(id)
  console.log(`返回商品详情 (ID: ${id})`)
  
  return {
    code: 200,
    message: 'success',
    data: goodsDetail
  }
})

// 搜索建议接口
Mock.mock(/\/mock\/goods\/suggest(\?.*)?$/, 'get', (options) => {
  const { url } = options
  const params = new URLSearchParams(url.split('?')[1] || '')
  const keyword = params.get('keyword') || ''
  
  return {
    code: 200,
    message: 'success',
    data: Mock.mock({
      'list|5-10': [`${keyword}@cword(2,5)`, `@cword(1,3)${keyword}@cword(1,3)`]
    }).list
  }
})

// 高级搜索接口
Mock.mock('/mock/goods/search', 'post', (options) => {
  const requestBody = JSON.parse(options.body || '{}')
  console.log('Mock高级搜索请求:', requestBody)
  
  // 生成10个固定格式的ID
  const idList = Array(10).fill().map((_, index) => `search${String(index + 1).padStart(4, '0')}`)
  
  // 获取商品列表数据
  const mockData = goodsRepository.getList(idList)
  
  return {
    code: 200,
    message: 'success',
    data: {
      list: mockData,
      total: 56,
      page: 1,
      pageSize: 10
    }
  }
})

// 搜索历史记录接口
Mock.mock('/mock/search/history', 'get', () => {
  return {
    code: 200,
    message: 'success',
    data: searchHistoryList
  }
})

// 保存搜索历史记录接口
Mock.mock('/mock/search/history/save', 'post', (options) => {
  console.log('保存搜索历史:', options.body)
  
  try {
    const { keyword } = JSON.parse(options.body)
    
    // 如果关键词已存在，先移除旧的记录（避免重复）
    const index = searchHistoryList.indexOf(keyword)
    if (index !== -1) {
      searchHistoryList.splice(index, 1)
    }
    
    // 将新关键词添加到搜索历史的开头
    searchHistoryList.unshift(keyword)
    
    // 限制搜索历史长度，最多保留10条
    if (searchHistoryList.length > 10) {
      searchHistoryList.pop()
    }
    
    console.log('更新后的搜索历史:', searchHistoryList)
    
    return {
      code: 200,
      message: 'success',
      data: true
    }
  } catch (error) {
    console.error('解析搜索历史请求失败:', error)
    return {
      code: 500,
      message: 'failed',
      data: false
    }
  }
})

// 清空搜索历史记录接口
Mock.mock('/mock/search/history/clear', 'post', () => {
  console.log('清空搜索历史')
  // 清空数组
  searchHistoryList.length = 0
  
  return {
    code: 200,
    message: 'success',
    data: true
  }
})

// 删除单条搜索历史记录接口
Mock.mock('/mock/search/history/remove', 'post', (options) => {
  console.log('删除搜索历史项:', options.body)
  
  try {
    const { keyword } = JSON.parse(options.body)
    
    // 查找关键词在列表中的索引
    const index = searchHistoryList.indexOf(keyword)
    if (index !== -1) {
      // 找到了，删除这一项
      searchHistoryList.splice(index, 1)
      console.log('删除后的搜索历史:', searchHistoryList)
      return {
        code: 200,
        message: 'success',
        data: true
      }
    } else {
      // 未找到要删除的关键词
      console.warn('未找到要删除的搜索历史项:', keyword)
      return {
        code: 404,
        message: 'history item not found',
        data: false
      }
    }
  } catch (error) {
    console.error('解析删除搜索历史请求失败:', error)
    return {
      code: 500,
      message: 'failed',
      data: false
    }
  }
})

// 导出模拟数据
export default [
  {
    url: /\/mock\/goods\/list(\?.*)?$/,
    method: 'get',
    response: (req) => {
      const { query } = req
      const page = parseInt(query.page || '1')
      const pageSize = parseInt(query.pageSize || '20')
      const category = query.category || ''
      const keyword = query.keyword || ''
      const sortBy = query.sortBy || 'default'
      const sortOrder = query.sortOrder || 'desc'
      
      console.log('导出模块：Mock服务器接收到商品列表请求:', { page, pageSize, category, keyword, sortBy, sortOrder })
      
      // 创建缓存键
      const cacheKey = `${page}_${pageSize}_${category}_${keyword}_${sortBy}_${sortOrder}`
      
      // 检查缓存中是否已有该列表数据
      if (goodsListCache[cacheKey]) {
        console.log(`导出模块：返回缓存的商品列表 (Key: ${cacheKey})`)
        return {
          code: 200,
          message: 'success',
          data: {
            list: goodsListCache[cacheKey],
            page,
            pageSize,
            total: 100,
            hasNextPage: page < 5 // 模拟5页数据
          }
        }
      }
      
      // 生成固定格式的ID列表
      const idList = Array(pageSize).fill().map((_, index) => {
        // 使用固定格式的ID，确保对应页码和商品位置
        return `${page}${String(index + 1).padStart(4, '0')}`
      })
      
      // 获取商品列表数据
      const mockData = goodsRepository.getList(idList)
      
      // 根据排序参数排序
      switch(sortBy) {
        case 'sales':
          mockData.sort((a, b) => sortOrder === 'desc' ? b.salesCount - a.salesCount : a.salesCount - b.salesCount)
          break
        case 'price':
          mockData.sort((a, b) => sortOrder === 'desc' ? b.price - a.price : a.price - b.price)
          break
        case 'rating':
          mockData.sort((a, b) => sortOrder === 'desc' ? b.rating - a.rating : a.rating - b.rating)
          break
        default:
          // 默认排序保持原样
          break
      }
      
      // 记录排序后的数据
      console.log('排序后的商品列表:', mockData.map(item => ({
        id: item.id,
        title: item.title,
        price: item.price,
        salesCount: item.salesCount,
        rating: item.rating
      })))
      
      // 将生成的列表存入缓存
      goodsListCache[cacheKey] = mockData
      console.log(`导出模块：生成并缓存新的商品列表 (Key: ${cacheKey})`)
      
      return {
        code: 200,
        message: 'success',
        data: {
          list: mockData,
          page,
          pageSize,
          total: 100,
          hasNextPage: page < 5 // 模拟5页数据
        }
      }
    }
  },
  {
    url: /\/(?:mock\/)?goods\/\d+/,
    method: 'get',
    response: (req) => {
      // 支持/goods/ID和/mock/goods/ID两种格式
      const idMatch = req.url.match(/\/(?:mock\/)?goods\/(\d+)/);
      const id = idMatch ? idMatch[1] : null;
      
      if (!id) {
        console.error('无法从URL提取商品ID:', req.url);
        return {
          code: 404,
          message: 'ID format error',
          data: null
        };
      }
      
      // 从商品仓库获取详情
      const goodsDetail = goodsRepository.getDetail(id)
      console.log(`导出模块：返回商品详情 (ID: ${id})`)
      
      return {
        code: 200,
        message: 'success',
        data: goodsDetail
      }
    }
  },
  {
    url: /\/mock\/goods\/suggest/,
    method: 'get',
    response: (req) => {
      const keyword = req.query.keyword || ''
      
      return {
        code: 200,
        message: 'success',
        data: Mock.mock({
          'list|5-10': [`${keyword}@cword(2,5)`, `@cword(1,3)${keyword}@cword(1,3)`]
        }).list
      }
    }
  },
  {
    url: '/mock/goods/search',
    method: 'post',
    response: (req) => {
      const { body } = req
      console.log('Mock高级搜索请求:', body)
      
      // 生成10个固定格式的ID
      const idList = Array(10).fill().map((_, index) => `search${String(index + 1).padStart(4, '0')}`)
      
      // 获取商品列表数据
      const mockData = goodsRepository.getList(idList)
      
      return {
        code: 200,
        message: 'success',
        data: {
          list: mockData,
          total: 56,
          page: 1,
          pageSize: 10
        }
      }
    }
  },
  {
    url: '/mock/search/history',
    method: 'get',
    response: () => {
      return {
        code: 200,
        message: 'success',
        data: searchHistoryList
      }
    }
  },
  {
    url: '/mock/search/history/save',
    method: 'post',
    response: (req) => {
      console.log('保存搜索历史:', req.body)
      
      try {
        const { keyword } = req.body
        
        // 如果关键词已存在，先移除旧的记录（避免重复）
        const index = searchHistoryList.indexOf(keyword)
        if (index !== -1) {
          searchHistoryList.splice(index, 1)
        }
        
        // 将新关键词添加到搜索历史的开头
        searchHistoryList.unshift(keyword)
        
        // 限制搜索历史长度，最多保留10条
        if (searchHistoryList.length > 10) {
          searchHistoryList.pop()
        }
        
        console.log('更新后的搜索历史:', searchHistoryList)
        
        return {
          code: 200,
          message: 'success',
          data: true
        }
      } catch (error) {
        console.error('解析搜索历史请求失败:', error)
        return {
          code: 500,
          message: 'failed',
          data: false
        }
      }
    }
  },
  {
    url: '/mock/search/history/clear',
    method: 'post',
    response: () => {
      console.log('清空搜索历史')
      // 清空数组
      searchHistoryList.length = 0
      
      return {
        code: 200,
        message: 'success',
        data: true
      }
    }
  },
  {
    url: '/mock/search/history/remove',
    method: 'post',
    response: (req) => {
      console.log('删除搜索历史项:', req.body)
      
      try {
        const { keyword } = req.body
        
        // 查找关键词在列表中的索引
        const index = searchHistoryList.indexOf(keyword)
        if (index !== -1) {
          // 找到了，删除这一项
          searchHistoryList.splice(index, 1)
          console.log('删除后的搜索历史:', searchHistoryList)
          return {
            code: 200,
            message: 'success',
            data: true
          }
        } else {
          // 未找到要删除的关键词
          console.warn('未找到要删除的搜索历史项:', keyword)
          return {
            code: 404,
            message: 'history item not found',
            data: false
          }
        }
      } catch (error) {
        console.error('解析删除搜索历史请求失败:', error)
        return {
          code: 500,
          message: 'failed',
          data: false
        }
      }
    }
  }
]

// 导出goodsRepository使其可以被其他模块使用
export { goodsRepository }
