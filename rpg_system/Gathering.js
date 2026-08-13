// Sistem mancing / mining / nebang pohon. Semua butuh tool yang harus dimiliki
// (dibeli lewat .buy karena udah otomatis kedaftar ke rpg_items pas module ini load),
// dan kena cooldown per-aktivitas biar gak spam.

const db = require('../db').promise();
const { addItemToInventory, dbReady } = require('../dbitem');
const QuestSystem = require('./QuestSystem');

const COOLDOWN_MS = 45 * 1000;
const cooldowns = {
    fish: new Map(),
    mine: new Map(),
    chop: new Map(),
};

// SEED ITEM KE rpg_items (tool + hasil gathering)
// kolom disamain sama yang dipake RPGShop.js: item_key, name, emoji, type, desc,
// price_buy, price_sell, min_level, stackable

const ITEM_DEFS = [
    // tools (non-stackable, cuma butuh 1)
    { key: 'fishing_rod', name: 'Fishing Rod', emoji: '🎣', type: 'tool', desc: 'Alat buat mancing.', priceBuy: 150, priceSell: 0, minLevel: 1, stackable: 0 },
    { key: 'pickaxe',     name: 'Pickaxe',     emoji: '⛏️', type: 'tool', desc: 'Alat buat menambang.', priceBuy: 200, priceSell: 0, minLevel: 1, stackable: 0 },
    { key: 'axe',         name: 'Axe',         emoji: '🪓', type: 'tool', desc: 'Alat buat nebang pohon.', priceBuy: 180, priceSell: 0, minLevel: 1, stackable: 0 },
 
    // hasil mancing
    { key: 'small_fish', name: 'Small Fish', emoji: '🐟', type: 'material', desc: 'Ikan kecil.', priceBuy: 0, priceSell: 15, minLevel: 1, stackable: 1 },
    { key: 'fish',       name: 'Fish',       emoji: '🐠', type: 'material', desc: 'Ikan biasa.', priceBuy: 0, priceSell: 35, minLevel: 1, stackable: 1 },
    { key: 'big_fish',   name: 'Big Fish',   emoji: '🐡', type: 'material', desc: 'Ikan besar.', priceBuy: 0, priceSell: 80, minLevel: 1, stackable: 1 },
    { key: 'rare_fish',  name: 'Rare Fish',  emoji: '🦈', type: 'material', desc: 'Ikan langka.', priceBuy: 0, priceSell: 200, minLevel: 1, stackable: 1 },
 
    // hasil mining
    { key: 'stone',    name: 'Stone',    emoji: '🪨', type: 'material', desc: 'Batu biasa.', priceBuy: 0, priceSell: 10, minLevel: 1, stackable: 1 },
    { key: 'iron_ore', name: 'Iron Ore', emoji: '⚙️', type: 'material', desc: 'Bijih besi.', priceBuy: 0, priceSell: 40, minLevel: 1, stackable: 1 },
    { key: 'gold_ore', name: 'Gold Ore', emoji: '🥇', type: 'material', desc: 'Bijih emas.', priceBuy: 0, priceSell: 100, minLevel: 1, stackable: 1 },
    { key: 'gemstone', name: 'Gemstone', emoji: '💎', type: 'material', desc: 'Batu permata.', priceBuy: 0, priceSell: 250, minLevel: 1, stackable: 1 },
 
    // hasil nebang
    { key: 'wood_log',   name: 'Wood Log',   emoji: '🪵', type: 'material', desc: 'Kayu gelondongan.', priceBuy: 0, priceSell: 12, minLevel: 1, stackable: 1 },
    { key: 'hardwood',   name: 'Hardwood',   emoji: '🌳', type: 'material', desc: 'Kayu keras.', priceBuy: 0, priceSell: 45, minLevel: 1, stackable: 1 },
    { key: 'rare_wood',  name: 'Rare Wood',  emoji: '✨', type: 'material', desc: 'Kayu langka.', priceBuy: 0, priceSell: 220, minLevel: 1, stackable: 1 },
];

async function seedItems() {
    for (const it of ITEM_DEFS) {
        try {
            await db.query(
                `INSERT INTO rpg_items (item_key, name, emoji, type, \`desc\`, price_buy, price_sell, min_level, stackable)
                 VALUES (?,?,?,?,?,?,?,?,?)
                 ON DUPLICATE KEY UPDATE name = VALUES(name)`,
                [it.key, it.name, it.emoji, it.type, it.desc, it.priceBuy, it.priceSell, it.minLevel, it.stackable]
            );
        } catch (e) {
            console.warn(`⚠️ Gagal seed item ${it.name} ke rpg_items (cek skema dbitem.js):`, e.message);
        }
    }
}

