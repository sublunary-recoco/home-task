const app = getApp();

Page({
  data: {
    loading: false
  },

  onShow() {
    if (app.globalData.openId && app.globalData.familyId) {
      wx.switchTab({ url: '/pages/home/home' });
    }
  },

  async handleLogin() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const { userInfo } = await wx.getUserProfile({
        desc: '用于在小家中展示你的昵称和头像'
      });

      const res = await wx.cloud.callFunction({
        name: 'getOpenId',
        data: {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        }
      });

      if (!res.result.success) {
        throw new Error('登录失败');
      }

      const { openId, user } = res.result;

      app.setOpenId(openId);
      app.setUserInfo({
        _id: user._id,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        score: user.score,
        level: user.level
      });

      if (user.familyId) {
        app.setFamilyId(user.familyId);
        wx.switchTab({ url: '/pages/home/home' });
      } else {
        wx.redirectTo({ url: '/pages/family/family' });
      }

    } catch (err) {
      console.error('登录失败:', err);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
