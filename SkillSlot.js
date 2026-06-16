// SkillSlot.js
// Sistem slot skill aktif per player — mirip Pokemon (4 slot aktif dari pool lebih banyak)
// Slot disimpan di tabel `player_skill_slots` di DB

const db = require('./db').promise();
const { getSkillPool, findSkillFromPool } = require('./SkillPool');

const MAX_SLOTS = 4;

// ══════════════════════════════════════════
// INIT TABEL
// ══════════════════════════════════════════
async function initSkillSlotTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS player_skill_slots (
            nomor VARCHAR(50) NOT NULL,
            slot TINYINT NOT NULL COMMENT '1-4',
            skill_id VARCHAR(50) NOT NULL,
            class_name VARCHAR(50) NOT NULL,
            PRIMARY KEY (nomor, slot),
            INDEX idx_nomor (nomor)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Tabel player_skill_slots siap.');
}
initSkillSlotTable().catch(console.error);

// ══════════════════════════════════════════
// GET SLOT AKTIF
// ══════════════════════════════════════════

/**
 * Ambil skill aktif player di slot tertentu (1-4).
 * Return skill object dari SkillPool, atau null jika slot kosong.
 */
async function getSlotSkill(nomor, slot, className) {
    const [rows] = await db.query(
        'SELECT skill_id FROM player_skill_slots WHERE nomor = ? AND slot = ?',
        [nomor, slot]
    );
    if (!rows.length) return null;

    const pool = getSkillPool(className);
    return pool.find(s => s.id === rows[0].skill_id) || null;
}

/**
 * Ambil semua slot aktif player (1-4) sebagai array.
 * Return: [{ slot, skill | null }, ...]
 */
async function getAllSlots(nomor, className) {
    const [rows] = await db.query(
        'SELECT slot, skill_id FROM player_skill_slots WHERE nomor = ? AND class_name = ? ORDER BY slot',
        [nomor, className]
    );

    const slotMap = {};
    for (const row of rows) slotMap[row.slot] = row.skill_id;

    const pool = getSkillPool(className);
    const result = [];
    for (let i = 1; i <= MAX_SLOTS; i++) {
        const skillId = slotMap[i];
        const skill = skillId ? pool.find(s => s.id === skillId) : null;
        result.push({ slot: i, skill });
    }
    return result;
}

// ══════════════════════════════════════════
// EQUIP SKILL
// ══════════════════════════════════════════

/**
 * Equip skill ke slot tertentu.
 * Jika slot tidak disebut, auto-cari slot kosong pertama.
 * @param {string} nomor - user WA
 * @param {string} className - class player
 * @param {string} skillQuery - nama atau id skill
 * @param {number|null} targetSlot - slot 1-4, null = auto
 * @param {number} playerLevel - level player untuk unlock check
 * @returns {{ success, message }}
 */
async function equipSkill(nomor, className, skillQuery, targetSlot = null, playerLevel) {
    const skill = findSkillFromPool(className, skillQuery);
    if (!skill) {
        const pool = getSkillPool(className);
        const poolList = pool.map(s => `${s.emoji} ${s.name}`).join(', ');
        return {
            success: false,
            message: `❌ Skill *${skillQuery}* tidak ada di pool class *${className}*.\n\nSkill tersedia:\n${poolList}`
        };
    }

    if ((skill.unlockLevel || 1) > playerLevel) {
        return {
            success: false,
            message: `🔒 *${skill.name}* belum terbuka!\nButuh level *${skill.unlockLevel}*, kamu sekarang level *${playerLevel}*.`
        };
    }

    // Cek apakah skill sudah di-equip di slot lain
    const [existing] = await db.query(
        'SELECT slot FROM player_skill_slots WHERE nomor = ? AND skill_id = ? AND class_name = ?',
        [nomor, skill.id, className]
    );
    if (existing.length) {
        return {
            success: false,
            message: `⚠️ *${skill.name}* sudah terpasang di slot *${existing[0].slot}*.`
        };
    }

    // Tentukan slot tujuan
    let slot = targetSlot;
    if (!slot) {
        // Auto-cari slot kosong
        const [occupied] = await db.query(
            'SELECT slot FROM player_skill_slots WHERE nomor = ? AND class_name = ? ORDER BY slot',
            [nomor, className]
        );
        const occupiedSlots = new Set(occupied.map(r => r.slot));
        for (let i = 1; i <= MAX_SLOTS; i++) {
            if (!occupiedSlots.has(i)) { slot = i; break; }
        }
        if (!slot) {
            return {
                success: false,
                message: `❌ Semua slot sudah penuh! Unequip dulu dengan *.unequipskill [1-4]*\natau ganti dengan *.equipskill [skill] [slot]*`
            };
        }
    } else {
        // Validasi slot
        if (slot < 1 || slot > MAX_SLOTS) {
            return { success: false, message: `❌ Slot harus antara 1-${MAX_SLOTS}.` };
        }
    }

    // Simpan ke DB (replace jika slot sudah ada isi)
    await db.query(
        `INSERT INTO player_skill_slots (nomor, slot, skill_id, class_name)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE skill_id = VALUES(skill_id), class_name = VALUES(class_name)`,
        [nomor, slot, skill.id, className]
    );

    return {
        success: true,
        message: `✅ *${skill.emoji} ${skill.name}* berhasil dipasang di slot *${slot}*!\n` +
                 `MP: ${skill.mpCost} | CD: ${skill.cooldownTurns} turn\n` +
                 `${skill.desc}\n\n` +
                 `Ketik *.myskills* untuk lihat slot aktifmu.`
    };
}

