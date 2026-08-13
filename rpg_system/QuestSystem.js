// QuestSystem.js
// Quest daily (reset tiap hari) + one-time (sekali selesai, gak reset).
// Admin/resepsionis bisa nambah quest baru lewat .addquest.
// Progress di-track otomatis lewat trackProgress(nomor, objectiveType, amount)
// yang dipanggil dari battle.js / partyBattle.js / Gathering.js / Farming.js.

const db = require('../db').promise();

async function initQuestTables() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS rpg_quests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            quest_key VARCHAR(50) NOT NULL UNIQUE,
            title VARCHAR(150) NOT NULL,
            description VARCHAR(255) DEFAULT '',
            quest_type ENUM('daily','onetime') NOT NULL DEFAULT 'daily',
            objective_type VARCHAR(30) NOT NULL,   -- hunt | fish | mine | chop | plant | harvest | dst
            objective_target INT NOT NULL DEFAULT 1,
            reward_gold INT DEFAULT 0,
            reward_exp INT DEFAULT 0,
            reward_item VARCHAR(100) DEFAULT NULL,
            reward_item_qty INT DEFAULT 0,
            active TINYINT DEFAULT 1,
            created_by VARCHAR(50) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS rpg_quest_progress (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nomor VARCHAR(50) NOT NULL,
            quest_key VARCHAR(50) NOT NULL,
            day_key VARCHAR(10) NOT NULL DEFAULT 'ONETIME', -- 'YYYY-MM-DD' buat daily, 'ONETIME' buat onetime
            progress INT DEFAULT 0,
            completed TINYINT DEFAULT 0,
            claimed TINYINT DEFAULT 0,
            completed_at DATETIME DEFAULT NULL,
            UNIQUE KEY uniq_progress (nomor, quest_key, day_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('✅ Tabel quest siap.');
}
initQuestTables();

function todayKey() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function dayKeyFor(quest) {
    return quest.quest_type === 'daily' ? todayKey() : 'ONETIME';
}

// =====================
// ADMIN: TAMBAH QUEST
// =====================
async function addQuest(key, opts = {}, createdBy = null) {
    const {
        title, description = '', questType = 'daily',
        objectiveType, objectiveTarget = 1,
        rewardGold = 0, rewardExp = 0, rewardItem = null, rewardItemQty = 0,
    } = opts;

    if (!title || !objectiveType) {
        throw new Error('title dan objectiveType wajib diisi');
    }

    const questKey = key.trim().toUpperCase();

    await db.query(
        `INSERT INTO rpg_quests
         (quest_key, title, description, quest_type, objective_type, objective_target,
          reward_gold, reward_exp, reward_item, reward_item_qty, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            title = VALUES(title), description = VALUES(description), quest_type = VALUES(quest_type),
            objective_type = VALUES(objective_type), objective_target = VALUES(objective_target),
            reward_gold = VALUES(reward_gold), reward_exp = VALUES(reward_exp),
            reward_item = VALUES(reward_item), reward_item_qty = VALUES(reward_item_qty), active = 1`,
        [questKey, title, description, questType, objectiveType, objectiveTarget,
         rewardGold, rewardExp, rewardItem, rewardItemQty, createdBy]
    );

    return questKey;
}

async function removeQuest(key) {
    const questKey = key.trim().toUpperCase();
    await db.query('UPDATE rpg_quests SET active = 0 WHERE quest_key = ?', [questKey]);
    return questKey;
}

// =====================
// TRACK PROGRESS
// =====================
// Dipanggil dari sistem lain tiap ada aksi relevan (menang hunt, mancing, dst)
async function trackProgress(nomor, objectiveType, amount = 1) {
    if (!nomor || !objectiveType) return;

    const [quests] = await db.query(
        'SELECT * FROM rpg_quests WHERE objective_type = ? AND active = 1',
        [objectiveType]
    );
    if (!quests.length) return;

    for (const quest of quests) {
        const dayKey = dayKeyFor(quest);

        const [rows] = await db.query(
            'SELECT * FROM rpg_quest_progress WHERE nomor = ? AND quest_key = ? AND day_key = ?',
            [nomor, quest.quest_key, dayKey]
        );

        let current = rows.length ? rows[0].progress : 0;
        if (rows.length && rows[0].completed) continue; // udah selesai, gak usah nambah lagi

        current = Math.min(quest.objective_target, current + amount);
        const isCompleted = current >= quest.objective_target ? 1 : 0;

        if (rows.length) {
            await db.query(
                'UPDATE rpg_quest_progress SET progress = ?, completed = ?, completed_at = ? WHERE id = ?',
                [current, isCompleted, isCompleted ? new Date() : null, rows[0].id]
            );
        } else {
            await db.query(
                `INSERT INTO rpg_quest_progress (nomor, quest_key, day_key, progress, completed, completed_at)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [nomor, quest.quest_key, dayKey, current, isCompleted, isCompleted ? new Date() : null]
            );
        }
    }
}

// =====================
// LIST QUEST (buat player)
// =====================
async function formatQuestList(nomor) {
    const [quests] = await db.query('SELECT * FROM rpg_quests WHERE active = 1 ORDER BY quest_type, id');
    if (!quests.length) {
        return '📜 Belum ada quest tersedia saat ini.';
    }

    const daily = [];
    const onetime = [];

    for (const quest of quests) {
        const dayKey = dayKeyFor(quest);
        const [rows] = await db.query(
            'SELECT * FROM rpg_quest_progress WHERE nomor = ? AND quest_key = ? AND day_key = ?',
            [nomor, quest.quest_key, dayKey]
        );
        const progress = rows.length ? rows[0].progress : 0;
        const completed = rows.length ? !!rows[0].completed : false;
        const claimed = rows.length ? !!rows[0].claimed : false;

        const statusIcon = claimed ? '✅' : completed ? '🎁' : '⏳';
        const rewardParts = [];
        if (quest.reward_gold) rewardParts.push(`💰${quest.reward_gold}`);
        if (quest.reward_exp) rewardParts.push(`✨${quest.reward_exp}`);
        if (quest.reward_item) rewardParts.push(`📦${quest.reward_item}${quest.reward_item_qty > 1 ? ` ×${quest.reward_item_qty}` : ''}`);

        const line =
            `${statusIcon} *${quest.title}* [${quest.quest_key}]\n` +
            `   ${quest.description || ''}\n` +
            `   Progress: ${progress}/${quest.objective_target}` +
            (claimed ? ' (sudah diklaim)' : completed ? ' — *.claimquest ' + quest.quest_key + '*' : '') + `\n` +
            `   Reward: ${rewardParts.join(' ') || '-'}`;

        if (quest.quest_type === 'daily') daily.push(line);
        else onetime.push(line);
    }

    let out = '📜 *QUEST LIST*\n\n';
    if (daily.length) out += `☀️ *Daily Quest*\n${daily.join('\n\n')}\n\n`;
    if (onetime.length) out += `⭐ *One-Time Quest*\n${onetime.join('\n\n')}\n\n`;
    out += `💡 *.claimquest [KODE]* — klaim reward quest yang udah selesai`;

    return out;
}

// =====================
// CLAIM QUEST
// =====================
async function claimQuest(nomor, key) {
    const questKey = String(key || '').trim().toUpperCase();
    const [questRows] = await db.query('SELECT * FROM rpg_quests WHERE quest_key = ? AND active = 1', [questKey]);
    if (!questRows.length) {
        return { success: false, message: '❌ Quest tidak ditemukan.' };
    }
    const quest = questRows[0];
    const dayKey = dayKeyFor(quest);

    const [rows] = await db.query(
        'SELECT * FROM rpg_quest_progress WHERE nomor = ? AND quest_key = ? AND day_key = ?',
        [nomor, questKey, dayKey]
    );
    if (!rows.length || !rows[0].completed) {
        return { success: false, message: '❌ Quest ini belum selesai.' };
    }
    if (rows[0].claimed) {
        return { success: false, message: '❌ Reward quest ini udah diklaim.' };
    }

    const rewards = [];
    if (quest.reward_gold > 0) {
        await db.query('UPDATE rpg_players SET gold = gold + ? WHERE nomor = ?', [quest.reward_gold, nomor]);
        rewards.push(`💰 Gold +*${quest.reward_gold}*`);
    }
    if (quest.reward_exp > 0) {
        await db.query('UPDATE rpg_players SET exp = exp + ? WHERE nomor = ?', [quest.reward_exp, nomor]);
        rewards.push(`✨ EXP +*${quest.reward_exp}*`);
    }
    if (quest.reward_item && quest.reward_item_qty > 0) {
        const { addItemToInventory } = require('../dbitem');
        await addItemToInventory(nomor, quest.reward_item, quest.reward_item_qty);
        rewards.push(`📦 *${quest.reward_item}* ×${quest.reward_item_qty}`);
    }

    await db.query('UPDATE rpg_quest_progress SET claimed = 1 WHERE id = ?', [rows[0].id]);

    return {
        success: true,
        message:
            `🎉 *Quest Selesai!* ${quest.title}\n\n` +
            `Reward:\n${rewards.map(r => `  ✦ ${r}`).join('\n')}`,
    };
}

module.exports = { addQuest, removeQuest, trackProgress, formatQuestList, claimQuest };