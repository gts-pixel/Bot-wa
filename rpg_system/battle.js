const db = require('../db').promise();
const { getRandomMonsterByRank, calcMonsterDerived, rollGold, rollDrops } = require('../monster_system/Mons');
const { getRank } = require('./RankSystem');
const { findSkillBySlot } = require('../skill_system/SkillSlot');
const Rpgformula = require('./Rpgformula');
const { getSkillCooldown, setSkillCooldown, decrementSkillCooldowns, formatSkillCooldowns } = require('../skill_system/CDSkill');
const { getEquippedStatBonus } = require('../dbitem');
const activeBattles = {};

function rollCrit(luck){ 
    const rate = Math.min(luck * 0.8, 60) / 100; // Maks 60% crit rate
    return Math.random() < rate;
}

function rollDodge(agi){
    const rate = Math.min(agi * 0.5, 50) / 100; // Maks 50% dodge rate
    return Math.random() < rate;
}

function calcPlayerPhysDamage(player){
    return Rpgformula.physicalDamage(player.strength)
}

function calcPlayermgcDamage(player){
    return Rpgformula.magicalDamage(player.intelligence, player.wisdom)
}

function applyDef (rawdmg, def) {
    return Math.max(1, Math.floor(rawdmg * (100 / (100 + def))));
}

function formatMonsterStatus(monster, monsterHp) {
    const pct = Math.floor((monsterHp / monster.derived.maxHP) * 100);
    const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10)); // 10 segmen
    return `${monster.emoji} *${monster.name}* ${monster.tier}\nHP: ${monsterHp}/${monster.derived.maxHP} [${bar}] ${pct}%`;
}

function applyEquippedBonus(player, bonus = {}) {
    const effective = { ...player };
    Object.entries(bonus).forEach(([stat, value]) => {
        effective[stat] = (Number(effective[stat]) || 0) + Number(value || 0);
    });
    return effective;
}

function applyDebuffs(player, battle = {}) {
    const effective = { ...player };
    const debuffs = battle.debuffs || [];

    debuffs.forEach(debuff => {
        const statKey = debuff.stat === 'str' ? 'strength'
            : debuff.stat === 'agi' ? 'agility'
            : debuff.stat === 'int' ? 'intelligence'
            : debuff.stat === 'dex' ? 'dexterity'
            : debuff.stat === 'def' ? 'defense'
            : debuff.stat === 'vit' ? 'vitality'
            : debuff.stat === 'wis' ? 'wisdom'
            : debuff.stat === 'luk' ? 'luck'
            : debuff.stat;

        if (statKey && effective[statKey] !== undefined) {
            effective[statKey] = Math.max(1, Number(effective[statKey] || 0) + Number(debuff.amount || 0));
        }
    });

    return effective;
}

// =====================
// CC SYSTEM (stun / freeze)
// =====================
function applyCC(current, type, turns) {
    // gak downgrade CC yang lagi jalan lebih lama
    if (current && current.turns >= turns) return current;
    return { type, turns };
}

function tickCC(cc) {
    if (!cc) return null;
    const turns = cc.turns - 1;
    return turns > 0 ? { type: cc.type, turns } : null;
}

function ccLabel(type) {
    return type === 'freeze' ? '🥶 *Freeze*' : '😵 *Stun*';
}

function formatPlayerStatus(player) {
    const maxHp = player.max_hp ?? player.maxHP ?? 0;
    const maxMp = player.max_mp ?? player.maxMP ?? 0;
    const currentHp = player.hp ?? 0;
    const currentMp = player.mp ?? 0;
    return `❤️ HP: ${currentHp}/${maxHp} | 💙 MP: ${currentMp}/${maxMp}`;
}

function formatMonsterSkill(monster) {
    if (!monster.skill) return '';
    return `Skill: *${monster.skill.name}* (${monster.skill.type === 'active' ? 'Active' : 'Passive'})\n${monster.skill.desc}\n\n`;
}

