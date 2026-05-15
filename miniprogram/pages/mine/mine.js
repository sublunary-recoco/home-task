const app = getApp();

Page({
  data: {
    userInfo: null,
    familyInfo: null,
    logs: []
  },

  onShow() {
    if (!app.checkLogin()) return;
    this.setData({ userInfo: app.globalData.userInfo });
    this.loadFamilyInfo();
    this.loadScoreLogs();
  },

  async loadFamilyInfo() {
    const familyId = app.globalData.familyId;
    if (!familyId) {
      this.setData({ familyInfo: null });
      return;
    }
    try {
      const res = await wx.cloud.callFunction({
        name: 'familyManager',
        data: { action: 'get' }
      });
      if (res.result.success) {
        this.setData({ familyInfo: res.result.family });
        app.globalData.familyInfo = res.result.family;
      }
    } catch (e) {
      console.error('加载家庭信息失败:', e);
    }
  },

  async loadScoreLogs() {
    const familyId = app.globalData.familyId;
    if (!familyId) return;
    try {
      const res = await wx.cloud.callFunction({
        name: 'scoreManager',
        data: {
          action: 'list',
          data: { page: 1, pageSize: 20 }
        }
      });
      if (res.result.success) {
        const logs = (res.result.logs || []).map(log => ({
          ...log,
          createdAt: this.formatDate(log.createdAt)
        }));
        this.setData({ logs });
      }
    } catch (e) {
      console.error('加载积分日志失败:', e);
    }
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hour}:${min}`;
  },

  goFamily() {
    wx.navigateTo({ url: '/pages/family/family' });
  },

  goToInteraction() {
    wx.navigateTo({ url: '/pages/interaction/interaction' });
  },

  goToRank() {
    wx.navigateTo({ url: '/pages/rank/rank' });
  },

  goToShop() {
    wx.navigateTo({ url: '/pages/shop/shop' });
  },

  handleLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出吗？退出后需要重新登录。',
      success: (res) => {
        if (res.confirm) {
          app.globalData.openId = '';
          app.globalData.userInfo = null;
          app.globalData.familyId = '';
          app.globalData.familyInfo = null;
          wx.clearStorageSync();
          wx.redirectTo({ url: '/pages/login/login' });
        }
      }
    });
  }
});
