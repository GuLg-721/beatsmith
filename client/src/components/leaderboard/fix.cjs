const fs = require('fs');
  let content = fs.readFileSync('RankList.vue', 'utf8');
  content = content.replace(
    'return score.toLocaleString()',
    'if (score === undefined || score === null) return "0";\n  return score.toLocaleString()'
  );
  fs.writeFileSync('RankList.vue', content);
  console.log('Fixed!');
