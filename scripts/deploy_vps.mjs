#!/usr/bin/env node
/**
 * Provision a fresh VPS and deploy the Nyluver backend onto it.
 *
 *   $env:DEPLOY_HOST="76.13.37.192"; $env:DEPLOY_USER="root"; $env:DEPLOY_PASSWORD="..."; node scripts/deploy_vps.mjs
 *
 * Required env:
 *   DEPLOY_HOST        IP or hostname of the target VPS
 *   DEPLOY_USER        SSH user (default: root)
 *   DEPLOY_PASSWORD    SSH password  (or set DEPLOY_KEY instead)
 *   DEPLOY_KEY         path to an SSH private key (alternative to DEPLOY_PASSWORD)
 *
 * Optional env:
 *   DEPLOY_APP_DIR     remote app folder name (default: nyluver-backend)
 *   DEPLOY_PORT        API port (default: 4020)
 *   DEPLOY_DOMAIN      value written to EXPO_PUBLIC_DOMAIN (default: <host>:<port>)
 *   DEPLOY_DB_URL      DATABASE_URL written to .env
 *   DEPLOY_SKIP_PROVISION=1   skip OS packages / Node / Postgres / PM2 setup
 *   DEPLOY_SKIP_BUILD=1       reuse the existing server_dist bundle
 *   DEPLOY_DUMP        path to a .sql.gz dump to restore instead of a fresh schema
 */

import { Client } from "ssh2";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const HOST = process.env.DEPLOY_HOST;
const USER = process.env.DEPLOY_USER || "root";
const PASSWORD = process.env.DEPLOY_PASSWORD || "";
const KEY_PATH = process.env.DEPLOY_KEY || "";
const PORT = String(process.env.DEPLOY_PORT || "4020");
const APP_DIR = process.env.DEPLOY_APP_DIR || "nyluver-backend";
const DOMAIN = process.env.DEPLOY_DOMAIN || HOST + ":" + PORT;
const DB_URL =
  process.env.DEPLOY_DB_URL ||
  "postgresql://nyluver:nyluver@localhost:5432/nyluver";
const SKIP_PROVISION = process.env.DEPLOY_SKIP_PROVISION === "1";
const SKIP_BUILD = process.env.DEPLOY_SKIP_BUILD === "1";
const DUMP_PATH = process.env.DEPLOY_DUMP || "";

const dbUrl = new URL(DB_URL);
const DB_USER = decodeURIComponent(dbUrl.username);
const DB_PASSWORD = decodeURIComponent(dbUrl.password);
const DB_NAME = dbUrl.pathname.replace(/^\//, "");

const ROOT = process.cwd();

if (!HOST) {
  console.error("DEPLOY_HOST is required");
  process.exit(1);
}
if (!PASSWORD && !KEY_PATH) {
  console.error("Provide DEPLOY_PASSWORD or DEPLOY_KEY");
  process.exit(1);
}

const log = (m) => console.log("\n==> " + m);
const warn = (m) => console.log("  ! " + m);
const ok = (m) => console.log("  + " + m);

function shq(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function build() {
  if (SKIP_BUILD) {
    ok("skipping build (DEPLOY_SKIP_BUILD=1)");
    return;
  }
  log("Building server bundle locally");
  execSync("npm run server:build", { stdio: "inherit", cwd: ROOT });
  if (!fs.existsSync(path.join(ROOT, "server_dist", "index.js"))) {
    throw new Error("server_dist/index.js was not produced by the build");
  }
  ok("server_dist/index.js built");
}

function buildEnvFile() {
  const localEnvPath = path.join(ROOT, ".env");
  const lines = fs.existsSync(localEnvPath)
    ? fs.readFileSync(localEnvPath, "utf8").split(/\r?\n/)
    : [];

  const overrides = {
    DATABASE_URL: DB_URL,
    PORT: PORT,
    NODE_ENV: "production",
    EXPO_PUBLIC_DOMAIN: DOMAIN,
  };
  const written = new Set();

  const out = lines.map((line) => {
    const match = /^([A-Z0-9_]+)=/.exec(line);
    if (!match || !(match[1] in overrides)) return line;
    written.add(match[1]);
    return match[1] + "=" + overrides[match[1]];
  });

  for (const key of Object.keys(overrides)) {
    if (!written.has(key)) out.push(key + "=" + overrides[key]);
  }

  while (out.length && out[out.length - 1].trim() === "") out.pop();
  return out.join("\n") + "\n";
}

let conn = null;

function connect() {
  return new Promise((resolve, reject) => {
    conn = new Client();
    conn.on("ready", resolve);
    conn.on("error", reject);
    const auth = KEY_PATH
      ? { privateKey: fs.readFileSync(KEY_PATH) }
      : { password: PASSWORD };
    conn.connect({ host: HOST, port: 22, username: USER, readyTimeout: 30000, ...auth });
  });
}

function exec(cmd, opts) {
  const quiet = opts && opts.quiet;
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d) => {
        out += d.toString();
        if (!quiet) process.stdout.write(d);
      });
      stream.stderr.on("data", (d) => {
        out += d.toString();
        if (!quiet) process.stderr.write(d);
      });
      stream.on("close", (code) => resolve({ code: code, out: out }));
    });
  });
}

