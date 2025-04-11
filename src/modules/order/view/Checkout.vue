<template>
  <div class="checkout-container">
    <el-breadcrumb separator="/">
      <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
      <el-breadcrumb-item :to="{ path: '/cart' }">购物车</el-breadcrumb-item>
      <el-breadcrumb-item>结算</el-breadcrumb-item>
    </el-breadcrumb>
    
    <h2 class="page-title">订单结算</h2>
    
    <el-card class="checkout-card">
      <!-- 地址选择器 -->
      <address-selector v-model="selectedAddress" />
      
      <!-- 订单商品清单 -->
      <div class="order-goods">
        <h3 class="section-title">商品清单</h3>
        
        <div class="goods-list">
          <div v-if="!cartStore.selectedItems.length" class="empty-cart">
            <el-empty description="请选择商品后再结算" :image-size="100">
              <template #extra>
                <el-button type="primary" @click="$router.push('/cart')">
                  返回购物车
                </el-button>
              </template>
            </el-empty>
          </div>
          
          <div v-else>
            <div class="goods-header">
              <span class="col-product">商品信息</span>
              <span class="col-price">单价</span>
              <span class="col-quantity">数量</span>
              <span class="col-subtotal">小计</span>
            </div>
            
            <div 
              v-for="item in cartStore.selectedItems" 
              :key="item.skuId" 
              class="goods-item"
            >
              <div class="col-product">
                <div class="product-info">
                  <img :src="item.cover || item.imageUrl" :alt="item.title" class="product-image" />
                  <div class="product-detail">
                    <h4 class="product-title">{{ item.title }}</h4>
                    <p class="product-specs">
                      <span v-for="(value, key) in item.specs" :key="key">
                        {{ key }}: {{ value }}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              
              <div class="col-price">
                <span class="price">¥{{ item.price ? item.price.toFixed(2) : '0.00' }}</span>
              </div>
              
              <div class="col-quantity">
                <span class="quantity">{{ item.count }}</span>
              </div>
              
              <div class="col-subtotal">
                <span class="subtotal">¥{{ (item.price && item.count) ? (item.price * item.count).toFixed(2) : '0.00' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 订单备注 -->
      <div class="order-remark">
        <h3 class="section-title">订单备注</h3>
        <el-input
          v-model="remark"
          type="textarea"
          :rows="3"
          placeholder="给卖家留言（选填，50字以内）"
          maxlength="50"
          show-word-limit
        />
      </div>
      
      <!-- 订单汇总 -->
      <div class="order-summary">
        <div class="summary-row">
          <span>商品总价：</span>
          <span>¥{{ totalPrice.toFixed(2) }}</span>
        </div>
        <div class="summary-row">
          <span>运费：</span>
          <span>¥{{ shippingFee.toFixed(2) }}</span>
        </div>
        <div class="summary-row">
          <span>折扣：</span>
          <span>-¥{{ discount.toFixed(2) }}</span>
        </div>
        <div class="summary-row total">
          <span>实付款：</span>
          <span class="total-amount">¥{{ totalAmount.toFixed(2) }}</span>
        </div>
      </div>
      
      <!-- 提交按钮 -->
      <div class="submit-area">
        <div class="address-confirm" v-if="selectedAddress">
          寄送至：{{ selectedAddress.province }} {{ selectedAddress.city }} {{ selectedAddress.district }} {{ selectedAddress.address }}
          <span class="address-contact">收货人：{{ selectedAddress.name }} {{ selectedAddress.phone }}</span>
        </div>
        
        <el-button 
          type="primary" 
          size="large" 
          @click="handleSubmit"
          :disabled="!canSubmit || submitting"
          :loading="submitting"
        >
          确认订单
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCartStore } from '../../cart/store/useCartStore'
import { useOrderStore } from '../store/useOrderStore'
import AddressSelector from '../../../common/components/AddressSelector.vue'

const router = useRouter()
const route = useRoute()
const cartStore = useCartStore()
const orderStore = useOrderStore()

// 订单信息状态
const selectedAddress = ref(null)
const remark = ref('')
const submitting = ref(false)
const tempOrderResult = ref(null)

// 计算属性
const totalPrice = computed(() => {
  // 检查是否是直接购买模式
  const isDirectBuy = route.query.directBuy === 'true'
  
  if (isDirectBuy) {
    // 从localStorage获取直接购买商品
    const directBuyItemStr = localStorage.getItem('directBuyItem')
    if (directBuyItemStr) {
      try {
        const directBuyItem = JSON.parse(directBuyItemStr)
        const price = Number(directBuyItem.price) || 0
        const count = Number(directBuyItem.count || directBuyItem.quantity || 1) || 0
        return price * count
      } catch (e) {
        return 0
      }
    }
    return 0
  }
  
  // 购物车模式下的计算
  if (!cartStore.selectedItems.length) return 0
  return cartStore.selectedItems.reduce((sum, item) => {
    const price = Number(item.price) || 0
    const count = Number(item.count || item.quantity || 1) || 0
    return sum + (price * count)
  }, 0)
})

const shippingFee = computed(() => {
  // 满99免运费，否则10元
  return totalPrice.value > 99 ? 0 : 10
})

const discount = computed(() => {
  // 每满100减10
  return Math.floor(totalPrice.value / 100) * 10
})

const totalAmount = computed(() => {
  // 实付款 = 商品总价 + 运费 - 折扣
  return totalPrice.value + shippingFee.value - discount.value
})

const canSubmit = computed(() => {
  // 检查是否是直接购买模式
  const isDirectBuy = route.query.directBuy === 'true'
  
  if (isDirectBuy) {
    // 直接购买模式只需要选择了地址就可以提交
    return selectedAddress.value !== null
  }
  
  // 购物车模式需要同时满足：有选中商品 且 选择了地址
  return cartStore.selectedItems.length > 0 && selectedAddress.value
})

// 清除缓存数据方法
const clearTemporaryData = (options = {}) => {
  const {
    clearDirectBuy = true,
    clearCheckoutData = true,
    logMessage = true
  } = options
  
  if (clearDirectBuy) {
    localStorage.removeItem('directBuyItem')
    localStorage.removeItem('directBuyGoodsId')
    localStorage.removeItem('directBuySkuId')
  }
  
  if (clearCheckoutData) {
    localStorage.removeItem('checkout_items')
  }
}

// 提交订单
const handleSubmit = async () => {
  if (!canSubmit.value) {
    if (!selectedAddress.value) {
      ElMessage.warning('请选择收货地址')
    } else if (cartStore.selectedItems.length === 0) {
      ElMessage.warning('购物车中没有选中的商品')
    }
    return
  }
  
  try {
    // 显示确认提示弹窗
    await ElMessageBox.confirm(
      `确认提交订单吗？订单总金额：¥${totalAmount.value.toFixed(2)}`,
      '提交订单',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    submitting.value = true
    
    // 地址检查
    if (!selectedAddress.value || !selectedAddress.value.id) {
      ElMessage.warning('地址信息不完整，请重新选择收货地址')
      submitting.value = false
      return
    }
    
    // 获取是否是直接购买模式
    const isDirectBuy = route.query.directBuy === 'true';
    const goodsId = route.query.goodsId;
    const skuId = route.query.skuId;
    
    // 创建订单
    const result = await orderStore.submitOrder(
      cartStore.selectedItems,
      selectedAddress.value,
      { 
        isDirectBuy, 
        remark: remark.value,
        goodsId: isDirectBuy ? goodsId : undefined,
        skuId: isDirectBuy ? skuId : undefined
      }
    )
    
    // 保存临时订单结果
    tempOrderResult.value = result
    
    // 准备订单数据
    const orderData = prepareOrderData(result);
    
    // 保存到Pinia store
    orderStore.currentOrder = orderData;
    
    // 清除直接购买相关的临时数据，但保留订单数据
    clearTemporaryData({
      clearDirectBuy: true,      // 清除直接购买相关的临时数据
      clearCheckoutData: false, // 不清除订单数据
      logMessage: false,    // 不输出日志
    })
    
    // 处理支付逻辑
    handleDirectPayment(result);
    
  } catch (error) {
    if (error === 'cancel') {
      return;
    }
    
    ElMessage.error(`提交订单失败，请稍后重试${error?.message ? ': ' + error.message : ''}`)
  } finally {
    submitting.value = false
  }
}

// 准备订单数据
const prepareOrderData = (result) => {
  // 获取商品项数据
  const items = cartStore.selectedItems.map(item => {
    // 获取价格，优先使用原始价格
    const price = Number(item.price || item._originalPrice || 0);
    // 获取数量，优先使用原始数量
    const quantity = Number(item.count || item.quantity || item._originalCount || 1);
    // 计算小计
    const subtotal = price * quantity;
    
    // 构建完整的商品项数据
    const itemData = {
      skuId: item.skuId,
      goodsId: item.goodsId || item.id,
      goodsName: item.title || item.name,
      goodsCover: item.cover || item.imageUrl || item.image,
      price: item.price,
      quantity: quantity,
      specs: item.specs || {},
      subtotal: subtotal,
      // 保存原始商品信息，用于后续处理
      _original: {
        title: item.title,
        name: item.name,
        price: item.price,
        _originalPrice: item._originalPrice,
        count: item.count,
        quantity: item.quantity,
        _originalCount: item._originalCount,
        cover: item.cover,
        imageUrl: item.imageUrl,
        image: item.image,
        specs: item.specs
      }
    };
    
    return itemData;
  });
  
  // 计算订单总金额
  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
  
  // 构建完整的订单数据
  const orderData = {
    orderNo: result.orderNo,
    totalAmount: totalAmount,
    paymentAmount: totalAmount + shippingFee.value - discount.value,
    shippingFee: shippingFee.value,
    discountAmount: discount.value,
    items: items,
    address: {
      name: selectedAddress.value.name,
      phone: selectedAddress.value.phone,
      province: selectedAddress.value.province,
      city: selectedAddress.value.city,
      district: selectedAddress.value.district,
      address: selectedAddress.value.address
    },
    remark: remark.value,
    timestamp: new Date().getTime(),
    // 添加额外的订单信息
    status: 1, // 待支付状态
    createdAt: new Date().toISOString(),
    paymentMethod: null,
    payTime: null,
    shipTime: null,
    completeTime: null,
    closeTime: null,
    // 保存原始订单信息
    _original: {
      totalAmount,
      shippingFee: shippingFee.value,
      discount: discount.value,
      items: items.map(item => item._original)
    }
  };
  
  // 保存原始订单数据到localStorage
  try {
    localStorage.setItem('checkout_order_data', JSON.stringify(orderData));
  } catch (e) {
    // 保存失败时静默处理
  }
  
  return orderData;
}

// 处理支付方法
const handleDirectPayment = (orderResult) => {
  ElMessage.success('正在跳转到支付页面...')

  const isDirectBuy = route.query.directBuy === 'true';

  if (orderResult) {
    // 获取支付金额
    let paymentAmount = totalAmount.value;
    
    // 确保金额有效
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      ElMessage.warning('订单金额计算有误，请返回购物车重新结算');
      setTimeout(() => router.push('/cart'), 2000);
      return;
    }
    
    // 跳转到支付页面
    setTimeout(() => {
      router.push({
        path: '/payment/pay',
        query: {
          orderNo: orderResult.orderNo,
          amount: paymentAmount.toString(),
          from: isDirectBuy ? 'direct_buy' : 'checkout'
        }
      })
    }, 500)
  }
}

// 获取订单商品项
const getOrderItems = (isDirectBuy) => {
  if (isDirectBuy) {
    const directBuyItemStr = localStorage.getItem('directBuyItem');
    if (directBuyItemStr) {
      try {
        const directBuyItem = JSON.parse(directBuyItemStr);
        return [{
          skuId: directBuyItem.skuId,
          goodsId: directBuyItem.goodsId,
          goodsName: directBuyItem.title || directBuyItem.goodsName,
          goodsCover: directBuyItem.cover || directBuyItem.imageUrl || directBuyItem.goodsCover,
          price: Number(directBuyItem.price),
          quantity: Number(directBuyItem.count || directBuyItem.quantity),
          specs: directBuyItem.specs || {}
        }];
      } catch (e) {
        return formatCartItems();
      }
    }
    return formatCartItems();
  } else {
    return formatCartItems();
  }
}

// 格式化购物车商品
const formatCartItems = () => {
  return cartStore.selectedItems.map(item => ({
    skuId: item.skuId,
    goodsId: item.goodsId || item.id,
    goodsName: item.title || item.name,
    goodsCover: item.cover || item.imageUrl || item.image,
    price: Number(item.price),
    quantity: Number(item.count || item.quantity || 1),
    specs: item.specs || {}
  }));
}

// 生命周期钩子
onMounted(() => {
  // 清除之前的订单结算数据缓存，但保留订单数据
  clearTemporaryData({
    clearCheckoutData: true, // 不清除订单数据
    clearDirectBuy: true,
    logMessage: false
  })
  
  // 检查是否是直接购买
  const isDirectBuy = route.query.directBuy === 'true'
  
  if (isDirectBuy) {
    // 从URL参数获取商品ID和SKU ID
    const goodsId = route.query.goodsId
    const skuId = route.query.skuId
    
    if (goodsId && skuId) {
      // 从URL参数获取直接购买商品信息
      const directBuyItemStr = localStorage.getItem('directBuyItem')
      // 检查URL参数中是否包含订单数据
      const urlOrderData = route.query.orderData
      
      // 尝试从URL参数中获取订单数据
      if (urlOrderData) {
        try {
          // 解析URL参数中的订单数据
          const orderData = JSON.parse(decodeURIComponent(urlOrderData))
          
          if (orderData && orderData.items && orderData.items.length > 0) {
            const directBuyItem = orderData.items[0]
            
            // 准备直接购买商品数据
            const itemData = {
              ...directBuyItem,
              price: Number(directBuyItem.price) || 0,
              count: Number(directBuyItem.count || directBuyItem.quantity || 1),
              subtotal: Number(directBuyItem.price) * Number(directBuyItem.count || directBuyItem.quantity || 1)
            }
            
            // 保存到localStorage
            localStorage.setItem('directBuyItem', JSON.stringify(itemData))
            localStorage.setItem('checkout_order_data', JSON.stringify(orderData))
            
            // 替换购物车选中的商品，只用于展示
            Object.defineProperty(cartStore, 'selectedItems', {
              get: () => [itemData]
            })
            
            // 成功处理，返回，不进行后续处理
            return
          }
        } catch (error) {
          // 解析失败，继续尝试从localStorage获取
        }
      }
      
      // 从localStorage获取直接购买商品（URL参数中没有数据或解析失败时）
      if (directBuyItemStr) {
        try {
          const directBuyItem = JSON.parse(directBuyItemStr)
          
          // 验证商品ID和SKU ID是否匹配
          if (directBuyItem.goodsId.toString() === goodsId.toString() && 
              directBuyItem.skuId.toString() === skuId.toString()) {
            
            // 准备直接购买商品数据
            const itemData = {
              ...directBuyItem,
              price: Number(directBuyItem.price) || 0,
              count: Number(directBuyItem.count || directBuyItem.quantity || 1),
              subtotal: Number(directBuyItem.price) * Number(directBuyItem.count || directBuyItem.quantity || 1)
            }
            
            // 保存到localStorage
            localStorage.setItem('directBuyItem', JSON.stringify(itemData))
            
            // 替换购物车选中的商品，只用于展示
            Object.defineProperty(cartStore, 'selectedItems', {
              get: () => [itemData]
            })
          } else {
            ElMessage.error('商品信息不匹配，请重新选择')
            router.push('/cart')
          }
        } catch (error) {
          ElMessage.error('商品数据异常，请重新选择')
          router.push('/cart')
        }
      } else {
        ElMessage.warning('未找到完整的商品信息，请重新选择')
        router.push('/cart')
      }
    } else {
      ElMessage.warning('商品信息不完整，请重新选择')
      router.push('/cart')
    }
  } else {
    // 常规购物车结算流程
    if (cartStore.selectedItems.length === 0) {
      ElMessage.warning('请先选择要购买的商品')
      router.push('/cart')
    }
  }
})

// 离开页面时清理数据
onBeforeUnmount(() => {
  if (!tempOrderResult.value) {
    clearTemporaryData({
      clearCheckoutData: false, // 不清除订单数据
      clearDirectBuy: true,
      logMessage: false
    })
  }
})
</script>

<style lang="scss" scoped>
@use "../style/checkout.scss" as *;

// 以下是额外的组件特定样式
.checkout-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  
  .page-title {
    margin: 20px 0;
    font-size: 24px;
    font-weight: 500;
    color: #333;
  }
  
  .checkout-card {
    margin-bottom: 30px;
    
    .section-title {
      margin: 0 0 15px;
      font-size: 18px;
      font-weight: 500;
      color: #333;
      border-left: 4px solid #ff5000;
      padding-left: 10px;
    }
    
    .order-goods {
      margin-bottom: 20px;
      
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
          .col-subtotal {
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
                  
                  span {
                    margin-right: 10px;
                  }
                }
              }
            }
          }
          
          .col-price,
          .col-quantity,
          .col-subtotal {
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
    }
    
    .order-remark {
      margin-bottom: 20px;
    }
    
    .order-summary {
      margin: 20px 0;
      padding: 15px;
      border: 1px solid #f0f0f0;
      background-color: #f9f9f9;
      border-radius: 4px;
      
      .summary-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        color: #666;
        
        &.total {
          margin-top: 15px;
          font-size: 16px;
          font-weight: 500;
          color: #333;
          border-top: 1px dashed #ddd;
          padding-top: 15px;
          
          .total-amount {
            color: #ff5000;
            font-size: 20px;
          }
        }
      }
    }
    
    .submit-area {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #eee;
      padding-top: 20px;
      
      .address-confirm {
        flex: 1;
        color: #666;
        line-height: 1.5;
        
        .address-contact {
          margin-left: 10px;
          color: #999;
        }
      }
    }
  }
}

.empty-cart {
  padding: 30px 0;
}
</style>
