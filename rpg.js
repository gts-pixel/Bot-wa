// rpg.js
const db = require('./db').promise(); // Import koneksi database MySQL promise wrapper
const Rpgformula = require('./rpgformula'); // Import formula RPG 
const { formatSkillList, useSkill } = require('./RpgClassSkill');
const { startHunt, doAttack, doSkill, doFlee } = require('./battle');
const RpgClassSkill = require('./RpgClassSkill');
const dbitem = require('./dbitem');
const { checkCooldown } = require ('./cd')
const { redeemCode, createCode } = require("./Redeem");
const SkillSlot = require('./SkillSlot');
const OWNER_NUMBERS = (process.env.OWNER_NUMBER || '')
    .split(',')
    .map(n => n.trim().replace(/@.*$/, ''))
    .filter(Boolean);

function isOwner(senderId) {
    return OWNER_NUMBERS.includes((senderId || '').split('@')[0]);
}

// Definisi class rpg
const DEFAULT_CLASS = 'non';
const CLASS_DATA = {
    non:       { emoji: '❌', bonus: {}, desc: '\n ↳Belum memilih class. Pilih dengan perintah .class [nama class].\n' },
    knight:    { emoji: '⚔️', bonus: { strength: 20, defense: 20 }, desc: '\n ↳Warrior tangguh dengan fokus STR + DEF.\n' },
    paladin:   { emoji: '🛡️', bonus: { strength: 10, defense: 15, vitality: 15 }, desc: '\n ↳Pelindung suci dengan STR + DEF + VIT.\n' },
    berserker: { emoji: '🪓', bonus: { strength: 25, agility: 10, defense: 5 }, desc: '\n ↳Penyerang brutal dengan STR + AGI + DEF.\n' },
    wizard:    { emoji: '🔮', bonus: { intelligence: 25, wisdom: 20}, desc: '\n ↳Ahli sihir dengan INT + WIS.\n' },
    mage:      { emoji: '🧙', bonus: { intelligence: 20, wisdom: 10, luck: 10 }, desc: '\n ↳Penyihir serbaguna dengan INT + WIS + LUK.\n' },
    assassin:  { emoji: '🗡️', bonus: { agility: 20, dexterity: 20 }, desc: '\n ↳Penyerang cepat dengan AGI + DEX.\n' },
    phantom:   { emoji: '👻', bonus: { agility: 15, dexterity: 15, luck: 10 }, desc: '\n ↳Bayangan licik dengan AGI + DEX + LUK.\n' },
    archer:    { emoji: '🏹', bonus: { dexterity: 20, agility: 15 }, desc: '\n ↳Pemanah jitu dengan DEX + AGI.\n' },
    hawkeye:   { emoji: '🦅', bonus: { dexterity: 25, luck: 20 }, desc: '\n ↳Sniper kelas atas dengan DEX + LUK.\n' },
    summoner:  { emoji: '🐉', bonus: { intelligence: 15, wisdom: 15, luck: 10 }, desc: '\n ↳Pemanggil makhluk dengan INT + WIS + LUK.\n' },
};

function getBaseStats() {
    return {
        strength: 10,
        agility: 10,
        intelligence: 10,
        dexterity: 10,
        defense: 10,
        vitality: 10,
        wisdom: 10,
        luck: 10,
    };
}

function applyClassStats(className) {
    const stats = getBaseStats();
    const classInfo = CLASS_DATA[className] || CLASS_DATA[DEFAULT_CLASS];
    Object.entries(classInfo.bonus).forEach(([key, value]) => {
        stats[key] = (stats[key] || 0) + value;
    });
    return stats;
}

function buildPlayerStats(className) {
    const stats = applyClassStats(className);
    const derived = Rpgformula.calculateDerivedStats(stats);
    return { stats, derived };
}

const REGEN_CONFIG = {
    hpPerTick: 1,
    mpPerTick: 3,
    tickSeconds: 3,
};

