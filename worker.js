// ============================================================
// OFM CRM — worker.js
// Воркер публикации Telegram постов
// Запускается отдельным процессом через PM2
// Проверяет каждые 60 секунд посты со status='pending'
// у которых scheduled_at <= NOW() и retry_count < 3
// ============================================================
// Запуск:  pm2 start worker.js --name ofmcrm-worker
// Логи:    pm2 logs ofmcrm-worker
// ============================================================

require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession }  = require('telegram/sessions');
const { Pool }           = require('pg');
const fs   = require('fs');
const path = require('path');

const API_ID   = 660062;
const API_HASH = 'a6770a0a3ab1415672adecfcd1235be0';
const ORG_ID   = process.env.ORG_ID || 'a1b2c3d4-0000-0000-0000-000000000001';
const INTERVAL = parseInt(process.env.WORKER_INTERVAL_MS) || 60_000; // 1 минута
const MAX_RETRY = 3;

// ── DB pool ───────────────────────────────────────────────────────────────
const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME     || 'ofmcrm',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 5,
});

const db = {
    query: (sql, p) => pool.query(sql, p),
    one:   async (sql, p) => { const r = await pool.query(sql, p); return r.rows[0] || null; },
    many:  async (sql, p) => { const r = await pool.query(sql, p); return r.rows; },
};

// ── Telegram client (singleton) ───────────────────────────────────────────
let tgClient = null;