function sudoWrap(cmd, isRoot) {
  if (isRoot) return "bash -lc " + shq(cmd);
  return "printf '%s\\n' " + shq(PASSWORD) + " | sudo -S -p '' bash -lc " + shq(cmd);
}

function sftpSession() {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => (err ? reject(err) : resolve(sftp)));
  });
}

function put(sftp, localRel, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(path.join(ROOT, localRel), remotePath, (err) =>
      err ? reject(new Error(localRel + ": " + err.message)) : resolve()
    );
  });
}

function writeRemote(sftp, remotePath, content) {
  return new Promise((resolve, reject) => {
    const stream = sftp.createWriteStream(remotePath);
    stream.on("close", resolve);
    stream.on("error", reject);
    stream.end(content);
  });
}

// bash below uses plain $VAR (never the braced form) so this template stays inert.
function provisionScript() {
  return `set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "--- apt update ---"
apt-get update -y

echo "--- base packages ---"
apt-get install -y curl ca-certificates gnupg git

echo "--- node ---"
NODE_MAJOR=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR=$(node -v | sed 's/^v//' | cut -d. -f1)
fi
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "installing Node.js 22 from NodeSource"
  if curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh && bash /tmp/nodesource_setup.sh; then
    apt-get install -y nodejs
  else
    echo "NodeSource setup unavailable - will use distro packages"
  fi
fi
if ! command -v node >/dev/null 2>&1; then
  echo "installing nodejs from distro repositories"
  apt-get install -y nodejs npm
fi
echo "node version: $(node -v)"

echo "--- pm2 ---"
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

echo "--- postgresql ---"
if ! command -v psql >/dev/null 2>&1; then
  apt-get install -y postgresql
fi
systemctl enable postgresql || true
systemctl start postgresql || true

for i in 1 2 3 4 5 6 7 8 9 10; do
  if pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then break; fi
  sleep 2
done

echo "--- database role and database ---"
ROLE_EXISTS=$(su - postgres -c "psql -tAc \\"SELECT 1 FROM pg_roles WHERE rolname='nyluver'\\"" | tr -d '[:space:]')
if [ "$ROLE_EXISTS" != "1" ]; then
  su - postgres -c "psql -c \\"CREATE ROLE nyluver LOGIN PASSWORD 'nyluver'\\""
fi
DB_EXISTS=$(su - postgres -c "psql -tAc \\"SELECT 1 FROM pg_database WHERE datname='nyluver'\\"" | tr -d '[:space:]')
if [ "$DB_EXISTS" != "1" ]; then
  su - postgres -c "createdb -O nyluver nyluver"
fi

echo "--- firewall ---"
if command -v ufw >/dev/null 2>&1; then
  if ufw status 2>/dev/null | grep -q "Status: active"; then
    ufw allow PORT_PLACEHOLDER/tcp || true
    echo "opened PORT_PLACEHOLDER/tcp in ufw"
  else
    echo "ufw inactive, no rule needed"
  fi
fi

echo "--- versions ---"
node -v
npm -v
psql --version
pm2 -v
echo "PROVISION_OK"
`.replace(/PORT_PLACEHOLDER/g, PORT);
}

