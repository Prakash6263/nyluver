module.exports = {
  apps: [{
    name: 'nyluver-backend',
    script: 'server_dist/index.js',
    cwd: __dirname,
    node_args: '--env-file=.env',
    exp_backoff_restart: 1000,
    max_restarts: 50,
    restart_delay: 2000,
    min_uptime: '5s',
    autorestart: true,
    env: {
      NODE_ENV: 'production',
    }
  }]
};