dbReady.then(() => seedItems()).catch(err => {
    console.warn('⚠️ Gathering seed tidak bisa dimulai:', err.message);
});

// =====================
// LOOT TABLE per aktivitas — weighted random
// =====================
const LOOT_TABLES = {
    fish: [
        { name: 'Small Fish', weight: 50 },
        { name: 'Fish', weight: 32 },
        { name: 'Big Fish', weight: 14 },
        { name: 'Rare Fish', weight: 4 },
    ],
    mine: [
        { name: 'Stone', weight: 50 },
        { name: 'Iron Ore', weight: 32 },
        { name: 'Gold Ore', weight: 14 },
        { name: 'Gemstone', weight: 4 },
    ],
    chop: [
        { name: 'Wood Log', weight: 50 },
        { name: 'Hardwood', weight: 32 },
        { name: 'Rare Wood', weight: 14 },
        { name: 'Rare Wood', weight: 4 }, // placeholder biar 4 tier, ganti kalau ada item spesial lain
    ],
};
 
const ACTIVITY_CONFIG = {
    fish: { tool: 'Fishing Rod', verb: 'mancing', emoji: '🎣', place: 'sungai' },
    mine: { tool: 'Pickaxe', verb: 'menambang', emoji: '⛏️', place: 'gua' },
    chop: { tool: 'Axe', verb: 'menebang pohon', emoji: '🪓', place: 'hutan' },
};
 
function rollLoot(activity) {
    const table = LOOT_TABLES[activity];
    const totalWeight = table.reduce((s, x) => s + x.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const entry of table) {
        if (roll < entry.weight) return entry.name;
        roll -= entry.weight;
    }
    return table[0].name;
}
 
async function hasTool(nomor, toolName) {
    const [rows] = await db.query(
        `SELECT ri.quantity FROM rpg_inventory ri
         JOIN rpg_items i ON ri.item_id = i.id
         WHERE ri.player_nomor = ? AND i.name = ? AND ri.quantity > 0`,
        [nomor, toolName]
    );
    return rows.length > 0;
}
 
function getCooldownLeft(activity, nomor) {
    const map = cooldowns[activity];
    const last = map.get(nomor);
    if (!last) return 0;
    const left = COOLDOWN_MS - (Date.now() - last);
    return left > 0 ? Math.ceil(left / 1000) : 0;
}
 
function setCooldown(activity, nomor) {
    cooldowns[activity].set(nomor, Date.now());
}
 
// =====================
// AKSI UTAMA
// =====================
async function doGather(activity, nomor, chat) {
    const config = ACTIVITY_CONFIG[activity];
 
    const [rows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [nomor]);
    if (!rows.length) {
        await chat.sendMessage('❌ Kamu belum terdaftar. Ketik *.login* dulu.');
        return;
    }
 
    const ownsTool = await hasTool(nomor, config.tool);
    if (!ownsTool) {
        await chat.sendMessage(
            `❌ Kamu belum punya *${config.tool}*!\n` +
            `Beli dulu dengan *.buy ${config.tool}* di *.shop equipment*.`
        );
        return;
    }
 
    const cdLeft = getCooldownLeft(activity, nomor);
    if (cdLeft > 0) {
        await chat.sendMessage(`⏳ Capek habis ${config.verb}. Coba lagi dalam *${cdLeft} detik*.`);
        return;
    }
    setCooldown(activity, nomor);
 
    const lootName = rollLoot(activity);
    const qty = 1 + (Math.random() < 0.2 ? 1 : 0); // 20% chance dapet 2x
    await addItemToInventory(nomor, lootName, qty);
 
    const bonusExp = 3 + Math.floor(Math.random() * 5); // 3-7 exp
    await db.query('UPDATE rpg_players SET exp = exp + ? WHERE nomor = ?', [bonusExp, nomor]);
 
    await QuestSystem.trackProgress(nomor, activity, 1);
 
    await chat.sendMessage(
        `${config.emoji} Kamu ${config.verb} di ${config.place}...\n\n` +
        `🎉 Dapat *${lootName}* ×${qty}!\n` +
        `✨ +${bonusExp} EXP`
    );
}
 
async function doFish(nomor, chat) { return doGather('fish', nomor, chat); }
async function doMine(nomor, chat) { return doGather('mine', nomor, chat); }
async function doChop(nomor, chat) { return doGather('chop', nomor, chat); }
 
module.exports = { doFish, doMine, doChop };