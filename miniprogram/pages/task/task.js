const app = getApp();

Page({
  data: {
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待领取' },
      { key: 'doing', label: '进行中' },
      { key: 'review', label: '待确认' },
      { key: 'done', label: '已完成' }
    ],
    currentTab: 'all',
    tasks: [],
    myUserId: '',
    page: 1,
    hasMore: true,
    showEdit: false,
    editingTaskId: '',
    editForm: {
      title: '',
      description: '',
      rewardScore: '',
      deadline: ''
    }
  },

  onShow() {
    if (!app.checkLogin()) return;
    if (!app.checkFamily()) return;
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      this.setData({ myUserId: userInfo._id });
    }
    this.loadTasks();
  },

  switchTab(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ currentTab: key, tasks: [], page: 1, hasMore: true });
    this.loadTasks();
  },

  async loadTasks() {
    try {
      wx.showLoading({ title: '加载中...' });
      const { currentTab, page } = this.data;
      const res = await wx.cloud.callFunction({
        name: 'taskManager',
        data: {
          action: 'list',
          data: {
            status: currentTab,
            page: page,
            pageSize: 20
          }
        }
      });

      if (res.result.success) {
        const newTasks = page === 1 ? res.result.tasks : [...this.data.tasks, ...res.result.tasks];

        const formatTasks = newTasks.map(t => ({
          ...t,
          deadlineRaw: t.deadline,
          deadline: t.deadline ? this.formatDate(t.deadline) : '',
          createdAt: this.formatDate(t.createdAt)
        }));

        this.setData({
          tasks: formatTasks,
          hasMore: res.result.tasks.length >= 20
        });
      }
    } catch (e) {
      console.error('加载任务失败:', e);
    } finally {
      wx.hideLoading();
    }
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}月${day}日`;
  },

  toDatePickerValue(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  async handleTake(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.showLoading({ title: '领取中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'taskManager',
        data: { action: 'take', data: { taskId } }
      });
      if (res.result.success) {
        wx.showToast({ title: '领取成功！', icon: 'success' });
        this.loadTasks();
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' });
      }
    } catch (e) {
      console.error('领取失败:', e);
    } finally {
      wx.hideLoading();
    }
  },

  async handleSubmit(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '提交任务',
      content: '确认完成任务并提交审核？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          wx.showLoading({ title: '提交中...' });
          const result = await wx.cloud.callFunction({
            name: 'taskManager',
            data: { action: 'submit', data: { taskId } }
          });
          if (result.result.success) {
            wx.showToast({ title: '已提交审核', icon: 'success' });
            this.loadTasks();
          } else {
            wx.showToast({ title: result.result.message, icon: 'none' });
          }
        } catch (e) {
          console.error('提交失败:', e);
        } finally {
          wx.hideLoading();
        }
      }
    });
  },

  async handleApprove(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认完成',
      content: '确认此任务已完成？奖励积分会发放给执行人。',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          wx.showLoading({ title: '确认中...' });
          const result = await wx.cloud.callFunction({
            name: 'taskManager',
            data: { action: 'review', data: { taskId, approved: true } }
          });
          if (result.result.success) {
            wx.showToast({ title: '任务完成！❤️', icon: 'success' });
            this.loadTasks();
          } else {
            wx.showToast({ title: result.result.message, icon: 'none' });
          }
        } catch (e) {
          console.error('操作失败:', e);
        } finally {
          wx.hideLoading();
        }
      }
    });
  },

  async handleReject(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '驳回任务',
      content: '确认驳回？任务将退回进行中状态。',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          wx.showLoading({ title: '驳回中...' });
          const result = await wx.cloud.callFunction({
            name: 'taskManager',
            data: { action: 'review', data: { taskId, approved: false } }
          });
          if (result.result.success) {
            wx.showToast({ title: '已驳回', icon: 'success' });
            this.loadTasks();
          }
        } catch (e) {
          console.error('操作失败:', e);
        } finally {
          wx.hideLoading();
        }
      }
    });
  },

  async handleCancel(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '取消任务',
      content: '确定取消此任务？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const result = await wx.cloud.callFunction({
            name: 'taskManager',
            data: { action: 'cancel', data: { taskId } }
          });
          if (result.result.success) {
            wx.showToast({ title: '已取消', icon: 'success' });
            this.loadTasks();
          }
        } catch (e) {
          console.error('取消失败:', e);
        }
      }
    });
  },

  showEditModal(e) {
    const task = e.currentTarget.dataset.task;
    this.setData({
      showEdit: true,
      editingTaskId: task._id,
      editForm: {
        title: task.title || '',
        description: task.description || '',
        rewardScore: String(task.rewardScore || 0),
        deadline: task.deadlineRaw ? this.toDatePickerValue(task.deadlineRaw) : ''
      }
    });
  },

  hideEditModal() {
    this.setData({ showEdit: false });
  },

  onEditTitle(e) {
    this.setData({ 'editForm.title': e.detail.value });
  },

  onEditDesc(e) {
    this.setData({ 'editForm.description': e.detail.value });
  },

  onEditScore(e) {
    this.setData({ 'editForm.rewardScore': e.detail.value });
  },

  onEditDeadline(e) {
    this.setData({ 'editForm.deadline': e.detail.value });
  },

  async handleEdit() {
    const { editingTaskId, editForm } = this.data;
    if (!editForm.title.trim()) {
      wx.showToast({ title: '任务标题不能为空', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '保存中...' });
      const res = await wx.cloud.callFunction({
        name: 'taskManager',
        data: {
          action: 'edit',
          data: {
            taskId: editingTaskId,
            title: editForm.title.trim(),
            description: editForm.description.trim(),
            rewardScore: parseInt(editForm.rewardScore) || 0,
            deadline: editForm.deadline || null
          }
        }
      });

      if (res.result.success) {
        wx.showToast({ title: '修改成功', icon: 'success' });
        this.hideEditModal();
        this.setData({ tasks: [], page: 1 });
        this.loadTasks();
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' });
      }
    } catch (e) {
      console.error('编辑失败:', e);
      wx.showToast({ title: '编辑失败，请重试', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/task-create/task-create' });
  },

  onReachBottom() {
    if (this.data.hasMore) {
      this.setData({ page: this.data.page + 1 });
      this.loadTasks();
    }
  }
});
