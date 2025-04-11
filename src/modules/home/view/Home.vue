<template>
  <div class="home-container">
    <!-- 顶部搜索栏 -->
    <div class="search-bar">
      <div class="search-input-wrapper">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索商品"
          class="search-input"
          @keyup.enter="handleSearch"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button @click="handleSearch">搜索</el-button>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧分类导航 -->
      <div class="category-nav">
        <div class="nav-header">分类</div>
        <ul class="category-list">
          <li class="category-item" @click="navigateToGoods({name: '户外高端装备'})">
            <el-icon><ShoppingBag /></el-icon>
            <span>户外高端装备</span>
          </li>
          <li class="category-item" @click="navigateToGoods({name: '电脑配件办公'})">
            <el-icon><Monitor /></el-icon>
            <span>电脑配件办公</span>
          </li>
          <li class="category-item" @click="navigateToGoods({name: '时尚服装鞋包'})">
            <el-icon><Shirt /></el-icon>
            <span>时尚服装鞋包</span>
          </li>
          <li class="category-item" @click="navigateToGoods({name: '美食生鲜健康'})">
            <el-icon><Apple /></el-icon>
            <span>美食生鲜健康</span>
          </li>
          <li class="category-item" @click="navigateToGoods({name: '运动户外'})">
            <el-icon><Football /></el-icon>
            <span>运动户外</span>
          </li>
          <li class="category-item" @click="navigateToGoods({name: '家居家装'})">
            <el-icon><GoodsFilled /></el-icon>
            <span>家居家装</span>
          </li>
          <li class="category-item" @click="navigateToGoods({name: '图书音像'})">
            <el-icon><Reading /></el-icon>
            <span>图书音像</span>
          </li>
          <li class="category-item" @click="navigateToGoods({name: '美妆个护'})">
            <el-icon><MagicStick /></el-icon>
            <span>美妆个护</span>
          </li>
          <li class="category-item" @click="navigateToGoods({name: '母婴童装玩具'})">
            <el-icon><Opportunity /></el-icon>
            <span>母婴童装玩具</span>
          </li>
          <li class="category-item" @click="navigateToGoods({name: '热门好物'})">
            <el-icon><TrendCharts /></el-icon>
            <span>热门好物</span>
          </li>
        </ul>
      </div>

      <!-- 中间轮播图 -->
      <div class="banner-container">
        <el-carousel height="100%" indicator-position="" arrow="always">
          <el-carousel-item v-for="(item, index) in banners" :key="index">
            <div class="banner-item" @click="navigateToGoods(item)" :class="`gradient-bg-${index+1}`">
              <div class="banner-content">
                <h3>{{ item.title }}</h3>
                <p>{{ item.desc }}</p>
                <el-button type="primary" size="small" class="banner-btn">立即查看</el-button>
              </div>
            </div>
          </el-carousel-item>
        </el-carousel>
      </div>

      <!-- 右侧品质商品区 -->
      <div class="quality-goods">
        <div class="quality-header">品质好货</div>
        <div class="quality-list">
          <div
            v-for="(item, index) in qualityTypes"
            :key="index"
            class="quality-item"
            @click="navigateToGoods(item)"
          >
            <div class="quality-icon" :class="`gradient-icon-${index+1}`">
              <el-icon class="icon" size="24">
                <component :is="getQualityIcon(index)" />
              </el-icon>
            </div>
            <span>{{ item.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 推荐商品区域 -->
    <div class="recommended-goods">
      <div class="section-title">
        <span>热门推荐</span>
        <el-button link size="small" @click="navigateToGoods({name: '热门推荐'})">查看更多</el-button>
      </div>
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="1" animated />
        <div class="goods-grid">
          <el-skeleton 
            v-for="i in 5" 
            :key="i" 
            class="goods-card skeleton"
            animated
          >
            <template #template>
              <div class="skeleton-item img"></div>
              <div class="skeleton-item title"></div>
              <div class="skeleton-item price"></div>
              <div class="skeleton-item desc"></div>
            </template>
          </el-skeleton>
        </div>
      </div>
      <div v-else-if="recommendedGoods.length > 0" class="goods-grid">
        <div
          v-for="item in recommendedGoods"
          :key="item.id"
          class="goods-card"
          @click="goToDetail(item.id)"
          :style="{ '--item-theme-color': item.themeColor || '#f5f5f5' }"
        >
          <div class="goods-img-wrapper" :style="{ backgroundColor: item.themeColor || '#f5f5f5' }">
            <div class="goods-img" :style="{ backgroundColor: item.themeColor || '#f5f5f5' }"></div>
          </div>
          <div class="goods-info">
            <h3 class="goods-title">{{ item.title }}</h3>
            <p class="price">{{ item.price.toFixed(2) }}</p>
            <div class="goods-meta">
              <span class="sales">月销 {{ item.salesCount }}件</span>
              <span class="rating">
                <el-rate
                  v-model="item.rating"
                  disabled
                  :colors="['#FF9800', '#FF9800', '#FF9800']"
                  :max="5"
                  :score-template="String(item.rating)"
                />
              </span>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无推荐商品" />
      <el-result v-if="loadError" 
        icon="error" 
        title="加载失败" 
        sub-title="无法获取推荐商品数据"
      >
        <template #extra>
          <el-button type="primary" @click="fetchRecommendedGoods">重试</el-button>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Search, 
  ShoppingBag, 
  ShoppingCart, 
  Monitor, 
  Collection as Shirt, 
  Apple, 
  Football, 
  Reading, 
  Edit as MagicStick, 
  TrendCharts, 
  Goods as GoodsFilled,
  House,
  Promotion,
  Star,
  Bell as Opportunity 
} from '@element-plus/icons-vue'
import { goodsAPI } from '../../../api/goods/goods'

// 路由
const router = useRouter()

// 搜索关键词
const searchKeyword = ref('')

// 轮播图数据
const banners = ref([
  {
    title: '宅家刷剧好伴侣',
    desc: '休闲零食美味升级',
    imgUrl: 'https://source.unsplash.com/1200x500/?snacks,food',
    keyword: '零食'
  },
  {
    title: '春季新品上市',
    desc: '焕新衣橱 时尚穿搭',
    imgUrl: 'https://source.unsplash.com/1200x500/?fashion,clothes',
    keyword: '春装'
  },
  {
    title: '数码新品发布',
    desc: '科技改变生活',
    imgUrl: 'https://source.unsplash.com/1200x500/?electronics,tech',
    keyword: '数码'
  }
])

// 品质好货类型
const qualityTypes = ref([
  {
    name: '品质家居',
    imgUrl: 'https://source.unsplash.com/150x150/?home,furniture',
    keyword: '家居'
  },
  {
    name: '超值优惠',
    imgUrl: 'https://source.unsplash.com/150x150/?sale,discount',
    keyword: '优惠'
  },
  {
    name: '品质好货',
    imgUrl: 'https://source.unsplash.com/150x150/?premium,quality',
    keyword: '品质'
  },
  {
    name: '创意选品',
    imgUrl: 'https://source.unsplash.com/150x150/?creative,design',
    keyword: '创意'
  }
])

// 推荐商品数据
const recommendedGoods = ref([])
const loading = ref(false)
const loadError = ref(false)

// 处理搜索
const handleSearch = () => {
  if (searchKeyword.value.trim()) {
    router.push({
      path: '/goods',
      query: { keyword: searchKeyword.value.trim() }
    })
  }
}

// 导航到商品列表页
const navigateToGoods = (item) => {
  const keyword = item.keyword || item.name
  router.push({
    path: '/goods',
    query: { keyword }
  })
}

// 跳转到商品详情
const goToDetail = (id) => {
  router.push(`/goods/${id}`)
}

// 获取推荐商品
const fetchRecommendedGoods = async () => {
  loading.value = true
  loadError.value = false
  try {
    const res = await goodsAPI.fetchList({ page: 1, pageSize: 10 })
    if (res && res.data && res.data.list) {
      recommendedGoods.value = res.data.list
    } else {
      recommendedGoods.value = []
    }
  } catch (error) {
    console.error('获取推荐商品失败:', error)
    recommendedGoods.value = []
    loadError.value = true
  } finally {
    loading.value = false
  }
}

// 获取品质好货图标
const getQualityIcon = (index) => {
  const icons = [
    'House', // 品质家居
    'Promotion', // 超值优惠
    'GoodsFilled', // 品质好货
    'Star' // 创意选品
  ]
  return icons[index] || 'GoodsFilled'
}

onMounted(() => {
  // 获取推荐商品
  fetchRecommendedGoods()
})
</script>

<style lang="scss">
@use '../style/home.scss' as *;

.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;

  // 搜索栏样式
  .search-bar {
    margin-bottom: 20px;
    background-color: white;
    padding: 15px;
    border-radius: $border-radius;
    box-shadow: $box-shadow;

    .search-input-wrapper {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;

      .search-input {
        width: 100%;
        transition: all 0.3s ease;
      }
    }
  }

  // 主要内容区域样式
  .main-content {
    display: grid;
    grid-template-columns: 200px 1fr 180px;
    grid-auto-rows: minmax(500px, auto);
    margin-bottom: 20px;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.08);
    
    > div {
      height: 100%;
      transition: all 0.3s ease;
    }

    // 左侧分类导航
    .category-nav {
      width: 100%;
      background-color: white;
      border-right: 1px solid #f0f0f0;
      display: flex;
      flex-direction: column;

      .nav-header {
        padding: 15px;
        font-weight: bold;
        font-size: 16px;
        border-bottom: 1px solid #f0f0f0;
        background-color: #f8f8f8;
        text-align: center;
        color: #333;
      }

      .category-list {
        list-style: none;
        padding: 0;
        margin: 0;
        flex-grow: 1;

        .category-item {
          padding: 12px 15px;
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 1px solid #f5f5f5;
          display: flex;
          align-items: center;

          .el-icon {
            margin-right: 10px;
            color: #ff5000;
            font-size: 18px;
          }
          
          span {
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          &:hover {
            background-color: #fff7e6;
            color: #ff5000;
            transform: translateX(3px);
          }
          
          &:last-child {
            border-bottom: none;
          }
        }
      }
    }

    // 中间轮播图
    .banner-container {
      width: 100%;
      height: 100%;
      background-color: white;
      display: flex;
      overflow: hidden;
      position: relative;
      
      .el-carousel, .el-carousel__container {
        height: 100% !important;
        width: 100%;
      }
      
      :deep(.el-carousel__container) {
        height: 100% !important;
      }
      
      :deep(.el-carousel__item) {
        height: 100% !important;
      }
      
      :deep(.el-carousel__indicators) {
        bottom: 10px;
      }
      
      ::-webkit-scrollbar {
        width: 0;
        height: 0;
        display: none;
      }

      .banner-item {
        position: relative;
        height: 100%;
        display: flex;
        align-items: center;
        padding: 0 10%;
        cursor: pointer;
        
        .banner-content {
          position: relative;
          bottom: auto;
          left: auto;
          max-width: 500px;
          color: white;
          text-shadow: 0 1px 5px rgba(0, 0, 0, 0.3);
          
          h3 {
            font-size: 36px;
            margin-bottom: 15px;
            font-weight: bold;
          }
          
          p {
            font-size: 18px;
            margin-bottom: 25px;
            opacity: 0.9;
          }
          
          .banner-btn {
            font-size: 14px;
            padding: 8px 20px;
            border-radius: 20px;
          }
        }
      }
    }

    // 右侧品质商品区
    .quality-goods {
      width: 100%;
      background-color: white;
      border-left: 1px solid #f0f0f0;
      display: flex;
      flex-direction: column;

      .quality-header {
        padding: 15px;
        font-weight: bold;
        font-size: 16px;
        border-bottom: 1px solid #f0f0f0;
        background-color: #f8f8f8;
        text-align: center;
        color: #ff5000;
      }

      .quality-list {
        display: flex;
        flex-direction: column;
        gap: 0;
        padding: 0;
        flex-grow: 1;

        .quality-item {
          display: flex;
          align-items: center;
          text-align: left;
          cursor: pointer;
          padding: 15px;
          transition: all 0.2s ease;
          border-bottom: 1px solid #f5f5f5;

          img {
            width: 50px;
            height: 50px;
            object-fit: cover;
            border-radius: 50%;
            margin-right: 12px;
            margin-bottom: 0;
            border: 2px solid #f0f0f0;
          }

          span {
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #333;
            font-weight: 500;
          }

          &:hover {
            background-color: #fff7e6;
            transform: translateX(-3px);
            
            img {
              border-color: #ffcba8;
            }
            
            span {
              color: #ff5000;
            }
          }
          
          &:last-child {
            border-bottom: none;
          }
        }
      }
    }
  }

  // 推荐商品区域
  .recommended-goods {
    background-color: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.08);
    margin-top: 30px;

    .section-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #f0f0f0;

      span {
        font-size: 18px;
        font-weight: bold;
        position: relative;
        padding-left: 10px;

        &:before {
          content: '';
          position: absolute;
          left: 0;
          top: 2px;
          bottom: 2px;
          width: 3px;
          background-color: #ff5000;
          border-radius: 3px;
        }
      }
      
      .el-button--text,
      .el-button.is-link {
        color: #1989fa;
        padding: 0;
        font-size: 14px;
        
        &:hover {
          color: #40a9ff;
        }
      }
    }

    .loading-container {
      .el-skeleton {
        margin-bottom: 20px;
      }
      
      .goods-card.skeleton {
        height: 280px;
        padding: 10px;
        
        .skeleton-item {
          background: linear-gradient(90deg, #f2f2f2 25%, #e6e6e6 50%, #f2f2f2 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
          
          &.img {
            width: 100%;
            height: 160px;
            margin-bottom: 10px;
          }
          
          &.title {
            width: 100%;
            height: 16px;
            margin-bottom: 15px;
          }
          
          &.price {
            width: 40%;
            height: 20px;
            margin-bottom: 15px;
          }
          
          &.desc {
            width: 80%;
            height: 12px;
          }
        }
      }
    }

    .goods-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 16px;

      @media (max-width: 1200px) {
        grid-template-columns: repeat(4, 1fr);
      }

      @media (max-width: 992px) {
        grid-template-columns: repeat(3, 1fr);
      }

      @media (max-width: 768px) {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (max-width: 576px) {
        grid-template-columns: 1fr;
      }

      .goods-card {
        background-color: white;
        border-radius: 8px;
        overflow: hidden;
        transition: all 0.3s ease;
        cursor: pointer;
        border: 1px solid #f0f0f0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

        &:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
          border-color: #e0e0e0;
        }

        .goods-img-wrapper {
          width: 100%;
          height: 0;
          padding-top: 100%;
          position: relative;
          overflow: hidden;
          background: linear-gradient(45deg, #f5f5f5, #e0e0e0);

          .goods-img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            transition: transform 0.3s ease;
            z-index: 1;
          }

          &:hover .goods-img {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }

        .goods-info {
          padding: 12px;
          background: linear-gradient(to bottom, #fff 0%, #fafafa 100%);

          .goods-title {
            margin: 0;
            font-size: 14px;
            font-weight: 400;
            line-height: 1.4;
            height: 40px;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            line-clamp: 2;
            -webkit-box-orient: vertical;
            color: #333;
          }

          .price {
            color: #ff5000;
            font-size: 16px;
            font-weight: 600;
            margin: 8px 0;

            &:before {
              content: '¥';
              font-size: 14px;
            }
          }

          .goods-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            color: #999;
            border-top: 1px dashed #f0f0f0;
            padding-top: 8px;

            .sales {
              display: flex;
              align-items: center;
              
              &:before {
                content: '';
                display: inline-block;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background-color: #ececec;
                margin-right: 5px;
              }
            }

            .rating {
              display: flex;
              align-items: center;
            }

            .el-rate {
              font-size: 12px;
              margin-left: 5px;
            }
          }
        }
      }
    }
  }
}

