<template>
  <div class="goods-detail-container">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton animated :rows="10" />
    </div>
    
    <!-- 商品详情内容 -->
    <template v-else-if="goodsDetail">
      <div class="goods-header">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item :to="{ path: '/goods' }">商品列表</el-breadcrumb-item>
          <el-breadcrumb-item>{{ goodsDetail.title }}</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
      
      <div class="goods-content">
        <!-- 左侧：商品图片轮播 -->
        <div class="goods-gallery">
          <!-- Swiper容器 -->
          <div class="swiper mySwiper">
            <div class="swiper-wrapper">
              <!-- 轮播项 -->
              <div class="swiper-slide" v-for="(image, index) in goodsDetail.images" :key="index">
                <div class="swiper-zoom-container">
                  <img :src="image" :alt="`${goodsDetail.title} - 图片${index + 1}`" />
                </div>
              </div>
            </div>
            <!-- 分页器 -->
            <div class="swiper-pagination"></div>
            <!-- 导航按钮 -->
            <div class="swiper-button-next"></div>
            <div class="swiper-button-prev"></div>
          </div>
        </div>
        
        <!-- 右侧：商品信息 -->
        <div class="goods-info">
          <h1 class="goods-title">{{ goodsDetail.title }}</h1>
          
          <div class="goods-price-container">
            <div class="price">{{ goodsDetail.price ? goodsDetail.price.toFixed(2) : '0.00' }}</div>
            <div class="original-price" v-if="goodsDetail.originalPrice">
              原价: <del>¥{{ goodsDetail.originalPrice ? goodsDetail.originalPrice.toFixed(2) : '0.00' }}</del>
            </div>
            <div class="discount" v-if="goodsDetail.discount">
              <el-tag type="danger" size="small">{{ goodsDetail.discount }}折</el-tag>
            </div>
          </div>
          
          <div class="goods-data">
            <div class="sales">月销 {{ goodsDetail.salesCount }}件</div>
            <div class="rating">
              <el-rate
                v-model="goodsDetail.rating"
                disabled
                :colors="['#FF9800', '#FF9800', '#FF9800']"
                :max="5"
              />
              <span class="rating-count">({{ goodsDetail.ratingCount }}条评价)</span>
            </div>
          </div>
          
          <!-- 规格选择 -->
          <div class="goods-specs">
            <div v-for="(specGroup, groupName) in goodsDetail.specs" :key="groupName" class="spec-group">
              <div class="spec-title">{{ groupName }}</div>
              <div class="spec-options">
                <el-radio-group v-model="selectedSpecs[groupName]">
                  <el-radio-button 
                    v-for="option in specGroup.options" 
                    :key="option.value"
                    :label="option.value"
                    :disabled="!isSpecAvailable(groupName, option.value)"
                  >
                    {{ option.label }}
                  </el-radio-button>
                </el-radio-group>
              </div>
            </div>
          </div>
          
          <!-- 库存信息 -->
          <div class="goods-stock">
            <span class="stock-label">库存:</span>
            <span class="stock-value" :class="{'low-stock': currentStock < 10}">
              {{ currentStock }}件
            </span>
          </div>
          
          <!-- 数量选择 -->
          <div class="goods-quantity">
            <span class="quantity-label">数量:</span>
            <el-input-number 
              v-model="quantity" 
              :min="1" 
              :max="currentStock" 
              :disabled="currentStock <= 0"
              size="small"
            />
          </div>
          
          <!-- 操作按钮 -->
          <div class="goods-actions" ref="actionsRef">
            <el-button 
              type="primary" 
              :icon="ShoppingCart" 
              @click="addToCart" 
              :disabled="currentStock <= 0"
              ref="addCartBtnRef"
            >
              加入购物车
            </el-button>
            <el-button 
              type="danger" 
              @click="buyNow" 
              :disabled="currentStock <= 0"
            >
              立即购买
            </el-button>
            <el-button 
              plain 
              :icon="Star" 
              @click="toggleFavorite"
              :type="isFavorite ? 'warning' : ''"
            >
              {{ isFavorite ? '已收藏' : '收藏' }}
            </el-button>
          </div>
          
          <!-- 服务承诺 -->
          <div class="goods-services">
            <div class="service-item" v-for="(service, index) in goodsDetail.services" :key="index">
              <el-icon><Check /></el-icon>
              <span>{{ service }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 商品详情tabs -->
      <div class="goods-tabs">
        <el-tabs>
          <el-tab-pane label="商品详情">
            <div class="goods-detail-content" v-html="goodsDetail.detailHtml"></div>
          </el-tab-pane>
          <el-tab-pane label="规格参数">
            <el-table v-if="goodsDetail.params && Array.isArray(goodsDetail.params)" :data="goodsDetail.params" stripe>
              <el-table-column prop="name" label="参数名" width="180" />
              <el-table-column prop="value" label="参数值" />
            </el-table>
            <el-empty v-else description="暂无规格参数信息"></el-empty>
          </el-tab-pane>
          <el-tab-pane label="用户评价">
            <div class="goods-reviews">
              <!-- 评价组件将在后续开发 -->
              <p>用户评价功能正在开发中...</p>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </template>
    
    <!-- 错误状态 -->
    <el-result
      v-else
      icon="error"
      title="商品不存在"
      sub-title="您访问的商品可能已下架或不存在"
    >
      <template #extra>
        <el-button type="primary" @click="$router.push('/goods')">返回商品列表</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ShoppingCart, Star, Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useGoodsStore } from '../store/useGoodsStore'
