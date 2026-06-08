const fs = require('fs');
  const path = require('path');
  let content = fs.readFileSync(path.join(__dirname, '../../views/LeaderboardView.vue'), 'utf8');

  // 修改 TopThree 的显示条件
  content = content.replace(
    'v-if="rankings.length >= 3"',
    'v-if="rankings.length > 0"'
  );

  // 修改 RankList 的排名切片
  content = content.replace(
    ':rankings="activeTab === \'song\' ? rankings : rankings.slice(3)"',
    ':rankings="activeTab === \'song\' ? rankings : rankings.slice(0, 50)"'
  );

  fs.writeFileSync(path.join(__dirname, '../../views/LeaderboardView.vue'), content);
  console.log('Fixed!');
