// ============================================================
// OFM CRM — userbot-auth.js
// Первичная авторизация gramjs (запускается ОДИН РАЗ)
// После авторизации session_string сохраняется в БД
// ============================================================
// Запуск: node userbot-auth.js
// ============================================================

require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession }  = require('telegram/sessions');
const input              = require('input');           // npm i input
const { Pool }           = require('pg');

const API_ID   = 660062;
const API_HASH = 'a6770a0a3ab1415672adecfcd1235be0';
const ORG_ID   = process.env.ORG_ID || 'a1b2c3d4-0000-0000-0000-000000000001';

const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME     || 'ofmcrm',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
});

async function main() {
    console.log('\n=== OFM CRM — Telegram Userbot Authorization ===\n');

    // Получаем телефон из БД
    const res = await pool.query(
        'SELECT phone, session_string FROM userbot_sessions WHERE org_id = $1',
        [ORG_ID]
    );
    if (!res.rows[0]) {
        console.error('❌ Userbot session not found in DB for org:', ORG_ID);
        process.exit(1);
    }

    const { phone, session_string } = res.rows[0];
    const session = new StringSession(session_string || '');

    const client = new TelegramClient(session, API_ID, API_HASH, {
        connectionRetries: 5,
    });

    console.log(`📱 Phone: ${phone}`);
    console.log('🔌 Connecting to Telegram...\n');

    await client.start({
        phoneNumber:  async () => phone,
        phoneCode:    async () => {
            return await input.text('📩 Enter the code from Telegram: ');
        },
        password:     async () => {
            return await input.text('🔐 Enter 2FA password (if any): ');
        },
        onError: (err) => {
            console.error('❌ Auth error:', err.message);
        },
    });

    const sessionString = client.session.save();
    console.log('\n✅ Authorized successfully!');
    console.log('💾 Saving session to database...');

    await pool.query(`
        UPDATE userbot_sessions
        SET session_string  = $2,
            is_authorized   = TRUE,
            error_message   = NULL,
            updated_at      = NOW()
        WHERE org_id = $1`,
        [ORG_ID, sessionString]
    );

    // Проверяем кто авторизован
    const me = await client.getMe();
    console.log(`\n👤 Logged in as: ${me.firstName} ${me.lastName || ''} (@${me.username})`);
    console.log('\n✅ Done! Now you can start the worker: node worker.js\n');

    await client.disconnect();
    await pool.end();
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