// monster ai
function monsterTurn(player, monster, monsterMp, battle) {
    const logs = [];

    // Kalau monster kena stun/freeze dari skill player, skip aksinya
    if (battle.monsterCC && battle.monsterCC.turns > 0) {
        logs.push(`${ccLabel(battle.monsterCC.type)}! *${monster.name}* tidak bisa bergerak.`);
        battle.monsterCC = tickCC(battle.monsterCC);
        return { dmgToPlayer: 0, logs, newMonsterMp: monsterMp, specialEffect: null };
    }

    const skill = monster.skill;
    let newMonsterMp = monsterMp;
    let dmgToPlayer = 0;
    let specialEffect = null;

    const useskillChance = skill?.type === 'active' && Math.random() < 0.30;

    if (useskillChance && monsterMp >= (skill.mpCost || 0)) {
        newMonsterMp -= skill.mpCost || 0;
        const eff = skill.effect;

        if (eff.debuff) {
            specialEffect = { type: 'debuff', chance: eff.chance ?? 1, ...eff };
            logs.push(`⚠️ *${monster.name}* menggunakan skill *${skill.name}* \n*${eff.debuff}* selama ${eff.duration} turn!`);
        } else if (eff.freeze) {
            specialEffect = { type: 'freeze', chance: eff.chance ?? 1, duration: eff.duration ?? 2 };
            logs.push(`⚠️ *${monster.name}* menggunakan *${skill.name}*!\n   ${skill.desc}`);
        } else if (eff.stun) {
            specialEffect = { type: 'stun', chance: eff.chance ?? 1, duration: eff.duration ?? 1 };
            logs.push(`⚠️ *${monster.name}* menggunakan *${skill.name}*!\n   ${skill.desc}`);
        } else if (eff.dot) {
            specialEffect = { type: 'dot', ...eff.dot, chance: eff.chance ?? 1 };
            logs.push(`⚠️ *${monster.name}* menggunakan *${skill.name}*!\n   ${skill.desc}`);
        } else {
            dmgToPlayer = calcMonsterAttack(monster, player);
            logs.push(`${monster.emoji} *${monster.name}* menyerang!`);
        }
    } else {
        dmgToPlayer = calcMonsterAttack(monster, player);
        logs.push(`${monster.emoji} *${monster.name}* menyerang!`);
    }
    return { dmgToPlayer, logs, newMonsterMp, specialEffect };
}

function calcMonsterAttack(monster, player) {
    const atk = monster.derived.atk;
    const isCrit = rollCrit(monster.stats.luck);
    const isDodge = rollDodge(player.agility);

    if (isDodge) return -1;
    
    const raw = isCrit ? atk * 1.5 : atk;
    const def = monster.damageType === 'physical' ? player.defense : player.wisdom;
    const dmg = Math.max(1, Math.floor(raw * (100 / (100 + def))));
    return isCrit ? -dmg : dmg; // Dodge berhasil, tapi kalau crit tetap kena damage   
}

// Start Battle (.hunt)
async function startHunt(senderId, chat) {
    if (activeBattles[senderId]) {
        await chat.sendMessage('⚔️ Kamu masih dalam pertarungan!\nSelesaikan dulu dengan *.attack*, *.skill [nama]*, atau *.flee*')
        return;
    }
    
    const [rows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [senderId]);
    if (!rows.length) {
        await chat.sendMessage('❌ Kamu belum terdaftar. Ketik *.login* untuk memulai petualanganmu!');
        return;
    }
    
    const player = rows[0];
    if (player.hp <= 0) {
        await chat.sendMessage('💀 HP kamu 0! Gunakan *.heal* atau item untuk memulihkan HP sebelum berburu.');
        return;
    }

    const playerRank = getRank(player.level);
    const monster = getRandomMonsterByRank(playerRank);
    const monsterHp = monster.derived.maxHP;
    const monsterMp = monster.derived.maxMP;

    activeBattles[senderId] = {
        skillCooldowns: {}, // inisiasi cd skill kosong { skillKey: turnRemaining }
        monster,
        monsterHp,
        monsterMp,
        turn: 1,
        damageReduction: null, // untuk efek debuff defense
        dotEffect: null,
        stunned: false, // legacy, biarin aja biar gak break kode lain yang mungkin masih baca ini
        debuffs: [],
        playerCC: null,   // { type: 'stun' | 'freeze', turns: N }
        monsterCC: null,  // { type: 'stun' | 'freeze', turns: N }
    };

    await chat.sendMessage(
        `⚔️ *BATTLE START!* [Tier ${monster.tier}]\n\n` +
        `${formatMonsterStatus(monster, monsterHp)}\n\n` +
        `${formatMonsterSkill(monster)}` +
        `Kamu bertemu *${monster.name}* ${monster.emoji}!\n` +
        `Tipe: ${monster.type} | DMG: ${monster.damageType === 'physical' ? 'Fisik' : 'Sihir'}\n\n` +
        `${formatPlayerStatus(player)}\n\n` +
        `📋 *Aksi:*\n` +
        `*.attack* — Serang fisik\n` +
        `*.use [1/2/3]* — Gunakan skill\n` +
        `*.flee* — Kabur dari pertarungan`
    );
}

