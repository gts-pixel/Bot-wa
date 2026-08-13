const db = require('../db').promise();
const { getRandomMonsterByRank, rollGold, rollDrops } = require('../monster_system/Mons');
const { getRank } = require('./RankSystem');
const { findSkillBySlot } = require('../skill_system/SkillSlot');
const { getSkillCooldown, setSkillCooldown, decrementSkillCooldowns, formatSkillCooldowns } = require('../skill_system/CDSkill');
const { getEquippedStatBonus, addItemToInventory } = require('../dbitem');
const { getSkillPool } = require('../skill_system/SkillPool');
const {
    rollCrit, rollDodge, calcPlayerPhysDamage, applyDef,
    applyEquippedBonus, applyDebuffs, applyCC, tickCC, ccLabel,
    calcMonsterAttack, formatPlayerStatus, formatMonsterStatus, formatMonsterSkill,
    activeBattles: soloActiveBattles,
} = require('./battle');
const { getParty, displayNumber, getDisplayName } = require('./PartySystem');

// Skala monster berdasarkan jumlah member: 2 org=1.5x, 4 org=2.5x, 6 org=3.5x, dst
function sizeMultiplier(memberCount) {
    return 1 + 0.5 * (memberCount - 1);
}

function scaledMonster(baseMonster, memberCount) {
    const mult = sizeMultiplier(memberCount);
    const monster = JSON.parse(JSON.stringify(baseMonster)); // deep clone, jangan sentuh template asli
    monster.derived.maxHP = Math.floor(monster.derived.maxHP * mult);
    monster.derived.atk = Math.floor(monster.derived.atk * mult);
    monster.reward = {
        ...monster.reward,
        xp: Math.floor(monster.reward.xp * mult),
        gold: monster.reward.gold, // rollGold nanti dipanggil per member, biar variatif
    };
    return monster;
}

function aliveMembers(battle) {
    return battle.turnOrder.filter(id => battle.memberState[id].hp > 0);
}

// nama di-cache di battle.memberNames pas .phunt mulai, biar gak query DB tiap turn
function nameOf(battle, id) {
    return battle.memberNames?.[id] || displayNumber(id);
}

function buildQueue(battle) {
    battle.queue = battle.turnOrder.filter(id => battle.memberState[id].hp > 0);
    battle.queueIndex = 0;
}

function currentActor(battle) {
    if (!battle.queue || battle.queueIndex >= battle.queue.length) return null;
    return battle.queue[battle.queueIndex];
}

function formatPartyStatus(battle) {
    return battle.turnOrder.map(id => {
        const st = battle.memberState[id];
        if (st.hp <= 0) return `💀 ${nameOf(battle, id)} — KO`;
        const cc = st.playerCC ? ` [${ccLabel(st.playerCC.type)}]` : '';
        return `${id === currentActor(battle) ? '➡️' : '•'} ${nameOf(battle, id)}: ❤️${st.hp}/${st.maxHp} 💙${st.mp}/${st.maxMp}${cc}`;
    }).join('\n');
}

