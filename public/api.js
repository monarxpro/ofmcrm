// ============================================================
// OFM CRM — api.js
// db + middleware/auth + routes/auth + routes/tg-posts + roles
// ============================================================

// ── db.js ─────────────────────────────────────────────────────────────────
const { Pool } = require('pg');
const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME     || 'ofmcrm',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 10,
});
const db = {
    query: (sql, p) => pool.query(sql, p),
    one:   async (sql, p) => { const r = await pool.query(sql, p); return r.rows[0] || null; },
    many:  async (sql, p) => { const r = await pool.query(sql, p); return r.rows; },
};
module.exports.db = db;

// ── middleware/auth.js ────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    const h = req.headers['authorization'];
    if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    try {
        req.user = jwt.verify(h.slice(7), process.env.JWT_SECRET);
        next();
    } catch { res.status(401).json({ error: 'Token invalid or expired' }); }
}

// Проверка базовой роли
function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.base_role))
            return res.status(403).json({ error: 'Insufficient permissions' });
        next();
    };
}

// Проверка конкретного права из таблицы permissions
async function checkPermission(req, res, next, permKey) {
    try {
        const row = await db.one(`
            SELECT 1 FROM role_permissions rp
            JOIN users u ON u.role_id = rp.role_id
            WHERE u.id = $1 AND rp.permission_key = $2`,
            [req.user.id, permKey]
        );
        if (!row) return res.status(403).json({ error: `Missing permission: ${permKey}` });
        next();
    } catch (e) { res.status(500).json({ error: 'Permission check failed' }); }
}
const perm = (key) => (req, res, next) => checkPermission(req, res, next, key);

module.exports.authMiddleware = authMiddleware;
module.exports.requireRole    = requireRole;
module.exports.perm           = perm;

// ── routes/auth.js ────────────────────────────────────────────────────────
const express = require('express');
const bcrypt  = require('bcrypt');
const jwtLib  = require('jsonwebtoken');
const authRouter = express.Router();