// Player action: attack
async function doAttack(senderId, chat) {
    const battle = activeBattles[senderId];
    if (!battle) {
        await chat.sendMessage('❌ Kamu tidak sedang dalam pertarungan. Ketik *.hunt* untuk mulai.');
        return;
    }

    const [rows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [senderId]);
    const player = rows[0];
    const {monster} = battle;
    const bonus = await getEquippedStatBonus(senderId, player);
    const effectivePlayer = applyEquippedBonus(applyDebuffs(player, battle), bonus);
    let logs = [];

    //Player turn
    let playerDmg = 0;
    if (battle.playerCC && battle.playerCC.turns > 0) {
        // ★ Player kena stun/freeze, gak bisa nyerang turn ini
        logs.push(`${ccLabel(battle.playerCC.type)}! Kamu tidak bisa bergerak turn ini.`);
        battle.playerCC = tickCC(battle.playerCC);
    } else {
        const isCrit = rollCrit(effectivePlayer.luck);
        const monsterDodge = rollDodge(monster.stats.agility);

        if (monsterDodge) {
            logs.push(`💨 *${monster.name}* menghindar! Seranganmu meleset.`)
        } else {
            const rawDmg = calcPlayerPhysDamage(effectivePlayer);
            const dmgAfterDef = applyDef(rawDmg, monster.stats.def);
            playerDmg = isCrit ? Math.floor(dmgAfterDef * 1.5) : dmgAfterDef;
            battle.monsterHp = Math.max(0, battle.monsterHp - playerDmg);
            logs.push(`⚔️ Kamu menyerang${isCrit ? ' — *CRITICAL!*' : ''}!\nDMG: *${playerDmg}* ke ${monster.emoji} ${monster.name}`);
        }
    }

    if (battle.monsterHp <= 0) {
        return await endBattle(senderId, chat, player, 'win', logs);
    }

    // Monster Turn
    logs.push('');
    const { dmgToPlayer, logs: mLogs, newMonsterMp, specialEffect } = monsterTurn(effectivePlayer, monster, battle.monsterMp, battle);
    battle.monsterMp = newMonsterMp;
    logs.push(...mLogs);

    let newPlayerHp = player.hp;
    let newPlayerMp = player.mp;

    if (dmgToPlayer === -1) {
        logs.push(`💨 Kamu menghindar dari serangan ${monster.emoji}!`);
    } else if (dmgToPlayer < 0) {
        const actualDmg = Math.abs(dmgToPlayer);
        newPlayerHp = Math.max(0, newPlayerHp - actualDmg);
        logs.push(`💥 *CRITICAL!* Kamu terkena *${actualDmg}* damage!`)
    } else {
        newPlayerHp = Math.max(0, newPlayerHp - dmgToPlayer);
        logs.push(`💔 Kamu terkena *${dmgToPlayer}* damage.`);
    }

    // handle spesial effect
    if (specialEffect) {
        if (specialEffect.type === 'stun' && Math.random() < (specialEffect.chance ?? 1)) {
            battle.playerCC = applyCC(battle.playerCC, 'stun', specialEffect.duration ?? 1);
            logs.push(`😵 Kamu terkena *stun*! Giliran berikutnya dilewati.`)
        } else if (specialEffect.type === 'freeze' && Math.random() < (specialEffect.chance ?? 1)) {
            battle.playerCC = applyCC(battle.playerCC, 'freeze', specialEffect.duration ?? 2);
            logs.push(`🥶 Kamu terkena *freeze*! ${specialEffect.duration ?? 2} giliran dilewati.`)
        } else if (specialEffect.type === 'dot' && Math.random() < (specialEffect.chance ?? 1)) {
            battle.dotEffect = { dmgPerTurn: specialEffect.dmgPerTurn, duration: specialEffect.duration, type: specialEffect.type };
            logs.push(`☠️ Kamu terkena *${specialEffect.type}*! -${specialEffect.dmgPerTurn} HP per turn selama ${specialEffect.duration} turn.`);
        } else if (specialEffect.type === 'debuff' && Math.random() < (specialEffect.chance ?? 1)) {
            const duration = Number.isFinite(Number(specialEffect.duration)) ? Number(specialEffect.duration) : 1;
            battle.debuffs.push({ stat: specialEffect.stat, amount: specialEffect.amount, duration });
            logs.push(`⚠️ Kamu terkena debuff *${specialEffect.stat.toUpperCase()}* ${specialEffect.amount > 0 ? '+' : ''}${specialEffect.amount} selama ${duration} turn.`);
        }
    }
    
    // Handle DOT effect
    if (battle.dotEffect && battle.dotEffect.duration > 0) {
        newPlayerHp = Math.max(0, newPlayerHp - battle.dotEffect.dmgPerTurn);
        logs.push(`🩸 *${battle.dotEffect.type}* effect: -${battle.dotEffect.dmgPerTurn} HP`);
        battle.dotEffect.duration--;
        if (battle.dotEffect.duration <= 0) battle.dotEffect = null;
    }

    // Update HP player di DB
    await db.query('UPDATE rpg_players SET hp = ?, mp = ? WHERE nomor = ?', [newPlayerHp, newPlayerMp, senderId]);

    // Cek player mati
    if (newPlayerHp <= 0) {
        return await endBattle(senderId, chat, { ...player, hp: 0 }, 'lose', logs);
    }

    if (battle.debuffs.length > 0) {
        battle.debuffs = battle.debuffs.filter(d => {
            if (d.duration === 'battle') return true;
            d.duration -= 1;
            return d.duration > 0;
        });
    }

    battle.turn++;
    decrementSkillCooldowns(battle); // Kurangi cooldown skill tiap turn
    const updatedPlayer = { ...player, hp: newPlayerHp, mp: newPlayerMp };

    await chat.sendMessage(
        logs.join('\n') + '\n\n' +
        `─────────────────\n` +
        `Turn *${battle.turn}*\n` +
        `${formatMonsterStatus(monster, battle.monsterHp)}\n` +
        `${formatPlayerStatus(updatedPlayer)}\n\n` +
        `${formatPlayerStatus(updatedPlayer)}${formatSkillCooldowns(battle)}\n\n` +
        `*.attack* | *.use [1/2/3]* | *.flee*`
    );
}