// =====================
// START PARTY HUNT
// =====================
async function startPartyHunt(senderId, chat) {
    const party = getParty(senderId);
    if (!party) {
        await chat.sendMessage('❌ Kamu belum punya party. Ketik *.createparty* dulu.');
        return;
    }
    if (party.leader !== senderId) {
        await chat.sendMessage('❌ Cuma leader yang bisa mulai party hunt (*.phunt*).');
        return;
    }
    if (party.battle) {
        await chat.sendMessage('⚔️ Party udah dalam battle!');
        return;
    }
    if (party.members.length < 2) {
        await chat.sendMessage('❌ Minimal 2 member buat mulai party hunt. Undang teman dulu dengan *.invite*.');
        return;
    }

    // Pastikan gak ada member yang lagi solo hunt bareng
    for (const id of party.members) {
        if (soloActiveBattles[id]) {
            await chat.sendMessage(`❌ *${displayNumber(id)}* masih dalam solo battle. Selesaikan dulu (*.attack*/*.flee*) sebelum party hunt.`);
            return;
        }
    }

    const playerRows = {};
    let totalLevel = 0;
    for (const id of party.members) {
        const [rows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [id]);
        if (!rows.length) {
            await chat.sendMessage(`❌ *${displayNumber(id)}* belum terdaftar. Party hunt dibatalkan.`);
            return;
        }
        if (rows[0].hp <= 0) {
            await chat.sendMessage(`❌ *${rows[0].nama}* HP-nya 0. Suruh dia heal dulu sebelum party hunt.`);
            return;
        }
        playerRows[id] = rows[0];
        totalLevel += rows[0].level;
    }

    const memberNames = {};
    for (const id of party.members) {
        memberNames[id] = playerRows[id].nama || displayNumber(id);
    }

    const avgLevel = Math.round(totalLevel / party.members.length);
    const rank = getRank(avgLevel);
    const baseMonster = getRandomMonsterByRank(rank);
    const monster = scaledMonster(baseMonster, party.members.length);

    const memberState = {};
    for (const id of party.members) {
        const p = playerRows[id];
        memberState[id] = {
            hp: p.hp, maxHp: p.max_hp,
            mp: p.mp, maxMp: p.max_mp,
            class: p.class,
            playerCC: null,
            debuffs: [],
            dotEffect: null,
            damageReduction: null,
            skillCooldowns: {},
        };
    }

    party.battle = {
        monster,
        monsterHp: monster.derived.maxHP,
        monsterMp: monster.derived.maxMP,
        monsterCC: null,
        turnOrder: [...party.members], // urutan giliran tetap, member mati cuma di-skip
        memberState,
        memberNames, // cache nama player, dipake formatPartyStatus & log battle
        round: 1,
    };
    buildQueue(party.battle);

    await chat.sendMessage(
        `⚔️ *PARTY BATTLE START!* [Tier ${monster.tier}] (${party.members.length} member, x${sizeMultiplier(party.members.length)} scaling)\n\n` +
        `${formatMonsterStatus(monster, party.battle.monsterHp)}\n\n` +
        `${formatMonsterSkill(monster)}` +
        `👥 *Party:*\n${formatPartyStatus(party.battle)}\n\n` +
        `Giliran sekarang: *${currentActor(party.battle)}*\n\n` +
        `📋 *.pattack* | *.puse [1-4]* | *.pflee*`
    );
}

async function requireYourTurn(senderId, party, chat) {
    if (!party || !party.battle) {
        await chat.sendMessage('❌ Party kamu gak lagi battle. Ketik *.phunt* dulu (leader aja yang bisa mulai).');
        return false;
    }
    const actor = currentActor(party.battle);
    if (actor !== senderId) {
        await chat.sendMessage(`⏳ Belum giliranmu! Sekarang giliran *${actor}*.`);
        return false;
    }
    return true;
}

// setelah actor menyelesaikan aksi: majuin queue, kalau abis satu ronde -> monster turn
async function afterMemberAction(party, chat) {
    const battle = party.battle;
    battle.queueIndex++;

    if (battle.queueIndex >= battle.queue.length) {
        // satu ronde kelar, monster gerak
        await runMonsterTurn(party, chat);
        if (!party.battle) return; // battle udah kelar (menang/kalah) di dalem runMonsterTurn

        battle.round++;
        buildQueue(battle);

        if (battle.queue.length === 0) {
            // seluruh party KO
            return await endPartyBattle(party, chat, 'lose');
        }
    }

    await syncMemberHpMp(party);

    const nextActor = currentActor(battle);
    if (nextActor) {
        await chat.sendMessage(
            `─────────────────\n` +
            `Ronde *${battle.round}*\n` +
            `${formatMonsterStatus(battle.monster, battle.monsterHp)}\n\n` +
            `👥 *Party:*\n${formatPartyStatus(battle)}\n\n` +
            `Giliran sekarang: *${nextActor}*\n` +
            `📋 *.pattack* | *.puse [1-4]* | *.pflee*`
        );
    }
}

