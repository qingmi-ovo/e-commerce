<template>
  <div class="cart-container">
    <!-- 页面加载中 -->
    <el-skeleton v-if="store.loading" :rows="5" animated />
    
    <!-- 购物车为空 -->
    <el-empty 
      v-else-if="store.items.length === 0"
      description="购物车是空的"
      :image-size="200"
    >
      <template #extra>
        <el-button type="primary" @click="$router.push('/goods')">去购物</el-button>
      </template>
    </el-empty>
    
    <!-- 购物车内容 -->
    <template v-else>
      <!-- 顶部操作栏 -->
      <div class="action-bar">
        <div class="left">
          <el-checkbox 
            :model-value="store.isAllSelected" 
            @change="store.toggleSelectAll"
            :disabled="!hasValidItems"
          >全选</el-checkbox>
          <span class="selected-count">已选 {{ store.selectedCount }} 件</span>
        </div>
        <div class="right">
          <el-button 
            v-if="hasInvalidItems" 
            size="small" 
            @click="clearInvalidItems"
          >清空失效商品</el-button>
        </div>
      </div>
      
      <!-- 商品列表 -->
      <div class="cart-list">
        <div 
          v-for="item in store.items" 
          :key="item.skuId" 
          :class="['cart-item', { 'invalid': item.isInvalid || item.stock === 0 }]"
        >
          <!-- 选择框 -->
          <div class="item-select">
            <el-checkbox 
              :model-value="isSelected(item.skuId)" 
              @change="() => store.toggleSelect(item.skuId)"
              :disabled="item.isInvalid || item.stock === 0"
            />
          </div>
          
          <!-- 商品信息 -->
          <div class="item-info">
            <div class="item-image">
              <img :src="item.imageUrl" :alt="item.title">
              <div v-if="item.isInvalid || item.stock === 0" class="invalid-mask">
                <span>{{ item.stock === 0 ? '已售罄' : '商品已下架' }}</span>
              </div>
            </div>
            
            <div class="item-details">
              <h3 class="item-title">{{ item.title }}</h3>
              <div class="item-specs" v-if="item.specs">
                <span v-for="(spec, key) in item.specs" :key="key" class="spec-tag">
                  {{ key }}: {{ spec.label || spec.value || spec }}
                </span>
              </div>
              <div class="item-price">
                <span class="price">¥{{ item.price.toFixed(2) }}</span>
              </div>
            </div>
          </div>
          
          <!-- 商品操作 -->
          <div class="item-actions">
            <!-- 数量操作 -->
            <div class="item-count">
              <el-input-number 
                v-model="item.count" 
                :min="1" 
                :max="item.stock || 1"
                :disabled="item.isInvalid || item.stock === 0"
                @change="value => handleCountChange(item.skuId, value)"
                size="small"
              />
            </div>
            
            <!-- 小计 -->
            <div class="item-subtotal">
              <span>¥{{ (item.price * item.count).toFixed(2) }}</span>
            </div>
            
            <!-- 删除按钮 -->
            <div class="item-delete">
              <el-popconfirm
                title="确定要删除这个商品吗？"
                @confirm="store.removeItem(item.skuId)"
                width="220"
              >
                <template #reference>
                  <el-button link class="delete-btn">删除</el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 底部结算栏 -->
      <div class="checkout-bar">
        <div class="checkout-info">
          <div class="checkout-left">
            <el-checkbox 
              :model-value="store.isAllSelected" 
              @change="store.toggleSelectAll"
              :disabled="!hasValidItems"
            >全选</el-checkbox>
            
            <el-button 
              link 
              class="batch-delete" 
              :disabled="store.selectedCount === 0"
              @click="handleBatchDelete"
            >
              删除选中
            </el-button>
          </div>
          
          <div class="checkout-right">
            <div class="price-box">
              <div class="total-count">
                已选择 <span>{{ store.selectedCount }}</span> 件商品
              </div>
              <div class="total-price">
                合计：<span>¥{{ store.totalPrice.toFixed(2) }}</span>
              </div>
            </div>
            
            <el-button 
              type="danger" 
              size="large" 
              :disabled="store.selectedCount === 0"
              @click="handleCheckout"
            >
              结算
            </el-button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCartStore } from '../store/useCartStore'
import debounce from 'lodash/debounce'

// 路由
const router = useRouter()

// 购物车Store
const store = useCartStore()

// 计算属性
const hasValidItems = computed(() => {
  return store.items.some(item => !item.isInvalid && item.stock > 0)
})

const hasInvalidItems = computed(() => {
  return store.items.some(item => item.isInvalid || item.stock === 0)
})

// 检查商品是否被选中
const isSelected = (skuId) => {
  return store.selectedIds.has(skuId)
}

