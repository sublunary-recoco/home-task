const app = getApp();

Page({
  data: {
    showCreate: false,
    showJoin: false,
    familyName: '',
    inviteCodeInput: '',
    familyInfo: null,
    loading: false,
    currentTab: 'create'
  },

  onShow() {
    if (!app.checkLogin()) return;
    this.loadFamilyInfo();
  },

  async loadFamilyInfo() {
    const familyId = app.globalData.familyId;
    if (!familyId) return;
    try {
      const res = await wx.cloud.callFunction({
        name: 'familyManager',
        data: { action: 'get' }
      });
      if (res.result.success && res.result.family) {
        this.setData({ familyInfo: res.result.family });
        app.globalData.familyInfo = res.result.family;
      }
    } catch (e) {
      console.error('加载家庭信息失败:', e);
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  onFamilyNameInput(e) {
    this.setData({ familyName: e.detail.value });
  },

  onInviteCodeInput(e) {
    this.setData({ inviteCodeInput: e.detail.value.toUpperCase() });
  },

  async handleCreateFamily() {
    const name = this.data.familyName.trim();
    if (!name) {
      wx.showToast({ title: '请输入小家名字', icon: 'none' });
      return;
    }
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'familyManager',
        data: {
          action: 'create',
          data: { name }
        }
      });
      if (res.result.success) {
        const family = res.result.family;
        app.setFamilyId(family._id);
        app.globalData.familyInfo = family;
        wx.showToast({ title: '小家创建成功！', icon: 'success' });
        this.setData({ familyInfo: family, showCreate: false, familyName: '' });
      }
    } catch (e) {
      console.error('创建家庭失败:', e);
      wx.showToast({ title: '创建失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async handleJoinFamily() {
    const code = this.data.inviteCodeInput.trim();
    if (!code) {
      wx.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'familyManager',
        data: {
          action: 'join',
          data: { inviteCode: code }
        }
      });
      if (res.result.success) {
        const family = res.result.family;
        app.setFamilyId(family._id);
        app.globalData.familyInfo = family;
        wx.showToast({ title: '加入成功！', icon: 'success' });
        this.setData({ familyInfo: family, inviteCodeInput: '' });
      } else {
        wx.showToast({ title: res.result.message || '加入失败', icon: 'none' });
      }
    } catch (e) {
      console.error('加入家庭失败:', e);
      wx.showToast({ title: '加入失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  copyInviteCode() {
    wx.setClipboardData({
      data: this.data.familyInfo.inviteCode,
      success: () => {
        wx.showToast({ title: '邀请码已复制', icon: 'success' });
      }
    });
  },

  async handleLeaveFamily() {
    wx.showModal({
      title: '离开小家',
      content: '确定要离开当前小家吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await wx.cloud.callFunction({
              name: 'familyManager',
              data: { action: 'leave' }
            });
            app.setFamilyId('');
            app.globalData.familyInfo = null;
            this.setData({ familyInfo: null });
            wx.showToast({ title: '已离开小家', icon: 'success' });
          } catch (e) {
            wx.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  goHome() {
    wx.switchTab({ url: '/pages/home/home' });
  }
});
