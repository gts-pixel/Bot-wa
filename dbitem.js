const db = require('./db').promise();

// Konstanta Validasi
const VALID_TYPES = ['equipment', 'consumable', 'material', 'quest']
const VALID_SUBTYPES = {
    equipment : ['weapon', 'armor', 'helmet', 'ring', 'accessory', 'shield'],
    consumable : ['potion','scroll', 'food', 'elixir'],
    material : ['ore', 'cloth', 'hide', 'gem', 'herb', 'misc'],
    quest : ['quest']
};

const VALID_SLOTS = ['weapon', 'armor', 'helmet', 'ring', 'accessory', 'shield'];
const VALID_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary' , 'myth'];
const VALID_TIERS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
const VALID_STATS    = ['str', 'agi', 'int', 'dex', 'def', 'vit', 'wis', 'luk', 'hp', 'mp'];
const VALID_EFFECTS  = ['stat_bonus', 'on_use', 'passive'];

// Rarity display
const RARITY_DISPLAY = {
    common    : { emoji: '⚪', label: 'Common'    },
    uncommon  : { emoji: '🟢', label: 'Uncommon'  },
    rare      : { emoji: '🔵', label: 'Rare'      },
    epic      : { emoji: '🟣', label: 'Epic'      },
    legendary : { emoji: '🟡', label: 'Legendary' },
};

