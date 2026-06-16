// RPGShop.js
// Sistem shop RPG — beli item dari catalog (rpg_items) pakai gold,
// jual item dari inventory balik jadi gold.
// Menggunakan tabel rpg_items, rpg_inventory, rpg_players yang sudah ada (lihat dbitem.js).

const db = require('./db').promise();
const { getItemByKey, addItemToInventory } = require('./dbitem');

// ══════════════════════════════════════════
// KONFIGURASI
// ══════════════════════════════════════════

// Tipe item yang dijual di shop (quest item biasanya gak dijual)
const SHOP_VISIBLE_TYPES = ['consumable', 'equipment', 'material'];

// ══════════════════════════════════════════
// LIST ITEM SHOP
// ══════════════════════════════════════════

/**
 * Ambil semua item yang dijual di shop (price_buy > 0).
 * Bisa difilter by type/page untuk shop besar.
 */
async function getShopItems(page = 1, perPage = 8, type = null) {
    const offset = (page - 1) * perPage;
    let query = `SELECT * FROM rpg_items WHERE price_buy > 0 AND type IN (?)`;
    const params = [SHOP_VISIBLE_TYPES];

    if (type) {
        query += ` AND type = ?`;
        params.push(type);
    }

    query += ` ORDER BY type, price_buy ASC LIMIT ? OFFSET ?`;
    params.push(perPage, offset);

    const [rows] = await db.query(query, params);

    const [countRows] = await db.query(
        `SELECT COUNT(*) as total FROM rpg_items WHERE price_buy > 0 AND type IN (?)` +
        (type ? ` AND type = ?` : ``),
        type ? [SHOP_VISIBLE_TYPES, type] : [SHOP_VISIBLE_TYPES]
    );

    return {
        items: rows,
        total: countRows[0].total,
        page,
        totalPages: Math.max(1, Math.ceil(countRows[0].total / perPage)),
    };
}

// ══════════════════════════════════════════
// BELI ITEM
// ══════════════════════════════════════════

/**
 * Beli item dari shop.
 * @param {string} nomor - nomor WA player
 * @param {string} itemQuery - nama atau key item
 * @param {number} qty - jumlah beli
 * @returns {{ success, message }}
 */
async function buyItem(nomor, itemQuery, qty = 1) {
    qty = parseInt(qty);
    if (isNaN(qty) || qty < 1) {
        return { success: false, message: '❌ Jumlah harus angka positif.' };
    }

    const item = await getItemByKey(itemQuery.trim());
    if (!item) {
        return { success: false, message: `❌ Item *${itemQuery}* tidak ditemukan di catalog.` };
    }

    if (!item.price_buy || item.price_buy <= 0) {
        return { success: false, message: `❌ *${item.name}* tidak dijual di shop.` };
    }

    // Non-stackable (equipment) gak bisa beli banyak sekaligus biar gak nyampah inventory
    if (!item.stackable && qty > 1) {
        return { success: false, message: `❌ *${item.name}* adalah equipment, beli 1 per transaksi.` };
    }

    const [playerRows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [nomor]);
    if (!playerRows.length) {
        return { success: false, message: '❌ Kamu belum terdaftar. Ketik *.login* dulu.' };
    }
    const player = playerRows[0];

    // Cek level minimum
    if (item.min_level && player.level < item.min_level) {
        return { success: false, message: `🔒 *${item.name}* butuh level *${item.min_level}*. Kamu level *${player.level}*.` };
    }

    const totalPrice = item.price_buy * qty;
    if (player.gold < totalPrice) {
        return {
            success: false,
            message: `❌ Gold tidak cukup!\nButuh: 💰 *${totalPrice}*\nKamu punya: 💰 *${player.gold}*`
        };
    }

    // Potong gold & masukin item
    await db.query('UPDATE rpg_players SET gold = gold - ? WHERE nomor = ?', [totalPrice, nomor]);
    await addItemToInventory(nomor, item.item_key, qty, 'shop');

    return {
        success: true,
        message:
            `🛒 *Pembelian Berhasil!*\n\n` +
            `${item.emoji || '📦'} *${item.name}* ×${qty}\n` +
            `💰 Total: *-${totalPrice} Gold*\n` +
            `Sisa Gold: *${player.gold - totalPrice}*`
    };
}