async function runMonsterTurn(party, chat) {
    const battle = party.battle;
    const alive = aliveMembers(battle);
    if (alive.length === 0) return;

    const logs = ['', '🔻 *Giliran monster:*'];

    if (battle.monsterCC && battle.monsterCC.turns > 0) {
        logs.push(`${ccLabel(battle.monsterCC.type)}! *${battle.monster.name}* tidak bisa bergerak.`);
        battle.monsterCC = tickCC(battle.monsterCC);
        await chat.sendMessage(logs.join('\n'));
        return;
    }

    // target random dari member yang masih hidup
    const targetId = alive[Math.floor(Math.random() * alive.length)];
    const targetState = battle.memberState[targetId];
    const targetName = nameOf(battle, targetId);
    const monster = battle.monster;

    const skill = monster.skill;
    const useSkill = skill?.type === 'active' && Math.random() < 0.30 && battle.monsterMp >= (skill.mpCost || 0);

    let dmgToTarget = 0;
    let specialEffect = null;

    if (useSkill) {
        battle.monsterMp -= skill.mpCost || 0;
        const eff = skill.effect;
        if (eff.debuff) {
            specialEffect = { type: 'debuff', chance: eff.chance ?? 1, ...eff };
        } else if (eff.freeze) {
            specialEffect = { type: 'freeze', chance: eff.chance ?? 1, duration: eff.duration ?? 2 };
        } else if (eff.stun) {
            specialEffect = { type: 'stun', chance: eff.chance ?? 1, duration: eff.duration ?? 1 };
        } else if (eff.dot) {
            specialEffect = { type: 'dot', ...eff.dot, chance: eff.chance ?? 1 };
        }
        logs.push(`⚠️ *${monster.name}* menggunakan *${skill.name}* ke *${targetName}*!\n   ${skill.desc}`);
    } else {
        dmgToTarget = calcMonsterAttack(monster, targetState);
        logs.push(`${monster.emoji} *${monster.name}* menyerang *${targetName}*!`);
    }

    const reducePercent = targetState.damageReduction?.duration > 0 ? targetState.damageReduction.persent : 0;

    if (dmgToTarget === -1) {
        logs.push(`💨 *${targetName}* menghindar dari serangan!`);
    } else if (dmgToTarget < 0) {
        let actualDmg = Math.abs(dmgToTarget);
        if (reducePercent > 0) actualDmg = Math.floor(actualDmg * (1 - reducePercent));
        targetState.hp = Math.max(0, targetState.hp - actualDmg);
        logs.push(`💥 *CRITICAL!* *${targetName}* terkena *${actualDmg}* damage!`);
    } else if (dmgToTarget > 0) {
        let finalDmg = dmgToTarget;
        if (reducePercent > 0) finalDmg = Math.floor(finalDmg * (1 - reducePercent));
        targetState.hp = Math.max(0, targetState.hp - finalDmg);
        logs.push(`💔 *${targetName}* terkena *${finalDmg}* damage.`);
    }

    if (specialEffect) {
        if (specialEffect.type === 'stun' && Math.random() < (specialEffect.chance ?? 1)) {
            targetState.playerCC = applyCC(targetState.playerCC, 'stun', specialEffect.duration ?? 1);
            logs.push(`😵 *${targetName}* terkena *stun*!`);
        } else if (specialEffect.type === 'freeze' && Math.random() < (specialEffect.chance ?? 1)) {
            targetState.playerCC = applyCC(targetState.playerCC, 'freeze', specialEffect.duration ?? 2);
            logs.push(`🥶 *${targetName}* terkena *freeze* (${specialEffect.duration ?? 2} giliran)!`);
        } else if (specialEffect.type === 'dot' && Math.random() < (specialEffect.chance ?? 1)) {
            targetState.dotEffect = { dmgPerTurn: specialEffect.dmgPerTurn, duration: specialEffect.duration, type: specialEffect.type };
            logs.push(`☠️ *${targetName}* terkena *${specialEffect.type}*!`);
        } else if (specialEffect.type === 'debuff' && Math.random() < (specialEffect.chance ?? 1)) {
            const duration = Number.isFinite(Number(specialEffect.duration)) ? Number(specialEffect.duration) : 1;
            targetState.debuffs.push({ stat: specialEffect.stat, amount: specialEffect.amount, duration });
            logs.push(`⚠️ *${targetName}* kena debuff *${specialEffect.stat.toUpperCase()}* ${specialEffect.amount > 0 ? '+' : ''}${specialEffect.amount} (${duration} turn).`);
        }
    }

    if (targetState.hp <= 0) {
        logs.push(`💀 *${targetName}* tumbang!`);
    }

    await chat.sendMessage(logs.join('\n'));

    // cek TPK (total party kill)
    if (aliveMembers(battle).length === 0) {
        await syncMemberHpMp(party);
        await endPartyBattle(party, chat, 'lose');
    }
}