async function initializeItemTables() {
    const queries = [
        // Master catalog item
        `CREATE TABLE IF NOT EXISTS rpg_items (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            item_key    VARCHAR(80) NOT NULL UNIQUE,
            name        VARCHAR(100) NOT NULL,
            emoji       VARCHAR(10),
            type        ENUM('equipment','consumable','material','quest') NOT NULL,
            subtype     VARCHAR(30),
            equip_slot  VARCHAR(20),
            rarity      ENUM('common','uncommon','rare','epic','legendary','myth') NOT NULL DEFAULT 'common',
            tier        ENUM('F','E','D','C','B','A','S'),
            min_level   INT DEFAULT 1,
            price_buy   INT DEFAULT 0,
            price_sell  INT DEFAULT 0,
            stackable   TINYINT(1) DEFAULT 1,
            max_stack   INT DEFAULT 99,
            usable      TINYINT(1) DEFAULT 0,
            \`desc\`    TEXT,
            created_by  VARCHAR(50),
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
 
        // Efek dan stat bonus item
        `CREATE TABLE IF NOT EXISTS rpg_item_effects (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            item_id     INT NOT NULL,
            effect_type ENUM('stat_bonus','on_use','passive') NOT NULL,
            stat        VARCHAR(20),
            value       FLOAT DEFAULT 0,
            value_mode  ENUM('flat','percent') DEFAULT 'flat',
            duration    INT,
            FOREIGN KEY (item_id) REFERENCES rpg_items(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
 
        // Inventory player
        `CREATE TABLE IF NOT EXISTS rpg_inventory (
            id             INT AUTO_INCREMENT PRIMARY KEY,
            player_nomor   VARCHAR(50) NOT NULL,
            item_id        INT NOT NULL,
            quantity       INT DEFAULT 1,
            obtained_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            obtained_from  VARCHAR(50) DEFAULT 'unknown',
            FOREIGN KEY (player_nomor) REFERENCES rpg_players(nomor) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES rpg_items(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
 
        // Item yang sedang diequip
        `CREATE TABLE IF NOT EXISTS rpg_equipped (
            id             INT AUTO_INCREMENT PRIMARY KEY,
            player_nomor   VARCHAR(50) NOT NULL,
            inventory_id   INT NOT NULL,
            slot           VARCHAR(20) NOT NULL,
            equipped_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_player_slot (player_nomor, slot),
            FOREIGN KEY (player_nomor) REFERENCES rpg_players(nomor) ON DELETE CASCADE,
            FOREIGN KEY (inventory_id) REFERENCES rpg_inventory(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    ];

    for (const q of queries) {
        try {
            await db.query(q);
        } catch (err) {
            console.error('Error creating item table:', err.message);
        }
    }
    console.log('✅ Tabel item system siap.');
}

function isAdmin(nomor) {
    const owners = (process.env.OWNER_NUMBER || '').split(',').map(n => n.trim());
    return owners.includes(nomor.split('@')[0]);
}
 
function parseArgs(str) {
    // Support quoted strings: .addsysitem weapon iron_sword "Iron Sword" ⚔️ ...
    const args = [];
    const regex = /[^\s"]+|"([^"]*)"/gi;
    let match;
    while ((match = regex.exec(str)) !== null) {
        args.push(match[1] !== undefined ? match[1] : match[0]);
    }
    return args;
}
 
async function getItemByKey(itemKey) {
    const [rows] = await db.query(
        'SELECT i.*, GROUP_CONCAT(e.stat, ":", e.value, ":", e.value_mode SEPARATOR "|") as effects FROM rpg_items i LEFT JOIN rpg_item_effects e ON i.id = e.item_id WHERE i.item_key = ? GROUP BY i.id',
        [itemKey]
    );
    return rows[0] || null;
}
 
async function getItemById(itemId) {
    const [rows] = await db.query('SELECT * FROM rpg_items WHERE id = ?', [itemId]);
    return rows[0] || null;
}
 
async function getItemEffects(itemId) {
    const [rows] = await db.query('SELECT * FROM rpg_item_effects WHERE item_id = ?', [itemId]);
    return rows;
}
 
function formatItemCard(item, effects = []) {
    const rar = RARITY_DISPLAY[item.rarity] || { emoji: '⚪', label: item.rarity };
    const lines = [
        `${item.emoji || '📦'} *${item.name}*`,
        `${rar.emoji} ${rar.label} ${item.tier ? `· Tier ${item.tier}` : ''} · ${item.type}${item.subtype ? `/${item.subtype}` : ''}`,
        item.equip_slot ? `🎯 Slot: ${item.equip_slot}` : '',
        item.min_level > 1 ? `📊 Min Level: ${item.min_level}` : '',
        '',
    ];
 
    if (effects.length > 0) {
        lines.push('⚡ *Efek:*');
        effects.forEach(e => {
            const sign = e.value >= 0 ? '+' : '';
            const val  = e.value_mode === 'percent' ? `${sign}${e.value}%` : `${sign}${e.value}`;
            const dur  = e.duration ? ` (${e.duration} turn)` : '';
            lines.push(`  ${e.stat?.toUpperCase()} ${val}${dur}`);
        });
        lines.push('');
    }
 
    if (item.desc) lines.push(`📖 ${item.desc}`);
    lines.push(`💰 Beli: ${item.price_buy}G · Jual: ${item.price_sell}G`);
 
    return lines.filter(l => l !== undefined).join('\n');
}
 
// ============================================================
//  COMMAND HANDLERS
// ============================================================
 
// ── .addsysitem ─────────────────────────────────────────────
// Format: .addsysitem <type> <key> <name> <emoji> <rarity> <tier> <min_level> <price_buy> <price_sell> [desc]
// Contoh: .addsysitem equipment iron_sword "Iron Sword" ⚔️ uncommon D 5 500 150 "Pedang besi standar"
async function handleAddSysItem(chat, senderId, argsStr) {
    if (!isAdmin(senderId)) {
        return chat.sendMessage('❌ Kamu tidak punya akses untuk perintah ini.');
    }
 
    const args = parseArgs(argsStr);
 
    if (args.length < 9) {
        return chat.sendMessage(
            '❌ *Format salah!*\n\n' +
            '*.addsysitem* <type> <key> <name> <emoji> <rarity> <tier> <min_level> <price_buy> <price_sell> [desc]\n\n' +
            '*Contoh:*\n' +
            '.addsysitem equipment iron_sword "Iron Sword" ⚔️ uncommon D 5 500 150 "Pedang besi tangguh"\n\n' +
            `*Type valid:* ${VALID_TYPES.join(', ')}\n` +
            `*Rarity valid:* ${VALID_RARITIES.join(', ')}\n` +
            `*Tier valid:* ${VALID_TIERS.join(', ')}`
        );
    }
 
    const [type, itemKey, name, emoji, rarity, tier, minLevelStr, priceBuyStr, priceSellStr, ...descParts] = args;
    const desc      = descParts.join(' ') || null;
    const minLevel  = parseInt(minLevelStr) || 1;
    const priceBuy  = parseInt(priceBuyStr) || 0;
    const priceSell = parseInt(priceSellStr) || 0;
 
    // Validasi
    if (!VALID_TYPES.includes(type))
        return chat.sendMessage(`❌ Type tidak valid. Pilih: ${VALID_TYPES.join(', ')}`);
    if (!VALID_RARITIES.includes(rarity))
        return chat.sendMessage(`❌ Rarity tidak valid. Pilih: ${VALID_RARITIES.join(', ')}`);
    if (!VALID_TIERS.includes(tier.toUpperCase()))
        return chat.sendMessage(`❌ Tier tidak valid. Pilih: ${VALID_TIERS.join(', ')}`);
    if (!/^[a-z0-9_]+$/.test(itemKey))
        return chat.sendMessage('❌ Item key hanya boleh huruf kecil, angka, dan underscore. Contoh: iron_sword');
    if (minLevel < 1 || minLevel > 100)
        return chat.sendMessage('❌ Min level harus antara 1–100.');
 
    // Cek duplikat
    const existing = await getItemByKey(itemKey);
    if (existing) {
        return chat.sendMessage(`❌ Item key *${itemKey}* sudah ada di database.\nNama: ${existing.name}`);
    }
 
    // Tentukan stackable & usable berdasarkan type
    const stackable = type !== 'equipment' ? 1 : 0;
    const usable    = type === 'consumable' ? 1 : 0;
 
    // Tentukan equip_slot otomatis jika subtype adalah slot valid
    // (bisa dioverride nanti dengan .addeffect)
    let equip_slot = null;
    let subtype    = null;
    if (type === 'equipment') {
        // Default subtype weapon jika equipment, admin bisa update manual
        equip_slot = 'weapon';
        subtype    = 'weapon';
    }
 
    try {
        await db.query(
            `INSERT INTO rpg_items 
             (item_key, name, emoji, type, subtype, equip_slot, rarity, tier, min_level, price_buy, price_sell, stackable, usable, \`desc\`, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [itemKey, name, emoji, type, subtype, equip_slot, rarity, tier.toUpperCase(), minLevel, priceBuy, priceSell, stackable, usable, desc, senderId.split('@')[0]]
        );
 
        const rar = RARITY_DISPLAY[rarity];
        await chat.sendMessage(
            `✅ *Item berhasil ditambahkan!*\n\n` +
            `${emoji} *${name}*\n` +
            `${rar.emoji} ${rar.label} · Tier ${tier.toUpperCase()} · ${type}\n` +
            `🔑 Key: \`${itemKey}\`\n` +
            `💰 Beli: ${priceBuy}G · Jual: ${priceSell}G\n` +
            `📊 Min Level: ${minLevel}\n` +
            (desc ? `📖 ${desc}\n` : '') +
            `\n*Tambah efek stat:*\n` +
            `.addeffect ${itemKey} stat_bonus str 10 flat\n` +
            `.addeffect ${itemKey} on_use hp 100 flat`
        );
    } catch (err) {
        console.error('addsysitem error:', err);
        await chat.sendMessage('❌ Gagal menambahkan item. Cek log untuk detail.');
    }
}
 
// ── .addeffect ──────────────────────────────────────────────
// Format: .addeffect <item_key> <effect_type> <stat> <value> <value_mode> [duration]
// Contoh: .addeffect iron_sword stat_bonus str 8 flat
//         .addeffect hp_potion on_use hp 100 flat
//         .addeffect power_scroll on_use str 20 percent 3
async function handleAddEffect(chat, senderId, argsStr) {
    if (!isAdmin(senderId)) {
        return chat.sendMessage('❌ Kamu tidak punya akses untuk perintah ini.');
    }
 
    const args = parseArgs(argsStr);
    if (args.length < 5) {
        return chat.sendMessage(
            '❌ *Format salah!*\n\n' +
            '*.addeffect* <item_key> <effect_type> <stat> <value> <value_mode> [duration]\n\n' +
            '*Contoh:*\n' +
            '.addeffect iron_sword stat_bonus str 8 flat\n' +
            '.addeffect hp_potion on_use hp 100 flat\n' +
            '.addeffect power_scroll on_use str 20 percent 3\n\n' +
            `*Effect type:* ${VALID_EFFECTS.join(', ')}\n` +
            `*Stat:* ${VALID_STATS.join(', ')}\n` +
            `*Value mode:* flat, percent`
        );
    }
 
    const [itemKey, effectType, stat, valueStr, valueMode, durationStr] = args;
    const value    = parseFloat(valueStr);
    const duration = durationStr ? parseInt(durationStr) : null;
 
    // Validasi
    if (!VALID_EFFECTS.includes(effectType))
        return chat.sendMessage(`❌ Effect type tidak valid. Pilih: ${VALID_EFFECTS.join(', ')}`);
    if (!VALID_STATS.includes(stat))
        return chat.sendMessage(`❌ Stat tidak valid. Pilih: ${VALID_STATS.join(', ')}`);
    if (!['flat', 'percent'].includes(valueMode))
        return chat.sendMessage('❌ Value mode tidak valid. Pilih: flat atau percent');
    if (isNaN(value))
        return chat.sendMessage('❌ Value harus berupa angka.');
 
    const item = await getItemByKey(itemKey);
    if (!item) return chat.sendMessage(`❌ Item *${itemKey}* tidak ditemukan.`);
 
    try {
        await db.query(
            'INSERT INTO rpg_item_effects (item_id, effect_type, stat, value, value_mode, duration) VALUES (?, ?, ?, ?, ?, ?)',
            [item.id, effectType, stat, value, valueMode, duration]
        );
 
        const sign = value >= 0 ? '+' : '';
        const val  = valueMode === 'percent' ? `${sign}${value}%` : `${sign}${value}`;
        const dur  = duration ? ` selama ${duration} turn` : ' (permanen)';
 
        await chat.sendMessage(
            `✅ *Efek ditambahkan ke ${item.name}!*\n\n` +
            `📌 ${effectType} → ${stat.toUpperCase()} ${val}${dur}\n\n` +
            `Ketik *.iteminfo ${itemKey}* untuk lihat semua efek.`
        );
    } catch (err) {
        console.error('addeffect error:', err);
        await chat.sendMessage('❌ Gagal menambahkan efek.');
    }
}
 
// ── .iteminfo ───────────────────────────────────────────────
async function handleItemInfo(chat, argsStr) {
    const itemKey = argsStr.trim().toLowerCase();
    if (!itemKey) return chat.sendMessage('❌ Gunakan: .iteminfo <item_key>');
 
    const item = await getItemByKey(itemKey);
    if (!item) return chat.sendMessage(`❌ Item *${itemKey}* tidak ditemukan.`);
 
    const effects = await getItemEffects(item.id);
    await chat.sendMessage(formatItemCard(item, effects));
}
 
// ── .items ──────────────────────────────────────────────────
// Contoh: .items | .items equipment | .items consumable rare
async function handleItems(chat, argsStr) {
    const args    = argsStr.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const type    = args[0] || null;
    const rarity  = args[1] || null;
 
    let query  = 'SELECT * FROM rpg_items WHERE 1=1';
    const vals = [];
 
    if (type && VALID_TYPES.includes(type)) {
        query += ' AND type = ?'; vals.push(type);
    }
    if (rarity && VALID_RARITIES.includes(rarity)) {
        query += ' AND rarity = ?'; vals.push(rarity);
    }
    query += ' ORDER BY tier, rarity, name LIMIT 20';
 
    const [rows] = await db.query(query, vals);
    if (!rows.length) return chat.sendMessage('❌ Tidak ada item ditemukan.');
 
    const lines = ['📦 *Daftar Item RPG*\n'];
    rows.forEach(item => {
        const rar = RARITY_DISPLAY[item.rarity];
        lines.push(`${item.emoji || '📦'} *${item.name}* ${rar.emoji}`);
        lines.push(`   ${item.type}${item.subtype ? '/'+item.subtype : ''} · Tier ${item.tier || '-'} · Key: \`${item.item_key}\``);
    });
    lines.push('\nGunakan *.iteminfo <key>* untuk detail item.');
 
    await chat.sendMessage(lines.join('\n'));
}
 
// ── .inv (inventory) ────────────────────────────────────────
async function handleInventory(chat, senderId) {
    const [rows] = await db.query(
        `SELECT inv.id, inv.quantity, inv.obtained_from,
                i.item_key, i.name, i.emoji, i.type, i.subtype, i.rarity, i.equip_slot,
                e.slot as equipped_slot
         FROM rpg_inventory inv
         JOIN rpg_items i ON inv.item_id = i.id
         LEFT JOIN rpg_equipped e ON e.inventory_id = inv.id
         WHERE inv.player_nomor = ?
         ORDER BY i.type, i.rarity DESC, i.name`,
        [senderId]
    );
 
    if (!rows.length) return chat.sendMessage('🎒 Inventory kamu kosong.');
 
    // Kelompokkan per type
    const groups = {};
    rows.forEach(r => {
        if (!groups[r.type]) groups[r.type] = [];
        groups[r.type].push(r);
    });
 
    const typeEmoji = { equipment:'⚔️', consumable:'🧪', material:'🪨', quest:'📜' };
    const lines = ['🎒 *Inventory Kamu*\n'];
 
    for (const [type, items] of Object.entries(groups)) {
        lines.push(`${typeEmoji[type] || '📦'} *${type.toUpperCase()}*`);
        items.forEach(item => {
            const rar      = RARITY_DISPLAY[item.rarity];
            const equip    = item.equipped_slot ? ` ✅[${item.equipped_slot}]` : '';
            const qty      = item.quantity > 1 ? ` ×${item.quantity}` : '';
            lines.push(`  ${item.emoji || '📦'} ${item.name}${qty} ${rar.emoji}${equip}`);
        });
        lines.push('');
    }
 
    lines.push('Gunakan *.equip <item_key>* untuk equip item.');
    await chat.sendMessage(lines.join('\n'));
}
 
// ── .equip ──────────────────────────────────────────────────
async function handleEquip(chat, senderId, argsStr) {
    const itemKey = argsStr.trim().toLowerCase();
    if (!itemKey) return chat.sendMessage('❌ Gunakan: .equip <item_key>');
 
    // Cek player
    const [playerRows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [senderId]);
    if (!playerRows.length) return chat.sendMessage('❌ Kamu belum terdaftar. Ketik *.login* dulu.');
    const player = playerRows[0];
 
    // Cek item di inventory
    const [invRows] = await db.query(
        `SELECT inv.id, inv.quantity, i.* FROM rpg_inventory inv
         JOIN rpg_items i ON inv.item_id = i.id
         WHERE inv.player_nomor = ? AND i.item_key = ? LIMIT 1`,
        [senderId, itemKey]
    );
    if (!invRows.length) return chat.sendMessage(`❌ Item *${itemKey}* tidak ada di inventory kamu.`);
 
    const inv  = invRows[0];
    const item = inv;
 
    if (item.type !== 'equipment')
        return chat.sendMessage(`❌ *${item.name}* bukan equipment dan tidak bisa diequip.`);
    if (player.level < item.min_level)
        return chat.sendMessage(`❌ Level kamu belum cukup. Min level: ${item.min_level}`);
 
    const slot = item.equip_slot;
    if (!slot) return chat.sendMessage(`❌ Item ini tidak memiliki slot equip.`);
 
    try {
        // Cek apakah slot sudah terisi
        const [eqRows] = await db.query(
            'SELECT e.*, i.name as item_name FROM rpg_equipped e JOIN rpg_inventory inv ON e.inventory_id = inv.id JOIN rpg_items i ON inv.item_id = i.id WHERE e.player_nomor = ? AND e.slot = ?',
            [senderId, slot]
        );
 
        if (eqRows.length > 0) {
            // Lepas item lama dulu
            await db.query('DELETE FROM rpg_equipped WHERE player_nomor = ? AND slot = ?', [senderId, slot]);
        }
 
        // Equip item baru
        await db.query(
            'INSERT INTO rpg_equipped (player_nomor, inventory_id, slot) VALUES (?, ?, ?)',
            [senderId, inv.id, slot]
        );
 
        const prevMsg = eqRows.length > 0 ? `\n📤 Dilepas: ${eqRows[0].item_name}` : '';
        await chat.sendMessage(
            `✅ *${item.name}* berhasil diequip!\n` +
            `🎯 Slot: ${slot}${prevMsg}\n\n` +
            `Ketik *.inv* untuk lihat inventory kamu.`
        );
    } catch (err) {
        console.error('equip error:', err);
        await chat.sendMessage('❌ Gagal equip item. Coba lagi.');
    }
}
 
// ── .unequip ────────────────────────────────────────────────
async function handleUnequip(chat, senderId, argsStr) {
    const slot = argsStr.trim().toLowerCase();
    if (!slot) return chat.sendMessage(`❌ Gunakan: .unequip <slot>\nSlot: ${VALID_SLOTS.join(', ')}`);
    if (!VALID_SLOTS.includes(slot)) return chat.sendMessage(`❌ Slot tidak valid. Pilih: ${VALID_SLOTS.join(', ')}`);
 
    const [rows] = await db.query(
        `SELECT e.*, i.name, i.emoji FROM rpg_equipped e
         JOIN rpg_inventory inv ON e.inventory_id = inv.id
         JOIN rpg_items i ON inv.item_id = i.id
         WHERE e.player_nomor = ? AND e.slot = ?`,
        [senderId, slot]
    );
 
    if (!rows.length) return chat.sendMessage(`❌ Slot *${slot}* tidak ada item yang diequip.`);
 
    await db.query('DELETE FROM rpg_equipped WHERE player_nomor = ? AND slot = ?', [senderId, slot]);
    await chat.sendMessage(`✅ *${rows[0].name}* berhasil dilepas dari slot ${slot}.`);
}
 
// ── .use (consumable) ───────────────────────────────────────
async function handleUseItem(chat, senderId, argsStr) {
    const itemKey = argsStr.trim().toLowerCase();
    if (!itemKey) return chat.sendMessage('❌ Gunakan: .use <item_key>');
 
    // Cek player
    const [playerRows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [senderId]);
    if (!playerRows.length) return chat.sendMessage('❌ Kamu belum terdaftar. Ketik *.login* dulu.');
    const player = playerRows[0];
 
    // Cek item di inventory
    const [invRows] = await db.query(
        `SELECT inv.id, inv.quantity, i.* FROM rpg_inventory inv
         JOIN rpg_items i ON inv.item_id = i.id
         WHERE inv.player_nomor = ? AND i.item_key = ? LIMIT 1`,
        [senderId, itemKey]
    );
 
    if (!invRows.length) return chat.sendMessage(`❌ Item *${itemKey}* tidak ada di inventory kamu.`);
 
    const inv  = invRows[0];
    const item = inv;
 
    if (!item.usable) return chat.sendMessage(`❌ *${item.name}* tidak bisa digunakan secara langsung.`);
    if (item.type !== 'consumable') return chat.sendMessage(`❌ *${item.name}* bukan consumable.`);
 
    // Ambil efek on_use
    const effects = await getItemEffects(item.id);
    const onUseEffects = effects.filter(e => e.effect_type === 'on_use');
 
    if (!onUseEffects.length) return chat.sendMessage(`❌ *${item.name}* tidak memiliki efek penggunaan.`);
 
    // Terapkan efek
    const resultLines = [`✨ *${item.emoji || ''} ${item.name}* digunakan!\n`];
    const updates = {};
 
    for (const eff of onUseEffects) {
        const stat = eff.stat;
        let   val  = eff.value;
 
        if (eff.value_mode === 'percent') {
            // Hitung dari max stat
            const maxStat = stat === 'hp' ? player.max_hp : stat === 'mp' ? player.max_mp : player[stat] || 0;
            val = Math.round(maxStat * (eff.value / 100));
        }
 
        if (stat === 'hp') {
            const newHp = Math.min(player.hp + val, player.max_hp);
            updates.hp  = newHp;
            const healed = newHp - player.hp;
            resultLines.push(`❤️ HP: ${player.hp} → ${newHp} (+${healed})`);
            player.hp = newHp;
        } else if (stat === 'mp') {
            const newMp = Math.min(player.mp + val, player.max_mp);
            updates.mp  = newMp;
            const restored = newMp - player.mp;
            resultLines.push(`💙 MP: ${player.mp} → ${newMp} (+${restored})`);
            player.mp = newMp;
        } else if (VALID_STATS.includes(stat)) {
            // Buff sementara — simpan ke tabel buff jika ada, atau langsung update
            const sign = val >= 0 ? '+' : '';
            resultLines.push(`⚡ ${stat.toUpperCase()}: ${sign}${val}${eff.duration ? ` selama ${eff.duration} turn` : ''}`);
        }
    }
 
    // Update DB
    if (Object.keys(updates).length > 0) {
        const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        await db.query(
            `UPDATE rpg_players SET ${setClauses} WHERE nomor = ?`,
            [...Object.values(updates), senderId]
        );
    }
 
    // Kurangi quantity
    if (inv.quantity > 1) {
        await db.query('UPDATE rpg_inventory SET quantity = quantity - 1 WHERE id = ?', [inv.id]);
    } else {
        await db.query('DELETE FROM rpg_inventory WHERE id = ?', [inv.id]);
        resultLines.push(`\n🗑️ Item habis dan dihapus dari inventory.`);
    }
 
    await chat.sendMessage(resultLines.join('\n'));
}
 
// ── Fungsi untuk tambah item ke inventory player ─────────────
// Dipakai oleh sistem drop monster, quest reward, dll
async function addItemToInventory(playerNomor, itemKey, quantity = 1, source = 'drop') {
    const item = await getItemByKey(itemKey);
    if (!item) return { success: false, reason: 'Item tidak ditemukan' };
 
    if (item.stackable) {
        // Cek apakah sudah ada di inventory
        const [existing] = await db.query(
            'SELECT * FROM rpg_inventory WHERE player_nomor = ? AND item_id = ?',
            [playerNomor, item.id]
        );
 
        if (existing.length > 0) {
            const newQty = Math.min(existing[0].quantity + quantity, item.max_stack);
            await db.query(
                'UPDATE rpg_inventory SET quantity = ? WHERE id = ?',
                [newQty, existing[0].id]
            );
        } else {
            await db.query(
                'INSERT INTO rpg_inventory (player_nomor, item_id, quantity, obtained_from) VALUES (?, ?, ?, ?)',
                [playerNomor, item.id, quantity, source]
            );
        }
    } else {
        // Non-stackable (equipment) — selalu insert baru
        for (let i = 0; i < quantity; i++) {
            await db.query(
                'INSERT INTO rpg_inventory (player_nomor, item_id, quantity, obtained_from) VALUES (?, ?, 1, ?)',
                [playerNomor, item.id, source]
            );
        }
    }
 
    return { success: true, item };
}
 
// ── Ambil semua stat bonus dari equipment yang diequip ───────
async function getEquippedStatBonus(playerNomor) {
    const [rows] = await db.query(
        `SELECT ie.stat, ie.value, ie.value_mode
         FROM rpg_equipped eq
         JOIN rpg_inventory inv ON eq.inventory_id = inv.id
         JOIN rpg_items i ON inv.item_id = i.id
         JOIN rpg_item_effects ie ON ie.item_id = i.id
         WHERE eq.player_nomor = ? AND ie.effect_type = 'stat_bonus'`,
        [playerNomor]
    );
 
    // Agregat semua bonus
    const bonus = {};
    rows.forEach(r => {
        if (!bonus[r.stat]) bonus[r.stat] = 0;
        bonus[r.stat] += r.value; // flat untuk sekarang
    });
 
    return bonus; // { str: 15, def: 10, ... }
}
 
// ============================================================
//  MAIN HANDLER — export untuk dipakai di rpg.js
// ============================================================
module.exports = {
    initializeItemTables,
    addItemToInventory,
    getEquippedStatBonus,
    getItemByKey,
 
    // Handler command — dipanggil dari switch di rpg.js
    async handleCommand(client, message, command, args) {
        const chat     = await message.getChat();
        const senderId = message.author || message.from;
 
        switch (command) {
            case 'addsysitem':  return handleAddSysItem(chat, senderId, args);
            case 'addeffect':   return handleAddEffect(chat, senderId, args);
            case 'iteminfo':    return handleItemInfo(chat, args);
            case 'items':       return handleItems(chat, args);
            case 'inv':
            case 'inventory':   return handleInventory(chat, senderId);
            case 'equip':       return handleEquip(chat, senderId, args);
            case 'unequip':     return handleUnequip(chat, senderId, args);
            case 'useitem':     return handleUseItem(chat, senderId, args);
        }
    },
};
 
// Inisialisasi tabel saat modul dimuat
initializeItemTables();