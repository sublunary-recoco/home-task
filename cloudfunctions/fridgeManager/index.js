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
    case 'list': {
      const { category, page = 1, pageSize = 50 } = data || {};
      const conditions = { familyId };
      if (category && category !== '全部') {
        conditions.category = category;
      }
      const skip = (page - 1) * pageSize;
      const res = await db.collection('fridge_items').where(conditions)
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get();
      const countRes = await db.collection('fridge_items').where(conditions).count();
      return { success: true, items: res.data, total: countRes.total };
    }

    case 'add': {
      const { name, quantity, unit, category, expiryDate } = data;
      if (!name || !name.trim()) return { success: false, message: '食材名称不能为空' };
      const qty = parseInt(quantity) || 1;
      const existing = await db.collection('fridge_items').where({
        familyId,
        name: name.trim()
      }).get();
      if (existing.data.length > 0) {
        await db.collection('fridge_items').doc(existing.data[0]._id).update({
          data: {
            quantity: _.inc(qty),
            expiryDate: expiryDate || existing.data[0].expiryDate || '',
            updatedAt: db.serverDate()
          }
        });
        return { success: true, itemId: existing.data[0]._id, message: '已增加数量' };
      }
      const res = await db.collection('fridge_items').add({
        data: {
          familyId,
          name: name.trim(),
          quantity: qty,
          unit: unit || '份',
          category: category || '其他',
          expiryDate: expiryDate || '',
          addedById: user._id,
          addedByName: user.nickName,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      });
      return { success: true, itemId: res._id };
    }

    case 'update': {
      const { itemId, quantity, unit, category, expiryDate } = data;
      const updateData = { updatedAt: db.serverDate() };
      if (quantity !== undefined) updateData.quantity = parseInt(quantity);
      if (unit !== undefined) updateData.unit = unit;
      if (category !== undefined) updateData.category = category;
      if (expiryDate !== undefined) updateData.expiryDate = expiryDate;
      await db.collection('fridge_items').doc(itemId).update({ data: updateData });
      return { success: true };
    }

    case 'remove': {
      const { itemId } = data;
      await db.collection('fridge_items').doc(itemId).remove();
      return { success: true };
    }

    case 'cook': {
      const { recipeId, recipeName, consumedIngredients } = data;
      if (!recipeId) return { success: false, message: '请指定菜谱' };
      if (!consumedIngredients || consumedIngredients.length === 0) {
        return { success: false, message: '食材清单为空' };
      }

      const warnings = [];
      for (const ing of consumedIngredients) {
        const itemRes = await db.collection('fridge_items').where({
          familyId,
          name: ing.name
        }).get();
        if (itemRes.data.length === 0 || itemRes.data[0].quantity < (ing.amount || 1)) {
          warnings.push(`${ing.name}库存不足`);
        }
      }

      for (const ing of consumedIngredients) {
        const itemRes = await db.collection('fridge_items').where({
          familyId,
          name: ing.name
        }).get();
        if (itemRes.data.length > 0) {
          const newQty = Math.max(0, itemRes.data[0].quantity - (ing.amount || 1));
          if (newQty === 0) {
            await db.collection('fridge_items').doc(itemRes.data[0]._id).remove();
          } else {
            await db.collection('fridge_items').doc(itemRes.data[0]._id).update({
              data: {
                quantity: newQty,
                updatedAt: db.serverDate()
              }
            });
          }
        }
      }

      await db.collection('cooking_logs').add({
        data: {
          familyId,
          recipeId,
          recipeName: recipeName || '',
          userId: user._id,
          userName: user.nickName,
          consumedIngredients,
          warnings: warnings.length > 0 ? warnings : [],
          createdAt: db.serverDate()
        }
      });

      if (warnings.length > 0) {
        return {
          success: true,
          message: '烹饪完成，但部分食材库存不足已记录',
          warnings
        };
      }
      return { success: true, message: '烹饪完成，食材库存已自动更新' };
    }

    case 'cookingLogs': {
      const { page = 1, pageSize = 20 } = data || {};
      const skip = (page - 1) * pageSize;
      const res = await db.collection('cooking_logs').where({ familyId })
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get();
      const countRes = await db.collection('cooking_logs').where({ familyId }).count();
      return { success: true, logs: res.data, total: countRes.total };
    }

    default:
      return { success: false, message: '未知操作' };
  }
};
