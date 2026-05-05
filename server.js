// ============================================================
// OFM CRM — server.js
// Главная точка входа. Запуск: node server.js
// или через PM2: pm2 start ecosystem.config.js
// ============================================================
require('dotenv').config();

const express = require('express');
const path    = require('path');
const app     = express();

// ── Middleware ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));

// ── Статика: /crm → папка public/crm ─────────────────────────────────────
app.use('/crm', express.static(path.join(__dirname, 'public/crm')));

// ── Редиректы ─────────────────────────────────────────────────────────────
// Корень сайта → лендинг
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// /crm → /crm/login.html
app.get('/crm', (req, res) => {
    res.redirect('/crm/login.html');
});

// ── API роуты ─────────────────────────────────────────────────────────────
const { authRouter, rolesRouter, postsRouter } = require('./api');
app.use('/api/auth',     authRouter);
app.use('/api/roles',    rolesRouter);
app.use('/api/tg-posts', postsRouter);

// ── Лендинг статика ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// ── Запуск ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ OFM CRM running on http://localhost:${PORT}`);
    console.log(`   CRM Panel: http://localhost:${PORT}/crm`);
    console.log(`   API:       http://localhost:${PORT}/api`);
});