async function getTgClient() {
    if (tgClient && tgClient.connected) return tgClient;

    const sessionRow = await db.one(
        'SELECT session_string, is_authorized FROM userbot_sessions WHERE org_id = $1 AND is_active = TRUE',
        [ORG_ID]
    );

    if (!sessionRow || !sessionRow.is_authorized || !sessionRow.session_string) {
        throw new Error('Userbot not authorized. Run: node userbot-auth.js');
    }

    const session = new StringSession(sessionRow.session_string);
    tgClient = new TelegramClient(session, API_ID, API_HASH, {
        connectionRetries: 5,
        autoReconnect: true,
    });

    await tgClient.connect();

    // Обновляем last_used_at
    await db.query(
        'UPDATE userbot_sessions SET last_used_at = NOW() WHERE org_id = $1',
        [ORG_ID]
    );

    log('✅ Telegram client connected');
    return tgClient;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function log(msg) {
    const ts = new Date().toISOString();
    console.log(`[${ts}] ${msg}`);
}

async function logPostEvent(postId, status, message) {
    await db.query(
        'INSERT INTO tg_post_logs (post_id, status, message) VALUES ($1, $2, $3)',
        [postId, status, message]
    );
}

async function setPostStatus(postId, status, extra = {}) {
    const fields = ['status = $2'];
    const vals   = [postId, status];
    let i = 3;

    if (extra.errorMessage !== undefined) { fields.push(`error_message = $${i++}`); vals.push(extra.errorMessage); }
    if (extra.tgMessageId  !== undefined) { fields.push(`tg_message_id = $${i++}`); vals.push(extra.tgMessageId); }
    if (extra.postedAt     !== undefined) { fields.push(`posted_at = $${i++}`);     vals.push(extra.postedAt); }
    if (extra.retryInc) {
        fields.push(`retry_count = retry_count + 1`);
        fields.push(`last_retry_at = NOW()`);
    }

    await db.query(
        `UPDATE tg_posts SET ${fields.join(', ')} WHERE id = $1`,
        vals
    );
}

// Загрузить фото: поддерживаем URL и локальный путь
async function resolvePhoto(photoRef) {
    if (!photoRef) return null;
    if (photoRef.startsWith('http://') || photoRef.startsWith('https://')) {
        // Скачиваем во временный файл
        const https = require('https');
        const http  = require('http');
        const os    = require('os');
        const tmpFile = path.join(os.tmpdir(), `ofmcrm_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
        const proto = photoRef.startsWith('https') ? https : http;
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(tmpFile);
            proto.get(photoRef, res => {
                res.pipe(file);
                file.on('finish', () => { file.close(); resolve(tmpFile); });
            }).on('error', reject);
        });
    }
    // Локальный путь
    if (fs.existsSync(photoRef)) return photoRef;
    return null;
}

// Публикуем один пост
async function publishPost(post) {
    log(`📤 Publishing post ${post.id} → ${post.channel_tg_id}`);

    const client = await getTgClient();

    // Помечаем как "в процессе"
    await setPostStatus(post.id, 'posting');
    await logPostEvent(post.id, 'posting', 'Worker started publishing');

    try {
        const channelEntity = await client.getEntity(post.channel_tg_id);

        // Собираем фото
        const photoRefs = [post.photo_1, post.photo_2, post.photo_3, post.photo_4, post.photo_5]
            .filter(Boolean);
        const tmpFiles = [];

        let message;

        if (photoRefs.length === 0) {
            // Только текст
            message = await client.sendMessage(channelEntity, {
                message: post.text || '',
            });
        } else if (photoRefs.length === 1) {
            // Одно фото
            const filePath = await resolvePhoto(photoRefs[0]);
            if (filePath) tmpFiles.push(filePath);
            message = await client.sendFile(channelEntity, {
                file:    filePath || photoRefs[0],
                caption: post.text || '',
            });
        } else {
            // Альбом (до 5 фото)
            const files = [];
            for (const ref of photoRefs) {
                const f = await resolvePhoto(ref);
                if (f) { files.push(f); tmpFiles.push(f); }
            }
            const album = files.map((f, i) => ({
                file:    f,
                caption: i === 0 ? (post.text || '') : '', // подпись только к первому
            }));
            const messages = await client.sendFile(channelEntity, {
                file: album,
            });
            message = Array.isArray(messages) ? messages[0] : messages;
        }

        // Удаляем временные файлы
        for (const tmp of tmpFiles) {
            if (tmp.startsWith(require('os').tmpdir())) {
                try { fs.unlinkSync(tmp); } catch {}
            }
        }

        const msgId = message?.id || null;
        await setPostStatus(post.id, 'posted', {
            tgMessageId: msgId,
            postedAt:    new Date().toISOString(),
            errorMessage: null,
        });
        await logPostEvent(post.id, 'posted', `Message ID: ${msgId}`);
        log(`✅ Post ${post.id} published → message_id=${msgId}`);

    } catch (err) {
        log(`❌ Post ${post.id} failed: ${err.message}`);

        const willRetry = post.retry_count + 1 < MAX_RETRY;
        await setPostStatus(post.id, willRetry ? 'pending' : 'error', {
            errorMessage: err.message,
            retryInc: true,
        });
        await logPostEvent(post.id, 'error', err.message);

        if (!willRetry) {
            log(`🚫 Post ${post.id} exceeded max retries (${MAX_RETRY}), marked as error`);
        }
    }
}

// ── Main tick ─────────────────────────────────────────────────────────────
async function tick() {
    try {
        // Берём все посты готовые к публикации
        const posts = await db.many(`
            SELECT p.*, c.tg_id AS channel_tg_id
            FROM tg_posts p
            JOIN tg_channels c ON c.id = p.channel_id
            WHERE p.org_id     = $1
              AND p.status     IN ('pending', 'error')
              AND p.scheduled_at <= NOW()
              AND p.retry_count < $2
            ORDER BY p.scheduled_at ASC
            LIMIT 10`,
            [ORG_ID, MAX_RETRY]
        );

        if (posts.length === 0) {
            return; // ничего не делаем тихо
        }

        log(`🔍 Found ${posts.length} post(s) to publish`);

        // Публикуем последовательно (не параллельно — flood protection)
        for (const post of posts) {
            await publishPost(post);
            // Пауза между постами чтобы не получить флуд-блокировку
            await new Promise(r => setTimeout(r, 2000));
        }

    } catch (err) {
        log(`⚠️  Tick error: ${err.message}`);
        // Если потеряли соединение — сбрасываем клиент
        if (err.message?.includes('disconnect') || err.message?.includes('connect')) {
            tgClient = null;
        }
    }
}

// ── Start ─────────────────────────────────────────────────────────────────
log('🚀 OFM CRM Worker starting...');
log(`   Org:      ${ORG_ID}`);
log(`   Interval: ${INTERVAL / 1000}s`);
log(`   Max retry: ${MAX_RETRY}`);

// Первый тик сразу
tick();

// Затем каждые INTERVAL мс
setInterval(tick, INTERVAL);

// Graceful shutdown
process.on('SIGTERM', async () => {
    log('🛑 SIGTERM received, shutting down...');
    if (tgClient) await tgClient.disconnect();
    await pool.end();
    process.exit(0);
});
process.on('SIGINT', async () => {
    log('🛑 SIGINT received, shutting down...');
    if (tgClient) await tgClient.disconnect();
    await pool.end();
    process.exit(0);
});
