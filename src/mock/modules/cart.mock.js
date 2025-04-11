import Mock from 'mockjs'
// 导入商品仓库
import goodsRepository from './goods.mock.js'

const Random = Mock.Random

// 存储购物车数据，使其具有持久性
let cartItems = []

// 清空并重新初始化购物车数据，确保干净
cartItems = []

// 初始化一些购物车数据
if (cartItems.length === 0) {
  cartItems = Mock.mock({
    'items|1-2': [{
      'skuId': '@id',
      'goodsId': '@id',
      'title': '@ctitle(10,20)',
      'price': '@float(10,1000,2,2)',
      'count': '@integer(1,5)',
      'selected': '@boolean',
      'stock': '@integer(10,100)',
      'imageUrl': Random.image('200x200', '#ffcc33', '#FFF', 'Mock'),
      'specs': {
        '颜色': {
          label: '@pick(["红色", "黑色", "白色", "蓝色"])',
          value: '@pick(["red", "black", "white", "blue"])'
        },
        '尺寸': {
          label: '@pick(["S", "M", "L", "XL"])',
          value: '@pick(["S", "M", "L", "XL"])'
        }
      },
      'isInvalid|1-10': false // 90%的商品是有效的，10%是失效的
    }]
  }).items
}

export default [
  // 购物车列表接口
  {
    url: '/cart/list',
    method: 'get',
    response: () => {
      console.log('Mock拦截购物车列表请求成功!')
      console.log('当前购物车内商品数量:', cartItems.length)
      console.log('购物车内容:', JSON.stringify(cartItems, null, 2))
      
      // 随机将一些商品标记为库存不足
      cartItems.forEach(item => {
        if (item.isInvalid === true) {
          item.stock = 0
        }
      })
      
      return {
        code: 200,
        message: 'success',
        data: cartItems
      }
    }
  },
  
  // 添加商品到购物车接口
  {
    url: '/cart/add',
    method: 'post',
    response: (req) => {
      try {
        const { skuId, count, goodsId, goodsDetail, skuInfo } = req.body
        console.log('添加商品到购物车，请求数据:', { skuId, count, goodsId })
        console.log('商品详情(简略):', goodsDetail ? `标题: ${goodsDetail.title}, 价格: ${goodsDetail.price}` : '未提供')
        console.log('SKU信息(简略):', skuInfo ? `ID: ${skuInfo.id}, 价格: ${skuInfo.price}, 库存: ${skuInfo.stock}` : '未提供')
        
        // 价格比较
        if (goodsDetail && skuInfo) {
          console.log('价格比较 - 商品详情价格:', goodsDetail.price, 'SKU价格:', skuInfo.price);
        }
        
        if (skuInfo) {
          console.log('SKU规格:', JSON.stringify(skuInfo.specs, null, 2))
        }
        
        // 查找购物车中是否已存在该商品
        const existingItem = cartItems.find(item => item.skuId === skuId)
        
        if (existingItem) {
          console.log('购物车中已存在该商品，更新数量:', existingItem)
          // 如果已存在，增加数量
          existingItem.count += count
          
          // 确保数量不超过库存
          const maxStock = skuInfo ? skuInfo.stock : (goodsDetail ? goodsDetail.stock : existingItem.stock);
          if (existingItem.count > maxStock) {
            existingItem.count = maxStock
          }
          
          // 更新价格和规格信息，确保和最新的选择一致
          if (goodsDetail && goodsDetail.price) {
            existingItem.price = goodsDetail.price; // 使用商品详情中的价格
          }
          
          if (skuInfo && skuInfo.specs) {
            existingItem.specs = skuInfo.specs;
          }
        } else {
          console.log('购物车中不存在该商品，准备创建新项')
          
          // 处理规格信息，确保格式一致
          let specs = {};
          
          // 优先使用传入的SKU规格信息
          if (skuInfo && skuInfo.specs) {
            console.log('使用 SKU 中的规格信息');
            specs = skuInfo.specs;
          } else if (goodsDetail && goodsDetail.selectedSpecs) {
            console.log('使用商品详情中的选定规格信息');
            specs = goodsDetail.selectedSpecs;
          }
          
          // 创建购物车新商品项
          const newItem = {
            skuId: skuId,
            goodsId: goodsId,
            title: goodsDetail ? goodsDetail.title : '未知商品',
            price: goodsDetail ? goodsDetail.price : 0, // 始终使用商品详情中的价格
            count: count,
            selected: true,
            stock: skuInfo && skuInfo.stock ? skuInfo.stock : (goodsDetail ? goodsDetail.stock : 100),
            imageUrl: goodsDetail && goodsDetail.images && goodsDetail.images.length > 0 
                    ? goodsDetail.images[0] 
                    : (goodsDetail ? goodsDetail.imageUrl : null),
            specs: specs,
            isInvalid: false
          };
          
          // 如果没有图片，生成一个随机图片
          if (!newItem.imageUrl) {
            newItem.imageUrl = Random.image('200x200', '#4A7BF7', '#FFF', 'New');
          }
          
          console.log('创建新的购物车商品项:', JSON.stringify(newItem, null, 2))
          cartItems.push(newItem);
          
          // 添加后输出购物车内容
          console.log('添加后购物车内商品数量:', cartItems.length)
        }
        
        return {
          code: 200,
          message: 'success',
          data: {
            skuId,
            count,
            item: cartItems.find(item => item.skuId === skuId)
          }
        }
      } catch (error) {
        console.error('添加购物车Mock数据错误:', error)
        console.error('错误详情:', error.stack)
        return {
          code: 500,
          message: '添加购物车失败',
          data: null
        }
      }
    }
  },
  
  // 批量更新购物车接口
  {
    url: '/cart/batch',
    method: 'patch',
    response: (req) => {
      try {
        const updates = req.body
        
        // 处理每个更新项
        updates.forEach(update => {
          const { skuId, count, selected } = update
          
          // 查找购物车中的商品
          const existingItemIndex = cartItems.findIndex(item => item.skuId === skuId)
          
          if (existingItemIndex !== -1) {
            // 如果商品存在
            if (count === 0) {
              // 如果count为0，移除商品
              cartItems.splice(existingItemIndex, 1)
            } else {
              // 更新商品数量和选中状态
              if (count !== undefined) {
                cartItems[existingItemIndex].count = count
              }
              
              if (selected !== undefined) {
                cartItems[existingItemIndex].selected = selected
              }
            }
          }
        })
        
        return {
          code: 200,
          message: 'success',
          data: {
            updated: updates.length
          }
        }
      } catch (error) {
        console.error('批量更新购物车Mock数据错误:', error)
        return {
          code: 500,
          message: '批量更新购物车失败',
          data: null
        }
      }
    }
  },
  
  // 清空购物车接口
  {
    url: '/cart/clear',
    method: 'delete',
    response: () => {
      cartItems = []
      
      return {
        code: 200,
        message: 'success',
        data: null
      }
    }
  },
  
  // 删除选中的购物车商品接口
  {
    url: '/cart/selected',
    method: 'delete',
    response: () => {
      // 保留未选中的商品
      cartItems = cartItems.filter(item => !item.selected)
      
      return {
        code: 200,
        message: 'success',
        data: null
      }
    }
  },
  
  // 选择/取消选择所有商品接口
  {
    url: '/cart/select-all',
    method: 'patch',
    response: (req) => {
      try {
        const { selectAll } = req.body
        
        // 更新所有有效商品的选中状态
        cartItems.forEach(item => {
          if (!item.isInvalid && item.stock > 0) {
            item.selected = selectAll
          }
        })
        
        return {
          code: 200,
          message: 'success',
          data: null
        }
      } catch (error) {
        console.error('全选/取消全选购物车Mock数据错误:', error)
        return {
          code: 500,
          message: '操作失败',
          data: null
        }
      }
    }
  }
] 