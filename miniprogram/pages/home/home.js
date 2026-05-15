const app = getApp();

Page({
  data: {
    userInfo: null,
    familyInfo: null,
    greeting: '',
    togetherDays: 0,
    todayTasks: [],
    todayScore: 0,
    recommendations: [],
    checkedIn: false,
    checkInStreak: 0,
    compliment: '',
    loading: true
  },

  onShow() {
    if (!app.checkLogin()) return;
    if (!app.checkFamily()) return;
    this.initPage();
  },

  async initPage() {
    this.setData({ loading: true });
    this.setGreeting();
    await Promise.all([
      this.loadTodayTasks(),
      this.loadTodayScore(),
      this.loadFamilyInfo(),
      this.loadInteractionStatus(),
      this.loadRecommendations()
    ]);
    this.setData({ loading: false });
  },

  setGreeting() {
    const hour = new Date().getHours();
    let greeting = '';
    if (hour < 6) greeting = '夜深了 🌙';
    else if (hour < 10) greeting = '早上好呀 ☀️';
    else if (hour < 12) greeting = '上午好 🌤️';
    else if (hour < 14) greeting = '中午好 ☀️';
    else if (hour < 18) greeting = '下午好 🌈';
    else if (hour < 22) greeting = '晚上好 🌙';
    else greeting = '夜深了 🌙';
    this.setData({ greeting });
  },

  async loadTodayTasks() {
    try {
      const familyId = app.globalData.familyId;
      const db = wx.cloud.database();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const res = await db.collection('tasks')
        .where({
          familyId: familyId,
          status: db.command.in(['pending', 'doing', 'review'])
        })
        .orderBy('createdAt', 'desc')
        .limit(4)
        .get();

      const tasks = res.data.map(item => {
        const emojis = ['🍳', '🧹', '🗑️', '🫧', '🧽', '🧺', '🥬', '☕'];
        return {
          ...item,
          emoji: emojis[Math.floor(Math.random() * emojis.length)]
        };
      });

      this.setData({ todayTasks: tasks });
    } catch (e) {
      console.error('加载任务失败:', e);
    }
  },

  async loadTodayScore() {
    try {
      const familyId = app.globalData.familyId;
      const db = wx.cloud.database();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const res = await db.collection('score_logs')
        .where({
          familyId: familyId,
          type: db.command.in(['task_reward', 'checkin']),
          createdAt: db.command.gte(today)
        })
        .get();

      let todayScore = 0;
      res.data.forEach(log => { todayScore += log.score; });
      this.setData({ todayScore });
    } catch (e) {
      console.error('加载积分失败:', e);
    }
  },

  async loadFamilyInfo() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'familyManager',
        data: { action: 'get' }
      });
      if (res.result.success && res.result.family) {
        this.setData({ familyInfo: res.result.family });
      }
    } catch (e) {
      console.error('加载家庭信息失败:', e);
    }
  },

  async loadInteractionStatus() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'interactionManager',
        data: { action: 'getStatus' }
      });
      if (res.result.success) {
        this.setData({
          togetherDays: res.result.togetherDays,
          checkedIn: res.result.checkedIn,
          checkInStreak: res.result.streak,
          compliment: res.result.compliment
        });
      }
    } catch (e) {
      console.error('加载互动状态失败:', e);
    }
  },

  async loadRecommendations() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'recommendManager',
        data: { action: 'recommend' }
      });
      if (res.result.success && res.result.recommendations) {
        this.setData({ recommendations: res.result.recommendations });
      }
    } catch (e) {
      console.error('加载推荐失败:', e);
    }
  },

  async handleCheckIn() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'interactionManager',
        data: { action: 'checkIn' }
      });
      if (res.result.success) {
        wx.showToast({
          title: `+${res.result.score} 爱心值`,
          icon: 'success'
        });
        this.setData({
          checkedIn: true,
          checkInStreak: res.result.streak,
          todayScore: this.data.todayScore + res.result.score
        });
      } else {
        wx.showToast({
          title: res.result.message || '签到失败',
          icon: 'none'
        });
      }
    } catch (e) {
      console.error('签到失败:', e);
      wx.showToast({ title: '签到失败，请重试', icon: 'none' });
    }
  },

  goToTask() {
    wx.switchTab({ url: '/pages/task/task' });
  },

  goToRecipe(e) {
    const index = e.currentTarget.dataset.index;
    if (index !== undefined && this.data.recommendations[index]) {
      const recipeId = this.data.recommendations[index].recipe._id;
      wx.navigateTo({ url: `/pages/recipe-detail/recipe-detail?id=${recipeId}` });
    } else {
      wx.switchTab({ url: '/pages/recipe/recipe' });
    }
  },

  goToFridge() {
    wx.navigateTo({ url: '/pages/fridge/fridge' });
  },

  goToMine() {
    wx.switchTab({ url: '/pages/mine/mine' });
  },

  goToInteraction() {
    wx.navigateTo({ url: '/pages/interaction/interaction' });
  },

  goToRank() {
    wx.navigateTo({ url: '/pages/rank/rank' });
  },

  goToTaskDetail(e) {
    const id = e.currentTarget.dataset.id;
    console.log('任务ID:', id);
  }
});
