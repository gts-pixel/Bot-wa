const db = require('./db').promise();
const { TIER_F_MONSTERS, calcMonsterDerived, rollGold, rollDrops } = require('./Mons');
const { findSkill } = require('./RpgClassSkill');
const Rpgformula = require('./Rpgformula');

const activeBattles = {};

function getRandomMonsterTierF() {
    const keys = Object.keys(TIER_F_MONSTERS);
    if (keys.length === 0) throw new Error('TIER_F_MONSTERS kosong atau tidak terdefinisi');
    const key = keys[Math.floor(Math.random() * keys.length)];
    const m = TIER_F_MONSTERS[key];
    return { id: key, ...m, derived: calcMonsterDerived(m.stats, m.damageType)};
}

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
function monsterTurn(player, monster, monsterMp) {
    const logs = [];
    const skill = monster.skill;
    let newMonsterMp = monsterMp;
    let dmgToPlayer = 0;
    let specialEffect = null;

    const useskillChance = skill?.type === 'active' && Math.random() < 0.30;

    if (useskillChance && monsterMp >= (skill.mpCost || 0)) {
        newMonsterMp -= skill.mpCost || 0;
        const eff = skill.effect;

        if (eff.debuff) {
            specialEffect = {type: 'debuff', ...eff};
            logs.push(`⚠️ *${monster.name}* menggunakan skill *${skill.name}* \n*${eff.debuff}* selama ${eff.duration} turn!`);
            dmgToPlayer = 0;
        } else if (eff.stun) {
            specialEffect = {type: 'stun', chance: eff.chance};
            logs.push(`⚠️ *${monster.name}* menggunakan *${skill.name}*!\n   ${skill.desc}`);
            dmgToPlayer = 0;
        } else if (eff.dot) {
            specialEffect = {type: 'dot', ...eff.dot, chance: eff.chance};
            logs.push(`⚠️ *${monster.name}* menggunakan *${skill.name}*!\n   ${skill.desc}`);
            dmgToPlayer = 0;
        } else {
            dmgToPlayer = calcMonsterAttack(monster, player);
            logs.push(`${monster.emoji} *${monster.name}* menyerang!`);
        }
    } else {
        dmgToPlayer = calcMonsterAttack(monster, player);
        logs.push(`${monster.emoji} *${monster.name}* menyerang!`);
    }
    return {dmgToPlayer, logs, newMonsterMp, specialEffect};
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

    const monster = getRandomMonsterTierF();
    const monsterHp = monster.derived.maxHP;
    const monsterMp = monster.derived.maxMP;

    activeBattles[senderId] = {
        monster,
        monsterHp,
        monsterMp,
        turn: 1,
        dotEffect: null,
        stunned: false,
    };

    await chat.sendMessage(
        `⚔️ *BATTLE START!* [Tier F]\n\n` +
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
    let logs = [];

    //Player turn
    const isCrit = rollCrit(player.luck);
    const monsterDodge = rollDodge(monster.stats.agility);
    
    let playerDmg = 0;
    if (monsterDodge) {
        logs.push(`💨 *${monster.name}* menghindar! Seranganmu meleset.`)
    } else {
        const rawDmg = calcPlayerPhysDamage(player);
        const dmgAfterDef = applyDef(rawDmg, monster.stats.def);
        playerDmg = isCrit ? Math.floor(dmgAfterDef * 1.5) : dmgAfterDef;
        battle.monsterHp = Math.max(0, battle.monsterHp - playerDmg);
        logs.push(`⚔️ Kamu menyerang${isCrit ? ' — *CRITICAL!*' : ''}!\nDMG: *${playerDmg}* ke ${monster.emoji} ${monster.name}`);
    }

    if (battle.monsterHp <= 0) {
        return await endBattle(senderId, chat, player, 'win', logs);
    }

    // Monster Turn
    logs.push('');
    const { dmgToPlayer, logs: mLogs, newMonsterMp, specialEffect } = monsterTurn(player, monster, battle.monsterMp);
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
        if (specialEffect.type === 'stun' && Math.random() < specialEffect.chance) {
            logs.push(`😵 Kamu terkena *stun*! Giliran berikutnya dilewati.`)
            battle.stunned = true;
        } else if (specialEffect.type === 'dot' && Math.random() < specialEffect.chance) {
            battle.dotEffect = { dmgPerTurn: specialEffect.dmgPerTurn, duration: specialEffect.duration, type: specialEffect.type };
            logs.push(`☠️ Kamu terkena *${specialEffect.type}*! -${specialEffect.dmgPerTurn} HP per turn selama ${specialEffect.duration} turn.`);
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

    battle.turn++;
    const updatedPlayer = { ...player, hp: newPlayerHp, mp: newPlayerMp };

    await chat.sendMessage(
        logs.join('\n') + '\n\n' +
        `─────────────────\n` +
        `Turn *${battle.turn}*\n` +
        `${formatMonsterStatus(monster, battle.monsterHp)}\n` +
        `${formatPlayerStatus(updatedPlayer)}\n\n` +
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

    const [rows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [senderId]);
    const player = rows[0];
    const { monster } = battle;
    let logs = [];

    const skill = findSkill(player.class, skillKey);
    if (!skill) {
        await chat.sendMessage(`❌ Skill *${skillKey}* tidak ditemukan.\nKetik *.skill* untuk lihat skill kamu.`);
        return;
    }

    if (player.mp < skill.mpCost) {
        await chat.sendMessage(`❌ MP tidak cukup! Butuh *${skill.mpCost} MP*, kamu punya *${player.mp} MP*.`);
        return;
    }

    // ── PLAYER SKILL TURN ──
    const result = skill.effect(player);
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

    // Cek monster mati
    if (battle.monsterHp <= 0) {
        await db.query('UPDATE rpg_players SET hp = ?, mp = ? WHERE nomor = ?', [newPlayerHp, newPlayerMp, senderId]);
        return await endBattle(senderId, chat, { ...player, hp: newPlayerHp, mp: newPlayerMp }, 'win', logs);
    }

    // ── MONSTER TURN ──
    logs.push('');
    const { dmgToPlayer, logs: mLogs, newMonsterMp, specialEffect } = monsterTurn(player, monster, battle.monsterMp);
    battle.monsterMp = newMonsterMp;
    logs.push(...mLogs);

    if (dmgToPlayer === -1) {
        logs.push(`💨 Kamu menghindar dari serangan ${monster.emoji}!`);
    } else if (dmgToPlayer < 0) {
        const actualDmg = Math.abs(dmgToPlayer);
        newPlayerHp = Math.max(0, newPlayerHp - actualDmg);
        logs.push(`💥 *CRITICAL!* Kamu terkena *${actualDmg}* damage!`);
    } else if (dmgToPlayer > 0) {
        newPlayerHp = Math.max(0, newPlayerHp - dmgToPlayer);
        logs.push(`💔 Kamu terkena *${dmgToPlayer}* damage.`);
    }

    if (specialEffect?.type === 'stun' && Math.random() < specialEffect.chance) {
        logs.push(`😵 Kamu terkena *stun*!`);
        battle.stunned = true;
    } else if (specialEffect?.type === 'dot' && Math.random() < specialEffect.chance) {
        battle.dotEffect = { dmgPerTurn: specialEffect.dmgPerTurn, duration: specialEffect.duration, type: specialEffect.type };
        logs.push(`☠️ Kamu terkena *${specialEffect.type}*! -${specialEffect.dmgPerTurn} HP/turn`);
    }

    if (battle.dotEffect?.duration > 0) {
        newPlayerHp = Math.max(0, newPlayerHp - battle.dotEffect.dmgPerTurn);
        logs.push(`🩸 *${battle.dotEffect.type}*: -${battle.dotEffect.dmgPerTurn} HP`);
        battle.dotEffect.duration--;
        if (battle.dotEffect.duration <= 0) battle.dotEffect = null;
    }

    await db.query('UPDATE rpg_players SET hp = ?, mp = ? WHERE nomor = ?', [newPlayerHp, newPlayerMp, senderId]);

    if (newPlayerHp <= 0) {
        return await endBattle(senderId, chat, { ...player, hp: 0, mp: newPlayerMp }, 'lose', logs);
    }

    battle.turn++;
    const updatedPlayer = { ...player, hp: newPlayerHp, mp: newPlayerMp };

    await chat.sendMessage(
        logs.join('\n') + '\n\n' +
        `─────────────────\n` +
        `Turn *${battle.turn}*\n` +
        `${formatMonsterStatus(monster, battle.monsterHp)}\n` +
        `${formatPlayerStatus(updatedPlayer)}\n\n` +
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
        const { addItemToInventory } = require('./dbitem');

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
            levelUpMsg = `\n\n🎉 *LEVEL UP!* ${player.level} → *${newLevel}*\n+${statPointGain} Stat Point!`;
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

module.exports = { startHunt, doAttack, doSkill, doFlee, activeBattles };