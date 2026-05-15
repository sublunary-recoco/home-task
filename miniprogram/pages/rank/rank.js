// pages/rank/rank.js
const app = getApp();

Page({
  data: {
    period: 'total',
    rankings: [],
    myRank: -1,
    total: 0,
    loading: true
  },

  onShow() {
    if (!app.checkLogin()) return;
    if (!app.checkFamily()) return;
    this.loadLeaderboard();
  },

  async loadLeaderboard() {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'scoreManager',
        data: {
          action: 'leaderboard',
          data: { period: this.data.period }
        }
      });
      if (res.result.success) {
        this.setData({
          rankings: res.result.rankings,
          myRank: res.result.myRank,
          total: res.result.total,
          loading: false
        });
      }
    } catch (e) {
      console.error('加载排行榜失败:', e);
      this.setData({ loading: false });
    }
  },

  switchPeriod(e) {
    const period = e.currentTarget.dataset.period;
    if (period === this.data.period) return;
    this.setData({ period }, () => {
      this.loadLeaderboard();
    });
  }
});