async function applyAutoRegen(nomor) {
    const [rows] = await db.query('SELECT hp, mp, max_hp, max_mp, last_regen FROM rpg_players WHERE nomor = ?', [nomor]);
    if (!rows.length) return null;

    const player = rows[0];
    const lastRegen = player.last_regen ? new Date(player.last_regen) : new Date();
    const now = new Date();
    const elapsedSeconds = Math.floor((now - lastRegen) / 1000);
    const ticks = Math.floor(elapsedSeconds / REGEN_CONFIG.tickSeconds);
    if (ticks <= 0) return player;

    const hpGain = Math.min(player.max_hp - player.hp, ticks * REGEN_CONFIG.hpPerTick);
    const mpGain = Math.min(player.max_mp - player.mp, ticks * REGEN_CONFIG.mpPerTick);
    const newHp = Math.min(player.max_hp, player.hp + hpGain);
    const newMp = Math.min(player.max_mp, player.mp + mpGain);

    await db.query(
        'UPDATE rpg_players SET hp = ?, mp = ?, last_regen = ? WHERE nomor = ?',
        [newHp, newMp, now, nomor]
    );

    return { ...player, hp: newHp, mp: newMp, last_regen: now };
}

function formatClassList() {
    return Object.entries(CLASS_DATA)
        .map(([name, info]) => `${info.emoji} ${name} — ${info.desc}`)
        .join('\n');
}

function formatDerivedStats(stats) {
    const d = Rpgformula.calculateDerivedStats(stats);
    return (
        `\n⚡ *Combat Stats:*\n` +
        `ATK Fisik : ${d.physicalDamage.toFixed(1)}\n` +
        `ATK Sihir : ${d.magicDamage.toFixed(1)}\n` +
        `Crit Rate : ${d.critRate.toFixed(1)}%\n` +
        `Crit DMG  : ${d.critDamage.toFixed(1)}\n` +
        `Max HP    : ${d.maxHP}\n` +
        `Max MP    : ${d.maxMP}\n` +
        `MP Regen  : ${d.mpRegen.toFixed(1)}\n` +
        `Dodge     : ${d.dodgeRate.toFixed(1)}%\n` +
        `Hit Rate  : ${d.hitRate.toFixed(1)}%\n` +
        `Max AP    : ${d.maxAP}`
    );
}

async function ensureColumn(column, def) {
    try {
        await db.query(`ALTER TABLE rpg_players ADD COLUMN ${column} ${def}`);
    } catch (error) {
        // kalau kolom sudah ada, abaikan
    }
}

// Fungsi untuk membuat tabel RPG jika belum ada
async function initializeRPGTables() {
    const createRPGPlayersTable = `
        CREATE TABLE IF NOT EXISTS rpg_players (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nomor VARCHAR(50) NOT NULL UNIQUE,
            nama VARCHAR(255) NOT NULL,
            class VARCHAR(50) NOT NULL DEFAULT '${DEFAULT_CLASS}',
            level INT DEFAULT 1,
            exp INT DEFAULT 0,
            gold INT DEFAULT 100,
            hp INT DEFAULT 100,
            max_hp INT DEFAULT 100,
            max_mp INT DEFAULT 100,
            strength INT DEFAULT 10,
            agility INT DEFAULT 10,
            intelligence INT DEFAULT 10,
            dexterity INT DEFAULT 10,
            defense INT DEFAULT 10,
            vitality INT DEFAULT 10,
            wisdom INT DEFAULT 10,
            luck INT DEFAULT 10,
            mp INT DEFAULT 100,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    try {
        await db.query(createRPGPlayersTable);
        await ensureColumn('class', `VARCHAR(50) NOT NULL DEFAULT '${DEFAULT_CLASS}'`);
        await ensureColumn('strength', 'INT DEFAULT 10');
        await ensureColumn('agility', 'INT DEFAULT 10');
        await ensureColumn('intelligence', 'INT DEFAULT 10');
        await ensureColumn('dexterity', 'INT DEFAULT 10');
        await ensureColumn('defense', 'INT DEFAULT 10');
        await ensureColumn('vitality', 'INT DEFAULT 10');
        await ensureColumn('wisdom', 'INT DEFAULT 10');
        await ensureColumn('luck', 'INT DEFAULT 10');
        await ensureColumn('mp', 'INT DEFAULT 100');
        await ensureColumn('max_mp', 'INT DEFAULT 100');
        await ensureColumn('last_regen', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        await ensureColumn('stat_points', 'INT DEFAULT 0');
        console.log('✅ Tabel rpg_players siap.');
    } catch (error) {
        console.error('Error creating rpg_players table:', error);
    }
}

// Fungsi login pemain
async function loginPlayer(nomor, nama) {
    try {
        const [rows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [nomor]);
        if (rows.length === 0) {
            const className = DEFAULT_CLASS;
            const { stats, derived } = buildPlayerStats(className);
            await db.query(`
                INSERT INTO rpg_players (
                    nomor, nama, class, level, exp, gold, hp, max_hp, max_mp,
                    strength, agility, intelligence, dexterity, defense, vitality, wisdom, luck, mp
                ) VALUES (?, ?, ?, 1, 0, 100, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                nomor,
                nama,
                className,
                derived.maxHP,
                derived.maxHP,
                derived.maxMP,
                stats.strength,
                stats.agility,
                stats.intelligence,
                stats.dexterity,
                stats.defense,
                stats.vitality,
                stats.wisdom,
                stats.luck,
                derived.maxMP
            ]);

            return {
                isNew: true,
                player: {
                    nomor,
                    nama,
                    class: className,
                    level: 1,
                    exp: 0,
                    gold: 100,
                    mp: derived.maxMP,
                    hp: derived.maxHP,
                    max_hp: derived.maxHP,
                    max_mp: derived.maxMP,
                    ...stats
                }
            };
        }

        await db.query('UPDATE rpg_players SET last_login = NOW() WHERE nomor = ?', [nomor]);
        const updatedPlayer = await updatePlayerDerivedStats(nomor, rows[0]);
        return { isNew: false, player: updatedPlayer };
    } catch (error) {
        console.error('Error in loginPlayer:', error);
        throw error;
    }
}

