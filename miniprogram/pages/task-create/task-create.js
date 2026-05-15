const app = getApp();

Page({
  data: {
    title: '',
    description: '',
    rewardScore: '',
    deadline: '',
    loading: false
  },

  onLoad() {
    if (!app.checkLogin()) return;
    if (!app.checkFamily()) return;
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  onScoreInput(e) {
    this.setData({ rewardScore: e.detail.value });
  },

  onDeadlineChange(e) {
    this.setData({ deadline: e.detail.value });
  },

  async handleCreate() {
    if (this.data.loading) return;
    const title = this.data.title.trim();
    if (!title) {
      wx.showToast({ title: '请输入任务标题', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'taskManager',
        data: {
          action: 'create',
          data: {
            title,
            description: this.data.description.trim(),
            rewardScore: parseInt(this.data.rewardScore) || 0,
            deadline: this.data.deadline || null
          }
        }
      });
      if (res.result.success) {
        wx.showToast({ title: '任务发布成功！', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      } else {
        wx.showToast({ title: res.result.message || '发布失败', icon: 'none' });
      }
    } catch (e) {
      console.error('发布任务失败:', e);
      wx.showToast({ title: '发布失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