function signToken(user) {
    return jwtLib.sign(
        { id: user.id, email: user.email, base_role: user.base_role, org_id: user.org_id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES || '7d' }
    );
}

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
    const { email, password, firstName, lastName, orgName, plan, inviteToken } = req.body;
    if (!email || !password || !firstName || !orgName)
        return res.status(400).json({ error: 'Missing required fields' });
    if (password.length < 8)
        return res.status(400).json({ error: 'Password min 8 chars' });
    try {
        const exists = await db.one('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
        if (exists) return res.status(409).json({ error: 'Email already registered' });

        const hash = await bcrypt.hash(password, 12);
        let orgId, baseRole, roleId = null;

        if (inviteToken) {
            const inviter = await db.one(
                'SELECT id, org_id FROM users WHERE invite_token=$1 AND is_active=TRUE',
                [inviteToken]
            );
            if (!inviter) return res.status(400).json({ error: 'Invalid invite token' });
            orgId    = inviter.org_id;
            baseRole = 'chatter';
            // Найти роль chatter для этой орг
            const cr = await db.one('SELECT id FROM roles WHERE org_id=$1 AND slug=$2', [orgId,'chatter']);
            roleId = cr?.id || null;
            await db.query('UPDATE users SET invite_token=NULL WHERE invite_token=$1', [inviteToken]);
        } else {
            orgId    = require('crypto').randomUUID();
            baseRole = 'admin';
            // Создаём системные роли для новой орг
            const roleRows = await db.many(`
                INSERT INTO roles (org_id, name, slug, description, color, is_system, base_role)
                VALUES ($1,'Admin','admin','Full access','#8b84ff',TRUE,'admin'),
                       ($1,'Manager','manager','Team & analytics','#f59e0b',TRUE,'manager'),
                       ($1,'Chatter','chatter','Chat only','#22c55e',TRUE,'chatter'),
                       ($1,'Analyst','analyst','Read-only analytics','#38bdf8',TRUE,'analyst')
                RETURNING id, slug`, [orgId]);

            const adminRole = roleRows.find(r => r.slug === 'admin');
            roleId = adminRole?.id || null;

            // Заполняем права для admin
            if (roleId) {
                await db.query(`INSERT INTO role_permissions (role_id, permission_key) SELECT $1, key FROM permissions`, [roleId]);
            }
        }

        const user = await db.one(`
            INSERT INTO users (email,password_hash,first_name,last_name,display_name,
                org_id,org_name,role_id,base_role,plan,is_active,email_verified)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE,FALSE)
            RETURNING id, email, base_role, org_id, display_name`,
            [email.toLowerCase(), hash, firstName, lastName||'',
             `${firstName} ${lastName||''}`.trim(),
             orgId, orgName, roleId, baseRole, plan||'pro']
        );
        res.status(201).json({ token: signToken(user), user });
    } catch(e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
    const { email, password, totpCode } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    try {
        const user = await db.one(`
            SELECT id,email,password_hash,base_role,org_id,display_name,
                   twofa_enabled,twofa_secret,is_active
            FROM users WHERE email=$1`, [email.toLowerCase()]);
        if (!user?.is_active) return res.status(401).json({ error: 'Invalid credentials' });
        if (!await bcrypt.compare(password, user.password_hash))
            return res.status(401).json({ error: 'Invalid credentials' });
        if (user.twofa_enabled && !totpCode)
            return res.status(202).json({ require2fa: true });
        // 2FA verify — подключи speakeasy в проде
        await db.query('UPDATE users SET last_login_at=NOW() WHERE id=$1', [user.id]);
        res.json({ token: signToken(user), user: { id:user.id, email:user.email, role:user.base_role } });
    } catch(e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/auth/me
authRouter.get('/me', authMiddleware, async (req, res) => {
    const u = await db.one(`
        SELECT u.*, r.name AS role_name, r.color AS role_color,
               ARRAY(SELECT permission_key FROM role_permissions WHERE role_id=u.role_id) AS permissions
        FROM users u LEFT JOIN roles r ON r.id=u.role_id
        WHERE u.id=$1`, [req.user.id]);
    res.json(u);
});

// PUT /api/auth/profile
authRouter.put('/profile', authMiddleware, async (req, res) => {
    const { firstName, lastName, telegram, language, timezone } = req.body;
    const u = await db.one(`
        UPDATE users SET first_name=COALESCE($2,first_name),last_name=COALESCE($3,last_name),
            display_name=COALESCE($2,first_name)||' '||COALESCE($3,last_name),
            telegram=$4,language=COALESCE($5,language),timezone=COALESCE($6,timezone)
        WHERE id=$1 RETURNING id,email,display_name,base_role`,
        [req.user.id,firstName,lastName,telegram,language,timezone]);
    res.json(u);
});

// POST /api/auth/change-password
authRouter.post('/change-password', authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length<8)
        return res.status(400).json({ error: 'Invalid password data' });
    const u = await db.one('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    if (!await bcrypt.compare(currentPassword, u.password_hash))
        return res.status(401).json({ error: 'Wrong current password' });
    await db.query('UPDATE users SET password_hash=$2 WHERE id=$1',
        [req.user.id, await bcrypt.hash(newPassword, 12)]);
    res.json({ success: true });
});

module.exports.authRouter = authRouter;

// ── routes/roles.js ───────────────────────────────────────────────────────
const rolesRouter = express.Router();
rolesRouter.use(authMiddleware);

// GET /api/roles — все роли организации с их правами
rolesRouter.get('/', perm('roles.view'), async (req, res) => {
    const rows = await db.many(`
        SELECT r.id, r.name, r.slug, r.description, r.color, r.is_system, r.base_role,
            ARRAY(SELECT permission_key FROM role_permissions WHERE role_id=r.id ORDER BY permission_key) AS permissions,
            COUNT(u.id)::int AS members_count
        FROM roles r
        LEFT JOIN users u ON u.role_id=r.id AND u.is_active=TRUE
        WHERE r.org_id=$1
        GROUP BY r.id ORDER BY r.is_system DESC, r.name`, [req.user.org_id]);
    res.json(rows);
});

// GET /api/roles/permissions — справочник всех прав
rolesRouter.get('/permissions', perm('roles.view'), async (req, res) => {
    const rows = await db.many('SELECT * FROM permissions ORDER BY section, key');
    res.json(rows);
});

// POST /api/roles — создать новую роль
rolesRouter.post('/', perm('roles.edit'), async (req, res) => {
    const { name, slug, description, color, baseRole, permissions: perms } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'name and slug required' });
    try {
        const role = await db.one(`
            INSERT INTO roles (org_id,name,slug,description,color,base_role)
            VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [req.user.org_id, name, slug, description||'', color||'#6c63ff', baseRole||'chatter']);
        // Добавляем права
        if (perms?.length) {
            for (const k of perms) {
                await db.query('INSERT INTO role_permissions (role_id,permission_key) VALUES ($1,$2) ON CONFLICT DO NOTHING',
                    [role.id, k]);
            }
        }
        res.status(201).json(role);
    } catch(e) { res.status(409).json({ error: 'Slug already exists' }); }
});

// PUT /api/roles/:id — обновить роль и права
rolesRouter.put('/:id', perm('roles.edit'), async (req, res) => {
    const { name, description, color, permissions: perms } = req.body;
    const role = await db.one(`
        UPDATE roles SET name=COALESCE($2,name),description=COALESCE($3,description),
            color=COALESCE($4,color)
        WHERE id=$1 AND org_id=$5 AND is_system=FALSE RETURNING *`,
        [req.params.id, name, description, color, req.user.org_id]);
    if (!role) return res.status(404).json({ error: 'Role not found or is system role' });
    if (perms !== undefined) {
        await db.query('DELETE FROM role_permissions WHERE role_id=$1', [req.params.id]);
        for (const k of perms) {
            await db.query('INSERT INTO role_permissions (role_id,permission_key) VALUES ($1,$2) ON CONFLICT DO NOTHING',
                [req.params.id, k]);
        }
    }
    res.json(role);
});

// DELETE /api/roles/:id
rolesRouter.delete('/:id', perm('roles.edit'), async (req, res) => {
    const r = await db.query(`
        DELETE FROM roles WHERE id=$1 AND org_id=$2 AND is_system=FALSE RETURNING id`,
        [req.params.id, req.user.org_id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Role not found or is system role' });
    res.json({ deleted: true });
});

module.exports.rolesRouter = rolesRouter;

// ── routes/tg-posts.js ────────────────────────────────────────────────────
const postsRouter = express.Router();
postsRouter.use(authMiddleware);

// GET /api/tg-posts
postsRouter.get('/', perm('tg_posting.view'), async (req, res) => {
    const { month, channel_id, status } = req.query;
    const params = [req.user.org_id]; let where = 'WHERE p.org_id=$1';
    if (month) {
        const s = new Date(month+'-01'), e = new Date(s.getFullYear(), s.getMonth()+1, 1);
        params.push(s.toISOString(), e.toISOString());
        where += ` AND p.scheduled_at>=$${params.length-1} AND p.scheduled_at<$${params.length}`;
    }
    if (channel_id) { params.push(channel_id); where += ` AND p.channel_id=$${params.length}`; }
    if (status)     { params.push(status);     where += ` AND p.status=$${params.length}`; }
    const posts = await db.many(`SELECT * FROM v_tg_posts_calendar ${where} ORDER BY scheduled_at`, params);
    res.json(posts);
});

// GET /api/tg-posts/stats
postsRouter.get('/stats', perm('tg_posting.view'), async (req, res) => {
    const { month } = req.query;
    const d = month ? new Date(month+'-01') : new Date();
    const s = await db.one(`SELECT * FROM v_tg_posts_monthly_stats WHERE org_id=$1 AND month=DATE_TRUNC('month',$2::timestamptz)`,
        [req.user.org_id, d.toISOString()]);
    res.json(s || { total:0, posted:0, pending:0, error:0, total_stars:0 });
});

// GET /api/tg-posts/:id
postsRouter.get('/:id', perm('tg_posting.view'), async (req, res) => {
    const p = await db.one('SELECT * FROM v_tg_posts_calendar WHERE id=$1 AND org_id=$2',
        [req.params.id, req.user.org_id]);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
});

// POST /api/tg-posts
postsRouter.post('/', perm('tg_posting.create'), async (req, res) => {
    const { channelId, scheduledAt, text, photo1,photo2,photo3,photo4,photo5, starsCost, status } = req.body;
    if (!channelId || !scheduledAt) return res.status(400).json({ error: 'channelId + scheduledAt required' });
    const ch = await db.one('SELECT id FROM tg_channels WHERE id=$1 AND org_id=$2', [channelId, req.user.org_id]);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    const p = await db.one(`
        INSERT INTO tg_posts (org_id,channel_id,scheduled_at,text,photo_1,photo_2,photo_3,photo_4,photo_5,stars_cost,status,created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [req.user.org_id,channelId,scheduledAt,text||null,
         photo1||null,photo2||null,photo3||null,photo4||null,photo5||null,
         starsCost||0, status||'pending', req.user.id]);
    res.status(201).json(p);
});

// POST /api/tg-posts/:id/copy — копирование поста
postsRouter.post('/:id/copy', perm('tg_posting.create'), async (req, res) => {
    const original = await db.one('SELECT * FROM tg_posts WHERE id=$1 AND org_id=$2',
        [req.params.id, req.user.org_id]);
    if (!original) return res.status(404).json({ error: 'Original post not found' });

    // Новая дата: по умолчанию +1 день от оригинала, или из тела запроса
    const newDate = req.body.scheduledAt || (() => {
        const d = new Date(original.scheduled_at);
        d.setDate(d.getDate() + 1);
        return d.toISOString();
    })();

    const copy = await db.one(`
        INSERT INTO tg_posts
            (org_id,channel_id,scheduled_at,text,photo_1,photo_2,photo_3,photo_4,photo_5,
             stars_cost,status,copied_from_id,created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11,$12)
        RETURNING *`,
        [original.org_id, req.body.channelId||original.channel_id, newDate,
         original.text,
         original.photo_1,original.photo_2,original.photo_3,original.photo_4,original.photo_5,
         original.stars_cost, original.id, req.user.id]);
    res.status(201).json(copy);
});

// PUT /api/tg-posts/:id
postsRouter.put('/:id', perm('tg_posting.edit'), async (req, res) => {
    const { channelId,scheduledAt,text,photo1,photo2,photo3,photo4,photo5,starsCost,status,errorMessage } = req.body;
    const ex = await db.one('SELECT id,status FROM tg_posts WHERE id=$1 AND org_id=$2',
        [req.params.id, req.user.org_id]);
    if (!ex) return res.status(404).json({ error: 'Not found' });
    if (ex.status==='posted' && req.user.base_role!=='admin')
        return res.status(403).json({ error: 'Cannot edit posted post' });
    const p = await db.one(`
        UPDATE tg_posts SET
            channel_id=COALESCE($2,channel_id), scheduled_at=COALESCE($3,scheduled_at),
            text=$4, photo_1=$5,photo_2=$6,photo_3=$7,photo_4=$8,photo_5=$9,
            stars_cost=COALESCE($10,stars_cost), status=COALESCE($11,status), error_message=$12
        WHERE id=$1 AND org_id=$13 RETURNING *`,
        [req.params.id, channelId||null,scheduledAt||null,text||null,
         photo1||null,photo2||null,photo3||null,photo4||null,photo5||null,
         starsCost,status,errorMessage||null, req.user.org_id]);
    res.json(p);
});

// DELETE /api/tg-posts/:id
postsRouter.delete('/:id', perm('tg_posting.edit'), async (req, res) => {
    const r = await db.query('DELETE FROM tg_posts WHERE id=$1 AND org_id=$2 RETURNING id',
        [req.params.id, req.user.org_id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
});

// GET /api/tg-posts/:id/logs — лог публикаций
postsRouter.get('/:id/logs', perm('tg_posting.view'), async (req, res) => {
    const logs = await db.many(
        'SELECT * FROM tg_post_logs WHERE post_id=$1 ORDER BY created_at DESC',
        [req.params.id]);
    res.json(logs);
});

module.exports.postsRouter = postsRouter;

// ── server.js (пример) ───────────────────────────────────────────────────
/*
require('dotenv').config();
const express = require('express');
const app     = express();

app.use(express.json({ limit: '20mb' }));
app.use(express.static('public'));

const { authRouter, rolesRouter, postsRouter } = require('./api');
app.use('/api/auth',     authRouter);
app.use('/api/roles',    rolesRouter);
app.use('/api/tg-posts', postsRouter);

app.listen(process.env.PORT || 3000, () =>
    console.log('OFM CRM API running on port', process.env.PORT || 3000));
*/