// 数量变更处理（使用防抖）
const handleCountChange = debounce((skuId, value) => {
  const item = store.items.find(item => item.skuId === skuId)
  if (!item) return
  
  // 获取原始数量
  const originalCount = item.count
  
  // 检查数量变更类型
  if (value > originalCount) {
    // 增加数量
    store.increaseCount(skuId, value - originalCount)
  } else if (value < originalCount) {
    // 减少数量
    store.decreaseCount(skuId, originalCount - value)
  }
}, 500)

// 清空失效商品
const clearInvalidItems = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有失效商品吗？', 
      '提示', 
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    store.clearInvalidItems()
    ElMessage.success('已清空失效商品')
  } catch {
    // 用户取消操作
  }
}

// 批量删除选中商品
const handleBatchDelete = async () => {
  if (store.selectedCount === 0) return
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${store.selectedCount} 件商品吗？`, 
      '提示', 
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 获取所有选中的商品ID
    const selectedItems = store.items.filter(item => 
      store.selectedIds.has(item.skuId)
    )
    
    // 逐个删除
    selectedItems.forEach(item => {
      store.removeItem(item.skuId)
    })
    
    ElMessage.success('已删除选中商品')
  } catch {
    // 用户取消操作
  }
}

// 结算处理
const handleCheckout = () => {
  if (store.selectedCount === 0) {
    ElMessage.warning('请至少选择一件商品')
    return
  }
  
  // 进入结算页面
  router.push('/checkout')
}

// 生命周期钩子
onMounted(async () => {
  // 获取购物车数据
  await store.fetchCart()
  
  // 输出购物车商品信息，便于调试
  console.log('购物车商品列表:', store.items.map(item => ({
    title: item.title,
    price: item.price,
    specs: item.specs
  })))
})
</script>

<style lang="scss" scoped>
.cart-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
}

.action-bar {
  background: #fff;
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .left {
    display: flex;
    align-items: center;
    
    .selected-count {
      margin-left: 15px;
      color: #666;
    }
  }
}

.cart-list {
  flex: 1;
}

.cart-item {
  background: #fff;
  margin-bottom: 15px;
  padding: 20px;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  transition: all 0.3s;
  
  &.invalid {
    opacity: 0.6;
    
    .el-checkbox {
      cursor: not-allowed;
    }
  }
  
  .item-select {
    flex: 0 0 50px;
  }
  
  .item-info {
    flex: 1;
    display: flex;
    
    .item-image {
      position: relative;
      width: 80px;
      height: 80px;
      margin-right: 15px;
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 4px;
      }
      
      .invalid-mask {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 14px;
        border-radius: 4px;
      }
    }
    
    .item-details {
      flex: 1;
      
      .item-title {
        margin: 0 0 8px;
        font-size: 16px;
        font-weight: 500;
        color: #333;
        line-height: 1.4;
      }
      
      .item-specs {
        margin: 8px 0;
        font-size: 12px;
        color: #666;
        
        .spec-tag {
          display: inline-block;
          margin-right: 10px;
          background-color: #f5f5f5;
          padding: 2px 8px;
          border-radius: 4px;
        }
      }
      
      .item-price {
        font-size: 16px;
        color: #f56c6c;
        font-weight: 500;
      }
    }
  }
  
  .item-actions {
    display: flex;
    align-items: center;
    
    .item-count {
      width: 140px;
    }
    
    .item-subtotal {
      width: 120px;
      text-align: center;
      font-size: 16px;
      font-weight: 500;
      color: #f56c6c;
    }
    
    .item-delete {
      width: 80px;
      text-align: center;
      
      .delete-btn {
        color: #909399;
        
        &:hover {
          color: #f56c6c;
        }
      }
    }
  }
}

.checkout-bar {
  position: sticky;
  bottom: 0;
  background: #fff;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  margin-top: 20px;
  padding: 15px 20px;
  border-radius: 6px;
  
  .checkout-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .checkout-left {
      display: flex;
      align-items: center;
      
      .batch-delete {
        margin-left: 15px;
      }
    }
    
    .checkout-right {
      display: flex;
      align-items: center;
      
      .price-box {
        margin-right: 20px;
        text-align: right;
        
        .total-count {
          font-size: 14px;
          color: #666;
          margin-bottom: 5px;
          
          span {
            color: #f56c6c;
            font-weight: 500;
          }
        }
        
        .total-price {
          font-size: 16px;
          color: #333;
          
          span {
            color: #f56c6c;
            font-size: 22px;
            font-weight: 700;
          }
        }
      }
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .cart-item {
    flex-direction: column;
    align-items: flex-start;
    
    .item-select {
      align-self: flex-start;
      margin-bottom: 10px;
    }
    
    .item-info {
      width: 100%;
      margin-bottom: 15px;
    }
    
    .item-actions {
      width: 100%;
      justify-content: space-between;
    }
  }
  
  .checkout-bar {
    .checkout-info {
      flex-direction: column;
      
      .checkout-left {
        margin-bottom: 15px;
        width: 100%;
        justify-content: space-between;
      }
      
      .checkout-right {
        width: 100%;
        justify-content: space-between;
      }
    }
  }
}
</style>
