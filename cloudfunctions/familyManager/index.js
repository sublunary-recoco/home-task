const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { action, data } = event;

  switch (action) {
    case 'create': {
      const { name } = data;
      let inviteCode = generateInviteCode();
      let codeExists = true;
      while (codeExists) {
        const check = await db.collection('families').where({ inviteCode }).get();
        if (check.data.length === 0) codeExists = false;
        else inviteCode = generateInviteCode();
      }

      const userRes = await db.collection('users').where({ openId }).get();
      const user = userRes.data[0];

      const memberInfo = {
        userId: user._id,
        openId: openId,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        role: 'owner',
        joinedAt: db.serverDate()
      };

      const familyRes = await db.collection('families').add({
        data: {
          name: name,
          inviteCode: inviteCode,
          members: [memberInfo],
          createdBy: user._id,
          startDate: db.serverDate(),
          createdAt: db.serverDate()
        }
      });

      await db.collection('users').doc(user._id).update({
        data: {
          familyId: familyRes._id,
          updatedAt: db.serverDate()
        }
      });

      return {
        success: true,
        family: {
          _id: familyRes._id,
          name: name,
          inviteCode: inviteCode,
          members: [memberInfo]
        }
      };
    }

    case 'join': {
      const { inviteCode } = data;
      const familyRes = await db.collection('families').where({ inviteCode }).get();
      if (familyRes.data.length === 0) {
        return { success: false, message: '邀请码不存在' };
      }

      const family = familyRes.data[0];
      const userRes = await db.collection('users').where({ openId }).get();
      const user = userRes.data[0];

      const alreadyMember = family.members.some(m => m.openId === openId);
      if (alreadyMember) {
        await db.collection('users').doc(user._id).update({
          data: {
            familyId: family._id,
            updatedAt: db.serverDate()
          }
        });
        return { success: true, family };
      }

      const memberInfo = {
        userId: user._id,
        openId: openId,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        role: 'member',
        joinedAt: db.serverDate()
      };

      await db.collection('families').doc(family._id).update({
        data: {
          members: _.push(memberInfo)
        }
      });

      await db.collection('users').doc(user._id).update({
        data: {
          familyId: family._id,
          updatedAt: db.serverDate()
        }
      });

      family.members.push(memberInfo);
      return { success: true, family };
    }

    case 'get': {
      const userRes = await db.collection('users').where({ openId }).get();
      const user = userRes.data[0];
      if (!user || !user.familyId) {
        return { success: false, message: '未加入家庭' };
      }

      const familyRes = await db.collection('families').doc(user.familyId).get();
      const memberIds = familyRes.data.members.map(m => m.userId);
      const membersRes = await db.collection('users').where({
        _id: _.in(memberIds)
      }).get();

      const members = familyRes.data.members.map(m => {
        const userInfo = membersRes.data.find(u => u._id === m.userId);
        return {
          ...m,
          score: userInfo ? userInfo.score : 0,
          avatarUrl: userInfo ? userInfo.avatarUrl : '',
          nickName: userInfo ? userInfo.nickName : m.nickName
        };
      });

      return {
        success: true,
        family: {
          ...familyRes.data,
          members
        }
      };
    }

    case 'leave': {
      const userRes = await db.collection('users').where({ openId }).get();
      const user = userRes.data[0];
      if (!user || !user.familyId) {
        return { success: false, message: '未加入家庭' };
      }

      await db.collection('families').doc(user.familyId).update({
        data: {
          members: _.pull({
            openId: openId
          })
        }
      });

      await db.collection('users').doc(user._id).update({
        data: {
          familyId: '',
          updatedAt: db.serverDate()
        }
      });

      return { success: true };
    }

    default:
      return { success: false, message: '未知操作' };
  }
};
