// pages/shop/shop.js
const app = getApp();

Page({
  data: {
    items: [],
    userScore: 0,
    showAddModal: false,
    addForm: { name: '', cost: '', icon: '🎁' },
    redeemLogs: [],
    showRedeemLogs: false,
    loading: true
  },

  iconOptions: ['🎁', '💝', '🌸', '☕', '🍰', '🎬', '💆', '🧸', '📖', '🎵', '🍿', '🕯️'],

  onShow() {
    if (!app.checkLogin()) return;
    if (!app.checkFamily()) return;
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'shopManager',
        data: { action: 'list' }
      });
      if (res.result.success) {
        this.setData({
          items: res.result.items,
          userScore: res.result.userScore,
          loading: false
        });
      }
    } catch (e) {
      console.error('加载商城失败:', e);
      this.setData({ loading: false });
    }
  },

  showAdd() {
    this.setData({
      showAddModal: true,
      addForm: { name: '', cost: '', icon: '🎁' }
    });
  },

  hideAdd() {
    this.setData({ showAddModal: false });
  },

  onNameInput(e) {
    this.setData({ 'addForm.name': e.detail.value });
  },

  onCostInput(e) {
    this.setData({ 'addForm.cost': e.detail.value });
  },

  selectIcon(e) {
    this.setData({ 'addForm.icon': e.currentTarget.dataset.icon });
  },

  async handleCreate() {
    const { name, cost, icon } = this.data.addForm;
    if (!name.trim()) {
      wx.showToast({ title: '请输入商品名称', icon: 'none' });
      return;
    }
    if (!cost || parseInt(cost) <= 0) {
      wx.showToast({ title: '请输入有效积分', icon: 'none' });
      return;
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'shopManager',
        data: {
          action: 'create',
          data: { name: name.trim(), cost: parseInt(cost), icon }
        }
      });
      if (res.result.success) {
        wx.showToast({ title: '商品创建成功', icon: 'success' });
        this.hideAdd();
        this.loadData();
      } else {
        wx.showToast({ title: res.result.message || '创建失败', icon: 'none' });
      }
    } catch (e) {
      console.error('创建商品失败:', e);
    }
  },

  async handleRedeem(e) {
    const item = e.currentTarget.dataset.item;
    if (this.data.userScore < item.cost) {
      wx.showToast({ title: '爱心值不足~', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认兑换',
      content: `确定要用 ${item.cost} 爱心值兑换「${item.name}」吗？`,
      confirmText: '确定兑换',
      success: async (modalRes) => {
        if (modalRes.confirm) {
          try {
            const res = await wx.cloud.callFunction({
              name: 'shopManager',
              data: { action: 'redeem', data: { itemId: item._id } }
            });
            if (res.result.success) {
              wx.showToast({ title: '兑换成功！', icon: 'success' });
              this.loadData();
            } else {
              wx.showToast({ title: res.result.message || '兑换失败', icon: 'none' });
            }
          } catch (e) {
            console.error('兑换失败:', e);
          }
        }
      }
    });
  },

  async handleDelete(e) {
    const item = e.currentTarget.dataset.item;
    wx.showModal({
      title: '删除商品',
      content: `确定要删除「${item.name}」吗？`,
      confirmColor: '#FF6B8E',
      success: async (modalRes) => {
        if (modalRes.confirm) {
          try {
            const res = await wx.cloud.callFunction({
              name: 'shopManager',
              data: { action: 'delete', data: { itemId: item._id } }
            });
            if (res.result.success) {
              wx.showToast({ title: '已删除', icon: 'success' });
              this.loadData();
            }
          } catch (e) {
            console.error('删除失败:', e);
          }
        }
      }
    });
  },

  async showRedeemHistory() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'shopManager',
        data: { action: 'redeemLogs', data: { pageSize: 30 } }
      });
      if (res.result.success) {
        this.setData({
          redeemLogs: res.result.logs,
          showRedeemLogs: true
        });
      }
    } catch (e) {
      console.error('加载兑换记录失败:', e);
    }
  },

  hideRedeemLogs() {
    this.setData({ showRedeemLogs: false });
  }
});
