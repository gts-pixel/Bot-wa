// skills.js
const Rpgformula = require('./rpgformula');

// =====================
// DEFINISI SKILL PER CLASS
// Format tiap skill:
//   mpCost   : biaya MP
//   cooldown : detik (disimpan di DB)
//   effect   : fungsi(player) → { damage, heal, mpRegen, desc }
// =====================
const SKILL = {
    knight: [
        {
            name: 'Shield Bash',
            key: '1',
            emoji: '🛡️',
            mpCost: 15,
            desc: 'Hantam musuh dengan perisai. DMG = STR × 3 + DEF × 1.5',
            effect: (p) => {
                const dmg = Math.floor(p.strength * 3 + p.defense * 1.5);
                return { damage: dmg, desc: `🛡️ *Shield Bash!*\nKamu menghantam musuh dengan perisai.\nDMG: *${dmg}*` };
            }
        },
        {
            name: 'Iron Will',
            key: '2',
            emoji: '💪',
            mpCost: 20,
            desc: 'Pulihkan HP = VIT × 5 + DEF × 2',
            effect: (p) => {
                const heal = Math.floor(p.vitality * 5 + p.defense * 2);
                return { heal, desc: `💪 *Iron Will!*\nKamu memulihkan diri.\nHP +*${heal}*` };
            }
        },
        {
            name: 'Sword Storm',
            key: '3',
            emoji: '⚔️',
            mpCost: 30,
            desc: 'Serang 3x. Total DMG = STR × 7',
            effect: (p) => {
                const dmg = Math.floor(p.strength * 7);
                return { damage: dmg, desc: `⚔️ *Sword Storm!*\nKamu menyerang 3 kali beruntun!\nTotal DMG: *${dmg}*` };
            }
        },
    ],
    paladin: [
        {
            name: 'Holy Light',
            key: '1',
            emoji: '✨',
            mpCost: 20,
            desc: 'Pulihkan HP = VIT × 6 + WIS × 3',
            effect: (p) => {
                const heal = Math.floor(p.vitality * 6 + p.wisdom * 3);
                return { heal, desc: `✨ *Holy Light!*\nCahaya suci memulihkan tubuhmu.\nHP + *${heal}*` };
            }
        },
        {
            name: 'Divine Strike',
            key: '2',
            emoji: '⚡',
            mpCost: 25,
            desc: 'DMG = STR × 2.5 + WIS × 2',
            effect: (p) => {
                const dmg = Math.floor(p.strength * 2.5 + p.wisdom * 2);
                return { damage: dmg, desc: `⚡ *Divine Strike!*\nSerangan suci menghantam musuh.\nDMG: *${dmg}*` };
            }
        },
        {
            name: 'Sacred Shield',
            key: '3',
            emoji: '🛡️',
            mpCost: 35,
            desc: 'Heal HP = DEF × 4 + VIT × 4',
            effect: (p) => {
                const heal = Math.floor(p.defense * 4 + p.vitality * 4);
                return { heal, desc: `🛡️ *Sacred Shield!*\nPerisai suci melindungi dan memulihkanmu.\nHP + *${heal}*` };
            }
        },
    ],
    berserker: [
        {
            name: 'Rage Strike',
            key: '1',
            emoji: '🪓',
            mpCost: 10,
            desc: 'DMG tinggi = STR × 4.25. Kurangi DEF diri sendiri 2 turn.',
            effect: (p) => {
                const dmg = Math.floor(p.strength * 4.25);
                return { damage: dmg, desc: `🪓 *Rage Strike!*\nSerangan penuh amarah!\nDMG: *${dmg}* (DEF berkurang sementara)` };
            }
        },
        {
            name: 'Blood Frenzy',
            key: '2',
            emoji: '🩸',
            mpCost: 20,
            desc: 'DMG = STR × 4 + AGI × 2. Steal HP 20% dari DMG.',
            effect: (p) => {
                const dmg = Math.floor(p.strength * 4 + p.agility * 2);
                const lifesteal = Math.floor(dmg * 0.2);
                return { damage: dmg, heal: lifesteal, desc: `🩸 *Blood Frenzy!*\nKamu menyerang sambil mencuri darah musuh!\nDMG: *${dmg}* | HP Steal: *+${lifesteal}*` };
            }
        },
        {
            name: 'Berserk Mode',
            key: '3',
            emoji: '💢',
            mpCost: 40,
            desc: 'DMG = STR × 8. Resiko: HP berkurang 10%.',
            effect: (p) => {
                const dmg = Math.floor(p.strength * 8);
                const hpCost = Math.floor(p.hp * 0.1);
                return { damage: dmg, hpCost, desc: `💢 *Berserk Mode!*\nKamu mengamuk tanpa kendali!\nDMG: *${dmg}* | HP Berkurang: *-${hpCost}*` };
            }
        },
    ],
    wizard: [
        {
            name: 'Arcane Bolt',
            key: '1',
            emoji: '🔮',
            mpCost: 20,
            desc: 'DMG = INT × 3 + WIS × 2',
            effect: (p) => {
                const dmg = Math.floor(p.intelligence * 3 + p.wisdom * 2);
                return { damage: dmg, desc: `🔮 *Arcane Bolt!*\nBola energi magis menghantam musuh.\nDMG: *${dmg}*` };
            }
        },
        {
            name: 'Mana Surge',
            key: '2',
            emoji: '💠',
            mpCost: 0,
            desc: 'Regenerasi MP = WIS × 3 + INT × 1',
            effect: (p) => {
                const regen = Math.floor(p.wisdom * 3 + p.intelligence * 1);
                return { mpRegen: regen, desc: `💠 *Mana Surge!*\nKamu menyerap energi aether.\nMP +*${regen}*` };
            }
        },
        {
            name: 'Meteor',
            key: '3',
            emoji: '☄️',
            mpCost: 50,
            desc: 'DMG = INT × 6 + WIS × 4. Skill paling kuat.',
            effect: (p) => {
                const dmg = Math.floor(p.intelligence * 6 + p.wisdom * 4);
                return { damage: dmg, desc: `☄️ *Meteor!*\nBatu langit jatuh menghancurkan musuh!\nDMG: *${dmg}*` };
            }
        },
    ],
    mage: [
        {
            name: 'Fireball',
            key: '1',
            emoji: '🔥',
            mpCost: 20,
            desc: 'DMG = INT × 2.5 + LUK × 1',
            effect: (p) => {
                const dmg = Math.floor(p.intelligence * 2.5 + p.luck * 1);
                return { damage: dmg, desc: `🔥 *Fireball!*\nBola api melesat ke arah musuh!\nDMG: *${dmg}*` };
            }
        },
        {
            name: 'Frost Nova',
            key: '2',
            emoji: '❄️',
            mpCost: 25,
            desc: 'DMG = INT × 2 + WIS × 1.5. Musuh freeze 1 turn.',
            effect: (p) => {
                const dmg = Math.floor(p.intelligence * 2 + p.wisdom * 1.5);
                return { damage: dmg, desc: `❄️ *Frost Nova!*\nExplosif es membekukan musuh!\nDMG: *${dmg}* (musuh freeze!)` };
            }
        },
        {
            name: 'Arcane Rain',
            key: '3',
            emoji: '🌌',
            mpCost: 40,
            desc: 'DMG = INT × 4 + WIS × 2 + LUK × 1',
            effect: (p) => {
                const dmg = Math.floor(p.intelligence * 4 + p.wisdom * 2 + p.luck * 1);
                return { damage: dmg, desc: `🌌 *Arcane Rain!*\nHujan energi magis memborbardir musuh!\nDMG: *${dmg}*` };
            }
        },
    ],
    assassin: [
        {
            name: 'Backstab',
            key: '1',
            emoji: '🗡️',
            mpCost: 15,
            desc: 'DMG = DEX × 3 + AGI × 2. Crit otomatis jika hit.',
            effect: (p) => {
                const base = Math.floor(p.dexterity * 3 + p.agility * 2);
                const dmg = Math.floor(base * 1.5); // selalu crit
                return { damage: dmg, desc: `🗡️ *Backstab!*\nSerangan dari balik bayangan — CRITICAL!\nDMG: *${dmg}*` };
            }
        },
        {
            name: 'Shadow Step',
            key: '2',
            emoji: '🌑',
            mpCost: 20,
            desc: 'Dodge 100% serangan berikutnya + DMG = AGI × 3',
            effect: (p) => {
                const dmg = Math.floor(p.agility * 3);
                return { damage: dmg, desc: `🌑 *Shadow Step!*\nKamu menghilang dan menyerang dari bayang-bayang!\nDMG: *${dmg}* + Dodge aktif` };
            }
        },
        {
            name: 'Deadly Poison',
            key: '3',
            emoji: '☠️',
            mpCost: 30,
            desc: 'DMG = DEX × 4 + AGI × 3. Efek racun.',
            effect: (p) => {
                const dmg = Math.floor(p.dexterity * 4 + p.agility * 3);
                return { damage: dmg, desc: `☠️ *Deadly Poison!*\nRacun mematikan mengalir ke tubuh musuh!\nDMG: *${dmg}* + Poison` };
            }
        },
    ],
    phantom: [
        {
            name: 'Phantom Slash',
            key: '1',
            emoji: '👻',
            mpCost: 15,
            desc: 'DMG = AGI × 2.5 + DEX × 2',
            effect: (p) => {
                const dmg = Math.floor(p.agility * 2.5 + p.dexterity * 2);
                return { damage: dmg, desc: `👻 *Phantom Slash!*\nSayatan tak kasat mata dari dimensi lain!\nDMG: *${dmg}*` };
            }
        },
        {
            name: 'Ghost Form',
            key: '2',
            emoji: '🌫️',
            mpCost: 25,
            desc: 'Heal HP = LUK × 3 + AGI × 2',
            effect: (p) => {
                const heal = Math.floor(p.luck * 3 + p.agility * 2);
                return { heal, desc: `🌫️ *Ghost Form!*\nKamu menyatu dengan bayangan untuk pulih.\nHP +*${heal}*` };
            }
        },
        {
            name: 'Soul Drain',
            key: '3',
            emoji: '💜',
            mpCost: 35,
            desc: 'DMG = DEX × 3 + LUK × 3. Steal HP 30%.',
            effect: (p) => {
                const dmg = Math.floor(p.dexterity * 3 + p.luck * 3);
                const lifesteal = Math.floor(dmg * 0.3);
                return { damage: dmg, heal: lifesteal, desc: `💜 *Soul Drain!*\nKamu menyedot jiwa musuh!\nDMG: *${dmg}* | HP Steal: *+${lifesteal}*` };
            }
        },
    ],
    archer: [
        {
            name: 'Quick Shot',
            key: '1',
            emoji: '🏹',
            mpCost: 10,
            desc: 'DMG = DEX × 2.5 + AGI × 1.5',
            effect: (p) => {
                const dmg = Math.floor(p.dexterity * 2.5 + p.agility * 1.5);
                return { damage: dmg, desc: `🏹 *Quick Shot!*\nPanah melesat cepat!\nDMG: *${dmg}*` };
            }
        },
        {
            name: 'Arrow Rain',
            key: '2',
            emoji: '🌧️',
            mpCost: 25,
            desc: 'DMG = DEX × 4 + AGI × 2. Serang 5 panah.',
            effect: (p) => {
                const dmg = Math.floor(p.dexterity * 4 + p.agility * 2);
                return { damage: dmg, desc: `🌧️ *Arrow Rain!*\nHujan panah menghujam musuh!\nDMG: *${dmg}*` };
            }
        },
        {
            name: 'Piercing Shot',
            key: '3',
            emoji: '💥',
            mpCost: 35,
            desc: 'DMG = DEX × 5 + AGI × 3. Tembus armor.',
            effect: (p) => {
                const dmg = Math.floor(p.dexterity * 5 + p.agility * 3);
                return { damage: dmg, desc: `💥 *Piercing Shot!*\nPanah menembus baju besi musuh!\nDMG: *${dmg}* (abaikan DEF)` };
            }
        },
    ],
    hawkeye: [
        {
            name: 'Eagle Eye',
            key: '1',
            emoji: '🦅',
            mpCost: 15,
            desc: 'DMG = DEX × 3 + LUK × 2. Hit rate +99%.',
            effect: (p) => {
                const dmg = Math.floor(p.dexterity * 3 + p.luck * 2);
                return { damage: dmg, desc: `🦅 *Eagle Eye!*\nBidikan sempurna tak bisa meleset!\nDMG: *${dmg}*` };
            }
        },
        {
            name: 'Lucky Shot',
            key: '2',
            emoji: '🍀',
            mpCost: 20,
            desc: 'DMG = LUK × 5. Damage acak x1.0–x2.0.',
            effect: (p) => {
                const multiplier = 1 + Math.random();
                const dmg = Math.floor(p.luck * 5 * multiplier);
                return { damage: dmg, desc: `🍀 *Lucky Shot!*\nKeberuntungan menentukan segalanya!\nDMG: *${dmg}* (×${multiplier.toFixed(2)})` };
            }
        },
        {
            name: 'Snipe',
            key: '3',
            emoji: '🎯',
            mpCost: 45,
            desc: 'DMG = DEX × 7 + LUK × 3. Selalu crit.',
            effect: (p) => {
                const base = Math.floor(p.dexterity * 7 + p.luck * 3);
                const dmg = Math.floor(base * 1.5);
                return { damage: dmg, desc: `🎯 *Snipe!*\nBidikan mematikan dari jarak jauh — CRITICAL!\nDMG: *${dmg}*` };
            }
        },
    ],
    summoner: [
        {
            name: 'Summon Golem',
            key: '1',
            emoji: '🗿',
            mpCost: 25,
            desc: 'DMG = INT × 2 + WIS × 2. Golem menyerang.',
            effect: (p) => {
                const dmg = Math.floor(p.intelligence * 2 + p.wisdom * 2);
                return { damage: dmg, desc: `🗿 *Summon Golem!*\nGolem batu menyerang musuh dengan keras!\nDMG: *${dmg}*` };
            }
        },
        {
            name: 'Spirit Heal',
            key: '2',
            emoji: '🌿',
            mpCost: 20,
            desc: 'Heal HP = WIS × 5 + INT × 2',
            effect: (p) => {
                const heal = Math.floor(p.wisdom * 5 + p.intelligence * 2);
                return { heal, desc: `🌿 *Spirit Heal!*\nRoh penjaga memulihkan lukamu.\nHP +*${heal}*` };
            }
        },
        {
            name: 'Dragon Breath',
            key: '3',
            emoji: '🐉',
            mpCost: 50,
            desc: 'DMG = INT × 5 + WIS × 3 + LUK × 2.',
            effect: (p) => {
                const dmg = Math.floor(p.intelligence * 5 + p.wisdom * 3 + p.luck * 2);
                return { damage: dmg, desc: `🐉 *Dragon Breath!*\nNagamu memuntahkan api dahsyat!\nDMG: *${dmg}*` };
            }
        },
    ],
    non: [],
};

