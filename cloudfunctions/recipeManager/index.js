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
      const { name, cover, difficulty, cookTime, servings, tags, ingredients, steps, tips } = data;
      if (!name || !name.trim()) return { success: false, message: '菜谱名称不能为空' };
      if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return { success: false, message: '请至少添加一种食材（做菜和推荐都需要它哦）' };
      }
      const res = await db.collection('recipes').add({
        data: {
          familyId,
          name: name.trim(),
          cover: cover || '🍳',
          difficulty: parseInt(difficulty) || 1,
          cookTime: parseInt(cookTime) || 30,
          servings: parseInt(servings) || 2,
          tags: tags || [],
          ingredients,
          steps,
          tips: tips || '',
          creatorId: user._id,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      });
      return { success: true, recipeId: res._id };
    }

    case 'update': {
      const { recipeId, name, cover, difficulty, cookTime, servings, tags, ingredients, steps, tips } = data;
      const recipeRes = await db.collection('recipes').doc(recipeId).get();
      const recipe = recipeRes.data;
      if (!recipe || recipe.familyId !== familyId) {
        return { success: false, message: '无权修改此菜谱' };
      }
      if (recipe.creatorId !== user._id) {
        return { success: false, message: '仅创建人可修改此菜谱' };
      }
      const updateData = { updatedAt: db.serverDate() };
      if (name !== undefined) {
        if (!name || !name.trim()) return { success: false, message: '菜谱名称不能为空' };
        updateData.name = name.trim();
      }
      if (cover !== undefined) updateData.cover = cover;
      if (difficulty !== undefined) updateData.difficulty = parseInt(difficulty);
      if (cookTime !== undefined) updateData.cookTime = parseInt(cookTime);
      if (servings !== undefined) updateData.servings = parseInt(servings);
      if (tags !== undefined) updateData.tags = tags;
      if (ingredients !== undefined) updateData.ingredients = ingredients;
      if (steps !== undefined) updateData.steps = steps;
      if (tips !== undefined) updateData.tips = tips;
      await db.collection('recipes').doc(recipeId).update({ data: updateData });
      return { success: true };
    }

    case 'delete': {
      const { recipeId } = data;
      const recipeRes = await db.collection('recipes').doc(recipeId).get();
      if (!recipeRes.data || recipeRes.data.familyId !== familyId) {
        return { success: false, message: '无权删除此菜谱' };
      }
      await db.collection('recipes').doc(recipeId).remove();
      return { success: true };
    }

    case 'detail': {
      const { recipeId } = data;
      const recipeRes = await db.collection('recipes').doc(recipeId).get();
      if (!recipeRes.data || recipeRes.data.familyId !== familyId) {
        return { success: false, message: '菜谱不存在' };
      }
      return { success: true, recipe: recipeRes.data };
    }

    case 'list': {
      const { category, keyword, page = 1, pageSize = 20 } = data || {};
      const conditions = { familyId };
      if (category) {
        conditions.tags = _.in([category]);
      }

      let query = db.collection('recipes').where(conditions);
      const skip = (page - 1) * pageSize;
      const res = await query
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get();

      if (keyword && keyword.trim()) {
        const kw = keyword.trim();
        const allRes = await db.collection('recipes').where(conditions).get();
        const filtered = allRes.data.filter(r =>
          r.name.includes(kw) ||
          (r.ingredients && r.ingredients.some(i => i.name.includes(kw)))
        );
        const paged = filtered.slice(skip, skip + pageSize);
        return { success: true, recipes: paged, total: filtered.length, page, pageSize };
      }

      const countRes = await db.collection('recipes').where(conditions).count();
      return { success: true, recipes: res.data, total: countRes.total, page, pageSize };
    }

    default:
      return { success: false, message: '未知操作' };
  }
};