// 移除 Vue 组件导入，改用核心 Swiper
import Swiper from 'swiper'
// 直接导入 Swiper 模块
import { EffectCoverflow, Pagination, Navigation, Zoom } from 'swiper'
// 注册所需模块
Swiper.use([EffectCoverflow, Pagination, Navigation, Zoom])
// 导入样式
import 'swiper/css'
import 'swiper/css/effect-coverflow'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import 'swiper/css/zoom'
// 导入购物车API
import { cartAPI } from '../../../api/cart/cart'
import { useCartStore } from '../../cart/store/useCartStore'

const route = useRoute()
const router = useRouter()
const goodsStore = useGoodsStore()
const cartStore = useCartStore()

// 商品ID从路由参数获取
const goodsId = ref(route.params.id)

// 状态
const loading = ref(true)
const goodsDetail = ref(null)
const quantity = ref(1)
const isFavorite = ref(false)
const selectedSpecs = reactive({})
const actionsRef = ref(null)
const addCartBtnRef = ref(null)
const swiperInstance = ref(null)

// 计算当前选择规格的库存
const currentStock = computed(() => {
  if (!goodsDetail.value || !goodsDetail.value.skus) {
    return 0
  }
  
  // 根据选择的规格找到对应的SKU
  const selectedSku = goodsDetail.value.skus.find(sku => {
    // 检查所有规格是否匹配
    for (const [groupName, selectedValue] of Object.entries(selectedSpecs)) {
      if (sku.specs[groupName] !== selectedValue) {
        return false
      }
    }
    return true
  })
  
  return selectedSku ? selectedSku.stock : 0
})

// 计算当前选择的SKU对象
const currentSku = computed(() => {
  if (!goodsDetail.value || !goodsDetail.value.skus) {
    return null
  }
  
  // 根据选择的规格找到对应的SKU
  return goodsDetail.value.skus.find(sku => {
    // 检查所有规格是否匹配
    for (const [groupName, selectedValue] of Object.entries(selectedSpecs)) {
      if (sku.specs[groupName] !== selectedValue) {
        return false
      }
    }
    return true
  })
})

