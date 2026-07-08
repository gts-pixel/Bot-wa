// redeem.js
const db = require('../db').promise();

// =====================
// INIT TABEL
// =====================
async function initRedeemTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS redeem_codes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            reward_gold INT DEFAULT 0,
            reward_exp INT DEFAULT 0,
            reward_item VARCHAR(100) DEFAULT NULL,
            reward_item_qty INT DEFAULT 0,
            max_uses INT DEFAULT 1,
            used_count INT DEFAULT 0,
            expires_at DATETIME DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS redeem_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nomor VARCHAR(50) NOT NULL,
            code VARCHAR(50) NOT NULL,
            redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_player_code (nomor, code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('✅ Tabel redeem siap.');
}
initRedeemTable();

// =====================
// REDEEM
// =====================
async function redeemCode(nomor, code) {
    const upperCode = code.trim().toUpperCase();

    // Cek kode ada
    const [codeRows] = await db.query(
        'SELECT * FROM redeem_codes WHERE code = ?',
        [upperCode]
    );
    if (!codeRows.length) {
        return { success: false, message: '❌ Kode redeem tidak valid.' };
    }

    const c = codeRows[0];

    // Cek sudah expired?
    if (c.expires_at && new Date() > new Date(c.expires_at)) {
        return { success: false, message: '❌ Kode redeem sudah kedaluwarsa.' };
    }

    // Cek max uses
    if (c.used_count >= c.max_uses) {
        return { success: false, message: '❌ Kode redeem sudah habis digunakan.' };
    }

    // Cek sudah pernah dipakai player ini
    const [logRows] = await db.query(
        'SELECT id FROM redeem_log WHERE nomor = ? AND code = ?',
        [nomor, upperCode]
    );
    if (logRows.length) {
        return { success: false, message: '❌ Kamu sudah pernah memakai kode ini.' };
    }

    // Cek player terdaftar
    const [playerRows] = await db.query(
        'SELECT * FROM rpg_players WHERE nomor = ?',
        [nomor]
    );
    if (!playerRows.length) {
        return { success: false, message: '❌ Kamu belum terdaftar. Ketik *.login* dulu.' };
    }

    // Beri reward
    const rewards = [];

    if (c.reward_gold > 0) {
        await db.query(
            'UPDATE rpg_players SET gold = gold + ? WHERE nomor = ?',
            [c.reward_gold, nomor]
        );
        rewards.push(`💰 Gold +*${c.reward_gold}*`);
    }

    if (c.reward_exp > 0) {
        await db.query(
            'UPDATE rpg_players SET exp = exp + ? WHERE nomor = ?',
            [c.reward_exp, nomor]
        );
        rewards.push(`✨ EXP +*${c.reward_exp}*`);
    }

    if (c.reward_item && c.reward_item_qty > 0) {
        const { addItemToInventory } = require('./dbitem');
        await addItemToInventory(nomor, c.reward_item, c.reward_item_qty);
        rewards.push(`📦 *${c.reward_item}* ×${c.reward_item_qty}`);
    }

    // Catat log & update used_count
    await db.query(
        'INSERT INTO redeem_log (nomor, code) VALUES (?, ?)',
        [nomor, upperCode]
    );
    await db.query(
        'UPDATE redeem_codes SET used_count = used_count + 1 WHERE code = ?',
        [upperCode]
    );

    return {
        success: true,
        message:
            `🎁 *Redeem Berhasil!*\n\n` +
            `Kode: \`${upperCode}\`\n` +
            `Reward:\n${rewards.map(r => `  ✦ ${r}`).join('\n')}`,
    };
}

// =====================
// BUAT KODE (admin)
// =====================
async function createCode(code, options = {}) {
    const {
        gold = 0,
        exp = 0,
        item = null,
        itemQty = 0,
        maxUses = 1,
        expiresAt = null,   // format: '2025-12-31 23:59:59'
    } = options;

    const upperCode = code.trim().toUpperCase();

    await db.query(
        `INSERT INTO redeem_codes 
         (code, reward_gold, reward_exp, reward_item, reward_item_qty, max_uses, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [upperCode, gold, exp, item, itemQty, maxUses, expiresAt]
    );

    return upperCode;
}

module.exports = { redeemCode, createCode };