App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
      return;
    }
    wx.cloud.init({
      env: "cloud1-d8g6jfhbq7cfe98a3",
      traceUser: true,
    });
    this.loadCache();
  },

  globalData: {
    env: "",
    userInfo: null,
    openId: "",
    familyId: "",
    familyInfo: null,
  },

  loadCache() {
    const userInfo = wx.getStorageSync('userInfo');
    const openId = wx.getStorageSync('openId');
    const familyId = wx.getStorageSync('familyId');
    if (userInfo) this.globalData.userInfo = userInfo;
    if (openId) this.globalData.openId = openId;
    if (familyId) this.globalData.familyId = familyId;
  },

  setUserInfo(info) {
    this.globalData.userInfo = info;
    wx.setStorageSync('userInfo', info);
  },

  setOpenId(id) {
    this.globalData.openId = id;
    wx.setStorageSync('openId', id);
  },

  setFamilyId(id) {
    this.globalData.familyId = id;
    wx.setStorageSync('familyId', id);
  },

  checkLogin() {
    if (!this.globalData.openId) {
      wx.redirectTo({ url: '/pages/login/login' });
      return false;
    }
    return true;
  },

  checkFamily() {
    if (!this.globalData.familyId) {
      wx.redirectTo({ url: '/pages/family/family' });
      return false;
    }
    return true;
  }
});