// =====================
// PLAYER SKILL
// =====================
async function doSkill(senderId, skillKey, chat) {
    const battle = activeBattles[senderId];
    if (!battle) {
        await chat.sendMessage('❌ Kamu tidak sedang dalam pertarungan. Ketik *.hunt* untuk mulai.');
        return;
    }

    // ★ Kalau player kena stun/freeze, gak bisa pakai skill — suruh .attack aja
    // buat lewatin giliran (biar CD skill & MP gak kebuang percuma)
    if (battle.playerCC && battle.playerCC.turns > 0) {
        await chat.sendMessage(`${ccLabel(battle.playerCC.type)}! Kamu tidak bisa pakai skill sekarang.\nKetik *.attack* untuk lewati giliran.`);
        return;
    }

    const [rows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [senderId]);
    const player = rows[0];
    const { monster } = battle;
    const bonus = await getEquippedStatBonus(senderId, player);
    const effectivePlayer = applyEquippedBonus(applyDebuffs(player, battle), bonus);
    let logs = [];

    // ★ Skill slot system — .use 1/2/3/4 sesuai slot aktif player
    const slotNum = parseInt(skillKey);
    if (isNaN(slotNum) || slotNum < 1 || slotNum > 4) {
        await chat.sendMessage('❌ Gunakan *.use [1-4]* sesuai slot skill aktifmu.\nKetik *.myskills* untuk lihat slot aktif.');
        return;
    }

    const skill = await findSkillBySlot(senderId, player.class, slotNum);
    if (!skill) {
        await chat.sendMessage(`❌ Slot *${slotNum}* kosong!\nEquip skill dulu dengan *.equipskill [nama skill]*\nKetik *.skillpool* untuk lihat skill yang tersedia.`);
        return;
    }

    if (player.mp < skill.mpCost) {
        await chat.sendMessage(`❌ MP tidak cukup! Butuh *${skill.mpCost} MP*, kamu punya *${player.mp} MP*.`);
        return;
    }

    // Cek skill cooldown (pakai slotNum sebagai key)
    const cdKey = String(slotNum);
    const cdRemaining = getSkillCooldown(battle, cdKey);
    if (cdRemaining > 0) {
        await chat.sendMessage(`⏳ *${skill.name}* (slot ${slotNum}) masih cooldown! Bisa dipakai lagi dalam *${cdRemaining} turn*.`);
        return;
    }

    // Set cooldown setelah dipakai
    setSkillCooldown(battle, skill, cdKey);

    // ── PLAYER SKILL TURN ──
    const result = skill.effect(effectivePlayer);
    let newPlayerHp = player.hp;
    let newPlayerMp = player.mp - skill.mpCost;

    logs.push(result.desc);

    // Terapkan damage ke monster
    if (result.damage) {
        const monsterDodge = rollDodge(monster.stats.agi);
        if (monsterDodge) {
            logs.push(`💨 *${monster.name}* menghindar dari skill!`);
        } else {
            const dmgAfterDef = applyDef(result.damage, monster.stats.def);
            battle.monsterHp = Math.max(0, battle.monsterHp - dmgAfterDef);
            logs.push(`💥 DMG ke monster: *${dmgAfterDef}*`);
        }
    }

    // ★ Terapkan CC (stun/freeze) ke monster kalau skill punya field `cc`
    // format skill: cc: { type: 'stun' | 'freeze', duration: N, chance: 0-1 }
    if (result.cc && Math.random() < (result.cc.chance ?? 1)) {
        const defaultTurns = result.cc.type === 'freeze' ? 2 : 1;
        battle.monsterCC = applyCC(battle.monsterCC, result.cc.type, result.cc.duration ?? defaultTurns);
        logs.push(`${ccLabel(result.cc.type)} berhasil dipasang ke *${monster.name}*!`);
    }

    // Terapkan heal
    if (result.heal) {
        newPlayerHp = Math.min(player.max_hp, newPlayerHp + result.heal);
    }

    // Terapkan hp cost (misal Berserk Mode)
    if (result.hpCost) {
        newPlayerHp = Math.max(1, newPlayerHp - result.hpCost);
    }

    // Terapkan MP regen
    if (result.mpRegen) {
        newPlayerMp = Math.min(player.max_mp, newPlayerMp + result.mpRegen);
    }

    // Lifesteal ke player
    if (result.lifesteal) {
        newPlayerHp = Math.min(player.max_hp, newPlayerHp + result.lifesteal);
    }

    // Damage Reduction buff/debuff
    if (result.damageReduction) {
        battle.damageReduction = {
            persent: result.damageReduction.persent,
            duration: result.damageReduction.duration,
        };
        logs.push(`🛡️ Damage Reduction: ${result.damageReduction.persent}% selama ${result.damageReduction.duration} turn.`);
    }

    // Cek monster mati
    if (battle.monsterHp <= 0) {
        await db.query('UPDATE rpg_players SET hp = ?, mp = ? WHERE nomor = ?', [newPlayerHp, newPlayerMp, senderId]);
        return await endBattle(senderId, chat, { ...player, hp: newPlayerHp, mp: newPlayerMp }, 'win', logs);
    }

    // ── MONSTER TURN ──
    logs.push('');
    const { dmgToPlayer, logs: mLogs, newMonsterMp, specialEffect } = monsterTurn(effectivePlayer, monster, battle.monsterMp, battle);
    battle.monsterMp = newMonsterMp;
    logs.push(...mLogs);

    const reducePercent2 = battle.damageReduction?.duration > 0 ? battle.damageReduction.persent : 0;

    if (dmgToPlayer === -1) {
        logs.push(`💨 Kamu menghindar dari serangan ${monster.emoji}!`);
    } else if (dmgToPlayer < 0) {
        let actualDmg = Math.abs(dmgToPlayer);
        if (reducePercent2 > 0) actualDmg = Math.floor(actualDmg * (1 - reducePercent2));
        newPlayerHp = Math.max(0, newPlayerHp - actualDmg);
        logs.push(`💥 *CRITICAL!* Kamu terkena *${actualDmg}* damage!`);
    } else if (dmgToPlayer > 0) {
        let finalDmg = dmgToPlayer;
        if (reducePercent2 > 0) finalDmg = Math.floor(finalDmg * (1 - reducePercent2));
        newPlayerHp = Math.max(0, newPlayerHp - finalDmg);
        logs.push(`💔 Kamu terkena *${finalDmg}* damage.`);
    }

    if (specialEffect?.type === 'stun' && Math.random() < (specialEffect.chance ?? 1)) {
        battle.playerCC = applyCC(battle.playerCC, 'stun', specialEffect.duration ?? 1);
        logs.push(`😵 Kamu terkena *stun*!`);
    } else if (specialEffect?.type === 'freeze' && Math.random() < (specialEffect.chance ?? 1)) {
        battle.playerCC = applyCC(battle.playerCC, 'freeze', specialEffect.duration ?? 2);
        logs.push(`🥶 Kamu terkena *freeze*! ${specialEffect.duration ?? 2} giliran dilewati.`);
    } else if (specialEffect?.type === 'dot' && Math.random() < (specialEffect.chance ?? 1)) {
        battle.dotEffect = { dmgPerTurn: specialEffect.dmgPerTurn, duration: specialEffect.duration, type: specialEffect.type };
        logs.push(`☠️ Kamu terkena *${specialEffect.type}*! -${specialEffect.dmgPerTurn} HP/turn`);
    } else if (specialEffect?.type === 'debuff' && Math.random() < (specialEffect.chance ?? 1)) {
        const duration = Number.isFinite(Number(specialEffect.duration)) ? Number(specialEffect.duration) : 1;
        battle.debuffs.push({ stat: specialEffect.stat, amount: specialEffect.amount, duration });
        logs.push(`⚠️ Kamu terkena debuff *${specialEffect.stat.toUpperCase()}* ${specialEffect.amount > 0 ? '+' : ''}${specialEffect.amount} selama ${duration} turn.`);
    }

    if (battle.dotEffect?.duration > 0) {
        newPlayerHp = Math.max(0, newPlayerHp - battle.dotEffect.dmgPerTurn);
        logs.push(`🩸 *${battle.dotEffect.type}*: -${battle.dotEffect.dmgPerTurn} HP`);
        battle.dotEffect.duration--;
        if (battle.dotEffect.duration <= 0) battle.dotEffect = null;
    }

    // Decrement damage reduction duration
    if (battle.damageReduction && battle.damageReduction.duration > 0) {
        battle.damageReduction.duration--;
        if (battle.damageReduction.duration <= 0) battle.damageReduction = null;
    }

    await db.query('UPDATE rpg_players SET hp = ?, mp = ? WHERE nomor = ?', [newPlayerHp, newPlayerMp, senderId]);

    if (newPlayerHp <= 0) {
        return await endBattle(senderId, chat, { ...player, hp: 0, mp: newPlayerMp }, 'lose', logs);
    }

    if (battle.debuffs.length > 0) {
        battle.debuffs = battle.debuffs.filter(d => {
            if (d.duration === 'battle') return true;
            d.duration -= 1;
            return d.duration > 0;
        });
    }

    battle.turn++;
    decrementSkillCooldowns(battle);
    const updatedPlayer = { ...player, hp: newPlayerHp, mp: newPlayerMp };

    await chat.sendMessage(
        logs.join('\n') + '\n\n' +
        `─────────────────\n` +
        `Turn *${battle.turn}*\n` +
        `${formatMonsterStatus(monster, battle.monsterHp)}\n` +
        `${formatPlayerStatus(updatedPlayer)}\n\n` +
        `${formatPlayerStatus(updatedPlayer)}${formatSkillCooldowns(battle)}\n\n` +
        `*.attack* | *.use [1/2/3]* | *.flee*`
    );
}