async function syncMemberHpMp(party) {
    if (!party.battle) return;
    for (const id of party.battle.turnOrder) {
        const st = party.battle.memberState[id];
        await db.query('UPDATE rpg_players SET hp = ?, mp = ? WHERE nomor = ?', [st.hp, st.mp, id]);
    }
}

// =====================
// PARTY ATTACK
// =====================
async function doPartyAttack(senderId, chat) {
    const party = getParty(senderId);
    if (!(await requireYourTurn(senderId, party, chat))) return;

    const battle = party.battle;
    const monster = battle.monster;
    const st = battle.memberState[senderId];

    const [rows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [senderId]);
    const player = { ...rows[0], hp: st.hp, mp: st.mp };
    const bonus = await getEquippedStatBonus(senderId, player);
    const effectivePlayer = applyEquippedBonus(applyDebuffs(player, { debuffs: st.debuffs }), bonus);

    const logs = [];

    if (st.playerCC && st.playerCC.turns > 0) {
        logs.push(`${ccLabel(st.playerCC.type)}! *${nameOf(battle, senderId)}* tidak bisa bergerak turn ini.`);
        st.playerCC = tickCC(st.playerCC);
    } else {
        const isCrit = rollCrit(effectivePlayer.luck);
        const monsterDodge = rollDodge(monster.stats.agility);

        if (monsterDodge) {
            logs.push(`💨 *${monster.name}* menghindar dari serangan *${nameOf(battle, senderId)}*!`);
        } else {
            const rawDmg = calcPlayerPhysDamage(effectivePlayer);
            const dmgAfterDef = applyDef(rawDmg, monster.stats.def);
            const dmg = isCrit ? Math.floor(dmgAfterDef * 1.5) : dmgAfterDef;
            battle.monsterHp = Math.max(0, battle.monsterHp - dmg);
            logs.push(`⚔️ *${nameOf(battle, senderId)}* menyerang${isCrit ? ' — *CRITICAL!*' : ''}!\nDMG: *${dmg}* ke ${monster.emoji} ${monster.name}`);
        }
    }

    tickMemberEffects(battle, st, logs, senderId);

    await chat.sendMessage(logs.join('\n'));

    if (battle.monsterHp <= 0) {
        return await endPartyBattle(party, chat, 'win');
    }

    await afterMemberAction(party, chat);
}