// =====================
// HELPER
// =====================
function getSkillsByClass(className) {
    return SKILL[className] || [];
}

function meetsReq(skill, playerRow) {
    if (!skill.req) return true;
    for (const [stat, val] of Object.entries(skill.req)) {
        if ((playerRow[stat] || 0) < val) return false;
    }
    return true;
}

function getAvailableSkillsForPlayer(className, playerRow) {
    const skills = getSkillsByClass(className);
    const available = [];
    const locked = [];
    skills.forEach(s => {
        if (meetsReq(s, playerRow)) available.push(s);
        else locked.push(s);
    });
    return { available, locked };
}

function formatSkillsForPlayer(className, playerRow) {
    const { available, locked } = getAvailableSkillsForPlayer(className, playerRow);
    if (!available.length && !locked.length) return '❌ Class kamu belum punya skill. Pilih class dulu dengan *.class [nama]*';

    let out = `📖 *Skill List — ${className}*\n\n`;
    if (available.length) {
        out += '*Skills Available:*\n';
        out += available.map((s, i) => `${i + 1}. ${s.emoji} *${s.name}* — MP: ${s.mpCost}\n   ${s.desc}`).join('\n\n');
    } else {
        out += '_Tidak ada skill yang bisa dipakai saat ini berdasarkan statmu._\n';
    }

    if (locked.length) {
        out += '\n\n*Locked / Requirements:*\n';
        out += locked.map((s) => {
            const reqs = Object.entries(s.req || {}).map(([k, v]) => `${k.toUpperCase()} ≥ ${v}`).join(', ');
            return `${s.emoji} *${s.name}* — requires: ${reqs}`;
        }).join('\n');
    }

    out += '\n\nGunakan *.use [nama skill]* untuk memakai skill.';
    return out;
}

