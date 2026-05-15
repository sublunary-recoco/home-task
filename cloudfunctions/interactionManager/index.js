const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 每日夸夸文案库
const COMPLIMENTS = [
  '你今天认真生活的样子，真的超有魅力 ✨',
  '有你在的家，连洗碗都变成了甜甜的事 💕',
  '看到你认真做饭的样子，心都要化了 🥰',
  '你是这个家最温柔的光，辛苦了 🌟',
  '有你一起分担家务，平凡的日子也闪闪发光 💫',
  '今天也是被你治愈的一天呢 🐻',
  '你的存在让柴米油盐都变成了诗 📝',
  '厨房里忙碌的你，是我心中最美的画面 🍳',
  '不管是做饭还是打扫，认真的你最迷人 💝',
  '和你一起经营的小家，每天都有温暖的味道 🏠',
  '辛苦一天了，记得给自己一个拥抱 🫂',
  '这个家因为有你的付出变得更温暖 ❤️',
  '谢谢你总是默默把一切都安排得那么好 🌸',
  '你的每一份劳动都是对家最温柔的告白 💌',
  '最喜欢看你做完任务后的满足笑容 😊',
  '和你一起生活的每一天都值得庆祝 🎉',
  '最好的爱情就是一起把日子过好 🌈',
  '你是今天的家务冠军，快去休息一下吧 🏆',
  '家里的一蔬一饭都藏着你的用心 🥬',
  '有你在，家才有了温度 ☀️',
  '细微的家务里藏着最深的爱 💗',
  '今天辛苦了，明天继续一起加油吧 🌻',
  '你把生活打理得井井有条，太棒了 👏',
  '每当看到整洁的家，就会想起你的好 🧹',
  '你的付出我都看在眼里，记在心里 💖',
  '爱就是一起做饭、一起打扫、一起变好 🍲',
  '你是这个家不可或缺的另一半 🐰',
  '你做的每一件小事，都是这个家的大温暖 🔥',
  '有你陪伴的日子，天天都是情人节 🌹',
  '愿我们的小家越来越温馨，越来越幸福 🏡'
];

function getTodayCompliment() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % COMPLIMENTS.length;
  return COMPLIMENTS[index];
}

function getTodayDateStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { action, data } = event;

  const userRes = await db.collection('users').where({ openId }).get();
  if (userRes.data.length === 0) return { success: false, message: '用户不存在' };
  const user = userRes.data[0];
  if (!user.familyId) return { success: false, message: '请先加入家庭' };

  switch (action) {
    case 'checkIn': {
      const today = getTodayDateStr();

      // 检查今日是否已签到
      const todayCheck = await db.collection('check_ins')
        .where({ userId: user._id, date: today })
        .get();

      if (todayCheck.data.length > 0) {
        return {
          success: false,
          message: '今天已经签到过啦~明天再来吧',
          alreadyChecked: true,
          record: todayCheck.data[0]
        };
      }

      // 查询昨天签到记录获取连续天数
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const y = yesterday.getFullYear();
      const m = String(yesterday.getMonth() + 1).padStart(2, '0');
      const d = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayStr = `${y}-${m}-${d}`;

      const yesterdayCheck = await db.collection('check_ins')
        .where({ userId: user._id, date: yesterdayStr })
        .get();

      let streak = 1;
      if (yesterdayCheck.data.length > 0) {
        streak = (yesterdayCheck.data[0].streak || 0) + 1;
      }

      // 随机奖励 1~5 爱心值
      const score = Math.floor(Math.random() * 5) + 1;

      // 写入签到记录
      const checkInRecord = {
        userId: user._id,
        familyId: user.familyId,
        date: today,
        score: score,
        streak: streak,
        createdAt: db.serverDate()
      };

      await db.collection('check_ins').add({ data: checkInRecord });

      // 写入积分日志
      await db.collection('score_logs').add({
        data: {
          userId: user._id,
          familyId: user.familyId,
          score: score,
          type: 'checkin',
          remark: `每日签到 (连续${streak}天)`,
          createdAt: db.serverDate()
        }
      });

      // 增加用户积分
      await db.collection('users').doc(user._id).update({
        data: {
          score: _.inc(score),
          updatedAt: db.serverDate()
        }
      });

      return {
        success: true,
        score,
        streak,
        message: `签到成功！+${score} 爱心值`
      };
    }

    case 'getStatus': {
      const today = getTodayDateStr();

      // 今日签到状态
      const todayCheck = await db.collection('check_ins')
        .where({ userId: user._id, date: today })
        .get();

      const checkedIn = todayCheck.data.length > 0;
      const todayRecord = checkedIn ? todayCheck.data[0] : null;

      // 计算连续签到天数
      let streak = 0;
      if (checkedIn) {
        streak = todayRecord.streak;
      } else {
        // 检查昨天
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const y = yesterday.getFullYear();
        const m = String(yesterday.getMonth() + 1).padStart(2, '0');
        const d = String(yesterday.getDate()).padStart(2, '0');
        const yesterdayStr = `${y}-${m}-${d}`;

        const yesterdayCheck = await db.collection('check_ins')
          .where({ userId: user._id, date: yesterdayStr })
          .get();

        if (yesterdayCheck.data.length > 0) {
          streak = yesterdayCheck.data[0].streak || 0;
        }
      }

      // 计算家庭创建天数
      let togetherDays = 0;
      if (user.familyId) {
        const familyRes = await db.collection('families').doc(user.familyId).get();
        if (familyRes.data && familyRes.data.startDate) {
          const start = new Date(familyRes.data.startDate);
          const now = new Date();
          togetherDays = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
        } else if (familyRes.data && familyRes.data.createdAt) {
          const start = new Date(familyRes.data.createdAt);
          const now = new Date();
          togetherDays = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
        }
      }

      return {
        success: true,
        checkedIn,
        todayRecord,
        streak,
        togetherDays,
        compliment: getTodayCompliment()
      };
    }

    case 'getCompliment': {
      return {
        success: true,
        compliment: getTodayCompliment()
      };
    }

    case 'getCheckInHistory': {
      const { page = 1, pageSize = 30 } = data || {};
      const skip = (page - 1) * pageSize;

      const logsRes = await db.collection('check_ins')
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
