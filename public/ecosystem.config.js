// ============================================================
// PM2 ecosystem — запуск API сервера + воркера
// Использование:
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup   ← автозапуск после перезагрузки сервера
// ============================================================
module.exports = {
  apps: [
    {
      name:      'ofmcrm-api',
      script:    'server.js',
      instances: 1,
      autorestart: true,
      watch:     false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV:    'production',
        PORT:        3000,
        DB_HOST:     'localhost',
        DB_PORT:     5432,
        DB_NAME:     'ofmcrm',
        DB_USER:     'postgres',
        DB_PASSWORD: 'ЗАМЕНИ_НА_СВОЙ_ПАРОЛЬ',
        JWT_SECRET:  'ЗАМЕНИ_НА_СЛУЧАЙНУЮ_СТРОКУ_32+_СИМВОЛА',
        JWT_EXPIRES: '7d',
        ORG_ID:      'a1b2c3d4-0000-0000-0000-000000000001',
      },
      error_file: './logs/api-error.log',
      out_file:   './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name:      'ofmcrm-worker',
      script:    'worker.js',
      instances: 1,       // СТРОГО 1 — нельзя запускать несколько воркеров
      autorestart: true,
      watch:     false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV:            'production',
        DB_HOST:             'localhost',
        DB_PORT:             5432,
        DB_NAME:             'ofmcrm',
        DB_USER:             'postgres',
        DB_PASSWORD:         'ЗАМЕНИ_НА_СВОЙ_ПАРОЛЬ',
        ORG_ID:              'a1b2c3d4-0000-0000-0000-000000000001',
        WORKER_INTERVAL_MS:  60000,   // проверка каждые 60 секунд
      },
      error_file: './logs/worker-error.log',
      out_file:   './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
