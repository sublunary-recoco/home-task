const app = getApp();

Page({
  data: {
    activeCategory: '全部',
    categories: [
      { label: '全部', value: '全部', icon: '📦' },
      { label: '蔬菜', value: '蔬菜', icon: '🥬' },
      { label: '水果', value: '水果', icon: '🍎' },
      { label: '肉类', value: '肉类', icon: '🥩' },
      { label: '海鲜', value: '海鲜', icon: '🦐' },
      { label: '调料', value: '调料', icon: '🧂' },
      { label: '饮品', value: '饮品', icon: '🥤' },
      { label: '其他', value: '其他', icon: '📦' }
    ],
    categoryNames: ['蔬菜', '水果', '肉类', '海鲜', '调料', '饮品', '其他'],
    items: [],
    totalCount: 0,
    showAddModal: false,
    addForm: {
      name: '',
      quantity: '1',
      unit: '个',
      categoryIndex: 0,
      expiryDate: ''
    },
    itemEmojis: {
      '蔬菜': '🥬', '水果': '🍎', '肉类': '🥩',
      '海鲜': '🦐', '调料': '🧂', '饮品': '🥤', '其他': '📦'
    }
  },

  onLoad() {
    if (!app.globalData.openId || !app.globalData.familyId) {
      wx.showToast({ title: '请先登录并加入家庭', icon: 'none' });
      return;
    }
    this.loadItems();
  },

  onShow() {
    if (app.globalData.openId && app.globalData.familyId) {
      this.loadItems();
    }
  },

  onPullDownRefresh() {
    this.loadItems().then(() => wx.stopPullDownRefresh());
  },

  async loadItems() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'fridgeManager',
        data: {
          action: 'list',
          data: { category: this.data.activeCategory }
        }
      });
      if (res.result.success) {
        const items = (res.result.items || []).map(item => ({
          ...item,
          emoji: this.data.itemEmojis[item.category] || '📦',
          isExpiring: item.expiryDate ? this.isExpiring(item.expiryDate) : false
        }));
        this.setData({
          items,
          totalCount: res.result.total
        });
      }
    } catch (err) {
      console.error('加载冰箱失败:', err);
    }
  },

  isExpiring(dateStr) {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return diff < 3 * 24 * 60 * 60 * 1000;
  },

  onCategoryChange(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.category }, () => {
      this.loadItems();
    });
  },

  onAddTap() {
    this.setData({
      showAddModal: true,
      addForm: {
        name: '',
        quantity: '1',
        unit: '个',
        categoryIndex: 0,
        expiryDate: ''
      }
    });
  },

  onAddNameInput(e) {
    this.setData({ 'addForm.name': e.detail.value });
  },

  onAddQtyInput(e) {
    this.setData({ 'addForm.quantity': e.detail.value });
  },

  onAddUnitInput(e) {
    this.setData({ 'addForm.unit': e.detail.value });
  },

  onAddCategoryChange(e) {
    this.setData({ 'addForm.categoryIndex': parseInt(e.detail.value) });
  },

  onAddExpiryChange(e) {
    this.setData({ 'addForm.expiryDate': e.detail.value });
  },

  onModalClose() {
    this.setData({ showAddModal: false });
  },

  noop() {},

  async onConfirmAdd() {
    const { addForm, categoryNames } = this.data;
    if (!addForm.name || !addForm.name.trim()) {
      wx.showToast({ title: '请输入食材名称', icon: 'none' });
      return;
    }
    const qty = parseInt(addForm.quantity) || 1;
    if (qty <= 0) {
      wx.showToast({ title: '数量至少为1', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '添加中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'fridgeManager',
        data: {
          action: 'add',
          data: {
            name: addForm.name.trim(),
            quantity: qty,
            unit: addForm.unit || '个',
            category: categoryNames[addForm.categoryIndex] || '其他',
            expiryDate: addForm.expiryDate || ''
          }
        }
      });
      wx.hideLoading();
      if (res.result.success) {
        wx.showToast({ title: res.result.message || '添加成功', icon: 'none' });
        this.setData({ showAddModal: false });
        this.loadItems();
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('添加食材失败:', err);
      wx.showToast({ title: '添加失败', icon: 'none' });
    }
  },

  async onIncrease(e) {
    const itemId = e.currentTarget.dataset.id;
    const item = this.data.items.find(i => i._id === itemId);
    if (!item) return;
    try {
      await wx.cloud.callFunction({
        name: 'fridgeManager',
        data: {
          action: 'update',
          data: { itemId, quantity: item.quantity + 1 }
        }
      });
      this.loadItems();
    } catch (err) {
      console.error('更新失败:', err);
    }
  },

  async onDecrease(e) {
    const itemId = e.currentTarget.dataset.id;
    const item = this.data.items.find(i => i._id === itemId);
    if (!item || item.quantity <= 1) {
      wx.showModal({
        title: '删除食材',
        content: '数量为0将删除此食材，确认继续？',
        success: async (res) => {
          if (res.confirm) {
            await this.deleteItem(itemId);
          }
        }
      });
      return;
    }
    try {
      await wx.cloud.callFunction({
        name: 'fridgeManager',
        data: {
          action: 'update',
          data: { itemId, quantity: item.quantity - 1 }
        }
      });
      this.loadItems();
    } catch (err) {
      console.error('更新失败:', err);
    }
  },

  async onDelete(e) {
    const itemId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个食材吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.deleteItem(itemId);
        }
      }
    });
  },

  async deleteItem(itemId) {
    try {
      await wx.cloud.callFunction({
        name: 'fridgeManager',
        data: { action: 'remove', data: { itemId } }
      });
      wx.showToast({ title: '已删除', icon: 'none' });
      this.loadItems();
    } catch (err) {
      console.error('删除失败:', err);
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  }
});
