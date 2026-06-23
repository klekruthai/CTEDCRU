import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
for (const name of ['index.html', 'app.js', 'data.js']) {
  fs.copyFileSync(path.join(src, name), path.join(dist, name));
}
fs.copyFileSync(path.join(src, 'CTED 2022-04.jpg'), path.join(dist, 'assets', 'CTED 2022-04.jpg'));