// =====================
// FLEE
// =====================
async function doFlee(senderId, chat) {
    const battle = activeBattles[senderId];
    if (!battle) {
        await chat.sendMessage('❌ Kamu tidak sedang dalam pertarungan.');
        return;
    }

    // 60% chance berhasil kabur
    const success = Math.random() < 0.60;
    delete activeBattles[senderId];

    if (success) {
        await chat.sendMessage(
            `🏃 Kamu berhasil kabur dari *${battle.monster.name}*!\n\n` +
            `⚠️ HP tidak dipulihkan. Gunakan item atau istirahat untuk recover.`
        );
    } else {
        // Kena damage saat kabur
        const [rows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [senderId]);
        const player = rows[0];
        const penalty = Math.floor(battle.monster.derived.atk * 0.8);
        const newHp = Math.max(1, player.hp - penalty);
        await db.query('UPDATE rpg_players SET hp = ? WHERE nomor = ?', [newHp, senderId]);
        await chat.sendMessage(
            `😰 Gagal kabur! *${battle.monster.name}* menghantammu!\n` +
            `💔 Damage: *${penalty}*\n\n` +
            `❤️ HP tersisa: *${newHp}/${player.max_hp}*\n\n` +
            `*.attack* | *.use [1/2/3]* | *.flee*`
        );
        // Kembalikan battle session karena gagal flee
        activeBattles[senderId] = battle;
    }
}

