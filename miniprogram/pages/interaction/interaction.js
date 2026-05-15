// pages/interaction/interaction.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    familyInfo: null,
    checkedIn: false,
    streak: 0,
    togetherDays: 0,
    compliment: '',
    logs: [],
    loading: true
  },

  onShow() {
    if (!app.checkLogin()) return;
    if (!app.checkFamily()) return;
    this.setData({ userInfo: app.globalData.userInfo });
    this.initPage();
  },

  async initPage() {
    this.setData({ loading: true });
    await Promise.all([
      this.loadStatus(),
      this.loadHistory(),
      this.loadFamilyInfo()
    ]);
    this.setData({ loading: false });
  },

  async loadStatus() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'interactionManager',
        data: { action: 'getStatus' }
      });
      if (res.result.success) {
        this.setData({
          checkedIn: res.result.checkedIn,
          streak: res.result.streak,
          togetherDays: res.result.togetherDays,
          compliment: res.result.compliment
        });
      }
    } catch (e) {
      console.error('加载互动状态失败:', e);
    }
  },

  async loadHistory() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'interactionManager',
        data: { action: 'getCheckInHistory', data: { pageSize: 30 } }
      });
      if (res.result.success) {
        this.setData({ logs: res.result.logs });
      }
    } catch (e) {
      console.error('加载签到历史失败:', e);
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

  async handleCheckIn() {
    if (this.data.checkedIn) return;

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
          streak: res.result.streak,
          todayScore: res.result.score
        });

        // 刷新历史
        this.loadHistory();
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
  }
});
