module.exports = {
  apps: [
    {
      name: 'pharmavie-api',
      cwd: '/opt/pharmavie/apps/api',
      script: 'dist/src/main.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'pharmavie-web',
      cwd: '/opt/pharmavie/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
