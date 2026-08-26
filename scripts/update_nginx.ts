import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '66.116.196.82',
  port: 22,
  username: 'nodeteam',
  password: '@#teamnode2222',
};

conn.on('ready', () => {
  console.log('SSH Connection Established for Nginx Setup!');
  
  // Script code to run on remote server
  const remoteJS = `
const fs = require('fs');

const confPath = '/etc/nginx/conf.d/node.aitechnotech.in.conf';
const newConfPath = '/home/nodeteam/node.aitechnotech.in.conf.new';
let content = fs.readFileSync(confPath, 'utf8');

let updatedContent = '';

const nyluverLocationBlocks = \`
    ############################################################
    # NYLUVER — API
    ############################################################
    location ^~ /nyluver/api/ {
       proxy_pass http://127.0.0.1:4020/api/;
       proxy_http_version 1.1;
       proxy_set_header Host \\\\$host;
       proxy_set_header X-Real-IP \\\\$remote_addr;
       proxy_set_header X-Forwarded-For \\\\$proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto \\\\$scheme;
    }

    ############################################################
    # NYLUVER — ADMIN
    ############################################################
    location ^~ /nyluver/admin/ {
       proxy_pass http://127.0.0.1:4020/admin/;
       proxy_http_version 1.1;
       proxy_set_header Host \\\\$host;
       proxy_set_header X-Real-IP \\\\$remote_addr;
       proxy_set_header X-Forwarded-For \\\\$proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto \\\\$scheme;
    }

    ############################################################
    # NYLUVER — FRONTEND (Expo Web App)
    ############################################################
    location ^~ /nyluver/ {
       root /home/nodeteam/nyluver-backend;
       index index.html;
       try_files \\\\$uri \\\\$uri/ /nyluver/index.html =404;
    }
\`;

if (content.includes('/nyluver/api/')) {
  console.log('Nyluver blocks already exist, replacing with fresh root-based blocks...');
  
  // Find start and end indices of the Nyluver block in file
  const startIdx = content.indexOf('############################################################\\n    # NYLUVER — API');
  const searchEndStr = 'try_files \\\\$uri \\\\$uri/ /nyluver/index.html =404;\\n    }';
  const endIdx = content.indexOf(searchEndStr);
  
  if (startIdx !== -1 && endIdx !== -1) {
    updatedContent = content.substring(0, startIdx) + nyluverLocationBlocks + content.substring(endIdx + searchEndStr.length);
  } else {
    console.log('Exact block match failed. Replacing using fallback regex...');
    // Fallback replacements
    let temp = content.replace(/alias \\/home\\/nodeteam\\/nyluver-backend\\/dist\\/;/g, 'root /home/nodeteam/nyluver-backend;');
    updatedContent = temp.replace(/127\\.0\\.0\\.1:(5000|5001)/g, '127.0.0.1:4020');
  }
} else {
  console.log('Nyluver blocks not found, appending them...');
  const lastBraceIdx = content.lastIndexOf('}');
  if (lastBraceIdx === -1) {
    console.error('Could not find closing brace in nginx config');
    process.exit(1);
  }
  updatedContent = content.substring(0, lastBraceIdx) + nyluverLocationBlocks + '\\\\n}\\\\n';
}

// Clean up double-escaped variables so they print as normal $var in Nginx conf file
updatedContent = updatedContent.replace(/\\\\\\\\\\$/g, '$');
updatedContent = updatedContent.replace(/\\\\\\$/g, '$');

fs.writeFileSync(newConfPath, updatedContent);
console.log('Temporary Nginx config generated!');
`;

  // Write JS script to remote temp file
  const remoteScriptPath = '/home/nodeteam/update_nginx.js';
  
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    const writeStream = sftp.createWriteStream(remoteScriptPath);
    writeStream.end(remoteJS, () => {
      console.log('Remote updater script written!');
      
      const runCommands = [
        // Run with regular user (has node)
        `node ${remoteScriptPath}`,
        // Copy using sudo
        'echo "@#teamnode2222" | sudo -S cp /home/nodeteam/node.aitechnotech.in.conf.new /etc/nginx/conf.d/node.aitechnotech.in.conf',
        // Test Nginx
        'echo "@#teamnode2222" | sudo -S nginx -t',
        // Reload Nginx
        'echo "@#teamnode2222" | sudo -S nginx -s reload',
        // Cleanup
        `rm -f ${remoteScriptPath} /home/nodeteam/node.aitechnotech.in.conf.new`
      ].join(' && ');

      conn.exec(runCommands, (err, stream) => {
        if (err) throw err;
        
        stream.on('close', (code: number, signal: any) => {
          console.log(`Nginx configuration commands finished with code: ${code}`);
          conn.end();
        }).on('data', (data: Buffer) => {
          console.log(data.toString().trim());
        }).stderr.on('data', (data: Buffer) => {
          console.error('STDERR:', data.toString().trim());
        });
      });
    });
  });
}).on('error', (err) => {
  console.error('SSH Connection Failed:', err.message);
}).connect(config);