/* 为了解决轮播图可能存在的其他滚动问题，添加以下全局样式 */
.home-container {
  .main-content {
    .banner-container {
      :deep(.el-carousel) {
        overflow: hidden !important;
      }
      
      :deep(.el-carousel__container) {
        overflow: hidden !important;
      }
    }
  }
  
  /* 优化按钮样式 */
  :deep(.el-button--text) {
    &.el-button--small {
      color: #1989fa;
      
      &:hover, &:focus {
        color: #40a9ff;
        background-color: transparent;
      }
    }
  }
}

/* 轮播图渐变背景 */
.gradient-bg-1 {
  background: linear-gradient(135deg, #FF9500, #FF5E3A);
  background-size: 200% 200%;
  animation: gradientBG 15s ease infinite;
}

.gradient-bg-2 {
  background: linear-gradient(135deg, #42B883, #347474);
  background-size: 200% 200%;
  animation: gradientBG 15s ease infinite;
}

.gradient-bg-3 {
  background: linear-gradient(135deg, #4158D0, #C850C0);
  background-size: 200% 200%;
  animation: gradientBG 15s ease infinite;
}

@keyframes gradientBG {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* 品质好货图标样式 */
.quality-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: inherit;
    filter: blur(2px);
    opacity: 0.8;
  }
  
  .icon {
    color: white;
    position: relative;
    z-index: 1;
  }
}

.gradient-icon-1 {
  background: linear-gradient(135deg, #36D1DC, #5B86E5);
}

.gradient-icon-2 {
  background: linear-gradient(135deg, #FF8008, #FFC837);
}

.gradient-icon-3 {
  background: linear-gradient(135deg, #FF416C, #FF4B2B);
}

.gradient-icon-4 {
  background: linear-gradient(135deg, #00C9FF, #92FE9D);
}

/* 修改banner内容样式 */
.banner-item {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 10%;
  
  .banner-content {
    position: relative;
    bottom: auto;
    left: auto;
    max-width: 500px;
    
    h3 {
      font-size: 36px;
      margin-bottom: 15px;
    }
    
    p {
      font-size: 18px;
      margin-bottom: 30px;
      opacity: 0.9;
    }
    
    .banner-btn {
      font-size: 16px;
      padding: 10px 25px;
      border-radius: 30px;
    }
  }
}

/* 美化左右箭头 */
:deep(.el-carousel__arrow) {
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  font-size: 16px;
  width: 36px;
  height: 36px;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.5);
  }
}
</style> 