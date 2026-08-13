// Farming.js
// Tanam benih di plot, tunggu beberapa menit (real-time), lalu panen.
// Tiap player punya beberapa plot (default 3).

const db = require('../db').promise();
const { addItemToInventory, dbReady } = require('../dbitem');
const QuestSystem = require('./QuestSystem');

const MAX_PLOTS = 3;

async function initFarmTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS rpg_farm_plots (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nomor VARCHAR(50) NOT NULL,
            slot INT NOT NULL,
            seed_key VARCHAR(50) DEFAULT NULL,
            crop_name VARCHAR(100) DEFAULT NULL,
            crop_qty INT DEFAULT 1,
            planted_at DATETIME DEFAULT NULL,
            ready_at DATETIME DEFAULT NULL,
            UNIQUE KEY uniq_plot (nomor, slot)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Tabel farm siap.');
}
initFarmTable();

// =====================
// SEED ITEM (benih & hasil panen) ke rpg_items
// =====================
const SEED_DEFS = [
    { key: 'wheat_seed',  name: 'Wheat Seed',  emoji: '🌱', growMinutes: 10, cropName: 'Wheat',       cropEmoji: '🌾', cropQty: [2, 4], priceBuy: 30,  cropSell: 15 },
    { key: 'carrot_seed', name: 'Carrot Seed', emoji: '🌱', growMinutes: 20, cropName: 'Carrot',      cropEmoji: '🥕', cropQty: [2, 3], priceBuy: 60,  cropSell: 35 },
    { key: 'melon_seed',  name: 'Melon Seed',  emoji: '🌱', growMinutes: 45, cropName: 'Melon',       cropEmoji: '🍈', cropQty: [1, 2], priceBuy: 150, cropSell: 100 },
    { key: 'golden_seed', name: 'Golden Seed', emoji: '✨', growMinutes: 120, cropName: 'Golden Fruit', cropEmoji: '🍑', cropQty: [1, 1], priceBuy: 500, cropSell: 400 },
];

async function seedItems() {
    for (const s of SEED_DEFS) {
        try {
            await db.query(
                `INSERT INTO rpg_items (item_key, name, emoji, type, \`desc\`, price_buy, price_sell, min_level, stackable)
                 VALUES (?, ?, ?, 'seed', ?, ?, 0, 1, 1)
                 ON DUPLICATE KEY UPDATE name = VALUES(name)`,
                [s.key, s.name, s.emoji, `Tanam, tunggu ${s.growMinutes} menit, panen jadi ${s.cropName}.`, s.priceBuy]
            );
            await db.query(
                `INSERT INTO rpg_items (item_key, name, emoji, type, \`desc\`, price_buy, price_sell, min_level, stackable)
                 VALUES (?, ?, ?, 'material', ?, 0, ?, 1, 1)
                 ON DUPLICATE KEY UPDATE name = VALUES(name)`,
                [s.key.replace('_seed', '_crop'), s.cropName, s.cropEmoji, `Hasil panen ${s.name}.`, s.cropSell]
            );
        } catch (e) {
            console.warn(`⚠️ Gagal seed item ${s.name} ke rpg_items (cek skema dbitem.js):`, e.message);
        }
    }
}

dbReady.then(() => seedItems()).catch(err => {
    console.warn('⚠️ Farm seed tidak bisa dimulai:', err.message);
});

function findSeedDef(nameOrKey) {
    const q = String(nameOrKey || '').trim().toLowerCase();
    return SEED_DEFS.find(s => s.name.toLowerCase() === q || s.key === q.replace(/\s+/g, '_')) || null;
}

// consume 1 seed dari inventory — pola manual sama kayak RPGShop.sellItem
async function consumeSeed(nomor, seedName) {
    const [itemRows] = await db.query('SELECT * FROM rpg_items WHERE name = ?', [seedName]);
    if (!itemRows.length) return false;
    const item = itemRows[0];

    const [invRows] = await db.query(
        'SELECT * FROM rpg_inventory WHERE player_nomor = ? AND item_id = ? AND quantity > 0',
        [nomor, item.id]
    );
    if (!invRows.length) return false;

    const row = invRows[0];
    if (row.quantity <= 1) {
        await db.query('DELETE FROM rpg_inventory WHERE id = ?', [row.id]);
    } else {
        await db.query('UPDATE rpg_inventory SET quantity = quantity - 1 WHERE id = ?', [row.id]);
    }
    return true;
}

async function getPlots(nomor) {
    const [rows] = await db.query('SELECT * FROM rpg_farm_plots WHERE nomor = ? ORDER BY slot', [nomor]);
    const plots = {};
    for (let i = 1; i <= MAX_PLOTS; i++) plots[i] = rows.find(r => r.slot === i) || { slot: i, seed_key: null };
    return plots;
}