// ══════════════════════════════════════════
// JUAL ITEM
// ══════════════════════════════════════════

/**
 * Jual item dari inventory balik jadi gold.
 * @param {string} nomor - nomor WA player
 * @param {string} itemQuery - nama atau key item
 * @param {number} qty - jumlah jual
 */
async function sellItem(nomor, itemQuery, qty = 1) {
    qty = parseInt(qty);
    if (isNaN(qty) || qty < 1) {
        return { success: false, message: '❌ Jumlah harus angka positif.' };
    }

    const item = await getItemByKey(itemQuery.trim());
    if (!item) {
        return { success: false, message: `❌ Item *${itemQuery}* tidak dikenal.` };
    }

    if (!item.price_sell || item.price_sell <= 0) {
        return { success: false, message: `❌ *${item.name}* tidak bisa dijual.` };
    }

    // Cek inventory player
    const [invRows] = await db.query(
        'SELECT * FROM rpg_inventory WHERE player_nomor = ? AND item_id = ?',
        [nomor, item.id]
    );
    if (!invRows.length) {
        return { success: false, message: `❌ Kamu tidak punya *${item.name}*.` };
    }

    const totalOwned = invRows.reduce((sum, r) => sum + r.quantity, 0);
    if (totalOwned < qty) {
        return { success: false, message: `❌ Kamu cuma punya *${totalOwned}× ${item.name}*.` };
    }

    // Kurangi quantity (handle multi-row untuk non-stackable)
    let remaining = qty;
    for (const row of invRows) {
        if (remaining <= 0) break;
        if (row.quantity <= remaining) {
            await db.query('DELETE FROM rpg_inventory WHERE id = ?', [row.id]);
            remaining -= row.quantity;
        } else {
            await db.query('UPDATE rpg_inventory SET quantity = quantity - ? WHERE id = ?', [remaining, row.id]);
            remaining = 0;
        }
    }

    const totalGain = item.price_sell * qty;
    await db.query('UPDATE rpg_players SET gold = gold + ? WHERE nomor = ?', [totalGain, nomor]);

    const [afterRows] = await db.query('SELECT gold FROM rpg_players WHERE nomor = ?', [nomor]);

    return {
        success: true,
        message:
            `💸 *Penjualan Berhasil!*\n\n` +
            `${item.emoji || '📦'} *${item.name}* ×${qty}\n` +
            `💰 Diterima: *+${totalGain} Gold*\n` +
            `Total Gold: *${afterRows[0].gold}*`
    };
}

// ══════════════════════════════════════════
// FORMAT OUTPUT
// ══════════════════════════════════════════

const TYPE_LABEL = {
    consumable: '🧪 Consumable',
    equipment: '⚔️ Equipment',
    material: '🪨 Material',
};

/**
 * Format daftar item shop untuk ditampilkan.
 */
async function formatShopList(page = 1, type = null) {
    const { items, totalPages, total } = await getShopItems(page, 8, type);

    if (!items.length) {
        return `🏪 *Shop kosong* — belum ada item yang dijual.`;
    }

    let out = `🏪 *Welcome to Shop!*\n`;
    out += type ? `Kategori: ${TYPE_LABEL[type] || type}\n` : '';
    out += `Halaman ${page}/${totalPages} (${total} item)\n\n`;

    let lastType = null;
    for (const item of items) {
        if (item.type !== lastType) {
            out += `\n${TYPE_LABEL[item.type] || item.type}\n`;
            lastType = item.type;
        }
        const lvlTag = item.min_level > 1 ? ` (lv.${item.min_level})` : '';
        out += `  ${item.emoji || '📦'} *${item.name}*${lvlTag} — 💰${item.price_buy}\n`;
        if (item.desc) out += `     _${item.desc}_\n`;
    }

    out += `\n💡 *.buy [nama item] [jumlah]* — beli item\n`;
    out += `💡 *.sell [nama item] [jumlah]* — jual item\n`;
    if (totalPages > 1) out += `💡 *.shop [halaman]* — lihat halaman lain\n`;
    out += `💡 *.shop equipment* / *.shop consumable* / *.shop material* — filter kategori`;

    return out;
}

module.exports = {
    getShopItems,
    buyItem,
    sellItem,
    formatShopList,
};