async function updatePlayerDerivedStats(nomor, player) {
    const derived = Rpgformula.calculateDerivedStats({
        strength: player.strength,
        agility: player.agility,
        intelligence: player.intelligence,
        dexterity: player.dexterity,
        defense: player.defense,
        vitality: player.vitality,
        wisdom: player.wisdom,
        luck: player.luck,
    });

    // Cap HP dan MP jika melebihi max baru
    const newHp = Math.min(player.hp, derived.maxHP);
    const newMp = Math.min(player.mp, derived.maxMP);

    await db.query(`
        UPDATE rpg_players SET max_hp = ?, max_mp = ?, hp = ?, mp = ?
        WHERE nomor = ?
    `, [derived.maxHP, derived.maxMP, newHp, newMp, nomor]);

    return { ...player, max_hp: derived.maxHP, max_mp: derived.maxMP, hp: newHp, mp: newMp };
}

async function setPlayerClass(nomor, className) {
    const classInfo = CLASS_DATA[className];
    if (!classInfo) {
        throw new Error('Class tidak ditemukan');
    }
    const { stats, derived } = buildPlayerStats(className);
    await db.query(`
        UPDATE rpg_players SET class = ?, strength = ?, agility = ?, intelligence = ?, dexterity = ?, defense = ?, vitality = ?, wisdom = ?, luck = ?, hp = ?, max_hp = ?, mp = ?, max_mp = ?
        WHERE nomor = ?
    `, [
        className,
        stats.strength,
        stats.agility,
        stats.intelligence,
        stats.dexterity,
        stats.defense,
        stats.vitality,
        stats.wisdom,
        stats.luck,
        derived.maxHP,
        derived.maxHP,
        derived.maxMP,
        derived.maxMP,
        nomor
    ]);
}

