const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { action, data } = event;

  const userRes = await db.collection('users').where({ openId }).get();
  if (userRes.data.length === 0) return { success: false, message: '用户不存在' };
  const user = userRes.data[0];
  if (!user.familyId) return { success: false, message: '请先加入家庭' };

  switch (action) {
    case 'recommend': {
      return await recommendDinner(user);
    }

    default:
      return { success: false, message: '未知操作' };
  }
};

async function recommendDinner(user) {
  const familyId = user.familyId;
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // 1. 获取冰箱所有食材
  const fridgeRes = await db.collection('fridge_items')
    .where({ familyId })
    .get();
  const fridgeItems = fridgeRes.data;

  // 构建食材名称索引（小写匹配）
  const fridgeMap = {};
  fridgeItems.forEach(item => {
    const key = item.name.toLowerCase();
    if (!fridgeMap[key]) {
      fridgeMap[key] = { count: 0, expiring: false };
    }
    fridgeMap[key].count += item.quantity || 1;
    if (item.expiryDate && new Date(item.expiryDate) <= threeDaysLater) {
      fridgeMap[key].expiring = true;
    }
  });

  // 2. 获取所有菜谱
  const recipeRes = await db.collection('recipes')
    .where({ familyId })
    .get();
  const recipes = recipeRes.data;

  if (recipes.length === 0) {
    return { success: true, recommendations: [], message: '还没有菜谱，去添加吧~' };
  }

  // 3. 计算每个菜谱的匹配度
  const scored = recipes.map(recipe => {
    let matchScore = 0;
    const missingIngredients = [];
    const usingExpiringItems = [];
    let totalIngredients = recipe.ingredients.length;

    recipe.ingredients.forEach(ing => {
      const ingName = ing.name.toLowerCase();
      const stock = fridgeMap[ingName];

      if (stock && stock.count >= (ing.count || 1)) {
        matchScore += 1;
        if (stock.expiring) {
          matchScore += 2;
          usingExpiringItems.push(ing.name);
        }
      } else if (stock && stock.count > 0) {
        matchScore += 0.5;
        missingIngredients.push({ name: ing.name, need: ing.count, have: stock.count });
      } else {
        missingIngredients.push({ name: ing.name, need: ing.count || 1, have: 0 });
      }
    });

    return {
      recipe,
      matchScore,
      matchRate: totalIngredients > 0 ? Math.round((matchScore / totalIngredients) * 100) : 0,
      missingIngredients,
      usingExpiringItems
    };
  });

  // 4. 按匹配度排序，取 top 3
  scored.sort((a, b) => b.matchScore - a.matchScore);
  const recommendations = scored.slice(0, 3);

  return {
    success: true,
    recommendations,
    totalRecipes: recipes.length,
    totalFridgeItems: fridgeItems.length
  };
}