function appSetupScript(homeDir) {
  return `set -euo pipefail

echo "--- starting application ---"
pm2 delete nyluver-backend >/dev/null 2>&1 || true
pm2 start ecosystem.config.cjs
pm2 save --force || pm2 save

echo "--- boot persistence ---"
pm2 startup systemd -u RUNUSER_PLACEHOLDER --hp HOMEDIR_PLACEHOLDER > /tmp/pm2_startup.sh 2>/dev/null || true
if [ -s /tmp/pm2_startup.sh ]; then
  bash /tmp/pm2_startup.sh >/dev/null 2>&1 || true
  echo "pm2 startup configured"
else
  echo "pm2 startup skipped"
fi

echo "--- waiting for API ---"
HTTP=""
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  HTTP=$(curl -s -o /tmp/api_probe.json -w "%{http_code}" "http://127.0.0.1:APIPORT_PLACEHOLDER/api/cities" || true)
  if [ "$HTTP" = "200" ]; then break; fi
  sleep 2
done

echo "HTTP_STATUS=$HTTP"
echo "RESPONSE_HEAD=$(head -c 200 /tmp/api_probe.json 2>/dev/null || true)"
echo "--- pm2 status ---"
pm2 status
echo "--- recent logs ---"
pm2 logs nyluver-backend --lines 15 --nostream || true
echo "APP_SETUP_DONE"
`
    .replace(/RUNUSER_PLACEHOLDER/g, USER)
    .replace(/HOMEDIR_PLACEHOLDER/g, homeDir)
    .replace(/APIPORT_PLACEHOLDER/g, PORT);
}

