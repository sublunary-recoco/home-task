const app = getApp();

Page({
  data: {
    activeCategory: '',
    categories: [
      { label: '🥘 家常菜', value: '家常菜' },
      { label: '🥣 汤粥', value: '汤粥' },
      { label: '🍝 西餐', value: '西餐' },
      { label: '🍰 甜品', value: '甜品' },
      { label: '🥤 饮品', value: '饮品' }
    ],
    recipes: [],
    keyword: '',
    loading: false
  },

  onShow() {
    if (!app.globalData.openId || !app.globalData.familyId) {
      wx.showToast({ title: '请先登录并加入家庭', icon: 'none' });
      return;
    }
    this.loadRecipes();
  },

  onPullDownRefresh() {
    this.loadRecipes().then(() => wx.stopPullDownRefresh());
  },

  async loadRecipes() {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'recipeManager',
        data: {
          action: 'list',
          data: {
            category: this.data.activeCategory || undefined,
            keyword: this.data.keyword || undefined
          }
        }
      });
      if (res.result.success) {
        this.setData({ recipes: res.result.recipes });
      }
    } catch (err) {
      console.error('加载菜谱失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onCategoryChange(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ activeCategory: category }, () => {
      this.loadRecipes();
    });
  },

  onSearchTap() {
    wx.showModal({
      title: '搜索菜谱',
      editable: true,
      placeholderText: '输入菜名或食材...',
      success: async (res) => {
        if (res.confirm && res.content) {
          this.setData({ keyword: res.content.trim() }, () => {
            this.loadRecipes();
          });
        }
      }
    });
  },

  onRecipeTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/recipe-detail/recipe-detail?id=${id}` });
  },

  onAddTap() {
    wx.navigateTo({ url: '/pages/recipe-create/recipe-create' });
  }
});