// 检查规格选项是否可用（有库存）
const isSpecAvailable = (groupName, optionValue) => {
  if (!goodsDetail.value || !goodsDetail.value.skus) {
    return false
  }
  
  // 复制当前选中的规格
  const tempSpecs = { ...selectedSpecs }
  tempSpecs[groupName] = optionValue
  
  // 查找匹配的SKU
  const matchingSku = goodsDetail.value.skus.find(sku => {
    // 检查已选规格是否都匹配
    for (const [name, value] of Object.entries(tempSpecs)) {
      // 忽略未选择的规格
      if (value && sku.specs[name] !== value) {
        return false
      }
    }
    return true
  })
  
  return matchingSku && matchingSku.stock > 0
}

// 初始化默认规格选择
const initDefaultSpecs = () => {
  if (!goodsDetail.value || !goodsDetail.value.specs) return
  
  // 为每个规格组设置第一个有库存的选项为默认值
  Object.keys(goodsDetail.value.specs).forEach(groupName => {
    const options = goodsDetail.value.specs[groupName].options
    
    // 查找第一个有库存的选项
    for (const option of options) {
      if (isSpecAvailable(groupName, option.value)) {
        selectedSpecs[groupName] = option.value
        break
      }
    }
  })
}

// 加载商品详情
const loadGoodsDetail = async () => {
  try {
    loading.value = true
    console.log(`开始加载商品详情 (ID: ${goodsId.value})`)
    
    // 保存之前的详情数据，以便在加载失败时恢复
    const previousDetail = goodsDetail.value
    
    const detail = await goodsStore.getGoodsDetail(goodsId.value)
    
    if (!detail) {
      // 商品不存在，留在页面显示错误信息
      console.error(`商品不存在 (ID: ${goodsId.value})`)
      loading.value = false
      return
    }
    
    console.log(`成功获取商品详情 (ID: ${goodsId.value}):`, detail)
    
    // 确保数据格式正确，避免渲染问题
    if (!detail.params || !Array.isArray(detail.params)) {
      detail.params = []
    }
    
    // 设置商品详情数据
    goodsDetail.value = detail
    
    // 初始化默认规格选择
    initDefaultSpecs()
    
    // 重置数量选择器
    quantity.value = 1
    
  } catch (error) {
    console.error(`加载商品详情失败 (ID: ${goodsId.value}):`, error)
    // 显示错误消息，但不清空之前加载的数据（如果有）
    ElMessage.error('加载商品详情失败，请稍后再试')
  } finally {
    loading.value = false
  }
}

// 加入购物车的抛物线动画
const animateCart = (el) => {
  if (!el) return
  
  // 创建一个临时元素作为动画元素
  const tempEl = document.createElement('div')
  tempEl.className = 'cart-animation-element'
  tempEl.style.position = 'fixed'
  tempEl.style.width = '20px'
  tempEl.style.height = '20px'
  tempEl.style.borderRadius = '50%'
  tempEl.style.backgroundColor = '#ff5000'
  tempEl.style.zIndex = '9999'
  
  // 获取起始位置（按钮位置）
  const rect = el.getBoundingClientRect()
  tempEl.style.left = `${rect.left + rect.width / 2}px`
  tempEl.style.top = `${rect.top + rect.height / 2}px`
  
  // 添加到body
  document.body.appendChild(tempEl)
  
  // 获取目标位置（页面右上角，模拟购物车图标位置）
  const targetX = window.innerWidth - 60
  const targetY = 60
  
  // 执行动画
  const animation = tempEl.animate([
    { transform: 'scale(1)', opacity: 1 },
    { transform: 'scale(0.5) translate(100px, -50px)', opacity: 0.8 },
    { transform: `scale(0.2) translate(${targetX}px, ${targetY}px)`, opacity: 0 }
  ], {
    duration: 800,
    easing: 'cubic-bezier(0.5, -0.5, 1, 1)'
  })
  
  // 动画结束后移除元素
  animation.onfinish = () => {
    document.body.removeChild(tempEl)
  }
}

