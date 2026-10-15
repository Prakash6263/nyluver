import { Client } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';

const conn = new Client();

const HOST = '76.13.37.192';
const USER = 'root';
const PASS = 'Prakash@6263';
const REMOTE_DIR = '/root/nyluver-backend';

function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    console.log(`Uploading ${localPath} -> ${remotePath}`);
    sftp.fastPut(localPath, remotePath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function sftpMkdir(sftp, remotePath) {
  return new Promise((resolve) => {
    sftp.mkdir(remotePath, () => resolve());
  });
}

function execCmd(conn, cmd) {
  return new Promise((resolve, reject) => {
    console.log(`\n[SSH] Running: ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('data', d => {
        out += d.toString();
        process.stdout.write(d);
      });
      stream.stderr.on('data', d => process.stderr.write(d));
      stream.on('close', code => {
        console.log(`[SSH] Exited with code ${code}`);
        resolve(out);
      });
    });
  });
}

conn.on('ready', async () => {
  console.log('✅ Connected to Hostinger VPS successfully!');

  conn.sftp(async (err, sftp) => {
    if (err) {
      console.error('SFTP Error:', err);
      conn.end();
      return;
    }

    try {
      // Ensure directories
      await sftpMkdir(sftp, `${REMOTE_DIR}/server`);
      await sftpMkdir(sftp, `${REMOTE_DIR}/server/public`);
      await sftpMkdir(sftp, `${REMOTE_DIR}/server/admin`);
      await sftpMkdir(sftp, `${REMOTE_DIR}/server/templates`);
      await sftpMkdir(sftp, `${REMOTE_DIR}/server_dist`);

      // Upload files
      await uploadFile(
        sftp,
        path.resolve(process.cwd(), 'server_dist/index.js'),
        `${REMOTE_DIR}/server_dist/index.js`
      );
      await uploadFile(
        sftp,
        path.resolve(process.cwd(), 'server/public/privacy-policy.html'),
        `${REMOTE_DIR}/server/public/privacy-policy.html`
      );
      await uploadFile(
        sftp,
        path.resolve(process.cwd(), 'server/admin/index.html'),
        `${REMOTE_DIR}/server/admin/index.html`
      );
      await uploadFile(
        sftp,
        path.resolve(process.cwd(), 'server/admin/privacy.html'),
        `${REMOTE_DIR}/server/admin/privacy.html`
      );
      await uploadFile(
        sftp,
        path.resolve(process.cwd(), 'server/admin/privacy-policy.html'),
        `${REMOTE_DIR}/server/admin/privacy-policy.html`
      );
      await uploadFile(
        sftp,
        path.resolve(process.cwd(), 'server/public/support.html'),
        `${REMOTE_DIR}/server/public/support.html`
      );
      await uploadFile(
        sftp,
        path.resolve(process.cwd(), 'server/admin/support.html'),
        `${REMOTE_DIR}/server/admin/support.html`
      );

      console.log('✅ All files uploaded successfully!');

      // Restart PM2 and verify
      await execCmd(conn, 'pm2 restart nyluver-backend');
      await execCmd(conn, 'sleep 3');
      await execCmd(conn, 'curl -IL http://127.0.0.1:4020/privacy-policy');
      await execCmd(conn, 'curl -IL http://127.0.0.1:4020/support');
      await execCmd(conn, 'curl -IL http://127.0.0.1:4020/support.html');

      console.log('🎉 DEPLOYMENT COMPLETE ON HOSTINGER VPS!');
      conn.end();
    } catch (e) {
      console.error('Upload / Deploy error:', e);
      conn.end();
    }
  });
}).on('error', err => {
  console.error('SSH Error:', err.message);
}).connect({
  host: HOST,
  port: 22,
  username: USER,
  password: PASS
});
