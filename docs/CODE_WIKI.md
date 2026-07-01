# 煮理人 - Code Wiki

## 目录
1. [项目概述](#项目概述)
2. [技术架构](#技术架构)
3. [项目结构](#项目结构)
4. [数据库设计](#数据库设计)
5. [云函数模块](#云函数模块)
6. [前端页面](#前端页面)
7. [样式系统](#样式系统)
8. [开发指南](#开发指南)

---

## 项目概述

### 项目简介
**煮理人**是一款微信小程序，帮助同居情侣或家庭成员管理厨房相关的日常事务。主要功能包括：
- 任务分配与积分奖励系统
- 菜谱管理
- 冰箱库存管理
- 智能晚饭推荐
- 情侣互动（签到、夸夸）
- 积分排行榜
- 积分商城

### AppID
```
wxe5004372672f61e1
```

### 技术栈
| 层级 | 技术 |
|------|------|
| 前端 | 微信原生小程序 (WXML + WXSS + JS) |
| 后端 | 微信云开发 (CloudBase) |
| 数据库 | 云开发 JSON 文档数据库 |
| 云函数 | Node.js + wx-server-sdk ~2.6.3 |

---

## 技术架构

### 整体架构
```
┌─────────────────────────────────────────────────────┐
│                    微信小程序端                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │   Home   │  │   Task   │  │  Recipe  │  Pages  │
│  └──────────┘  └──────────┘  └──────────┘         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  Fridge  │  │   Mine   │  │  Login   │         │
│  └──────────┘  └──────────┘  └──────────┘         │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                 微信云开发平台                       │
│  ┌───────────────────────────────────────────────┐ │
│  │              Cloud Functions                  │ │
│  │  getOpenId, familyManager, taskManager...     │ │
│  └───────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────┐ │
│  │              Cloud Database                   │ │
│  │  users, families, tasks, recipes...           │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 数据流向
1. 前端页面调用 `wx.cloud.callFunction()` 发起请求
2. 云函数接收请求，通过 `wx-server-sdk` 访问数据库
3. 云函数处理业务逻辑，返回统一格式 `{success: boolean, data?: any, message?: string}`
4. 前端接收响应，更新页面状态

---

## 项目结构

```
home-task/
├── cloudfunctions/              # 云函数目录
│   ├── getOpenId/              # 用户登录与获取 OpenId
│   │   ├── index.js
│   │   ├── config.json
│   │   └── package.json
│   ├── familyManager/          # 家庭管理（创建/加入/离开）
│   ├── taskManager/            # 任务管理（CRUD + 状态流转）
│   ├── fridgeManager/          # 冰箱库存管理
│   ├── recipeManager/          # 菜谱管理
│   ├── scoreManager/           # 积分管理与排行榜
│   ├── interactionManager/     # 互动（签到 + 夸夸）
│   ├── recommendManager/       # 智能推荐
│   ├── shopManager/            # 积分商城
│   └── quickstartFunctions/    # 示例函数
│
├── miniprogram/                # 小程序前端
│   ├── pages/                  # 页面
│   │   ├── home/               # 首页
│   │   ├── login/              # 登录页
│   │   ├── family/             # 家庭管理页
│   │   ├── task/               # 任务列表页
│   │   ├── task-create/        # 任务创建页
│   │   ├── recipe/             # 菜谱列表页
│   │   ├── recipe-create/      # 菜谱创建页
│   │   ├── recipe-detail/      # 菜谱详情页
│   │   ├── fridge/             # 冰箱页
│   │   ├── interaction/        # 互动页
│   │   ├── rank/               # 排行榜页
│   │   ├── shop/               # 积分商城页
│   │   └── mine/               # 我的页面
│   ├── components/             # 组件
│   │   └── cloudTipModal/      # 云提示弹窗
│   ├── images/                 # 图片资源
│   │   └── icons/              # 图标
│   ├── app.js                  # 应用入口
│   ├── app.json                # 全局配置
│   ├── app.wxss                # 全局样式
│   ├── envList.js              # 环境列表
│   └── sitemap.json            # 站点地图
│
├── project.config.json         # 项目配置
├── uploadCloudFunction.sh      # 云函数上传脚本
├── README.md                   # 项目说明
└── CODE_WIKI.md               # 本文档
```

---

## 数据库设计

### 集合总览

| 集合名称 | 用途 |
|----------|------|
| `users` | 用户信息 |
| `families` | 家庭信息 |
| `tasks` | 任务信息 |
| `recipes` | 菜谱信息 |
| `fridge_items` | 冰箱库存 |
| `score_logs` | 积分日志 |
| `cooking_logs` | 烹饪记录 |
| `check_ins` | 签到记录 |
| `shop_items` | 商城商品 |
| `redeem_logs` | 兑换记录 |

---

### 1. users 集合

**字段说明：**
```javascript
{
  _id: "用户ID",
  openId: "微信OpenId",
  nickName: "昵称",
  avatarUrl: "头像URL",
  familyId: "关联家庭ID",
  score: 0,                    // 积分
  level: 1,                    // 等级
  createdAt: Date,             // 创建时间
  updatedAt: Date              // 更新时间
}
```

**索引建议：**
- `openId` (唯一索引)
- `familyId`

---

### 2. families 集合

**字段说明：**
```javascript
{
  _id: "家庭ID",
  name: "家庭名称",
  inviteCode: "6位邀请码",     // 如: ABC123
  members: [                   // 成员列表
    {
      userId: "用户ID",
      openId: "用户OpenId",
      nickName: "昵称",
      avatarUrl: "头像",
      role: "owner" | "member", // 角色
      joinedAt: Date           // 加入时间
    }
  ],
  createdBy: "创建者ID",
  startDate: Date,             // 共同生活起始日
  createdAt: Date
}
```

**索引建议：**
- `inviteCode` (唯一索引)
- `members.userId`

---

### 3. tasks 集合

**字段说明：**
```javascript
{
  _id: "任务ID",
  familyId: "家庭ID",
  title: "任务标题",
  description: "任务描述",
  rewardScore: 10,             // 奖励积分
  status: "pending" | "doing" | "review" | "done" | "cancel", // 状态
  creatorId: "创建者ID",
  assigneeId: "执行人ID",      // 领取后设置
  deadline: Date | null,       // 截止日期
  images: [],                  // 图片URL列表
  createdAt: Date,
  updatedAt: Date
}
```

**状态流转图：**
```
pending (待领取)
    ↓ [领取]
doing (进行中)
    ↓ [提交]
review (待确认)
    ↓ [批准/驳回]
done (已完成) / doing (退回)

任何状态 → cancel (已取消)
```

**索引建议：**
- `familyId`
- `status`
- `assigneeId`
- `creatorId`

---

### 4. recipes 集合

**字段说明：**
```javascript
{
  _id: "菜谱ID",
  familyId: "家庭ID",
  name: "菜谱名称",
  cover: "🍳",                 // emoji封面
  difficulty: 1,              // 难度: 1-3
  cookTime: 30,               // 烹饪时间(分钟)
  servings: 2,                // 份量
  tags: ["快手菜", "家常菜"], // 分类标签
  ingredients: [              // 食材列表
    {
      name: "鸡蛋",
      count: 2,
      unit: "个"
    }
  ],
  steps: [                    // 步骤
    {
      order: 1,
      content: "第一步..."
    }
  ],
  tips: "小贴士...",
  creatorId: "创建者ID",
  createdAt: Date,
  updatedAt: Date
}
```

**索引建议：**
- `familyId`
- `tags`

---

### 5. fridge_items 集合

**字段说明：**
```javascript
{
  _id: "物品ID",
  familyId: "家庭ID",
  name: "食材名称",
  quantity: 5,                // 数量
  unit: "个",                 // 单位
  category: "蔬菜",           // 分类
  expiryDate: Date | null,    // 过期日期
  addedById: "添加者ID",
  addedByName: "添加者昵称",
  createdAt: Date,
  updatedAt: Date
}
```

**索引建议：**
- `familyId`
- `name`
- `category`
- `expiryDate`

---

### 6. score_logs 集合

**字段说明：**
```javascript
{
  _id: "记录ID",
  userId: "用户ID",
  familyId: "家庭ID",
  score: 10,                  // 积分变化（正/负）
  type: "task_reward" | "checkin" | "redeem", // 类型
  remark: "备注说明",
  taskId: "关联任务ID",       // task_reward类型时
  createdAt: Date
}
```

**索引建议：**
- `userId`
- `familyId`
- `createdAt`

---

### 7. cooking_logs 集合

**字段说明：**
```javascript
{
  _id: "记录ID",
  familyId: "家庭ID",
  recipeId: "菜谱ID",
  recipeName: "菜谱名称",
  userId: "用户ID",
  userName: "用户昵称",
  consumedIngredients: [     // 消耗的食材
    { name: "鸡蛋", amount: 2 }
  ],
  warnings: [                // 库存不足警告
    "某食材库存不足"
  ],
  createdAt: Date
}
```

**索引建议：**
- `familyId`
- `userId`
- `createdAt`

---

### 8. check_ins 集合

**字段说明：**
```javascript
{
  _id: "记录ID",
  userId: "用户ID",
  familyId: "家庭ID",
  date: "2024-01-01",        // 日期字符串
  score: 3,                  // 获得的积分
  streak: 5,                 // 连续签到天数
  createdAt: Date
}
```

**索引建议：**
- `userId`
- `familyId`
- `date`
- `userId + date` (复合索引)

---

### 9. shop_items 集合

**字段说明：**
```javascript
{
  _id: "商品ID",
  familyId: "家庭ID",
  name: "商品名称",
  cost: 50,                  // 所需积分
  icon: "🎁",               // emoji图标
  createdBy: "创建者ID",
  createdAt: Date
}
```

**索引建议：**
- `familyId`

---

### 10. redeem_logs 集合

**字段说明：**
```javascript
{
  _id: "记录ID",
  userId: "用户ID",
  familyId: "家庭ID",
  itemId: "商品ID",
  itemName: "商品名称",
  cost: 50,                  // 消耗积分
  createdAt: Date
}
```

**索引建议：**
- `userId`
- `familyId`
- `createdAt`

---

## 云函数模块

所有云函数使用统一的响应格式：
```javascript
{
  success: boolean,
  data?: any,
  message?: string
}
```

---

### 1. getOpenId

**文件：** [cloudfunctions/getOpenId/index.js](file:///d:\ownfile\家庭厨房智能管家\home-task\cloudfunctions\getOpenId\index.js)

**功能：** 用户登录，获取 OpenId，创建或更新用户信息

**调用方式：**
```javascript
wx.cloud.callFunction({
  name: 'getOpenId',
  data: {
    nickName: '用户昵称',
    avatarUrl: '头像URL'
  }
})
```

**返回示例：**
```javascript
{
  success: true,
  openId: "用户OpenId",
  user: { /* 用户对象 */ }
}
```

---

### 2. familyManager

**文件：** [cloudfunctions/familyManager/index.js](file:///d:\ownfile\家庭厨房智能管家\home-task\cloudfunctions\familyManager\index.js)

**功能：** 家庭的创建、加入、获取、离开

#### Actions

##### (1) create - 创建家庭
```javascript
{
  action: 'create',
  data: { name: '我们的小家' }
}
```
**返回：**
```javascript
{
  success: true,
  family: { _id, name, inviteCode, members: [...] }
}
```

##### (2) join - 加入家庭
```javascript
{
  action: 'join',
  data: { inviteCode: 'ABC123' }
}
```

##### (3) get - 获取家庭信息
```javascript
{
  action: 'get'
}
```
返回包含成员详细信息的家庭对象

##### (4) leave - 离开家庭
```javascript
{
  action: 'leave'
}
```

**辅助函数：** `generateInviteCode()` - 生成6位大写字母+数字的邀请码

---

### 3. taskManager

**文件：** [cloudfunctions/taskManager/index.js](file:///d:\ownfile\家庭厨房智能管家\home-task\cloudfunctions\taskManager\index.js)

**功能：** 任务的完整生命周期管理

#### Actions

##### (1) create - 创建任务
```javascript
{
  action: 'create',
  data: {
    title: '做晚饭',
    description: '三菜一汤',
    rewardScore: 10,
    deadline: '2024-01-01'
  }
}
```

##### (2) list - 获取任务列表
```javascript
{
  action: 'list',
  data: {
    status: 'pending' | 'all', // 可选，默认all
    page: 1,
    pageSize: 20
  }
}
```
返回时会自动填充 `creator` 和 `assignee` 的用户信息

##### (3) myList - 获取我的任务
```javascript
{
  action: 'myList',
  data: { status, page, pageSize }
}
```

##### (4) take - 领取任务
```javascript
{
  action: 'take',
  data: { taskId: '任务ID' }
}
```

##### (5) submit - 提交任务审核
```javascript
{
  action: 'submit',
  data: { taskId: '任务ID' }
}
```

##### (6) review - 审核任务
```javascript
{
  action: 'review',
  data: {
    taskId: '任务ID',
    approved: true  // true=批准, false=驳回
  }
}
```
批准时自动发放积分给执行人

##### (7) cancel - 取消任务
```javascript
{
  action: 'cancel',
  data: { taskId: '任务ID' }
}
```

##### (8) edit - 编辑任务
```javascript
{
  action: 'edit',
  data: {
    taskId: '任务ID',
    title: '...',
    description: '...',
    rewardScore: 10,
    deadline: '...'
  }
}
```
仅限创建者编辑，且任务必须处于 pending 状态

##### (9) delete - 删除任务
```javascript
{
  action: 'delete',
  data: { taskId: '任务ID' }
}
```

---

### 4. recipeManager

**文件：** [cloudfunctions/recipeManager/index.js](file:///d:\ownfile\家庭厨房智能管家\home-task\cloudfunctions\recipeManager\index.js)

**功能：** 菜谱的增删改查

#### Actions

##### (1) create - 创建菜谱
```javascript
{
  action: 'create',
  data: {
    name: '番茄炒蛋',
    cover: '🍳',
    difficulty: 1,
    cookTime: 15,
    servings: 2,
    tags: ['快手菜'],
    ingredients: [
      { name: '番茄', count: 2, unit: '个' },
      { name: '鸡蛋', count: 3, unit: '个' }
    ],
    steps: [
      { order: 1, content: '准备食材' },
      { order: 2, content: '起锅烧油' }
    ],
    tips: '鸡蛋要多搅拌'
  }
}
```

##### (2) update - 更新菜谱
```javascript
{
  action: 'update',
  data: { recipeId, ...fields }
}
```
仅限创建者编辑

##### (3) delete - 删除菜谱
```javascript
{
  action: 'delete',
  data: { recipeId }
}
```

##### (4) detail - 获取菜谱详情
```javascript
{
  action: 'detail',
  data: { recipeId }
}
```

##### (5) list - 获取菜谱列表
```javascript
{
  action: 'list',
  data: {
    category: '分类标签',  // 可选
    keyword: '搜索关键词',  // 可选
    page: 1,
    pageSize: 20
  }
}
```

---

### 5. fridgeManager

**文件：** [cloudfunctions/fridgeManager/index.js](file:///d:\ownfile\家庭厨房智能管家\home-task\cloudfunctions\fridgeManager\index.js)

**功能：** 冰箱库存管理与烹饪消耗

#### Actions

##### (1) list - 获取库存列表
```javascript
{
  action: 'list',
  data: {
    category: '蔬菜',  // 可选
    page: 1,
    pageSize: 50
  }
}
```

##### (2) add - 添加/增加库存
```javascript
{
  action: 'add',
  data: {
    name: '番茄',
    quantity: 5,
    unit: '个',
    category: '蔬菜',
    expiryDate: '2024-01-05'
  }
}
```
如果同名食材已存在，自动增加数量

##### (3) update - 更新库存
```javascript
{
  action: 'update',
  data: {
    itemId: '物品ID',
    quantity: 10,
    unit: '个',
    category: '蔬菜',
    expiryDate: '2024-01-10'
  }
}
```

##### (4) remove - 删除库存
```javascript
{
  action: 'remove',
  data: { itemId }
}
```

##### (5) cook - 烹饪消耗
```javascript
{
  action: 'cook',
  data: {
    recipeId: '菜谱ID',
    recipeName: '番茄炒蛋',
    consumedIngredients: [
      { name: '番茄', amount: 2 },
      { name: '鸡蛋', amount: 3 }
    ]
  }
}
```
自动扣减库存，记录烹饪日志，返回库存不足警告

##### (6) cookingLogs - 烹饪记录
```javascript
{
  action: 'cookingLogs',
  data: { page, pageSize }
}
```

---

### 6. scoreManager

**文件：** [cloudfunctions/scoreManager/index.js](file:///d:\ownfile\家庭厨房智能管家\home-task\cloudfunctions\scoreManager\index.js)

**功能：** 积分日志查询与排行榜

#### Actions

##### (1) list - 家庭积分日志
```javascript
{
  action: 'list',
  data: { page, pageSize }
}
```

##### (2) myLogs - 我的积分日志
```javascript
{
  action: 'myLogs',
  data: { page, pageSize }
}
```

##### (3) leaderboard - 排行榜
```javascript
{
  action: 'leaderboard',
  data: { period: 'week' | 'month' | 'total' }
}
```
返回按积分排序的成员列表及当前用户排名

---

### 7. interactionManager

**文件：** [cloudfunctions/interactionManager/index.js](file:///d:\ownfile\家庭厨房智能管家\home-task\cloudfunctions\interactionManager\index.js)

**功能：** 每日签到与夸夸文案

#### Actions

##### (1) checkIn - 签到
```javascript
{
  action: 'checkIn'
}
```
随机获得 1-5 积分，计算连续签到天数

##### (2) getStatus - 获取互动状态
```javascript
{
  action: 'getStatus'
}
```
返回：
```javascript
{
  checkedIn: boolean,      // 今日是否已签到
  todayRecord: {...},      // 今日签到记录
  streak: 5,               // 连续签到天数
  togetherDays: 100,       // 共同生活天数
  compliment: "今日夸夸文案"
}
```

##### (3) getCompliment - 获取今日夸夸
```javascript
{
  action: 'getCompliment'
}
```

##### (4) getCheckInHistory - 签到历史
```javascript
{
  action: 'getCheckInHistory',
  data: { page, pageSize }
}
```

**内置文案库：** `COMPLIMENTS` 数组包含 40+ 条治愈系文案

---

### 8. recommendManager

**文件：** [cloudfunctions/recommendManager/index.js](file:///d:\ownfile\家庭厨房智能管家\home-task\cloudfunctions\recommendManager\index.js)

**功能：** 智能晚饭推荐

#### Actions

##### (1) recommend - 获取推荐
```javascript
{
  action: 'recommend'
}
```

**推荐算法：**
1. 获取冰箱所有食材，标记3天内过期的食材
2. 对每个菜谱计算匹配度：
   - 食材完全匹配：+1 分
   - 使用即将过期的食材：+2 分
   - 部分匹配（有但不够）：+0.5 分
3. 按匹配度排序，返回 Top 3

**返回示例：**
```javascript
{
  success: true,
  recommendations: [
    {
      recipe: { /* 菜谱对象 */ },
      matchScore: 10,
      matchRate: 85,
      missingIngredients: [
        { name: '...', need: 2, have: 1 }
      ],
      usingExpiringItems: ['即将过期的食材名']
    }
  ],
  totalRecipes: 10,
  totalFridgeItems: 20
}
```

---

### 9. shopManager

**文件：** [cloudfunctions/shopManager/index.js](file:///d:\ownfile\家庭厨房智能管家\home-task\cloudfunctions\shopManager\index.js)

**功能：** 积分商城

#### Actions

##### (1) list - 获取商品列表
```javascript
{
  action: 'list'
}
```
返回商品列表和当前用户积分

##### (2) create - 创建商品
```javascript
{
  action: 'create',
  data: {
    name: '按摩10分钟',
    cost: 50,
    icon: '💆'
  }
}
```

##### (3) redeem - 兑换商品
```javascript
{
  action: 'redeem',
  data: { itemId: '商品ID' }
}
```
自动扣减积分，记录兑换日志

##### (4) delete - 删除商品
```javascript
{
  action: 'delete',
  data: { itemId }
}
```

##### (5) redeemLogs - 兑换记录
```javascript
{
  action: 'redeemLogs',
  data: { page, pageSize }
}
```

---

## 前端页面

### 应用入口

**文件：** [miniprogram/app.js](file:///d:\ownfile\家庭厨房智能管家\home-task\miniprogram\app.js)

**全局数据：**
```javascript
globalData: {
  env: '',
  userInfo: null,
  openId: '',
  familyId: '',
  familyInfo: null
}
```

**全局方法：**
- `loadCache()` - 从本地存储加载缓存
- `setUserInfo(info)` - 设置用户信息
- `setOpenId(id)` - 设置 OpenId
- `setFamilyId(id)` - 设置家庭ID
- `checkLogin()` - 检查登录状态，未登录跳转登录页
- `checkFamily()` - 检查家庭状态，未加入跳转家庭页

**云开发初始化：**
```javascript
wx.cloud.init({
  env: "cloud1-d8g6jfhbq7cfe98a3",
  traceUser: true
})
```

---

### 全局配置

**文件：** [miniprogram/app.json](file:///d:\ownfile\家庭厨房智能管家\home-task\miniprogram\app.json)

**TabBar 配置：**
| 页面 | 图标 | 路径 |
|------|------|------|
| 首页 | home | pages/home/home |
| 任务 | business | pages/task/task |
| 菜单 | goods | pages/recipe/recipe |
| 我的 | usercenter | pages/mine/mine |

---

### 1. 首页 - home

**文件：** [miniprogram/pages/home/home.js](file:///d:\ownfile\家庭厨房智能管家\home-task\miniprogram\pages\home\home.js)

**功能：**
- 根据时间显示问候语
- 展示今日待办任务
- 展示今日获得积分
- 展示家庭信息与共同生活天数
- 今日签到入口
- 晚饭推荐卡片
- 快捷入口（冰箱、排行榜、互动）

**主要方法：**
- `initPage()` - 初始化页面数据
- `setGreeting()` - 根据时间设置问候语
- `loadTodayTasks()` - 加载今日任务
- `loadTodayScore()` - 加载今日积分
- `loadFamilyInfo()` - 加载家庭信息
- `loadInteractionStatus()` - 加载互动状态
- `loadRecommendations()` - 加载推荐菜谱
- `handleCheckIn()` - 执行签到

---

### 2. 任务页 - task

**文件：** [miniprogram/pages/task/task.js](file:///d:\ownfile\家庭厨房智能管家\home-task\miniprogram\pages\task\task.js)

**功能：**
- 按状态分类展示任务（全部/待领取/进行中/待确认/已完成）
- 任务卡片操作：领取、提交、批准、驳回、取消、编辑
- 分页加载
- 编辑任务弹窗

**主要方法：**
- `switchTab()` - 切换任务状态标签
- `loadTasks()` - 加载任务列表
- `handleTake()` - 领取任务
- `handleSubmit()` - 提交任务
- `handleApprove()` - 批准任务
- `handleReject()` - 驳回任务
- `handleCancel()` - 取消任务
- `showEditModal()` / `hideEditModal()` - 编辑弹窗控制
- `handleEdit()` - 保存编辑

---

### 3. 其他页面

| 页面 | 路径 | 功能 |
|------|------|------|
| login | pages/login/login | 用户登录与授权 |
| family | pages/family/family | 创建或加入家庭 |
| task-create | pages/task-create/task-create | 创建新任务 |
| recipe | pages/recipe/recipe | 菜谱列表与搜索 |
| recipe-create | pages/recipe-create/recipe-create | 创建/编辑菜谱 |
| recipe-detail | pages/recipe-detail/recipe-detail | 菜谱详情，开始烹饪 |
| fridge | pages/fridge/fridge | 冰箱库存管理 |
| interaction | pages/interaction/interaction | 互动页面（签到历史、夸夸） |
| rank | pages/rank/rank | 积分排行榜（周/月/总） |
| shop | pages/shop/shop | 积分商城 |
| mine | pages/mine/mine | 个人中心 |

---

## 样式系统

**文件：** [miniprogram/app.wxss](file:///d:\ownfile\家庭厨房智能管家\home-task\miniprogram\app.wxss)

### 颜色变量

```css
--primary: #FF8FAB;           /* 主色 */
--primary-light: #FFC0CB;     /* 主色浅 */
--primary-dark: #FF6B8E;      /* 主色深 */
--secondary: #FFE4ED;         /* 次要色 */
--accent-green: #A8E6CF;
--accent-yellow: #FFD93D;
--accent-blue: #A8DCEA;

--bg: #FFF8F9;               /* 背景色 */
--bg-card: #FFFFFF;          /* 卡片背景 */
--bg-light: #FFF0F5;

--text-primary: #2D2D2D;
--text-secondary: #666666;
--text-hint: #AAAAAA;

--border: #FFE4ED;
--border-light: #FFF0F5;
```

### 通用样式类

#### 卡片
```css
.card {
  background: var(--bg-card);
  border-radius: 28rpx;
  padding: 32rpx;
  margin: 20rpx 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(255, 143, 171, 0.12);
}
```

#### 按钮
```css
.btn-primary    /* 主按钮（粉渐变） */
.btn-secondary  /* 次按钮（浅粉背景） */
.btn-outline    /* 描边按钮 */
.btn-ghost      /* 幽灵按钮 */
.btn-sm         /* 小按钮 */
```

#### 布局
```css
.flex-row       /* 横向flex */
.flex-col       /* 纵向flex */
.flex-between   /* 两端对齐 */
.flex-center    /* 居中 */
```

#### 状态标签
```css
.tag-pending    /* 待领取 - 橙色 */
.tag-doing      /* 进行中 - 蓝色 */
.tag-review     /* 待确认 - 紫色 */
.tag-done       /* 已完成 - 绿色 */
.tag-cancel     /* 已取消 - 灰色 */
.tag-primary    /* 主色调标签 */
```

#### 间距
```css
.mt-10, .mt-20, .mt-30    /* margin-top */
.mb-10, .mb-20, .mb-30    /* margin-bottom */
```

#### 其他
```css
.empty-state    /* 空状态 */
.section-header /* 区块标题 */
```

---

## 开发指南

### 环境准备

1. **微信开发者工具**
   - 下载并安装最新版本
   - 打开项目目录

2. **AppID 配置**
   - 在 `project.config.json` 中配置：`"appid": "wxe5004372672f61e1"`

3. **云开发环境**
   - 在微信开发者工具中开通云开发
   - 创建云环境
   - 在 `app.js` 中修改 `env` 为你的云环境ID

### 云函数部署

1. 在微信开发者工具中右键云函数文件夹
2. 选择"上传并部署：云端安装依赖"
3. 依次部署所有云函数

### 数据库初始化

在云开发控制台创建以下集合：
- `users`
- `families`
- `tasks`
- `recipes`
- `fridge_items`
- `score_logs`
- `cooking_logs`
- `check_ins`
- `shop_items`
- `redeem_logs`

### 本地开发流程

1. 打开微信开发者工具
2. 修改代码后自动预览
3. 使用模拟器调试
4. 真机调试测试

### 代码规范

#### 云函数
- 统一使用 `wx-server-sdk` 初始化
- 统一返回格式 `{success: boolean, data?: any, message?: string}`
- 操作前验证用户身份与权限

#### 前端页面
- 使用 `getApp()` 获取全局实例
- 页面 `onShow()` 中调用 `checkLogin()` 和 `checkFamily()`
- 云函数调用使用 `try-catch` 包裹
- 加载状态使用 `wx.showLoading()` / `wx.hideLoading()`

#### 样式
- 使用 CSS 变量定义颜色
- 优先使用通用样式类
- 圆角使用 `--radius` / `--radius-large` 变量

---

## 附录

### 任务状态枚举

| 值 | 说明 |
|----|------|
| pending | 待领取 |
| doing | 进行中 |
| review | 待确认 |
| done | 已完成 |
| cancel | 已取消 |

### 积分类型枚举

| 值 | 说明 |
|----|------|
| task_reward | 任务奖励 |
| checkin | 签到奖励 |
| redeem | 积分兑换（消耗） |

---

*文档版本：1.0*
*最后更新：2024-05-19*
