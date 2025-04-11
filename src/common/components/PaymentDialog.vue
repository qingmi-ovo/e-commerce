<template>
  <el-dialog
    v-model="dialogVisible"
    title="支付确认"
    width="480px"
    center
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <div class="payment-dialog">
      <div class="payment-header">
        <h3 class="payment-title">支付金额</h3>
        <div class="payment-amount">¥{{ formattedAmount }}</div>
      </div>
      
      <div class="payment-qrcode" v-if="paymentMethod === 'wechat' || paymentMethod === 'alipay'">
        <div class="qrcode-wrapper">
          <img :src="qrCodeUrl" alt="支付二维码" class="qrcode-image" />
        </div>
        <p class="qrcode-tip">请使用{{ paymentMethodName }}扫码支付</p>
      </div>
      
      <div class="payment-actions">
        <el-button @click="handleCancel">取消支付</el-button>
        <el-button type="primary" @click="handleConfirm">确认支付</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, watch } from 'vue'

// 定义组件属性
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  paymentAmount: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    default: 'wechat'
  }
})

// 定义事件
const emit = defineEmits(['update:modelValue', 'cancel', 'confirm'])

// 计算属性：对话框可见性
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 计算属性：格式化的支付金额
const formattedAmount = computed(() => {
  const amount = Number(props.paymentAmount)
  return isNaN(amount) ? '0.00' : amount.toFixed(2)
})

// 计算属性：支付方式名称
const paymentMethodName = computed(() => {
  switch (props.paymentMethod) {
    case 'wechat':
      return '微信'
    case 'alipay':
      return '支付宝'
    default:
      return '微信'
  }
})

// 模拟的二维码URL
const qrCodeUrl = computed(() => {
  // 实际应用中，这里应该是动态生成的支付二维码
  return 'data:image/png;base64,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'
})

// 处理取消按钮点击
const handleCancel = () => {
  dialogVisible.value = false
  emit('cancel')
}

// 处理确认按钮点击
const handleConfirm = () => {
  dialogVisible.value = false
  emit('confirm')
}
</script>

<style lang="scss" scoped>
.payment-dialog {
  text-align: center;
  
  .payment-header {
    margin-bottom: 20px;
    
    .payment-title {
      margin: 0 0 10px;
      font-size: 16px;
      color: #666;
    }
    
    .payment-amount {
      font-size: 28px;
      font-weight: bold;
      color: #f56c6c;
    }
  }
  
  .payment-qrcode {
    padding: 20px 0;
    
    .qrcode-wrapper {
      width: 200px;
      height: 200px;
      margin: 0 auto 10px;
      
      .qrcode-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }
    
    .qrcode-tip {
      color: #666;
      margin: 10px 0 0;
    }
  }
  
  .payment-actions {
    margin-top: 20px;
  }
}
</style> 