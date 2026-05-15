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
  if (!user.familyId) return { success: false, message: '请先加入家庭' };

  switch (action) {
    case 'list': {
      const itemsRes = await db.collection('shop_items')
        .where({ familyId: user.familyId })
        .orderBy('createdAt', 'desc')
        .get();

      return {
        success: true,
        items: itemsRes.data,
        userScore: user.score
      };
    }

    case 'create': {
      const { name, cost, icon } = data;
      if (!name || !cost || cost <= 0) {
        return { success: false, message: '请输入商品名称和所需积分' };
      }

      await db.collection('shop_items').add({
        data: {
          familyId: user.familyId,
          name,
          cost: parseInt(cost),
          icon: icon || '🎁',
          createdBy: user._id,
          createdAt: db.serverDate()
        }
      });

      return { success: true, message: '商品创建成功' };
    }

    case 'redeem': {
      const { itemId } = data;
      if (!itemId) return { success: false, message: '缺少商品ID' };

      const itemRes = await db.collection('shop_items').doc(itemId).get();
      if (!itemRes.data || itemRes.data.familyId !== user.familyId) {
        return { success: false, message: '商品不存在' };
      }
      const item = itemRes.data;

      // 重新获取最新用户积分
      const freshUser = await db.collection('users').doc(user._id).get();
      const currentScore = freshUser.data.score || 0;

      if (currentScore < item.cost) {
        return { success: false, message: `爱心值不足！需要 ${item.cost}，当前 ${currentScore}` };
      }

      // 扣减积分
      await db.collection('users').doc(user._id).update({
        data: {
          score: _.inc(-item.cost),
          updatedAt: db.serverDate()
        }
      });

      // 写入兑换记录
      await db.collection('redeem_logs').add({
        data: {
          userId: user._id,
          familyId: user.familyId,
          itemId: item._id,
          itemName: item.name,
          cost: item.cost,
          createdAt: db.serverDate()
        }
      });

      // 写入积分日志
      await db.collection('score_logs').add({
        data: {
          userId: user._id,
          familyId: user.familyId,
          score: -item.cost,
          type: 'redeem',
          remark: `兑换：${item.name}`,
          createdAt: db.serverDate()
        }
      });

      return {
        success: true,
        message: `成功兑换 ${item.name}！`
      };
    }

    case 'delete': {
      const { itemId } = data;
      const itemRes = await db.collection('shop_items').doc(itemId).get();
      if (!itemRes.data || itemRes.data.familyId !== user.familyId) {
        return { success: false, message: '商品不存在' };
      }
      await db.collection('shop_items').doc(itemId).remove();
      return { success: true, message: '商品已删除' };
    }

    case 'redeemLogs': {
      const { page = 1, pageSize = 20 } = data || {};
      const skip = (page - 1) * pageSize;

      const logsRes = await db.collection('redeem_logs')
        .where({ familyId: user.familyId })
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

    default:
      return { success: false, message: '未知操作' };
  }
};
