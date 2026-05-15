const app = getApp();

Page({
  data: {
    recipeId: '',
    myUserId: '',
    recipe: {
      cover: '',
      name: '',
      difficulty: 1,
      cookTime: 0,
      servings: 2,
      tags: [],
      ingredients: [],
      steps: [],
      tips: ''
    }
  },

  onLoad(options) {
    if (app.globalData.userInfo) {
      this.setData({ myUserId: app.globalData.userInfo._id });
    }
    if (options.id) {
      this.setData({ recipeId: options.id });
      this.loadDetail();
    }
  },

  goToFridge() {
    wx.navigateTo({ url: '/pages/fridge/fridge' });
  },

  goEdit() {
    wx.navigateTo({ url: `/pages/recipe-create/recipe-create?id=${this.data.recipeId}` });
  },

  async loadDetail() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'recipeManager',
        data: {
          action: 'detail',
          data: { recipeId: this.data.recipeId }
        }
      });
      if (res.result.success) {
        const recipe = res.result.recipe;
        if (recipe.ingredients) {
          recipe.ingredients = recipe.ingredients.map(i => ({
            ...i,
            checked: false
          }));
        }
        this.setData({ recipe });
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' });
      }
    } catch (err) {
      console.error('加载菜谱详情失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onCheckIngredient(e) {
    const index = e.currentTarget.dataset.index;
    const recipe = this.data.recipe;
    recipe.ingredients[index].checked = !recipe.ingredients[index].checked;
    this.setData({ recipe });
  },

  onStartCook() {
    const { recipe, recipeId } = this.data;
    const allChecked = recipe.ingredients.every(i => i.checked);
    if (!allChecked) {
      wx.showModal({
        title: '食材未确认',
        content: '建议先确认所有食材是否已准备好哦～',
        cancelText: '再核对',
        confirmText: '继续烹饪'
      }).then(res => {
        if (res.confirm) this.doCook(recipe, recipeId);
      });
    } else {
      this.doCook(recipe, recipeId);
    }
  },

  async doCook(recipe, recipeId) {
    wx.showLoading({ title: '烹饪中...', mask: true });
    try {
      const consumedIngredients = recipe.ingredients.map(i => ({
        name: i.name,
        amount: parseFloat(i.amount) || 1,
        unit: i.unit || '克'
      }));

      const res = await wx.cloud.callFunction({
        name: 'fridgeManager',
        data: {
          action: 'cook',
          data: {
            recipeId,
            recipeName: recipe.name,
            consumedIngredients
          }
        }
      });

      wx.hideLoading();

      if (res.result.success) {
        const title = res.result.warnings && res.result.warnings.length > 0
          ? '烹饪完成，但...'
          : '烹饪成功！🎉';
        const content = res.result.warnings && res.result.warnings.length > 0
          ? res.result.warnings.join('\n') + '\n\n这些食材库存不足，记得补充哦～'
          : '食材库存已自动更新，开始享受美食吧～';

        wx.showModal({
          title,
          content,
          showCancel: false,
          confirmText: '好的',
          confirmColor: '#FF8FAB'
        });
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('烹饪失败:', err);
      wx.showToast({ title: '烹饪失败，请重试', icon: 'none' });
    }
  }
});
