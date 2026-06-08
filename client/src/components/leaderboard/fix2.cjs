const fs = require('fs');
  let content = fs.readFileSync('TopThree.vue', 'utf8');
  content = content.replace(
    'return score.toLocaleString()',
    'if (score === undefined || score === null) return "0";\n  return score.toLocaleString()'
  );
  fs.writeFileSync('TopThree.vue', content);
  console.log('Fixed!');
