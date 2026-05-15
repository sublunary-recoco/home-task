const app = getApp();

Page({
  data: {
    isEdit: false,
    editRecipeId: '',
    showDetail: false,
    form: {
      name: '',
      cover: '🍳',
      cookTime: 30,
      difficulty: 1,
      servings: 2,
      tags: [],
      ingredients: [{ name: '', amount: '', unit: '克' }],
      steps: [{ desc: '' }],
      tips: ''
    },
    cookTimeOptions: [10, 15, 20, 25, 30, 40, 50, 60, 90, 120],
    difficultyOptions: ['⭐ 简单', '⭐⭐ 中等', '⭐⭐⭐ 困难'],
    difficultyValues: [1, 2, 3],
    servingsOptions: [1, 2, 3, 4, 5, 6],
    tagOptions: [
      { name: '家常菜', selected: false },
      { name: '汤粥', selected: false },
      { name: '西餐', selected: false },
      { name: '甜品', selected: false },
      { name: '饮品', selected: false },
      { name: '快手菜', selected: false },
      { name: '减脂', selected: false },
      { name: '宴客', selected: false }
    ],
    coverEmojis: ['🍳', '🍜', '🍝', '🥗', '🥘', '🍛', '🍲', '🥩', '🍗', '🍤', '🥟', '🍕', '🧁', '🥤'],
    submitting: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ isEdit: true, editRecipeId: options.id });
      this.loadRecipe(options.id);
    }
  },

  async loadRecipe(recipeId) {
    try {
      wx.showLoading({ title: '加载菜谱...' });
      const res = await wx.cloud.callFunction({
        name: 'recipeManager',
        data: { action: 'detail', data: { recipeId } }
      });
      if (res.result.success) {
        const r = res.result.recipe;
        const ingredients = (r.ingredients && r.ingredients.length > 0)
          ? r.ingredients.map(i => ({ name: i.name || '', amount: i.amount || '', unit: i.unit || '克' }))
          : [{ name: '', amount: '', unit: '克' }];

        const steps = (r.steps && r.steps.length > 0)
          ? r.steps.map(s => ({ desc: s.desc || '' }))
          : [{ desc: '' }];

        const recipeTags = r.tags || [];
        const tagOptions = this.data.tagOptions.map(t => ({
          ...t,
          selected: recipeTags.indexOf(t.name) !== -1
        }));

        this.setData({
          showDetail: !!(r.tips || (r.steps && r.steps.length > 0) || (recipeTags.length > 0)),
          tagOptions,
          form: {
            name: r.name || '',
            cover: r.cover || '🍳',
            cookTime: r.cookTime || 30,
            difficulty: r.difficulty || 1,
            servings: r.servings || 2,
            tags: r.tags || [],
            ingredients,
            steps,
            tips: r.tips || ''
          }
        });
      }
      wx.hideLoading();
    } catch (e) {
      wx.hideLoading();
      console.error('加载菜谱失败:', e);
    }
  },

  toggleDetail() {
    this.setData({ showDetail: !this.data.showDetail });
  },

  onNameInput(e) {
    this.setData({ 'form.name': e.detail.value });
  },

  onCoverTap() {
    wx.showActionSheet({
      itemList: this.data.coverEmojis,
      success: (res) => {
        this.setData({ 'form.cover': this.data.coverEmojis[res.tapIndex] });
      }
    });
  },

  onCookTimeChange(e) {
    this.setData({ 'form.cookTime': this.data.cookTimeOptions[e.detail.value] });
  },

  onDifficultyChange(e) {
    this.setData({ 'form.difficulty': this.data.difficultyValues[e.detail.value] });
  },

  onServingsChange(e) {
    this.setData({ 'form.servings': this.data.servingsOptions[e.detail.value] });
  },

  onTagTap(e) {
    const index = e.currentTarget.dataset.index;
    const tagOptions = this.data.tagOptions;
    tagOptions[index].selected = !tagOptions[index].selected;
    const tags = tagOptions.filter(t => t.selected).map(t => t.name);
    this.setData({ tagOptions, 'form.tags': tags });
  },

  // 食材
  onIngredientNameInput(e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({ [`form.ingredients[${idx}].name`]: e.detail.value });
  },

  onIngredientAmountInput(e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({ [`form.ingredients[${idx}].amount`]: e.detail.value });
  },

  onIngredientUnitInput(e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({ [`form.ingredients[${idx}].unit`]: e.detail.value });
  },

  addIngredient() {
    this.setData({
      'form.ingredients': [...this.data.form.ingredients, { name: '', amount: '', unit: '克' }]
    });
  },

  removeIngredient(e) {
    const idx = e.currentTarget.dataset.index;
    const ingredients = this.data.form.ingredients;
    if (ingredients.length <= 1) return;
    ingredients.splice(idx, 1);
    this.setData({ 'form.ingredients': ingredients });
  },

  // 步骤
  onStepInput(e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({ [`form.steps[${idx}].desc`]: e.detail.value });
  },

  addStep() {
    this.setData({ 'form.steps': [...this.data.form.steps, { desc: '' }] });
  },

  removeStep(e) {
    const idx = e.currentTarget.dataset.index;
    const steps = this.data.form.steps;
    if (steps.length <= 1) return;
    steps.splice(idx, 1);
    this.setData({ 'form.steps': steps });
  },

  onTipsInput(e) {
    this.setData({ 'form.tips': e.detail.value });
  },

  async handleSubmit() {
    const { form, isEdit, editRecipeId } = this.data;
    if (!form.name.trim()) {
      wx.showToast({ title: '请输入菜谱名称', icon: 'none' });
      return;
    }

    const validIngredients = form.ingredients.filter(i => i.name.trim());
    if (validIngredients.length === 0) {
      wx.showToast({ title: '请至少添加一种食材', icon: 'none' });
      return;
    }

    const validSteps = form.steps.filter(s => s.desc.trim());

    const payload = {
      name: form.name.trim(),
      cover: form.cover,
      difficulty: form.difficulty,
      cookTime: form.cookTime,
      servings: form.servings,
      tags: form.tags,
      ingredients: validIngredients.map(i => ({
        name: i.name.trim(),
        amount: i.amount.trim() || '适量',
        unit: i.unit.trim() || '克'
      })),
      steps: validSteps.map((s, idx) => ({ order: idx + 1, desc: s.desc.trim() })),
      tips: form.tips.trim()
    };

    this.setData({ submitting: true });
    try {
      if (isEdit) {
        payload.recipeId = editRecipeId;
      }
      const res = await wx.cloud.callFunction({
        name: 'recipeManager',
        data: {
          action: isEdit ? 'update' : 'create',
          data: payload
        }
      });

      if (res.result.success) {
        wx.showToast({ title: isEdit ? '修改成功' : '创建成功 🎉', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1200);
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' });
      }
    } catch (err) {
      console.error('保存菜谱失败:', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
