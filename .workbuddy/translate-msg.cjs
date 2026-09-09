const fs = require('fs');
const [, , mapPath] = process.argv;
const pairs = fs.readFileSync(mapPath, 'utf8')
  .split('\n')
  .filter(l => l.includes('\t'))
  .map(l => { const i = l.indexOf('\t'); return [l.slice(0, i), l.slice(i + 1)]; })
  .map(([from, to]) => [
    from.split('\\n').join('\n').split('\\r').join('\r'),
    to.split('\\n').join('\n').split('\\r').join('\r'),
  ]);
let data = '';
process.stdin.on('data', d => { data += d; });
process.stdin.on('end', () => {
  for (const [from, to] of pairs) data = data.split(from).join(to);
  process.stdout.write(data);
});