// 加入购物车
const addToCart = async () => {
  if (currentStock.value <= 0) {
    ElMessage.warning('商品库存不足')
    return
  }
  
  // 检查是否选择了规格
  if (goodsDetail.value.skus && goodsDetail.value.skus.length > 0) {
    const allSpecsSelected = Object.keys(goodsDetail.value.specs).every(key => 
      selectedSpecs[key] !== undefined && selectedSpecs[key] !== ''
    )
    
    if (!allSpecsSelected) {
      ElMessage.warning('请先选择商品规格')
      return
    }
  }
  
  try {
    // 获取当前SKU ID
    let skuId;
    
    if (goodsDetail.value.skus && goodsDetail.value.skus.length > 0) {
      // 如果有SKU，使用选中的SKU的ID
      if (currentSku.value) {
        skuId = currentSku.value.id;
      } else {
        ElMessage.warning('请先选择商品规格');
        return;
      }
    } else {
      // 如果没有SKU，直接使用商品ID
      skuId = goodsDetail.value.id;
    }
    
    console.log('准备添加到购物车:', { 
      skuId, 
      count: quantity.value, 
      selectedSpecs,
      currentSku: currentSku.value 
    });
    
    // 构建selectedSpecs的对象，包含标签和值
    const formattedSpecs = {};
    if (goodsDetail.value.specs) {
      for (const [key, selectedValue] of Object.entries(selectedSpecs)) {
        if (selectedValue) {
          const specGroup = goodsDetail.value.specs[key];
          const selectedOption = specGroup.options.find(opt => opt.value === selectedValue);
          if (selectedOption) {
            formattedSpecs[key] = {
              label: selectedOption.label,
              value: selectedValue
            };
          }
        }
      }
    }
    
    // 完整的SKU信息，保证包含价格和库存
    let fullSkuInfo = null;
    if (currentSku.value) {
      fullSkuInfo = {
        ...currentSku.value,
        specs: formattedSpecs, // 使用格式化后的规格信息
        price: goodsDetail.value.price, // 使用商品详情中的价格，确保一致性
        stock: currentSku.value.stock, // 确保库存存在
        id: skuId // 确保ID一致
      };
      console.log('选择的SKU信息(已修正价格):', fullSkuInfo);
    }
    
    // 调用购物车API，传递完整的商品详情和SKU信息
    const res = await cartAPI.addItem(
      skuId, 
      quantity.value, 
      goodsDetail.value.id,
      {
        ...goodsDetail.value,
        selectedSpecs: formattedSpecs // 添加选中的规格信息到商品详情
      },
      fullSkuInfo
    )
    
    if (res.code === 200) {
      // 如果成功，显示添加的商品信息
      const addedItem = res.data.item;
      if (addedItem) {
        console.log('成功添加到购物车的商品:', addedItem);
      }
      
      ElMessage.success(`已将 ${quantity.value} 件商品加入购物车`)
      
      // 执行抛物线动画
      animateCart(addCartBtnRef.value?.$el)
    } else {
      ElMessage.error(res.message || '加入购物车失败')
    }
  } catch (error) {
    console.error('加入购物车出错:', error)
    ElMessage.error('加入购物车失败，请稍后再试')
  }
}