// ══════════════════════════════════════════
// UNEQUIP SKILL
// ══════════════════════════════════════════

/**
 * Unequip skill dari slot tertentu.
 */
async function unequipSkill(nomor, className, slot) {
    const slotNum = parseInt(slot);
    if (isNaN(slotNum) || slotNum < 1 || slotNum > MAX_SLOTS) {
        return { success: false, message: `❌ Slot harus antara 1-${MAX_SLOTS}.` };
    }

    const [rows] = await db.query(
        'SELECT skill_id FROM player_skill_slots WHERE nomor = ? AND slot = ? AND class_name = ?',
        [nomor, slotNum, className]
    );
    if (!rows.length) {
        return { success: false, message: `⚠️ Slot *${slotNum}* sudah kosong.` };
    }

    const pool = getSkillPool(className);
    const skill = pool.find(s => s.id === rows[0].skill_id);
    await db.query(
        'DELETE FROM player_skill_slots WHERE nomor = ? AND slot = ? AND class_name = ?',
        [nomor, slotNum, className]
    );

    return {
        success: true,
        message: `🗑️ *${skill ? skill.emoji + ' ' + skill.name : rows[0].skill_id}* dilepas dari slot *${slotNum}*.`
    };
}

// ══════════════════════════════════════════
// RESET SLOT (saat ganti class)
// ══════════════════════════════════════════

/**
 * Hapus semua slot skill player (dipanggil saat ganti class).
 */
async function clearAllSlots(nomor) {
    await db.query('DELETE FROM player_skill_slots WHERE nomor = ?', [nomor]);
}

/**
 * Set slot default saat pertama kali pilih class
 * (equip 4 skill pertama dari pool secara otomatis)
 */
async function setDefaultSlots(nomor, className, playerLevel) {
    const pool = getSkillPool(className);
    if (!pool.length) return;

    const unlockedSkills = pool.filter(s => (s.unlockLevel || 1) <= playerLevel);
    const defaultSkills = unlockedSkills.length ? unlockedSkills.slice(0, MAX_SLOTS) : pool.slice(0, MAX_SLOTS);
    for (let i = 0; i < defaultSkills.length; i++) {
        await db.query(
            `INSERT INTO player_skill_slots (nomor, slot, skill_id, class_name)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE skill_id = VALUES(skill_id), class_name = VALUES(class_name)`,
            [nomor, i + 1, defaultSkills[i].id, className]
        );
    }
}

// ══════════════════════════════════════════
// FORMAT OUTPUT
// ══════════════════════════════════════════

/**
 * Format tampilan slot aktif untuk ditampilkan ke player
 */
async function formatActiveSlots(nomor, className) {
    const slots = await getAllSlots(nomor, className);
    const pool = getSkillPool(className);

    let out = `⚔️ *Skill Slots Aktif — ${className}*\n`;
    out += `_Slot aktif saat battle (.use 1-4)_\n\n`;

    for (const { slot, skill } of slots) {
        if (skill) {
            out += `*[${slot}]* ${skill.emoji} *${skill.name}*\n`;
            out += `   MP: ${skill.mpCost} | CD: ${skill.cooldownTurns} turn\n`;
            out += `   ${skill.desc}\n\n`;
        } else {
            out += `*[${slot}]* _(kosong)_\n\n`;
        }
    }

    out += `\n📚 *Skill Pool* (${pool.length} skill tersedia):\n`;
    out += pool.map(s => `   ${s.emoji} ${s.name} — MP: ${s.mpCost} | CD: ${s.cooldownTurns} turn`).join('\n');
    out += '\n\n';
    out += `💡 *Cara ganti skill:*\n`;
    out += `  *.equipskill [nama skill]* — equip ke slot kosong\n`;
    out += `  *.equipskill [nama skill] [1-4]* — equip ke slot tertentu\n`;
    out += `  *.unequipskill [1-4]* — lepas skill dari slot`;

    return out;
}

/**
 * Format daftar skill pool (untuk command .skillpool)
 */
function formatSkillPool(className, playerLevel = 1) {
    const pool = getSkillPool(className);
    let out = `📚 *Skill Pool — ${className}* (${pool.length} skill):\n\n`;
    out += pool.map((s, i) => {
        const locked = (s.unlockLevel || 1) > playerLevel;
        const lockTag = locked ? ` 🔒 lv.${s.unlockLevel}` : ' ✅';
        return `*${i+1}.* ${s.emoji} *${s.name}*${lockTag}\n   MP: ${s.mpCost} | CD: ${s.cooldownTurns} turn\n   ${s.desc}`;
    }).join('\n\n');
    return out;
}

// ══════════════════════════════════════════
// FIND SKILL FROM ACTIVE SLOTS (untuk battle)
// ══════════════════════════════════════════

/**
 * Cari skill berdasarkan nomor slot aktif.
 * Dipakai di battle.js saat player ketik .use 1/2/3/4
 */
async function findSkillBySlot(nomor, className, slotNum) {
    const [rows] = await db.query(
        'SELECT skill_id FROM player_skill_slots WHERE nomor = ? AND slot = ? AND class_name = ?',
        [nomor, slotNum, className]
    );
    if (!rows.length) return null;

    const pool = getSkillPool(className);
    return pool.find(s => s.id === rows[0].skill_id) || null;
}

module.exports = {
    equipSkill,
    unequipSkill,
    clearAllSlots,
    setDefaultSlots,
    getAllSlots,
    getSlotSkill,
    findSkillBySlot,
    formatActiveSlots,
    formatSkillPool,
};
