import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('Connected! Restarting nyluver-backend process on server...');
  
  const cmd = [
    'cd /home/nodeteam/nyluver-backend',
    'pm2 restart nyluver-backend --update-env || pm2 start ecosystem.config.cjs',
    'sleep 3',
    'pm2 status',
    'ss -tlnp | grep 4020 || echo "Not Listening"',
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