// =====================
// PARTY SKILL
// =====================
async function doPartySkill(senderId, skillKey, chat) {
    const party = getParty(senderId);
    if (!(await requireYourTurn(senderId, party, chat))) return;

    const battle = party.battle;
    const st = battle.memberState[senderId];

    if (st.playerCC && st.playerCC.turns > 0) {
        await chat.sendMessage(`${ccLabel(st.playerCC.type)}! Kamu tidak bisa pakai skill sekarang.\nKetik *.pattack* untuk lewati giliran.`);
        return;
    }

    const slotNum = parseInt(skillKey);
    if (isNaN(slotNum) || slotNum < 1 || slotNum > 4) {
        await chat.sendMessage('❌ Gunakan *.puse [1-4]* sesuai slot skill aktifmu.');
        return;
    }

    const skill = await findSkillBySlot(senderId, st.class, slotNum);
    if (!skill) {
        await chat.sendMessage(`❌ Slot *${slotNum}* kosong! Equip dulu dengan *.equipskill*.`);
        return;
    }
    if (st.mp < skill.mpCost) {
        await chat.sendMessage(`❌ MP tidak cukup! Butuh *${skill.mpCost}*, kamu punya *${st.mp}*.`);
        return;
    }

    const cdKey = String(slotNum);
    const cdRemaining = getSkillCooldown(st, cdKey);
    if (cdRemaining > 0) {
        await chat.sendMessage(`⏳ *${skill.name}* (slot ${slotNum}) masih cooldown *${cdRemaining} turn*.`);
        return;
    }
    setSkillCooldown(st, skill, cdKey);

    const [rows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [senderId]);
    const player = { ...rows[0], hp: st.hp, mp: st.mp };
    const bonus = await getEquippedStatBonus(senderId, player);
    const effectivePlayer = applyEquippedBonus(applyDebuffs(player, { debuffs: st.debuffs }), bonus);

    const result = skill.effect(effectivePlayer);
    const monster = battle.monster;
    const logs = [`*${nameOf(battle, senderId)}*: ${result.desc}`];

    st.mp -= skill.mpCost;

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

    if (result.cc && Math.random() < (result.cc.chance ?? 1)) {
        const defaultTurns = result.cc.type === 'freeze' ? 2 : 1;
        battle.monsterCC = applyCC(battle.monsterCC, result.cc.type, result.cc.duration ?? defaultTurns);
        logs.push(`${ccLabel(result.cc.type)} berhasil dipasang ke *${monster.name}*!`);
    }
    if (result.heal) st.hp = Math.min(st.maxHp, st.hp + result.heal);
    if (result.hpCost) st.hp = Math.max(1, st.hp - result.hpCost);
    if (result.mpRegen) st.mp = Math.min(st.maxMp, st.mp + result.mpRegen);
    if (result.lifesteal) st.hp = Math.min(st.maxHp, st.hp + result.lifesteal);
    if (result.damageReduction) {
        st.damageReduction = { persent: result.damageReduction.persent, duration: result.damageReduction.duration };
        logs.push(`🛡️ Damage Reduction: ${result.damageReduction.persent}% (${result.damageReduction.duration} turn).`);
    }

    tickMemberEffects(battle, st, logs, senderId, /* skipCC */ true);
    decrementSkillCooldowns(st);

    await chat.sendMessage(logs.join('\n'));

    if (battle.monsterHp <= 0) {
        return await endPartyBattle(party, chat, 'win');
    }

    await afterMemberAction(party, chat);
}

// tick DOT & damage reduction milik 1 member (dipanggil abis actor selesai aksi)
function tickMemberEffects(battle, st, logs, ownerId, skipCC = false) {
    if (st.dotEffect && st.dotEffect.duration > 0) {
        st.hp = Math.max(0, st.hp - st.dotEffect.dmgPerTurn);
        logs.push(`🩸 *${nameOf(battle, ownerId)}* kena *${st.dotEffect.type}*: -${st.dotEffect.dmgPerTurn} HP`);
        st.dotEffect.duration--;
        if (st.dotEffect.duration <= 0) st.dotEffect = null;
    }
    if (st.damageReduction && st.damageReduction.duration > 0) {
        st.damageReduction.duration--;
        if (st.damageReduction.duration <= 0) st.damageReduction = null;
    }
    if (st.debuffs.length > 0) {
        st.debuffs = st.debuffs.filter(d => {
            if (d.duration === 'battle') return true;
            d.duration -= 1;
            return d.duration > 0;
        });
    }
}