function findSkill(className, key) {
    return getSkillsByClass(className).find(s => s.key === key);
}

function formatSkillList(className) {
    const skills = getSkillsByClass(className);
    if (!skills.length) return '❌ Class kamu belum punya skill. Pilih class dulu dengan *.class [nama]*';
    return skills.map((s, i) =>
        `${i + 1}. ${s.emoji} *${s.name}* — MP: ${s.mpCost}\n   ${s.desc}`
    ).join('\n\n');
}

// =====================
// EKSEKUSI SKILL
// Kembalikan { success, message } untuk dikirim ke chat
// Player diupdate langsung di DB
// =====================
async function useSkill(db, senderId, skillKey, playerRow) {
    const p = playerRow;
    const skill = findSkill(p.class, skillKey);

    if (!skill) {
        return { success: false, message: `❌ Skill *${skillKey}* tidak ditemukan atau bukan milik class *${p.class}*.` };
    }

    if (p.mp < skill.mpCost) {
        return { success: false, message: `❌ MP tidak cukup! Butuh *${skill.mpCost} MP*, kamu punya *${p.mp} MP*.` };
    }

    // Jalankan efek skill
    const result = skill.effect(p);

    let newHp = p.hp;
    let newMp = p.mp - skill.mpCost;

    // Terapkan damage (jika ada)
    if (result.damage) {
        // Damage ke musuh — dalam konteks solo ini hanya ditampilkan
        // Nanti bisa dihubungkan ke sistem battle
    }

    // Terapkan heal (jika ada)
    if (result.heal) {
        newHp = Math.min(p.max_hp, newHp + result.heal);
    }

    // Terapkan hp cost (misal Berserk Mode)
    if (result.hpCost) {
        newHp = Math.max(1, newHp - result.hpCost);
    }

    // Terapkan MP regen (misal Mana Surge)
    if (result.mpRegen) {
        newMp = Math.min(p.max_mp, newMp + result.mpRegen);
    }

    // Update DB
    await db.query(
        'UPDATE rpg_players SET hp = ?, mp = ? WHERE nomor = ?',
        [newHp, newMp, senderId]
    );

    const statLine =
        `\n\n❤️ HP: ${newHp}/${p.max_hp}\n💙 MP: ${newMp}/${p.max_mp}`;

    return { success: true, message: result.desc + statLine };
}

module.exports = { getSkillsByClass, findSkill, formatSkillList, useSkill, getAvailableSkillsForPlayer, formatSkillsForPlayer };