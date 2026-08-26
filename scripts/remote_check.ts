import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('Connected! Checking index.html and files on remote server...');
  
  const cmd = [
    'echo "=== nyluver index.html ==="',
    'cat /home/nodeteam/nyluver-backend/nyluver/index.html',
    'echo "=== js files ==="',
    'ls -la /home/nodeteam/nyluver-backend/nyluver/_expo/static/js/web',
  ].join(' && ');

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
    .on('data', (d: Buffer) => console.log(d.toString()))
    .stderr.on('data', (d: Buffer) => console.error(d.toString()));
  });
}).connect({
  host: '66.116.196.82',
  port: 22,
  username: 'nodeteam',
  password: '@#teamnode2222',
});