// =====================
// PARTY FLEE
// =====================
async function doPartyFlee(senderId, chat) {
    const party = getParty(senderId);
    if (!party || !party.battle) {
        await chat.sendMessage('❌ Party kamu gak lagi battle.');
        return;
    }

    const battle = party.battle;
    const success = Math.random() < 0.60;

    if (success) {
        await syncMemberHpMp(party);
        party.battle = null;
        await chat.sendMessage(`🏃 *${nameOf(battle, senderId)}* berhasil membawa party kabur dari *${battle.monster.name}*!\n\n⚠️ HP party tidak dipulihkan.`);
        return;
    }

    const st = battle.memberState[senderId];
    const penalty = Math.floor(battle.monster.derived.atk * 0.5);
    st.hp = Math.max(1, st.hp - penalty);
    await chat.sendMessage(`😰 *${nameOf(battle, senderId)}* gagal membawa party kabur! Kena damage *${penalty}*.\n❤️ HP: ${st.hp}/${st.maxHp}`);

    // gagal flee tetap menghabiskan giliran si pencoba
    await afterMemberAction(party, chat);
}

// =====================
// END PARTY BATTLE
// =====================
async function endPartyBattle(party, chat, result) {
    const battle = party.battle;
    party.battle = null;

    if (result === 'win') {
        const monster = battle.monster;
        const perMemberXp = Math.floor(monster.reward.xp / party.members.length);
        const summaries = [];

        for (const id of battle.turnOrder) {
            const st = battle.memberState[id];
            const [rows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [id]);
            const player = rows[0];
            require('./QuestSystem').trackProgress(id, 'hunt', 1).catch(() => {}); // ★ hook quest, non-blocking

            const goldGain = rollGold(monster.reward.gold);
            const drops = rollDrops(monster.reward.drops);

            const newExp = player.exp + perMemberXp;
            const expNeeded = player.level * 100;
            let newLevel = player.level;
            let lvlMsg = '';

            if (newExp >= expNeeded) {
                newLevel++;
                await db.query(
                    'UPDATE rpg_players SET level = ?, exp = ?, hp = ?, mp = ?, gold = gold + ?, stat_point = stat_point + 5 WHERE nomor = ?',
                    [newLevel, newExp - expNeeded, st.hp, st.mp, goldGain, id]
                );
                const pool = getSkillPool(player.class);
                const newSkills = pool.filter(s => s.unlockLevel === newLevel);
                lvlMsg = `\n🎉 LEVEL UP! ${player.level} → *${newLevel}*` + (newSkills.length ? ` (skill baru terbuka!)` : '');
            } else {
                await db.query(
                    'UPDATE rpg_players SET exp = ?, hp = ?, mp = ?, gold = gold + ? WHERE nomor = ?',
                    [newExp, st.hp, st.mp, goldGain, id]
                );
            }

            if (drops.length > 0) {
                for (const itemName of drops) await addItemToInventory(id, itemName, 1);
            }

            summaries.push(
                `*${nameOf(battle, id)}*${st.hp <= 0 ? ' (KO)' : ''}: +${perMemberXp} EXP, +${goldGain} Gold` +
                (drops.length ? `, 🎁 ${drops.join(', ')}` : '') +
                lvlMsg
            );
        }

        await chat.sendMessage(
            `🏆 *PARTY MENANG!* ${battle.monster.emoji} ${battle.monster.name} dikalahkan!\n\n` +
            summaries.join('\n')
        );
    } else {
        await syncMemberHpMp(party);
        await chat.sendMessage(
            `💀 *PARTY WIPE!* Seluruh member dikalahkan oleh *${battle.monster.name}*!\n\n` +
            `HP akan dipulihkan otomatis. Gunakan item heal untuk recover.`
        );
    }
}

module.exports = { startPartyHunt, doPartyAttack, doPartySkill, doPartyFlee };