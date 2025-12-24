module.exports = {
  apps: [{
    name: 'hrsm-license-server',
    script: 'src/server.js',
    cwd: '/var/www/hr-sm/hrsm-license-server',
    instances: 1, // Single instance for license server to avoid conflicts
    exec_mode: 'fork', // Fork mode for single instance
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
      MONGODB_URI: 'mongodb+srv://devhaithammoreda_db_user:Jj9BcW2KPu4qLLWr@cluster.uwhj601.mongodb.net/hrsm_license_db?retryWrites=true&w=majority',
      JWT_PRIVATE_KEY_PATH: './keys/private.pem',
      JWT_PUBLIC_KEY_PATH: './keys/public.pem',
      ADMIN_API_KEY: 'your-secure-admin-api-key-here',
      ALLOWED_ORIGINS: 'https://your-domain.com,https://admin.your-domain.com',
      RATE_LIMIT_WINDOW: '900000',
      RATE_LIMIT_MAX_REQUESTS: '100',
      LOG_LEVEL: 'info'
    },
    
    env_development: {
      NODE_ENV: 'development',
      PORT: 4000,
      MONGODB_URI: 'mongodb+srv://devhaithammoreda_db_user:Jj9BcW2KPu4qLLWr@cluster.uwhj601.mongodb.net/hrsm_license_db_dev?retryWrites=true&w=majority',
      JWT_PRIVATE_KEY_PATH: './keys/private.pem',
      JWT_PUBLIC_KEY_PATH: './keys/public.pem',
      ADMIN_API_KEY: 'dev-admin-key-change-in-production',
      ALLOWED_ORIGINS: 'http://localhost:5000,http://localhost:3001,http://localhost:3000',
      RATE_LIMIT_WINDOW: '900000',
      RATE_LIMIT_MAX_REQUESTS: '1000',
      LOG_LEVEL: 'debug'
    },
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Process management
    watch: false, // Disable watch in production
    ignore_watch: ['node_modules', 'logs', 'keys'],
    max_memory_restart: '500M',
    
    // Restart policy
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Advanced settings
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 3000,
    
    // Health monitoring
    health_check_grace_period: 3000,
    
    // Merge logs
    merge_logs: true,
    
    // Time zone
    time: true
  }],
  
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/hr-sm.git',
      path: '/var/www/hrsm-license-server',
      'pre-deploy-local': '',
      'post-deploy': 'cd hrsm-license-server && npm install && npm run generate-keys && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    },
    
    staging: {
      user: 'deploy',
      host: 'staging-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/hr-sm.git',
      path: '/var/www/hrsm-license-server-staging',
      'post-deploy': 'cd hrsm-license-server && npm install && npm run generate-keys && pm2 reload ecosystem.config.js --env development'
    }
  }
};