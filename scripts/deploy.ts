import { Client } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const conn = new Client();

const config = {
  host: '66.116.196.82',
  port: 22,
  username: 'nodeteam',
  password: '@#teamnode2222',
};

async function executeLocalBuild() {
  console.log('Running local server build...');
  execSync('npm run server:build', { stdio: 'inherit' });
  console.log('Running local Expo web export...');
  execSync('npx expo export --platform web', { stdio: 'inherit' });
  console.log('Local builds completed successfully!');
}

function sftpUpload(sftp: any, localPath: string, remotePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, (err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function sftpMkdir(sftp: any, remotePath: string): Promise<void> {
  return new Promise((resolve) => {
    sftp.mkdir(remotePath, () => {
      resolve(); // ignore error if it already exists
    });
  });
}

async function sftpUploadDir(sftp: any, localDir: string, remoteDir: string): Promise<void> {
  await sftpMkdir(sftp, remoteDir);
  const items = fs.readdirSync(localDir);
  for (const item of items) {
    const localPath = path.join(localDir, item);
    const remotePath = path.posix.join(remoteDir, item);
    const stat = fs.statSync(localPath);
    if (stat.isDirectory()) {
      await sftpUploadDir(sftp, localPath, remotePath);
    } else {
      await sftpUpload(sftp, localPath, remotePath);
    }
  }
}

conn.on('ready', () => {
  console.log('SSH Connection Established for Deployment!');
  
  conn.sftp(async (err, sftp) => {
    if (err) {
      console.error('SFTP connection failed:', err.message);
      conn.end();
      return;
    }

    try {
      const remoteDir = '/home/nodeteam/nyluver-backend';
      const remoteDistDir = `${remoteDir}/server_dist`;

      console.log('Creating remote directories...');
      await sftpMkdir(sftp, remoteDir);
      await sftpMkdir(sftp, remoteDistDir);
      
      const remoteServerDir = `${remoteDir}/server`;
      const remoteTemplatesDir = `${remoteServerDir}/templates`;
      const remoteAdminDir = `${remoteServerDir}/admin`;
      
      await sftpMkdir(sftp, remoteServerDir);
      await sftpMkdir(sftp, remoteTemplatesDir);
      await sftpMkdir(sftp, remoteAdminDir);

      console.log('Uploading package files...');
      await sftpUpload(sftp, path.resolve(process.cwd(), 'package.json'), `${remoteDir}/package.json`);
      await sftpUpload(sftp, path.resolve(process.cwd(), 'package-lock.json'), `${remoteDir}/package-lock.json`);
      await sftpUpload(sftp, path.resolve(process.cwd(), 'drizzle.config.ts'), `${remoteDir}/drizzle.config.ts`);
      
      // Upload schema config file for drizzle running remotely
      const remoteSharedDir = `${remoteDir}/shared`;
      await sftpMkdir(sftp, remoteSharedDir);
      await sftpUpload(sftp, path.resolve(process.cwd(), 'shared/schema.ts'), `${remoteSharedDir}/schema.ts`);

      console.log('Uploading templates and admin assets...');
      await sftpUpload(sftp, path.resolve(process.cwd(), 'server/templates/landing-page.html'), `${remoteTemplatesDir}/landing-page.html`);
      await sftpUpload(sftp, path.resolve(process.cwd(), 'server/admin/index.html'), `${remoteAdminDir}/index.html`);

      console.log('Uploading built server files...');
      const localDistFiles = fs.readdirSync(path.resolve(process.cwd(), 'server_dist'));
      for (const file of localDistFiles) {
        await sftpUpload(
          sftp,
          path.resolve(process.cwd(), 'server_dist', file),
          `${remoteDistDir}/${file}`
        );
      }

      console.log('Uploading static web frontend files...');
      await sftpUploadDir(sftp, path.resolve(process.cwd(), 'dist'), `${remoteDir}/nyluver`);

      console.log('Creating remote .env configuration...');
      const envContent = [
        'DATABASE_URL=postgresql://nyluver:nyluver@localhost:5432/nyluver',
        'SESSION_SECRET=nyluver-secret-key',
        'PORT=4020',
        'NODE_ENV=production',
        'EXPO_PUBLIC_DOMAIN=node.aitechnotech.in',
        '# Staging: fixed OTP for testing. Remove when client provides WhatsApp credentials.',
        'DEFAULT_OTP=123456',
      ].join('\n');

      const tempEnvPath = path.resolve(process.cwd(), 'server_dist/.env.remote');
      fs.writeFileSync(tempEnvPath, envContent);
      await sftpUpload(sftp, tempEnvPath, `${remoteDir}/.env`);
      fs.unlinkSync(tempEnvPath);

      console.log('Files uploaded successfully! Starting installation and PM2 run...');

      const remoteShellCommands = [
        `cd ${remoteDir}`,
        'npm install --ignore-scripts',
        'export DATABASE_URL="postgresql://nyluver:nyluver@localhost:5432/nyluver"',
        'npx drizzle-kit push',
        'pm2 delete nyluver-backend 2>/dev/null || true',
        'pm2 start server_dist/index.js --name "nyluver-backend" --node-args="--env-file=.env"',
        'pm2 save'
      ].join(' && ');

      conn.exec(remoteShellCommands, (err, stream) => {
        if (err) throw err;
        
        stream.on('close', (code: number, signal: any) => {
          console.log(`Remote setup script completed with exit code: ${code}`);
          conn.end();
        }).on('data', (data: Buffer) => {
          console.log(data.toString().trim());
        }).stderr.on('data', (data: Buffer) => {
          console.error('REMOTE STDERR:', data.toString().trim());
        });
      });

    } catch (e: any) {
      console.error('Deployment Failed during file upload:', e.message);
      conn.end();
    }
  });
}).on('error', (err) => {
  console.error('SSH Connection Failed:', err.message);
});

// Run local build and connect
(async () => {
  try {
    await executeLocalBuild();
    conn.connect(config);
  } catch (error: any) {
    console.error('Build step failed:', error.message);
  }
})();
