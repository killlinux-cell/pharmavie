module.exports = {
  apps: [
    {
      name: 'pharmavie-api',
      script: '/opt/pharmavie/deploy/simple/start-api.sh',
      interpreter: 'bash',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '5s',
    },
    {
      name: 'pharmavie-web',
      script: '/opt/pharmavie/deploy/simple/start-web.sh',
      interpreter: 'bash',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '5s',
    },
  ],
};
