# 支付模块文档

## 第一部分：总体逻辑

支付模块主要负责订单支付和结果处理功能，包括以下核心功能：

1. **支付方式管理**：
   - 获取可用支付方式
   - 展示支付方式选项
   - 支付方式选择

2. **支付流程处理**：
   - 支付创建与初始化
   - 支付二维码/链接生成
   - 支付状态轮询检测
   - 支付超时处理

3. **支付结果处理**：
   - 支付结果页面展示
   - 支付成功/失败处理
   - 支付结果回调

### 流程图：支付模块总体逻辑

```
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│                   │     │                   │     │                   │
│  支付方式管理      │     │  支付流程处理      │     │  支付结果处理      │
│                   │     │                   │     │                   │
└─────────┬─────────┘     └─────────┬─────────┘     └─────────┬─────────┘
          │                         │                         │
          ▼                         ▼                         ▼
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│ - 获取支付方式     │     │ - 支付创建        │     │ - 结果页展示      │
│ - 展示支付选项     │     │ - 二维码/链接生成  │     │ - 成功/失败处理   │
│ - 支付方式选择     │     │ - 状态轮询检测    │     │ - 结果回调        │
│                   │     │ - 超时处理        │     │                   │
└───────────────────┘     └───────────────────┘     └───────────────────┘
```

## 第二部分：组件到Store的逻辑

支付模块采用Vue3的组合式API和Pinia状态管理库，实现组件与状态管理的解耦。

### 核心组件

1. **Pay.vue**：
   - 支付主页面组件
   - 显示订单信息
   - 支付方式选择
   - 支付二维码/链接展示
   - 支付状态轮询

2. **PaymentResult.vue**：
   - 支付结果页面组件
   - 显示支付状态
   - 提供相关操作（查看订单、继续购物等）

3. **ResultSimple.vue**：
   - 通用结果页面组件
   - 支持多种结果类型（成功、失败、处理中）
   - 自定义操作按钮

### 状态管理 (usePaymentStore.js)

状态管理器封装了所有支付相关操作，包括：

- 支付方式数据管理
- 支付创建与初始化
- 支付状态轮询与检测
- 支付成功事件处理

### 核心状态和计算属性

- **状态**：
  - `paymentMethods`: 支付方式列表
  - `currentPayment`: 当前支付数据
  - `paymentStatus`: 当前支付状态
  - `loading`: 加载状态
  - `error`: 错误信息

### 数据流向

组件通过Pinia的usePaymentStore获取状态和方法，Store通过API服务与后端交互。支付状态通过事件总线在不同组件间通信。

### 流程图：组件到Store的数据流

```
┌───────────────────────────────────────────────┐
│                                               │
│                视图层 (View)                   │
│                                               │
├─────────────────┬─────────────────────────────┤
│                 │                             │
│     Pay.vue     │     PaymentResult.vue       │
│                 │                             │
└─────────┬───────┴───────────────┬─────────────┘
          │                       │
          │                       │
          ▼                       ▼
┌─────────────────────────────────────────────────┐
│                                                 │
│            状态管理 (usePaymentStore)            │
│                                                 │
├─────────────────┬───────────────────────────────┤
│                 │                               │
│     状态        │          方法                 │
│                 │                               │
├─────────────────┼───────────────────────────────┤
│ - paymentMethods│ - fetchPaymentMethods()       │
│ - currentPayment│ - initPayment()               │
│ - paymentStatus │ - checkPaymentStatus()        │
│ - loading       │ - startPolling()              │
│ - error         │ - clearPolling()              │
│                 │ - resetPayment()              │
│                 │ - onPaymentSuccess()          │
│                 │                               │
└─────────────────┴───────────────┬───────────────┘
                                  │
                                  │
                                  ▼
┌──────────────────────────────────────────────────┐
│                                                  │
│                      API 层                       │
│                                                  │
└──────────────────────────────────────────────────┘
```

## 第三部分：API层

支付模块的API封装在一个文件中：

1. **payment.js**：处理支付相关的全部API

### API架构

所有API请求都通过 `request.js` 工具函数封装，统一处理以下功能：
- 请求拦截：添加认证信息
- 响应拦截：统一错误处理
- Mock数据支持：开发环境使用Mock数据

### 真实API与Mock数据

项目同时支持真实API和Mock数据：
- 开发环境默认使用Mock数据
- 通过在请求中设置 `mock: true/false` 可以控制是否使用Mock数据

### Mock实现

- Mock数据实现了所有API的模拟响应
- 在 `src/mock/modules/payment.mock.js` 中定义了所有支付相关的Mock数据
- 支持模拟支付创建、状态查询等流程
- 实现了支付成功率控制，随着轮询次数增加，支付成功率递增

### 流程图：API调用与Mock处理流程

```
┌────────────────┐      ┌────────────────┐      ┌────────────────┐
│                │      │                │      │                │
│  组件/Store    │      │   请求工具     │      │   API服务器    │
│                │      │  request.js    │      │  或Mock服务    │
│                │      │                │      │                │
└────────┬───────┘      └────────┬───────┘      └────────┬───────┘
         │                       │                       │
         │  调用API服务          │                       │
         ├───────────────────────►                       │
         │                       │                       │
         │                       │ 判断是否使用Mock      │
         │                       ├─────────┐             │
         │                       │         │             │
         │                       │ ◄───────┘             │
         │                       │                       │
         │                       │ 如使用真实API         │
         │                       ├───────────────────────►
         │                       │                       │
         │                       │ 如使用Mock            │
         │                       │                       │
         │                       │ ┌──────────────────┐  │
         │                       │ │                  │  │
         │                       │ │  拦截原始请求    │  │
         │                       │ │                  │  │
         │                       │ └─────────┬────────┘  │
         │                       │           │           │
         │                       │           ▼           │
         │                       │ ┌──────────────────┐  │
         │                       │ │                  │  │
         │                       │ │ 处理Mock数据响应 │  │
         │                       │ │                  │  │
         │                       │ └─────────┬────────┘  │
         │                       │           │           │
         │                       │ ◄─────────┘           │
         │                       │                       │
         │  响应结果             │                       │
         ◄───────────────────────┤                       │
         │                       │                       │
         │                       │                       │
┌────────┴───────┐      ┌────────┴───────┐      ┌────────┴───────┐
│                │      │                │      │                │
│  组件/Store    │      │   请求工具     │      │   API服务器    │
│  处理响应      │      │  request.js    │      │  或Mock服务    │
│                │      │                │      │                │
└────────────────┘      └────────────────┘      └────────────────┘
```

## 支付流程图

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│         │     │         │     │         │     │         │     │         │
│ 订单确认 ├────►│ 选择支付 ├────►│ 创建支付 ├────►│ 状态轮询 ├────►│ 结果处理 │
│         │     │  方式   │     │         │     │         │     │         │
└─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘
```

## 核心API列表

### 支付API (payment.js)
- `createPayment(orderNo, method)` - 创建支付订单
- `checkStatus(paymentNo)` - 查询支付状态
- `getMethods()` - 获取可用支付方式 