// 立即购买
const buyNow = async () => {
  if (currentStock.value <= 0) {
    ElMessage.warning('商品库存不足')
    return
  }
  
  // 检查是否选择了规格
  if (goodsDetail.value.skus && goodsDetail.value.skus.length > 0) {
    const allSpecsSelected = Object.keys(goodsDetail.value.specs).every(key => 
      selectedSpecs[key] !== undefined && selectedSpecs[key] !== ''
    )
    
    if (!allSpecsSelected) {
      ElMessage.warning('请先选择商品规格')
      return
    }
  }
  
  try {
    // 获取当前SKU ID
    let skuId;
    let directBuyItem = null;
    
    // 构建规格对象，包含标签和值
    const formattedSpecs = {};
    if (goodsDetail.value.specs) {
      for (const [key, selectedValue] of Object.entries(selectedSpecs)) {
        if (selectedValue) {
          const specGroup = goodsDetail.value.specs[key];
          const selectedOption = specGroup.options.find(opt => opt.value === selectedValue);
          if (selectedOption) {
            formattedSpecs[key] = selectedOption.label; // 只保存标签值
          }
        }
      }
    }
    
    if (goodsDetail.value.skus && goodsDetail.value.skus.length > 0) {
      // 如果有SKU，使用选中的SKU的ID
      if (currentSku.value) {
        skuId = currentSku.value.id;
        
        // 构建直接购买的商品对象，确保与购物车商品格式一致
        directBuyItem = {
          skuId: skuId,
          goodsId: goodsDetail.value.id,
          title: goodsDetail.value.title,
          price:  goodsDetail.value.price || currentSku.value.price,
          count: quantity.value,
          selected: true,
          stock: currentSku.value.stock,
          imageUrl: goodsDetail.value.images[0],
          cover: goodsDetail.value.images[0],
          specs: formattedSpecs,
          // 添加结算页和订单详情页需要的额外字段
          goodsName: goodsDetail.value.title,
          goodsCover: goodsDetail.value.images[0],
          quantity: quantity.value,
          _originalPrice: currentSku.value.price || goodsDetail.value.price,
          _originalCount: quantity.value,
          _originalSpecs: formattedSpecs,
          // 添加完整的商品信息
          _originalItem: {
            ...goodsDetail.value,
            selectedSpecs: formattedSpecs,
            currentSku: {
              ...currentSku.value,
              // 确保将敏感信息转换为字符串或简单对象
              id: currentSku.value.id,
              price: currentSku.value.price,
              stock: currentSku.value.stock,
              specs: Object.fromEntries(
                Object.entries(currentSku.value.specs).map(([k, v]) => [k, String(v)])
              )
            }
          }
        };
      } else {
        ElMessage.warning('请先选择商品规格');
        return;
      }
    } else {
      // 如果没有SKU，直接使用商品ID
      skuId = goodsDetail.value.id;
      
      // 构建直接购买的商品对象，确保与购物车商品格式一致
      directBuyItem = {
        skuId: skuId,
        goodsId: goodsDetail.value.id,
        title: goodsDetail.value.title,
        price: goodsDetail.value.price,
        count: quantity.value,
        selected: true,
        stock: goodsDetail.value.stock || 999,
        imageUrl: goodsDetail.value.images[0],
        cover: goodsDetail.value.images[0],
        specs: {},
        // 添加结算页和订单详情页需要的额外字段
        goodsName: goodsDetail.value.title,
        goodsCover: goodsDetail.value.images[0],
        quantity: quantity.value,
        _originalPrice: goodsDetail.value.price,
        _originalCount: quantity.value,
        _originalSpecs: {},
        // 添加完整的商品信息
        _originalItem: {
          ...goodsDetail.value,
          selectedSpecs: {},
          currentSku: null
        }
      };
    }
    
    console.log('准备立即购买directBuyItem:', directBuyItem);
    
    // 将完整商品信息和商品ID一起存储到本地
    localStorage.setItem('directBuyItem', JSON.stringify(directBuyItem));
    localStorage.setItem('directBuyGoodsId', goodsDetail.value.id.toString());
    localStorage.setItem('directBuySkuId', skuId.toString());
    
    // 添加临时订单数据到localStorage，以便订单详情页使用
    const orderData = {
      orderNo: 'temp_' + Date.now(), // 临时订单号
      totalAmount: directBuyItem.price * directBuyItem.count,
      paymentAmount: directBuyItem.price * directBuyItem.count,
      shippingFee: 0,
      discountAmount: 0,
      items: [directBuyItem],
      timestamp: new Date().getTime(),
      isDirectBuy: true, // 标记为直接购买
      _original: {
        totalAmount: directBuyItem.price * directBuyItem.count,
        shippingFee: 0,
        discount: 0,
        items: [directBuyItem]
      }
    };
    localStorage.setItem('checkout_order_data', JSON.stringify(orderData));
    
    // 组装一个简化版的订单数据，用于URL传递
    const simplifiedOrderData = {
      orderNo: orderData.orderNo,
      totalAmount: orderData.totalAmount,
      items: [{
        skuId: directBuyItem.skuId,
        goodsId: directBuyItem.goodsId,
        title: directBuyItem.title,
        price: directBuyItem.price,
        count: directBuyItem.count,
        specs: directBuyItem.specs,
        imageUrl: directBuyItem.imageUrl,
        cover: directBuyItem.cover
      }]
    };
    
    // 直接跳转到结算页面，带上直接购买标识和商品ID
    router.push({
      path: '/checkout',
      query: { 
        directBuy: 'true',
        goodsId: goodsDetail.value.id,
        skuId: skuId,
        orderData: encodeURIComponent(JSON.stringify(simplifiedOrderData)) // 添加简化版订单数据到URL参数
      }
    });
  } catch (error) {
    console.error('立即购买出错:', error)
    ElMessage.error('立即购买失败，请稍后再试')
  }
}