async function main() {
  build();
  const envFile = buildEnvFile();

  log("Connecting to " + USER + "@" + HOST);
  await connect();
  ok("SSH connected");

  const whoami = await exec("id -un", { quiet: true });
  const remoteUser = whoami.out.trim();
  const isRoot = remoteUser === "root";
  ok("remote user: " + remoteUser + (isRoot ? " (root)" : " (sudo)"));

  const homeRes = await exec("eval echo ~$(id -un)", { quiet: true });
  const homeDir = homeRes.out.trim();
  const remoteAppDir = homeDir + "/" + APP_DIR;
  ok("app directory: " + remoteAppDir);

  const sftp = await sftpSession();

  if (!SKIP_PROVISION) {
    log("Provisioning system packages (Node, PostgreSQL, PM2)");
    await writeRemote(sftp, "/tmp/nyluver_provision.sh", provisionScript());
    const res = await exec(sudoWrap("bash /tmp/nyluver_provision.sh", isRoot));
    if (res.code !== 0) {
      throw new Error("provisioning failed with exit code " + res.code);
    }
    ok("system provisioned");
  } else {
    warn("skipping system provisioning");
  }

  log("Creating remote directories");
  await exec(
    [
      "mkdir -p " + shq(remoteAppDir + "/server_dist"),
      "mkdir -p " + shq(remoteAppDir + "/server/templates"),
      "mkdir -p " + shq(remoteAppDir + "/server/admin"),
      "mkdir -p " + shq(remoteAppDir + "/server/public"),
      "mkdir -p " + shq(remoteAppDir + "/scripts"),
      "mkdir -p " + shq(remoteAppDir + "/shared"),
    ].join(" && "),
    { quiet: true }
  );
  ok("directories ready");

  log("Uploading application files");
  const files = [
    ["package.json", remoteAppDir + "/package.json"],
    ["package-lock.json", remoteAppDir + "/package-lock.json"],
    ["drizzle.config.ts", remoteAppDir + "/drizzle.config.ts"],
    ["ecosystem.config.cjs", remoteAppDir + "/ecosystem.config.cjs"],
    ["shared/schema.ts", remoteAppDir + "/shared/schema.ts"],
    ["server_dist/index.js", remoteAppDir + "/server_dist/index.js"],
    ["server/templates/landing-page.html", remoteAppDir + "/server/templates/landing-page.html"],
    ["server/admin/index.html", remoteAppDir + "/server/admin/index.html"],
    ["server/public/privacy-policy.html", remoteAppDir + "/server/public/privacy-policy.html"],
    ["scripts/check-smtp.mjs", remoteAppDir + "/scripts/check-smtp.mjs"],
  ];
  for (const f of files) {
    await put(sftp, f[0], f[1]);
    ok("uploaded " + f[0]);
  }

  await writeRemote(sftp, remoteAppDir + "/.env", envFile);
  ok("uploaded .env");

  log("Installing dependencies");
  const install = await exec(
    ["cd " + shq(remoteAppDir), "npm install --no-audit --no-fund"].join(" && "),
  );
  if (install.code !== 0) {
    warn("dependency install reported a non-zero exit code");
  } else {
    ok("dependencies installed");
  }

  if (DUMP_PATH) {
    log("Migrating database from " + DUMP_PATH);
    await put(sftp, DUMP_PATH, "/tmp/nyluver_restore.sql.gz");
    const restore = await exec(
      [
        "rm -f /tmp/nyluver_restore.sql /tmp/nyluver_restore.log",
        "gunzip -c /tmp/nyluver_restore.sql.gz > /tmp/nyluver_restore.sql",
        "PGPASSWORD=" + shq(DB_PASSWORD) + " psql -h 127.0.0.1 -p 5432 -U " + DB_USER + " -d " + DB_NAME + " -q -f /tmp/nyluver_restore.sql > /tmp/nyluver_restore.log 2>&1 || true",
        "echo --- restore errors ---",
        "grep -c ERROR /tmp/nyluver_restore.log || true",
        "echo --- restored rows ---",
        "PGPASSWORD=" + shq(DB_PASSWORD) + " psql -h 127.0.0.1 -p 5432 -U " + DB_USER + " -d " + DB_NAME + " -tAc \"select 'users='||count(*) from users\"",
        "PGPASSWORD=" + shq(DB_PASSWORD) + " psql -h 127.0.0.1 -p 5432 -U " + DB_USER + " -d " + DB_NAME + " -tAc \"select 'orders='||count(*) from orders\"",
        "PGPASSWORD=" + shq(DB_PASSWORD) + " psql -h 127.0.0.1 -p 5432 -U " + DB_USER + " -d " + DB_NAME + " -tAc \"select 'products='||count(*) from products\"",
        "echo RESTORE_DONE",
      ].join(" && "),
    );
    if (!/RESTORE_DONE/.test(restore.out)) {
      throw new Error("database restore did not complete");
    }
    ok("database migrated");
  } else {
    log("Syncing schema with drizzle-kit push");
    await exec(
      [
        "cd " + shq(remoteAppDir),
        "DATABASE_URL=" + shq(DB_URL) + " npx --yes drizzle-kit@0.31.4 push || echo 'WARN: drizzle-kit push failed - boot-time ensureSchema still runs'",
      ].join(" && "),
    );
    ok("schema push finished");
  }

  log("Starting application with PM2");
  await writeRemote(sftp, "/tmp/nyluver_app_setup.sh", appSetupScript(homeDir));
  const started = await exec("cd " + shq(remoteAppDir) + " && bash /tmp/nyluver_app_setup.sh");

  const statusMatch = /HTTP_STATUS=(\d+)/.exec(started.out);

  log("Result");
  console.log("  API health check : HTTP " + (statusMatch ? statusMatch[1] : "unknown"));
  console.log("  Public base URL  : http://" + HOST + ":" + PORT);
  console.log("  Admin panel      : http://" + HOST + ":" + PORT + "/admin");
  console.log("  App domain value : " + DOMAIN);

  if (!statusMatch || statusMatch[1] !== "200") {
    warn("API did not answer 200 - check the PM2 logs printed above");
    console.log("  Debug: ssh " + USER + "@" + HOST + " \"pm2 logs nyluver-backend --lines 80\"");
  } else {
    ok("backend is live");
  }

  conn.end();
}

main().catch((err) => {
  console.error("\nDEPLOY FAILED: " + err.message);
  try {
    conn.end();
  } catch (e) {}
  process.exit(1);
});
