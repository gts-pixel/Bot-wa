// Inventory.js
const db = require('./db').promise();
const { ITEMS, findItem, getItemNameByKey } = require('./item');

// =====================
// INIT TABEL
// =====================
async function initInventoryTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS inventory (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nomor VARCHAR(50) NOT NULL,
            item_name VARCHAR(100) NOT NULL,
            quantity INT DEFAULT 1,
            UNIQUE KEY uniq_player_item (nomor, item_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `).catch(console.error);
}
initInventoryTable();

// =====================
// CRUD INVENTORY
// =====================

// Tambah item ke inventory (auto stack)
async function addItem(nomor, itemName, qty = 1) {
    await db.query(`
        INSERT INTO inventory (nomor, item_name, quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
    `, [nomor, itemName, qty]);
}

// Kurangi item (return false jika tidak cukup)
async function removeItem(nomor, itemName, qty = 1) {
    const [rows] = await db.query(
        'SELECT quantity FROM inventory WHERE nomor = ? AND item_name = ?',
        [nomor, itemName]
    );
    if (!rows.length || rows[0].quantity < qty) return false;

    if (rows[0].quantity === qty) {
        await db.query('DELETE FROM inventory WHERE nomor = ? AND item_name = ?', [nomor, itemName]);
    } else {
        await db.query(
            'UPDATE inventory SET quantity = quantity - ? WHERE nomor = ? AND item_name = ?',
            [qty, nomor, itemName]
        );
    }
    return true;
}

// Ambil semua inventory player
async function getInventory(nomor) {
    const [rows] = await db.query(
        'SELECT item_name, quantity FROM inventory WHERE nomor = ? ORDER BY item_name',
        [nomor]
    );
    return rows;
}

// Cek apakah punya item tertentu
async function hasItem(nomor, itemName, qty = 1) {
    const [rows] = await db.query(
        'SELECT quantity FROM inventory WHERE nomor = ? AND item_name = ?',
        [nomor, itemName]
    );
    return rows.length > 0 && rows[0].quantity >= qty;
}

// =====================
// FORMAT DISPLAY
// =====================
function formatInventory(rows) {
    if (!rows.length) return '🎒 Inventory kamu kosong.';

    const consumables = rows.filter(r => {
        const item = findItem(r.item_name);
        return item?.type === 'consumable';
    });
    const materials = rows.filter(r => {
        const item = findItem(r.item_name);
        return item?.type === 'material' || !item;
    });

    let out = `🎒 *Inventory*\n\n`;

    if (consumables.length) {
        out += `*🧪 Consumables:*\n`;
        out += consumables.map(r => {
            const item = findItem(r.item_name);
            return `${item?.emoji || '📦'} ${r.item_name} ×${r.quantity}\n   _${item?.desc || ''}_`;
        }).join('\n');
        out += '\n\n';
    }

    if (materials.length) {
        out += `*🪨 Materials:*\n`;
        out += materials.map(r => {
            const item = findItem(r.item_name);
            return `${item?.emoji || '📦'} ${r.item_name} ×${r.quantity}`;
        }).join('\n');
    }

    out += `\n\nGunakan *.item [nama]* untuk memakai item.\nContoh: *.item hp potion*`;
    return out;
}

// =====================
// PAKAI ITEM
// =====================
async function useItem(nomor, itemName, playerRow, inBattle = false) {
    const item = findItem(itemName);

    if (!item) {
        return { success: false, message: `❌ Item *${itemName}* tidak ditemukan.` };
    }

    if (item.type !== 'consumable') {
        return { success: false, message: `❌ Item *${itemName}* tidak bisa dipakai.` };
    }

    if (!item.usableInBattle && inBattle) {
        return { success: false, message: `❌ Item *${itemName}* tidak bisa dipakai saat battle.` };
    }

    // Cari nama item yang tepat (case-insensitive match)
    const exactName = Object.keys(ITEMS).find(
        n => n.toLowerCase() === itemName.toLowerCase()
    ) || itemName;

    const owned = await hasItem(nomor, exactName);
    if (!owned) {
        return { success: false, message: `❌ Kamu tidak punya *${exactName}*.` };
    }

    const effect = item.effect(playerRow);
    let newHp = playerRow.hp;
    let newMp = playerRow.mp;
    let resultDesc = '';

    if (effect.healHp) {
        const actual = Math.min(effect.healHp, playerRow.max_hp - playerRow.hp);
        newHp = Math.min(playerRow.max_hp, newHp + effect.healHp);
        resultDesc = `${item.emoji} *${exactName}* digunakan!\n❤️ HP +*${actual}* (${newHp}/${playerRow.max_hp})`;
    }

    if (effect.healMp) {
        const actual = Math.min(effect.healMp, playerRow.max_mp - playerRow.mp);
        newMp = Math.min(playerRow.max_mp, newMp + effect.healMp);
        resultDesc = `${item.emoji} *${exactName}* digunakan!\n💙 MP +*${actual}* (${newMp}/${playerRow.max_mp})`;
    }

    // Kurangi item dari inventory
    await removeItem(nomor, exactName);

    // Update HP/MP di DB
    await db.query(
        'UPDATE rpg_players SET hp = ?, mp = ? WHERE nomor = ?',
        [newHp, newMp, nomor]
    );

    return {
        success: true,
        message: resultDesc,
        newHp,
        newMp,
    };
}

module.exports = { addItem, removeItem, getInventory, hasItem, formatInventory, useItem };