const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  const { nickName, avatarUrl } = event;

  const userRes = await db.collection('users').where({
    openId: openId
  }).get();

  let user = null;

  if (userRes.data.length === 0) {
    const createRes = await db.collection('users').add({
      data: {
        openId: openId,
        nickName: nickName || '小可爱',
        avatarUrl: avatarUrl || '',
        familyId: '',
        score: 0,
        level: 1,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });
    user = {
      _id: createRes._id,
      openId: openId,
      nickName: nickName || '小可爱',
      avatarUrl: avatarUrl || '',
      familyId: '',
      score: 0,
      level: 1
    };
  } else {
    user = userRes.data[0];
    await db.collection('users').doc(user._id).update({
      data: {
        nickName: nickName || user.nickName,
        avatarUrl: avatarUrl || user.avatarUrl,
        updatedAt: db.serverDate()
      }
    });
    user.nickName = nickName || user.nickName;
    user.avatarUrl = avatarUrl || user.avatarUrl;
  }

  return {
    success: true,
    openId: openId,
    user: user
  };
};