// 切换收藏状态
const toggleFavorite = () => {
  isFavorite.value = !isFavorite.value
  
  if (isFavorite.value) {
    ElMessage.success('已加入收藏')
  } else {
    ElMessage.info('已取消收藏')
  }
}

// 监听规格变化，自动调整数量上限
watch(currentStock, (newStock) => {
  if (quantity.value > newStock) {
    quantity.value = Math.max(1, newStock)
  }
})

// 监听路由参数变化，当商品id变化时重新加载详情
watch(() => route.params.id, (newId) => {
  if (newId && goodsId.value !== newId) {
    console.log(`商品ID变化: ${goodsId.value} -> ${newId}，重新加载商品详情`);
    // 更新当前商品ID
    goodsId.value = newId;
    
    // 清除之前的商品数据，避免新旧数据混合显示
    goodsDetail.value = null;
    quantity.value = 1;
    // 清除已选规格
    Object.keys(selectedSpecs).forEach(key => delete selectedSpecs[key]);
    
    // 重新加载商品详情
    loadGoodsDetail();
  }
}, { immediate: true })

// 监听商品详情变化，重新初始化Swiper
watch(() => goodsDetail.value?.images, (newImages) => {
  if (newImages?.length) {
    nextTick(() => {
      try {
        // 销毁之前的Swiper实例
        if (swiperInstance.value) {
          swiperInstance.value.destroy()
        }
        
        // 创建新的Swiper实例
        swiperInstance.value = new Swiper('.mySwiper', {
          effect: 'coverflow',
          grabCursor: true,
          centeredSlides: true,
          slidesPerView: 'auto',
          coverflowEffect: {
            rotate: 50,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: true,
          },
          pagination: {
            el: '.swiper-pagination',
            clickable: true,
          },
          navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
          },
        })
      } catch (error) {
        console.error('初始化Swiper失败:', error)
      }
    })
  }
}, { deep: true })

// 生命周期钩子
onMounted(async () => {
  // 加载初始商品详情
  await loadGoodsDetail()
  
  // 初始化Swiper (在商品详情加载完成后)
  nextTick(() => {
    if (goodsDetail.value?.images?.length) {
      swiperInstance.value = new Swiper('.mySwiper', {
        effect: 'coverflow',
        grabCursor: true,
        centeredSlides: true,
        slidesPerView: 'auto',
        coverflowEffect: {
          rotate: 50,
          stretch: 0,
          depth: 100,
          modifier: 1,
          slideShadows: true,
        },
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
      })
    }
  })
})