// =====================
// END BATTLE
// =====================
async function endBattle(senderId, chat, player, result, logs) {
    const battle = activeBattles[senderId];
    delete activeBattles[senderId];

    if (result === 'win') {
        const monster = battle.monster;
        const expGain = monster.reward.xp;
        const goldGain = rollGold(monster.reward.gold);
        const drops = rollDrops(monster.reward.drops);
        const { addItemToInventory } = require('../dbitem');
        require('./QuestSystem').trackProgress(senderId, 'hunt', 1).catch(() => {}); // ★ hook quest, non-blocking

        // Hitung level up
        const newExp = player.exp + expGain;
        const expNeeded = player.level * 100;
        let newLevel = player.level;
        let levelUpMsg = '';

        if (newExp >= expNeeded) {
            newLevel++;
            const statPointGain = 5;
            await db.query(
                'UPDATE rpg_players SET level = ?, exp = ?, gold = gold + ?, stat_point = stat_point + ? WHERE nomor = ?',
                [newLevel, newExp - expNeeded, goldGain, statPointGain, senderId]
            );

            const { getSkillPool } = require('../skill_system/SkillPool');
            const pool = getSkillPool(player.class);
            const newSkills = pool.filter(s => s.unlockLevel === newLevel);
            const newSkillMsg = newSkills.length
                ? `\n🔓 Skill baru terbuka: ${newSkills.map(s => `${s.emoji} *${s.name}*`).join(', ')}!\nKetik *.skillpool* untuk equip.`
                : '';

            levelUpMsg = `\n\n🎉 *LEVEL UP!* ${player.level} → *${newLevel}*\n+${statPointGain} Stat Point!` + newSkillMsg;
        } else {
            await db.query(
                'UPDATE rpg_players SET exp = ?, gold = gold + ? WHERE nomor = ?',
                [newExp, goldGain, senderId]
            );
        }

        if (drops.length > 0) {
            for (const itemName of drops) {
                await addItemToInventory(senderId, itemName, 1);
            }
        }

        const dropMsg = drops.length ? `\n🎁 Drop: ${drops.join(', ')}` : '\n🎁 Tidak ada drop.';

        await chat.sendMessage(
            logs.join('\n') + '\n\n' +
            `─────────────────\n` +
            `🏆 *MENANG!* ${monster.emoji} ${monster.name} dikalahkan!\n\n` +
            `✨ EXP: +*${expGain}* (${newExp}/${newLevel * 100})\n` +
            `💰 Gold: +*${goldGain}*` +
            dropMsg +
            levelUpMsg + '\n\n' +
            `❤️ HP tersisa: *${player.hp}/${player.max_hp}*`
        );
    } else {
        await chat.sendMessage(
            logs.join('\n') + '\n\n' +
            `─────────────────\n` +
            `💀 *KALAH!* Kamu dikalahkan oleh *${battle.monster.name}*!\n\n` +
            `HP akan dipulihkan secara otomatis.\n` +
            `Gunakan item heal atau minta bantuan untuk recover.`
        );
    }
}

module.exports = {
    startHunt, doAttack, doSkill, doFlee, activeBattles,
    // ★ di-export biar bisa dipakai ulang sama partyBattle.js
    rollCrit, rollDodge, calcPlayerPhysDamage, applyDef,
    applyEquippedBonus, applyDebuffs, applyCC, tickCC, ccLabel,
    calcMonsterAttack, formatPlayerStatus, formatMonsterStatus, formatMonsterSkill,
};