const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { action, data } = event;

  const userRes = await db.collection('users').where({ openId }).get();
  if (userRes.data.length === 0) return { success: false, message: '用户不存在' };
  const user = userRes.data[0];

  const familyId = user.familyId;
  if (!familyId) return { success: false, message: '请先加入家庭' };

  switch (action) {
    case 'create': {
      const { title, description, rewardScore, deadline } = data;
      if (!title || !title.trim()) return { success: false, message: '任务标题不能为空' };
      const score = parseInt(rewardScore) || 0;
      const res = await db.collection('tasks').add({
        data: {
          familyId,
          title: title.trim(),
          description: description || '',
          rewardScore: score,
          status: 'pending',
          creatorId: user._id,
          assigneeId: null,
          deadline: deadline ? new Date(deadline) : null,
          images: [],
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      });
      return { success: true, taskId: res._id };
    }

    case 'list': {
      const { status, page = 1, pageSize = 20 } = data || {};
      let query = db.collection('tasks').where({ familyId });
      if (status && status !== 'all') {
        query = query.where({ status });
      }
      const skip = (page - 1) * pageSize;
      const res = await query
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get();

      const creatorIds = [...new Set(res.data.map(t => t.creatorId))];
      const assigneeIds = res.data.filter(t => t.assigneeId).map(t => t.assigneeId);
      const allUserIds = [...new Set([...creatorIds, ...assigneeIds])];

      if (allUserIds.length > 0) {
        const usersRes = await db.collection('users').where({
          _id: _.in(allUserIds)
        }).field({ nickName: true, avatarUrl: true }).get();
        const userMap = {};
        usersRes.data.forEach(u => { userMap[u._id] = u; });
        res.data.forEach(t => {
          t.creator = userMap[t.creatorId] || null;
          t.assignee = userMap[t.assigneeId] || null;
        });
      }

      const countRes = await db.collection('tasks').where({ familyId }).count();
      return {
        success: true,
        tasks: res.data,
        total: countRes.total,
        page,
        pageSize
      };
    }

    case 'myList': {
      const { status, page = 1, pageSize = 20 } = data || {};
      const conditions = { familyId };
      if (status && status !== 'all') {
        conditions.status = status;
        conditions.assigneeId = user._id;
      } else {
        conditions.assigneeId = user._id;
      }
      const skip = (page - 1) * pageSize;
      const res = await db.collection('tasks').where(conditions)
        .orderBy('createdAt', 'desc')
        .skip(skip).limit(pageSize).get();

      const creatorIds = [...new Set(res.data.map(t => t.creatorId))];
      if (creatorIds.length > 0) {
        const usersRes = await db.collection('users').where({
          _id: _.in(creatorIds)
        }).field({ nickName: true, avatarUrl: true }).get();
        const userMap = {};
        usersRes.data.forEach(u => { userMap[u._id] = u; });
        res.data.forEach(t => { t.creator = userMap[t.creatorId] || null; });
      }

      return { success: true, tasks: res.data, page, pageSize };
    }

    case 'take': {
      const { taskId } = data;
      const taskRes = await db.collection('tasks').doc(taskId).get();
      const task = taskRes.data;
      if (task.status !== 'pending') {
        return { success: false, message: '该任务已被领取' };
      }
      await db.collection('tasks').doc(taskId).update({
        data: {
          status: 'doing',
          assigneeId: user._id,
          updatedAt: db.serverDate()
        }
      });
      return { success: true };
    }

    case 'submit': {
      const { taskId } = data;
      const taskRes = await db.collection('tasks').doc(taskId).get();
      const task = taskRes.data;
      if (task.status !== 'doing') {
        return { success: false, message: '任务状态不正确' };
      }
      if (task.assigneeId !== user._id) {
        return { success: false, message: '你未领取此任务' };
      }
      await db.collection('tasks').doc(taskId).update({
        data: {
          status: 'review',
          updatedAt: db.serverDate()
        }
      });
      return { success: true };
    }

    case 'review': {
      const { taskId, approved } = data;
      const taskRes = await db.collection('tasks').doc(taskId).get();
      const task = taskRes.data;
      if (task.status !== 'review') {
        return { success: false, message: '任务不在待确认状态' };
      }

      if (approved) {
        await db.collection('tasks').doc(taskId).update({
          data: {
            status: 'done',
            updatedAt: db.serverDate()
          }
        });

        if (task.assigneeId && task.rewardScore > 0) {
          await db.collection('users').doc(task.assigneeId).update({
            data: {
              score: _.inc(task.rewardScore),
              updatedAt: db.serverDate()
            }
          });
          await db.collection('score_logs').add({
            data: {
              userId: task.assigneeId,
              familyId,
              score: task.rewardScore,
              type: 'task_reward',
              remark: `完成任务：${task.title}`,
              taskId: taskId,
              createdAt: db.serverDate()
            }
          });
        }
      } else {
        await db.collection('tasks').doc(taskId).update({
          data: {
            status: 'doing',
            updatedAt: db.serverDate()
          }
        });
      }
      return { success: true };
    }

    case 'cancel': {
      const { taskId } = data;
      await db.collection('tasks').doc(taskId).update({
        data: {
          status: 'cancel',
          updatedAt: db.serverDate()
        }
      });
      return { success: true };
    }

    case 'edit': {
      const { taskId, title, description, rewardScore, deadline } = data;

      const taskRes = await db.collection('tasks').doc(taskId).get();
      const task = taskRes.data;

      if (!task) return { success: false, message: '任务不存在' };
      if (task.creatorId !== user._id) return { success: false, message: '仅创建人可修改任务' };
      if (task.status !== 'pending') return { success: false, message: '任务已被领取，无法修改' };

      const updateData = { updatedAt: db.serverDate() };
      if (title !== undefined) {
        if (!title || !title.trim()) return { success: false, message: '任务标题不能为空' };
        updateData.title = title.trim();
      }
      if (description !== undefined) updateData.description = description;
      if (rewardScore !== undefined) updateData.rewardScore = Math.max(0, parseInt(rewardScore) || 0);
      if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;

      await db.collection('tasks').doc(taskId).update({ data: updateData });
      return { success: true, message: '修改成功' };
    }

    case 'delete': {
      const { taskId } = data;
      await db.collection('tasks').doc(taskId).remove();
      return { success: true };
    }

    default:
      return { success: false, message: '未知操作' };
  }
};
