const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

const defaultTasks = {
  takeoff: '🛫 起飞！完成一个简单动作：举手高呼“起飞啦”！',
  baseRoll: {
    2: '掷出2点：做2个深蹲。',
    3: '掷出3点：学3声猫叫。',
    4: '掷出4点：原地转4圈。',
    5: '掷出5点：与右边玩家击掌5下。'
  },
  outer: Array.from({ length: 12 }, (_, i) => `周围路径任务 ${i + 1}：请自定义大冒险内容。`),
  straight: Array.from({ length: 6 }, (_, i) => `直道第 ${i + 1} 格任务：所有颜色统一`),
  king: RANKS.map(r => `国王卡 ${r}：请自定义任务。`),
  final: '最后一名执行终极惩罚：由其他玩家商定。'
};

module.exports = { RANKS, defaultTasks };
