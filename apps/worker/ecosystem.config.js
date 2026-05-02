module.exports = {
  apps: [
    {
      name: 'fb-autopublish-worker',
      script: './dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
      },
      // Must be > worker.close() timeout (30s) to allow graceful shutdown
      kill_timeout: 35_000,
      listen_timeout: 10_000,
      // Restart delay on crash — avoid tight crash loops
      restart_delay: 5_000,
    },
  ],
}