// =====================
// PLANT
// =====================
async function plant(nomor, seedQuery, chat) {
    if (!seedQuery) {
        await chat.sendMessage(
            `❌ Format: *.plant [nama benih]*\n\n` +
            `Benih tersedia: ${SEED_DEFS.map(s => s.name).join(', ')}\n` +
            `Beli di *.shop equipment* atau minta admin.`
        );
        return;
    }

    const seedDef = findSeedDef(seedQuery);
    if (!seedDef) {
        await chat.sendMessage(`❌ Benih *${seedQuery}* tidak dikenal.`);
        return;
    }

    const [rows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [nomor]);
    if (!rows.length) {
        await chat.sendMessage('❌ Kamu belum terdaftar. Ketik *.login* dulu.');
        return;
    }

    const plots = await getPlots(nomor);
    const emptySlot = Object.values(plots).find(p => !p.seed_key);
    if (!emptySlot) {
        await chat.sendMessage(`❌ Semua plot (${MAX_PLOTS}) lagi kepake! Panen dulu dengan *.harvest*.`);
        return;
    }

    const consumed = await consumeSeed(nomor, seedDef.name);
    if (!consumed) {
        await chat.sendMessage(`❌ Kamu tidak punya *${seedDef.name}*. Beli dulu di shop.`);
        return;
    }

    const now = new Date();
    const readyAt = new Date(now.getTime() + seedDef.growMinutes * 60 * 1000);

    await db.query(
        `INSERT INTO rpg_farm_plots (nomor, slot, seed_key, crop_name, crop_qty, planted_at, ready_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE seed_key = VALUES(seed_key), crop_name = VALUES(crop_name),
            crop_qty = VALUES(crop_qty), planted_at = VALUES(planted_at), ready_at = VALUES(ready_at)`,
        [nomor, emptySlot.slot, seedDef.key, seedDef.cropName,
         seedDef.cropQty[0] + Math.floor(Math.random() * (seedDef.cropQty[1] - seedDef.cropQty[0] + 1)),
         now, readyAt]
    );

    await QuestSystem.trackProgress(nomor, 'plant', 1);

    await chat.sendMessage(
        `🌱 Kamu menanam *${seedDef.name}* di plot ${emptySlot.slot}!\n` +
        `⏰ Siap panen dalam *${seedDef.growMinutes} menit* (jadi *${seedDef.cropName}*).\n\n` +
        `Cek progress dengan *.myfarm*`
    );
}

// =====================
// MYFARM
// =====================
async function myFarm(nomor, chat) {
    const plots = await getPlots(nomor);
    const now = Date.now();

    const lines = Object.values(plots).map(p => {
        if (!p.seed_key) return `🟫 Plot ${p.slot}: kosong`;
        const readyAt = new Date(p.ready_at).getTime();
        if (now >= readyAt) return `✅ Plot ${p.slot}: *${p.crop_name}* siap dipanen! (×${p.crop_qty})`;
        const minsLeft = Math.ceil((readyAt - now) / 60000);
        return `🌱 Plot ${p.slot}: tumbuh jadi *${p.crop_name}*, sisa *${minsLeft} menit*`;
    });

    await chat.sendMessage(
        `🚜 *FARM KAMU*\n\n${lines.join('\n')}\n\n` +
        `💡 *.plant [benih]* — tanam di plot kosong\n` +
        `💡 *.harvest* — panen plot yang udah siap`
    );
}

// =====================
// HARVEST
// =====================
async function harvest(nomor, chat) {
    const plots = await getPlots(nomor);
    const now = Date.now();
    const readyPlots = Object.values(plots).filter(p => p.seed_key && new Date(p.ready_at).getTime() <= now);

    if (!readyPlots.length) {
        await chat.sendMessage('❌ Belum ada plot yang siap dipanen. Cek *.myfarm* buat lihat sisa waktu.');
        return;
    }

    const results = [];
    for (const p of readyPlots) {
        await addItemToInventory(nomor, p.crop_name, p.crop_qty);
        results.push(`🎉 *${p.crop_name}* ×${p.crop_qty} (plot ${p.slot})`);
        await db.query(
            'UPDATE rpg_farm_plots SET seed_key = NULL, crop_name = NULL, crop_qty = 1, planted_at = NULL, ready_at = NULL WHERE nomor = ? AND slot = ?',
            [nomor, p.slot]
        );
        await QuestSystem.trackProgress(nomor, 'harvest', 1);
    }

    await chat.sendMessage(`🚜 *Panen Berhasil!*\n\n${results.join('\n')}`);
}

module.exports = { plant, myFarm, harvest };