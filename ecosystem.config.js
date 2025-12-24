module.exports = {
  apps: [
    {
      name: 'hrms-main-backend',
      script: 'server/index.js',
      cwd: '/var/www/hr-sm',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster', // Cluster mode for load balancing
      
      // Environment variables for production
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        MONGODB_URI: 'mongodb+srv://devhaithammoreda_db_user:Jj9BcW2KPu4qLLWr@cluster.uwhj601.mongodb.net/hrms?retryWrites=true&w=majority',
        REDIS_URL: 'redis://localhost:6379',
        REDIS_PASSWORD: '',
        REDIS_DB: 0,
        
        // License server integration
        LICENSE_SERVER_URL: 'http://localhost:4000',
        LICENSE_SERVER_API_KEY: 'your-secure-license-api-key-here',
        
        // Session configuration
        SESSION_SECRET: 'your-super-secure-session-secret-change-in-production',
        SESSION_STORE: 'redis',
        
        // Security settings
        CORS_ORIGIN: 'https://your-domain.com,https://admin.your-domain.com',
        RATE_LIMIT_WINDOW: '900000', // 15 minutes
        RATE_LIMIT_MAX_REQUESTS: '1000',
        
        // Email configuration
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: '587',
        SMTP_USER: 'your-email@gmail.com',
        SMTP_PASS: 'your-app-password',
        SMTP_FROM: 'HR System <noreply@your-domain.com>',
        
        // File upload settings
        MAX_FILE_SIZE: '10485760', // 10MB
        UPLOAD_PATH: './uploads',
        
        // Monitoring
        PROMETHEUS_ENABLED: 'true',
        PROMETHEUS_PORT: '9090',
        LOG_LEVEL: 'info',
        
        // Backup settings
        BACKUP_ENABLED: 'true',
        BACKUP_SCHEDULE: '0 2 * * *', // Daily at 2 AM
        AWS_ACCESS_KEY_ID: 'your-aws-access-key',
        AWS_SECRET_ACCESS_KEY: 'your-aws-secret-key',
        AWS_REGION: 'us-east-1',
        AWS_S3_BUCKET: 'hrms-backups-production'
      },
      
      // Development environment
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000,
        MONGODB_URI: 'mongodb+srv://devhaithammoreda_db_user:Jj9BcW2KPu4qLLWr@cluster.uwhj601.mongodb.net/hrms_dev?retryWrites=true&w=majority',
        REDIS_URL: 'redis://localhost:6379',
        REDIS_PASSWORD: '',
        REDIS_DB: 1,
        
        // License server integration
        LICENSE_SERVER_URL: 'http://localhost:4000',
        LICENSE_SERVER_API_KEY: 'dev-license-api-key-change-in-production',
        
        // Session configuration
        SESSION_SECRET: 'dev-session-secret-change-in-production',
        SESSION_STORE: 'redis',
        
        // Security settings
        CORS_ORIGIN: 'http://localhost:3000,http://localhost:3001',
        RATE_LIMIT_WINDOW: '900000',
        RATE_LIMIT_MAX_REQUESTS: '10000',
        
        // Monitoring
        PROMETHEUS_ENABLED: 'true',
        PROMETHEUS_PORT: '9090',
        LOG_LEVEL: 'debug',
        
        // Backup settings
        BACKUP_ENABLED: 'false'
      },
      
      // Logging configuration
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      watch: false, // Disable watch in production
      ignore_watch: ['node_modules', 'logs', 'uploads', 'backups'],
      max_memory_restart: '1G', // Restart if memory usage exceeds 1GB
      
      // Restart policy
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Advanced settings
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
      
      // Health monitoring
      health_check_grace_period: 3000,
      
      // Merge logs from all instances
      merge_logs: true,
      
      // Time zone
      time: true,
      
      // Node.js options
      node_args: '--max-old-space-size=2048'
    }
  ],
  
  deploy: {
    production: {
      user: 'deploy',
      host: ['server1.your-domain.com', 'server2.your-domain.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/hr-sm.git',
      path: '/var/www/hr-sm',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /var/www/hr-sm/logs /var/www/hr-sm/uploads /var/www/hr-sm/backups'
    },
    
    staging: {
      user: 'deploy',
      host: 'staging.your-domain.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/hr-sm.git',
      path: '/var/www/hr-sm-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env development',
      'pre-setup': 'mkdir -p /var/www/hr-sm-staging/logs /var/www/hr-sm-staging/uploads'
    }
  }
};