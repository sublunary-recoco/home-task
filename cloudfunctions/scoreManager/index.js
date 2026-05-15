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

  switch (action) {
    case 'list': {
      const { page = 1, pageSize = 20 } = data || {};
      const skip = (page - 1) * pageSize;
      const familyId = user.familyId;
      const logsRes = await db.collection('score_logs')
        .where({ familyId })
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get();
      return {
        success: true,
        logs: logsRes.data,
        page,
        pageSize
      };
    }

    case 'myLogs': {
      const { page = 1, pageSize = 20 } = data || {};
      const skip = (page - 1) * pageSize;
      const logsRes = await db.collection('score_logs')
        .where({ userId: user._id })
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get();
      return {
        success: true,
        logs: logsRes.data,
        page,
        pageSize
      };
    }

    case 'leaderboard': {
      const { period = 'total' } = data || {};
      const familyId = user.familyId;
      if (!familyId) return { success: false, message: '请先加入家庭' };

      let startDate = null;
      const now = new Date();

      if (period === 'week') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
      } else if (period === 'month') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
      }

      // 获取家庭全部成员
      const familyRes = await db.collection('families').doc(familyId).get();
      const memberIds = familyRes.data.members.map(m => m.userId);
      const membersRes = await db.collection('users').where({
        _id: _.in(memberIds)
      }).field({ _id: true, nickName: true, avatarUrl: true, level: true }).get();

      // 聚合每个成员的积分
      const rankings = [];
      for (const member of membersRes.data) {
        let totalScore = 0;

        if (startDate) {
          const logsRes = await db.collection('score_logs')
            .where({
              userId: member._id,
              familyId: familyId,
              createdAt: _.gte(startDate)
            })
            .get();
          logsRes.data.forEach(log => { totalScore += log.score; });
        } else {
          totalScore = (await db.collection('users').doc(member._id).field({ score: true }).get()).data.score || 0;
        }

        rankings.push({
          userId: member._id,
          nickName: member.nickName || '小可爱',
          avatarUrl: member.avatarUrl || '',
          level: member.level || 1,
          score: totalScore
        });
      }

      // 按积分降序
      rankings.sort((a, b) => b.score - a.score);

      // 标记当前用户排名
      let myRank = -1;
      rankings.forEach((item, index) => {
        if (item.userId === user._id) myRank = index + 1;
      });

      return {
        success: true,
        rankings,
        myRank,
        total: rankings.length
      };
    }

    default:
      return { success: false, message: '未知操作' };
  }
};