// 销毁Swiper实例
onBeforeUnmount(() => {
  if (swiperInstance.value) {
    swiperInstance.value.destroy(true, true)
  }
})
</script>

<style lang="scss" scoped>
.goods-detail-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  
  .loading-container {
    padding: 40px 20px;
  }
  
  .goods-header {
    margin-bottom: 20px;
  }
  
  .goods-content {
    display: flex;
    gap: 30px;
    margin-bottom: 30px;
    
    @media (max-width: 768px) {
      flex-direction: column;
    }
    
    // 商品图片轮播
    .goods-gallery {
      flex: 1;
      max-width: 500px;
      
      @media (max-width: 768px) {
        max-width: 100%;
      }
      
      :deep(.swiper) {
        padding: 50px 0;
      }
      
      :deep(.swiper-slide) {
        background-position: center;
        background-size: cover;
        width: 300px;
        height: 300px;
        
        img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
        }
      }
    }
    
    // 商品信息
    .goods-info {
      flex: 1;
      
      .goods-title {
        font-size: 20px;
        margin: 0 0 16px;
      }
      
      .goods-price-container {
        display: flex;
        align-items: baseline;
        margin-bottom: 16px;
        
        .price {
          font-size: 24px;
          font-weight: bold;
          color: #FF5000;
          margin-right: 10px;
          
          &::before {
            content: '¥';
            font-size: 16px;
          }
        }
        
        .original-price {
          font-size: 14px;
          color: #999;
          margin-right: 10px;
        }
      }
      
      .goods-data {
        display: flex;
        justify-content: space-between;
        margin-bottom: 16px;
        
        .sales {
          font-size: 14px;
          color: #666;
        }
        
        .rating {
          display: flex;
          align-items: center;
          
          .rating-count {
            margin-left: 8px;
            font-size: 12px;
            color: #999;
          }
        }
      }
      
      .goods-specs {
        margin-bottom: 16px;
        
        .spec-group {
          margin-bottom: 12px;
          
          .spec-title {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
          }
          
          .spec-options {
            margin-bottom: 8px;
          }
        }
      }
      
      .goods-stock {
        margin-bottom: 16px;
        
        .stock-label {
          font-size: 14px;
          color: #666;
          margin-right: 8px;
        }
        
        .stock-value {
          font-size: 14px;
          color: #333;
          
          &.low-stock {
            color: #FF5000;
          }
        }
      }
      
      .goods-quantity {
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        
        .quantity-label {
          font-size: 14px;
          color: #666;
          margin-right: 8px;
        }
      }
      
      .goods-actions {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        position: sticky;
        bottom: 0;
        background-color: #fff;
        padding: 10px 0;
        z-index: 10;
      }
      
      .goods-services {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        padding: 16px 0;
        border-top: 1px dashed #eee;
        
        .service-item {
          display: flex;
          align-items: center;
          font-size: 12px;
          color: #666;
          
          .el-icon {
            color: #67c23a;
            margin-right: 4px;
          }
        }
      }
    }
  }
  
  .goods-tabs {
    margin-top: 30px;
    
    .goods-detail-content {
      padding: 20px 0;
      
      :deep(img) {
        max-width: 100%;
        height: auto;
      }
    }
    
    .goods-reviews {
      padding: 20px 0;
    }
  }
}

// 加入购物车动画
:global(.cart-animation-element) {
  transform-origin: center center;
}

// Swiper样式
.goods-gallery {
  width: 100%;
  padding: 20px 0;
  
  .mySwiper {
    width: 100%;
    height: 400px;
    
    .swiper-slide {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 80%;
      border-radius: 8px;
      overflow: hidden;
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
    
    :deep(.swiper-pagination-bullet-active) {
      background-color: #ff5000;
    }
    
    :deep(.swiper-button-next),
    :deep(.swiper-button-prev) {
      color: #ff5000;
    }
  }
}
</style>