module.exports = async (client, message) => {
    try {
        const body = message.body || "";
        const senderId = message.author || message.from;
        const chat = await message.getChat();
        const nomorWA = senderId.split('@')[0];
        const nama = nomorWA; // gunakan nomor WA secara konsisten

        // Prefix Bot
        if (!body.startsWith(".")) return;

        // Ambil command setelah prefix
        const fullCommand = body.slice(1).trim().toLowerCase();
        const commandParts = fullCommand.split(/\s+/);
        const command = commandParts[0];
        const args = commandParts.slice(1).join(' ');

        // Simpan user ke DB kalau belum ada
        await db.query(`
            INSERT IGNORE INTO users (nomor, nama) VALUES (?, ?)
        `, [senderId, nama]);

        // Log setiap perintah
        await db.query(`
            INSERT INTO log_perintah (nomor, perintah) VALUES (?, ?)
        `, [senderId, command]);

        // Terapkan auto regen sebelum eksekusi command
        await applyAutoRegen(senderId);

        // ── ANTI-SPAM COOLDOWN ──
        const sisaCD = checkCooldown(senderId);
        if (sisaCD > 0) {
            await chat.sendMessage(`⏳ Tunggu *${sisaCD} detik* lagi sebelum pakai command berikutnya.`);
            return;
        }

        // Log pesan masuk
        console.log(`Perintah diterima: ${command} dari ${senderId}`);

        switch (command) {
            case "login":
                try {
                    const result = await loginPlayer(senderId, nama);
                    if (result.isNew) {
                        await chat.sendMessage(
                            `🎮 *Selamat datang di RPG Bot, ${result.player.nama}!*\n\n` +
                            `Kamu telah didaftarkan sebagai pemain baru!\n\n` +
                            `📊 *Status Awal:*\n` +
                            `Level: ${result.player.level}\n` +
                            `EXP: ${result.player.exp}\n` +
                            `Gold: ${result.player.gold}\n` +
                            `HP: ${result.player.hp}/${result.player.max_hp}\n` +
                            `MP: ${result.player.mp}\n\n` +
                            `Ketik *.help* untuk melihat perintah RPG lainnya.`
                        );
                    } else {
                        await chat.sendMessage(
                            `🎮 *Selamat datang kembali, ${result.player.nama}!*\n\n` +
                            `📊 *Status Kamu:*\n` +
                            `Level: ${result.player.level}\n` +
                            `EXP: ${result.player.exp}\n` +
                            `Gold: ${result.player.gold}\n` +
                            `HP: ${result.player.hp}/${result.player.max_hp}\n` +
                            `MP: ${result.player.mp}\n\n` +
                            `Ketik *.help* untuk melihat perintah RPG lainnya.`
                        );
                    }
                } catch (error) {
                    await chat.sendMessage("❌ Terjadi kesalahan saat login. Coba lagi nanti.");
                    console.error("Login error:", error);
                }
                break;

            case "halo":
                await chat.sendMessage("Halo! 👋 Ada yang bisa dibantu?");
                break;

            case "class":
                if (!args) {
                    try {
                        const [rows] = await db.query('SELECT class FROM rpg_players WHERE nomor = ?', [senderId]);
                        const currentClass = rows.length ? rows[0].class : DEFAULT_CLASS;
                        await chat.sendMessage(
                            `🎯 *Class RPG saat ini:* ${currentClass}\n\n` +
                            `Gunakan *.class [nama class]* untuk ganti class.\n` +
                            `Contoh: *.class assassin`
                        );
                    } catch (error) {
                        await chat.sendMessage('❌ Terjadi kesalahan saat memeriksa class.');
                        console.error('Class check error:', error);
                    }
                } else {
                    const className = args.toLowerCase();
                    if (!CLASS_DATA[className]) {
                        await chat.sendMessage(`❌ Class *${className}* tidak dikenal. Ketik *.classes* untuk melihat daftar class.`);
                        break;
                    }
                    try {
                        await setPlayerClass(senderId, className);
                        // Reset skill slots dan set default 4 skill pertama dari class baru
                        await SkillSlot.clearAllSlots(senderId);
                        await SkillSlot.setDefaultSlots(senderId, className);
                        await chat.sendMessage(
                            `✅ Class kamu berhasil diubah menjadi *${className}*!\n\n` +
                            `🎮 Skill slot 1-4 sudah di-reset ke default skill class *${className}*.\n` +
                            `Ketik *.myskills* untuk lihat slot aktifmu atau *.skillpool* untuk lihat semua skill yang bisa di-equip.`
                        );
                    } catch (error) {
                        await chat.sendMessage('❌ Terjadi kesalahan saat mengubah class. Coba lagi nanti.');
                        console.error('Change class error:', error);
                    }
                }
                break;

            case "classes":
                await chat.sendMessage(`📜 *Daftar Class RPG*\n\n${formatClassList()}`);
                break;

            case "change":
                if (args.length === 0) {
                    await chat.sendMessage("❌ Format salah. Gunakan: .change [nama baru]");
                } else {
                    try {
                        await db.query('UPDATE rpg_players SET nama = ? WHERE nomor = ?', [args, senderId]);
                        await chat.sendMessage(`✅ Nama kamu berhasil diubah menjadi *${args}*.`);
                    } catch (error) {
                        await chat.sendMessage("❌ Terjadi kesalahan saat mengubah nama. Coba lagi nanti.");
                        console.error("Change name error:", error);
                    }
                }
                break;
            case "profile":
                try {
                    const [rows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [senderId]);
                    if (rows.length === 0) {
                        await chat.sendMessage("❌ Kamu belum terdaftar. Ketik *.login* untuk mendaftar.");
                    } else {
                        const player = rows[0];
                        await chat.sendMessage(
                            `╔═══『 ⚔️ RPG PROFILE ⚔️ 』═══╗\n\n` +
                            `Nama: ${player.nama}\n` +
                            `Class: ${player.class || DEFAULT_CLASS}\n` +
                            `Level: ${player.level}\n` +
                            `EXP: ${player.exp}\n` +
                            `Gold: ${player.gold}\n\n` +
                            `HP: ${player.hp}/${player.max_hp}\n` +
                            `MP: ${player.mp}/${player.max_mp}\n\n` +
                            '╠════『 📊 STATS 』════╣\n\n' +
                            `STR: ${player.strength}\n` +
                            `AGI: ${player.agility}\n` +
                            `INT: ${player.intelligence}\n` +
                            `DEX: ${player.dexterity}\n` +
                            `DEF: ${player.defense}\n` +
                            `VIT: ${player.vitality}\n` +
                            `WIS: ${player.wisdom}\n` +
                            `LUK: ${player.luck}\n\n` +
                            `Stat point: ${player.stat_point}\n`+
                            `╚══════════════════════╝`
                        );
                    }
                } catch (error) {
                    await chat.sendMessage("❌ Terjadi kesalahan saat mengambil profile. Coba lagi nanti.");
                    console.error("Profile error:", error);
                }
                break;
            // ── .myskills — lihat slot skill aktif (1-4) ──
            case "myskills":
            case "skill": {
                const [rows] = await db.query('SELECT class FROM rpg_players WHERE nomor = ?', [senderId]);
                if (!rows.length) {
                    await chat.sendMessage('❌ Kamu belum terdaftar. Ketik *.login* untuk mendaftar.');
                    break;
                }
                const out = await SkillSlot.formatActiveSlots(senderId, rows[0].class);
                await chat.sendMessage(out);
                break;
            }

            // ── .skillpool — lihat semua skill yang bisa di-equip ──
            case "skillpool": {
                const [rows] = await db.query('SELECT class FROM rpg_players WHERE nomor = ?', [senderId]);
                if (!rows.length) {
                    await chat.sendMessage('❌ Kamu belum terdaftar. Ketik *.login* untuk mendaftar.');
                    break;
                }
                await chat.sendMessage(SkillSlot.formatSkillPool(rows[0].class));
                break;
            }

            // ── .equipskill [nama skill] [slot opsional] ──
            case "equipskill": {
                if (!args) {
                    await chat.sendMessage('❌ Format: *.equipskill [nama skill]* atau *.equipskill [nama skill] [1-4]*\nContoh: *.equipskill Fireball* atau *.equipskill Fireball 2*');
                    break;
                }
                const [rows] = await db.query('SELECT class, level FROM rpg_players WHERE nomor = ?', [senderId]);
                if (!rows.length) {
                    await chat.sendMessage('❌ Kamu belum terdaftar. Ketik *.login* untuk mendaftar.');
                    break;
                }
                // Parsing: "fireball 2" → skill = "fireball", slot = 2
                const parts = args.trim().split(/\s+/);
                const maybeSlot = parseInt(parts[parts.length - 1]);
                let skillName, targetSlot;
                if (!isNaN(maybeSlot) && maybeSlot >= 1 && maybeSlot <= 4) {
                    targetSlot = maybeSlot;
                    skillName = parts.slice(0, -1).join(' ');
                } else {
                    targetSlot = null;
                    skillName = parts.join(' ');
                }
                const result = await SkillSlot.equipSkill(senderId, rows[0].class, skillName, targetSlot, rows[0].level);
                await chat.sendMessage(result.message);
                break;
            }

            // ── .unequipskill [1-4] ──
            case "unequipskill": {
                if (!args) {
                    await chat.sendMessage('❌ Format: *.unequipskill [1-4]*\nContoh: *.unequipskill 3*');
                    break;
                }
                const [rows] = await db.query('SELECT class FROM rpg_players WHERE nomor = ?', [senderId]);
                if (!rows.length) {
                    await chat.sendMessage('❌ Kamu belum terdaftar. Ketik *.login* untuk mendaftar.');
                    break;
                }
                const result = await SkillSlot.unequipSkill(senderId, rows[0].class, args.trim());
                await chat.sendMessage(result.message);
                break;
            }

            // ── .use [1-4] — pakai skill slot saat battle ──
            case "use": {
                if (!args) {
                    await chat.sendMessage('❌ Format: *.use [1-4]*\nContoh: *.use 2*\n\nKetik *.myskills* untuk lihat slot aktifmu.');
                    break;
                }
                const skillKey = args.trim();
                const { activeBattles } = require('./battle');
                if (activeBattles[senderId]) {
                    await doSkill(senderId, skillKey, chat);
                } else {
                    // Di luar battle — jalankan heal/mpRegen skill langsung
                    const [rows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [senderId]);
                    if (!rows.length) {
                        await chat.sendMessage('❌ Kamu belum terdaftar. Ketik *.login* untuk mendaftar.');
                        break;
                    }
                    const slotNum = parseInt(skillKey);
                    if (isNaN(slotNum) || slotNum < 1 || slotNum > 4) {
                        await chat.sendMessage('❌ Gunakan *.use [1-4]* sesuai nomor slot.\nKetik *.myskills* untuk lihat slot aktifmu.');
                        break;
                    }
                    const player = rows[0];
                    const skill = await SkillSlot.findSkillBySlot(senderId, player.class, slotNum);
                    if (!skill) {
                        await chat.sendMessage(`❌ Slot *${slotNum}* kosong. Equip dulu dengan *.equipskill [nama skill]*`);
                        break;
                    }
                    if (player.mp < skill.mpCost) {
                        await chat.sendMessage(`❌ MP tidak cukup! Butuh *${skill.mpCost} MP*, kamu punya *${player.mp} MP*.`);
                        break;
                    }
                    const result = skill.effect(player);
                    let newHp = player.hp;
                    let newMp = player.mp - skill.mpCost;
                    if (result.heal) newHp = Math.min(player.max_hp, newHp + result.heal);
                    if (result.mpRegen) newMp = Math.min(player.max_mp, newMp + result.mpRegen);
                    if (result.hpCost) newHp = Math.max(1, newHp - result.hpCost);
                    await db.query('UPDATE rpg_players SET hp = ?, mp = ? WHERE nomor = ?', [newHp, newMp, senderId]);
                    await chat.sendMessage(result.desc + `\n\n❤️ HP: ${newHp}/${player.max_hp}\n💙 MP: ${newMp}/${player.max_mp}`);
                }
                break;
            }
            
            case "hunt": {
                await startHunt(senderId, chat);
                break;
            }
            
            case "attack": {
                await doAttack(senderId, chat);
                break;
            } 

            case "flee": {
                await doFlee(senderId, chat);
                break;
            } 

            case "skills":
                try {
                    const [rows] = await db.query('SELECT class FROM rpg_players WHERE nomor = ?', [senderId]);
                    if (!rows.length) {
                        await chat.sendMessage('❌ Kamu belum terdaftar. Ketik *.login* untuk mendaftar.');
                        break;
                    }
                    const out = await SkillSlot.formatActiveSlots(senderId, rows[0].class);
                    await chat.sendMessage(out);
                } catch (err) {
                    console.error('Error fetching skills:', err);
                    await chat.sendMessage('❌ Terjadi kesalahan. Coba lagi nanti.');
                }
                break;
            
            case "addstat":
                const VALID_STATS = {
                    str: 'strength', strength: 'strength',
                    agi: 'agility',  agility: 'agility',
                    int: 'intelligence', intelligence: 'intelligence',
                    dex: 'dexterity', dexterity: 'dexterity',
                    def: 'defense',  defense: 'defense',
                    vit: 'vitality', vitality: 'vitality',
                    wis: 'wisdom',   wisdom: 'wisdom',
                    luk: 'luck',     luck: 'luck', 
                };
                
                const addParts = args.split(/\s+/);
                const statInput = addParts[0];
                const amount = parseInt(addParts[1]);

                if (!statInput || isNaN(amount) || amount <= 0) {
                    await chat.sendMessage(
                        `❌ Format salah.\nGunakan: *.addstat [stat] [jumlah]*\n\n` +
                        `Contoh: *.addstat str 3*\n\n` +
                        `Stat yang tersedia:\n` +
                        `str, agi, int, dex, def, vit, wis, luk`
                    );
                    break;
                }

                const statKey = VALID_STATS[statInput];
                if (!statKey) {
                    await chat.sendMessage(
                        `❌ Stat *${statInput}* tidak dikenal.\n\n` +
                        `Stat yang tersedia: str, agi, int, dex, def, vit, wis, luk`
                    );
                    break;
                }

                const [pRows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [senderId]);
                if (!pRows.length) {
                    await chat.sendMessage('❌ Kamu belum terdaftar. Ketik *.login* untuk mendaftar.');
                    break;
                }

                const p = pRows[0];
                if ((p.stat_point || 0) < amount) {
                    await chat.sendMessage(
                        `❌ Stat point tidak cukup!\n` +
                        `Kamu punya *${p.stat_point || 0} point*, butuh *${amount} point*.`
                    );
                    break;
                }

                // Update stat + kurangi stat_point
                await db.query(
                    `UPDATE rpg_players SET ${statKey} = ${statKey} + ?, stat_point = stat_point - ? WHERE nomor = ?`,
                    [amount, amount, senderId]
                );

                // Hitung ulang max_hp dan max_mp setelah stat berubah
                const [updated] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [senderId]);
                const newDerived = Rpgformula.calculateDerivedStats(updated[0]);
                await db.query(
                    'UPDATE rpg_players SET max_hp = ?, max_mp = ? WHERE nomor = ?',
                    [newDerived.maxHP, newDerived.maxMP, senderId]
                );

                await chat.sendMessage(
                    `✅ *${statInput.toUpperCase()}* berhasil ditambah *+${amount}*!\n\n` +
                    `${statInput.toUpperCase()} : ${p[statKey]} → ${p[statKey] + amount}\n` +
                    `🔹 Sisa Stat Point : *${(p.stat_point || 0) - amount}*\n\n` +
                    `Ketik *.profile* untuk melihat stat terbaru.`
                );
                break;
            
            case "statpoint": {
                // Lihat sisa stat point
                const [spRows] = await db.query('SELECT stat_point, level FROM rpg_players WHERE nomor = ?', [senderId]);
                if (!spRows.length) {
                    await chat.sendMessage('❌ Kamu belum terdaftar. Ketik *.login* untuk mendaftar.');
                    break;
                }
                const sp = spRows[0].stat_point || 0;
                await chat.sendMessage(
                    `🔹 *Stat Point kamu: ${sp}*\n\n` +
                    `Gunakan *.addstat [stat] [jumlah]* untuk alokasikan.\n` +
                    `Contoh: *.addstat str 5*\n\n` +
                    `Stat: str, agi, int, dex, def, vit, wis, luk`
                );
                break;
            }

            // case "inv" : {
            //     const [invPlayerRows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ? ', [senderId]);
            //     if (!invPlayerRows.length) {
            //         await chat.sendMessage('❌ Kamu belum terdaftar. Ketik *.login* untuk mendaftar.');
            //         break;
            //     }
            //     const invRows = await getInventory(senderId);
            //     await chat.sendMessage(formatInventory(invRows));
            //     break;
            // }

            // case "item": {
            //     if (!args) {
            //         await chat.sendMessage(
            //             '❌ Format salah.\nGunakan: *.item [nama item]*\n\nContoh: *.item HP Potion*\n\nKetik *.inv* untuk melihat inventory kamu.'
            //         );
            //         break;
            //     }
            //     const [itemPlayerRows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [senderId]);
            //     if (!itemPlayerRows.length) {
            //         await chat.sendMessage('❌ Kamu belum terdaftar. Ketik *.login* untuk mendaftar.');
            //         break;
            //     }
            //     const playerRow = itemPlayerRows[0];
            //     const { activeBattles } = require('./battle');
            //     const inBattle = !!activeBattles[senderId];
            //     const itemResult = await useItem(senderId, args, playerRow, inBattle);
            //     await chat.sendMessage(itemResult.message);
            //     break;
            // }

            case "leaderboard":
            case "lb": {
                try {
                    const lbType = args.trim().toLowerCase();
                    const validTypes = { level: 'level', lvl: 'level', gold: 'gold', exp: 'exp' };
                    const sortBy = validTypes[lbType] || 'level';

                    const [lbRows] = await db.query(
                        `SELECT nama, level, exp, gold, class
                         FROM rpg_players
                         ORDER BY ${sortBy} DESC, exp DESC
                         LIMIT 10`
                    );

                    if (!lbRows.length) {
                        await chat.sendMessage('📊 Belum ada pemain yang terdaftar.');
                        break;
                    }

                    const medals = ['🥇', '🥈', '🥉', '🔴4️⃣', '🔴5️⃣', '🔴6️⃣', '🔴7️⃣', '🔴8️⃣', '🔴9️⃣', '🔴🔟'];
                    const typeLabel = sortBy === 'level' ? 'Level' : sortBy === 'gold' ? 'Gold' : 'EXP';
                    const typeEmoji = sortBy === 'level' ? '⭐' : sortBy === 'gold' ? '💰' : '✨';

                    // Cari rank pemain yang ngirim command
                    const [rankRow] = await db.query(
                        `SELECT COUNT(*) + 1 as myrank FROM rpg_players
                         WHERE ${sortBy} > (SELECT ${sortBy} FROM rpg_players WHERE nomor = ?)`
                    , [senderId]);
                    const myRank = rankRow[0]?.myrank || '-';

                    const [myRow] = await db.query(
                        `SELECT nama, level, exp, gold, class FROM rpg_players WHERE nomor = ?`
                    , [senderId]);
                    const myData = myRow[0];

                    let text = `╔═════╬🏆 TOP 10 ${typeLabel} 🏆╬═════╗\n`;

                    lbRows.forEach((row, i) => {
                        const classInfo = CLASS_DATA[row.class] || CLASS_DATA['non'];
                        const value = sortBy === 'level'
                            ? `Lv.*${row.level}*  ✨ ${row.exp} EXP`
                            : sortBy === 'gold'
                            ? `💰 *${row.gold}* gold  |  Lv.${row.level}`
                            : `✨ *${row.exp}* exp  |  Lv.${row.level}`;
                        text += `${medals[i]} *${row.nama}* ${classInfo.emoji}\n`;
                        text += `     └─ ${value}\n`;
                    });

                    text += `╚══════════════════════╝\n`;

                    // Tampilkan rank pemain sendiri
                    if (myData) {
                        const classInfo = CLASS_DATA[myData.class] || CLASS_DATA['non'];
                        const myVal = sortBy === 'level'
                            ? `Lv.*${myData.level}*  ✨ ${myData.exp} EXP`
                            : sortBy === 'gold'
                            ? `💰 *${myData.gold}* gold  |  Lv.${myData.level}`
                            : `✨ *${myData.exp}* exp  |  Lv.${myData.level}`;
                        text += `📌 *Rankmu:* #${myRank} — ${myData.nama} ${classInfo.emoji}\n`;
                        text += `     └─ ${myVal}\n`;
                    }

                    text += `\n📌 Filter: *.lb level* | *.lb gold* | *.lb exp*`;

                    await chat.sendMessage(text);
                } catch (err) {
                    console.error('Leaderboard error:', err);
                    await chat.sendMessage('❌ Terjadi kesalahan saat mengambil leaderboard.');
                }
                break;
            }

            case 'addsysitem':
            case 'addeffect':
            case 'iteminfo':
            case 'items':
            case 'inv':
            case 'inventory':
            case 'equip':
            case 'unequip':
            case 'useitem':
                await dbitem.handleCommand(client, message, command, args);
                break;
            case "shop" : {
                
            }

            case 'redeem': {
                if (!args) {
                    await chat.sendMessage('❌ Format: *.redeem [KODE]*\nContoh: *.redeem LAUNCH2025*');
                    break;
                }
                const result = await redeemCode(senderId, args.trim());
                await chat.sendMessage(result.message);
                break;
            }

            // Admin only
            case 'addcode': {
                if (!isOwner(senderId)) {
                    await chat.sendMessage('❌ Kamu bukan admin.');
                    break;
                }
                // Format: .addcode KODE gold:500 exp:1000 uses:10
                // Atau:   .addcode KODE gold:500 item:HP Potion itemqty:3
                const parts = args.trim().split(/\s+/);
                const kode = parts[0];
                if (!kode) {
                    await chat.sendMessage('❌ Format: *.addcode KODE gold:500 exp:1000 uses:10*');
                    break;
                }
                const opts = {};
                parts.slice(1).forEach(p => {
                    const [k, v] = p.split(':');
                    if (k === 'gold') opts.gold = parseInt(v);
                    else if (k === 'exp') opts.exp = parseInt(v);
                    else if (k === 'uses') opts.maxUses = parseInt(v);
                    else if (k === 'item') opts.item = v.replace(/_/g, ' ');
                    else if (k === 'itemqty') opts.itemQty = parseInt(v);
                    else if (k === 'expires') opts.expiresAt = v.replace(/_/g, ' ');
                });
                try {
                    const created = await createCode(kode, opts);
                    await chat.sendMessage(
                        `✅ Kode *${created}* berhasil dibuat!\n` +
                        `Gold: ${opts.gold || 0} | EXP: ${opts.exp || 0} | Max uses: ${opts.maxUses || 1}`
                    );
                } catch (e) {
                    await chat.sendMessage('❌ Kode sudah ada atau terjadi error.');
                }
                break;
            }

            default:
                await chat.sendMessage(`❓ Command *.${command}* tidak dikenal. Ketik *.help* untuk melihat daftar perintah.`);
                break;
        }

    } catch (error) {
        console.error("Error di rpg:", error);
    }
};

// Inisialisasi tabel saat modul dimuat
initializeRPGTables();