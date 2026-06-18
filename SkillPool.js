// SkillPool.js
// Pool skill lengkap per class — player bisa equip 4 dari pool ini ke slot aktif
// Mirip sistem Pokemon: punya banyak skill, tapi cuma 4 yang dibawa

const SKILL_POOL = {

    // ══════════════════════════════════════════
    // KNIGHT — Tank/Melee Warrior
    // ══════════════════════════════════════════
    knight: [
        {
            id: 'shield_bash',
            name: 'Shield Bash',
            emoji: '🛡️',
            mpCost: 15,
            cooldownTurns: 2,
            unlockLevel: 1,
            desc: 'Hantam musuh dengan perisai. DMG = STR × 3.5 + DEF × 1.5',
            effect: (p) => {
                const dmg = Math.floor(p.strength * 3.5 + p.defense * 1.5);
                return { damage: dmg, desc: `🛡️ *Shield Bash!*\nKamu menghantam musuh dengan perisai.\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'iron_will',
            name: 'Iron Will',
            emoji: '💪',
            mpCost: 20,
            cooldownTurns: 3,
            unlockLevel: 1,
            desc: 'Pulihkan HP = VIT × 5 + DEF × 2',
            effect: (p) => {
                const heal = Math.floor(p.vitality * 5 + p.defense * 2);
                return { heal, desc: `💪 *Iron Will!*\nKamu memulihkan diri.\nHP +*${heal}*` };
            }
        },
        {
            id: 'sword_storm',
            name: 'Sword Storm',
            emoji: '⚔️',
            mpCost: 30,
            cooldownTurns: 4,
            unlockLevel: 7,
            desc: 'Serang 3x beruntun. Total DMG = STR × 7',
            effect: (p) => {
                const dmg = Math.floor(p.strength * 7);
                return { damage: dmg, desc: `⚔️ *Sword Storm!*\nKamu menyerang 3 kali beruntun!\nTotal DMG: *${dmg}*` };
            }
        },
        {
            id: 'taunt',
            name: 'Taunt',
            emoji: '📣',
            mpCost: 10,
            cooldownTurns: 3,
            unlockLevel: 14,
            desc: 'Provokasi musuh — naikkan DEF 20% selama 2 turn. DEF bonus = DEF × 0.2',
            effect: (p) => {
                const defBonus = Math.floor(p.defense * 0.2);
                return { defBuff: defBonus, desc: `📣 *Taunt!*\nKamu memprovokasi musuh!\nDEF +*${defBonus}* selama 2 turn` };
            }
        },
        {
            id: 'fortify',
            name: 'Fortify',
            emoji: '🏰',
            mpCost: 25,
            cooldownTurns: 4,
            unlockLevel: 23,
            desc: 'Benteng diri — heal HP = DEF × 3 + VIT × 3',
            effect: (p) => {
                const heal = Math.floor(p.defense * 3 + p.vitality * 3);
                return { heal, desc: `🏰 *Fortify!*\nKamu membentengi diri!\nHP +*${heal}*` };
            }
        },
        {
            id: 'blade_fury',
            name: 'Blade Fury',
            emoji: '🌀',
            mpCost: 40,
            cooldownTurns: 5,
            unlockLevel: 39,
            desc: 'Ultimate slash. DMG = STR × 9 + DEF × 2',
            effect: (p) => {
                const dmg = Math.floor(p.strength * 9 + p.defense * 2);
                return { damage: dmg, desc: `🌀 *Blade Fury!*\nSerangan terkuat Knight!\nDMG: *${dmg}*` };
            }
        },
    ],

    // ══════════════════════════════════════════
    // PALADIN — Holy Warrior
    // ══════════════════════════════════════════
    paladin: [
        {
            id: 'holy_light',
            name: 'Holy Light',
            emoji: '✨',
            mpCost: 20,
            cooldownTurns: 2,
            unlockLevel: 1,
            desc: 'Pulihkan HP = VIT × 6 + WIS × 3',
            effect: (p) => {
                const heal = Math.floor(p.vitality * 6 + p.wisdom * 3);
                return { heal, desc: `✨ *Holy Light!*\nCahaya suci memulihkan tubuhmu.\nHP +*${heal}*` };
            }
        },
        {
            id: 'divine_strike',
            name: 'Divine Strike',
            emoji: '⚡',
            mpCost: 25,
            cooldownTurns: 3,
            unlockLevel: 1,
            desc: 'DMG = STR × 4 + WIS × 2.5',
            effect: (p) => {
                const dmg = Math.floor(p.strength * 4 + p.wisdom * 2.5);
                return { damage: dmg, desc: `⚡ *Divine Strike!*\nSerangan suci menghantam musuh.\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'sacred_shield',
            name: 'Sacred Shield',
            emoji: '🛡️',
            mpCost: 35,
            cooldownTurns: 4,
            unlockLevel: 7,
            desc: 'reduce damage 35% selama 2 turn',
            effect: (p) => {
                const heal = Math.floor(p.defense * 2 + p.vitality * 1.2);
                const damageReduction = { persent: 0.35, duration: 2 };
                return { heal, damageReduction, desc: `🛡️ *Sacred Shield!*\nPerisai suci melindungimu 
                    \nDamage diterima 35% selama 2 turn dan memulihkanmu.\nHP +*${heal}*` };
            }
        },
        {
            id: 'holy_flame',
            name: 'Holy Flame',
            emoji: '🔥',
            mpCost: 30,
            cooldownTurns: 3,
            unlockLevel: 13,
            desc: 'Api suci. DMG = WIS × 3.5 + STR × 2',
            effect: (p) => {
                const dmg = Math.floor(p.wisdom * 3.5 + p.strength * 2);
                return { damage: dmg, desc: `🔥 *Holy Flame!*\nApi suci membakar musuh!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'blessed_aura',
            name: 'Blessed Aura',
            emoji: '🌟',
            mpCost: 15,
            cooldownTurns: 3,
            unlockLevel: 23,
            desc: 'Regen HP = WIS × 2 per turn selama 3 turn',
            effect: (p) => {
                const heal = Math.floor(p.wisdom * 2);
                return { heal, desc: `🌟 *Blessed Aura!*\nAura suci memulihkanmu.\nHP +*${heal}*` };
            }
        },
        {
            id: 'judgement',
            name: 'Judgement',
            emoji: '⚖️',
            mpCost: 50,
            cooldownTurns: 5,
            unlockLevel: 40,
            desc: 'Ultimate — DMG = STR × 5 + WIS × 5 + VIT × 2',
            effect: (p) => {
                const dmg = Math.floor(p.strength * 5 + p.wisdom * 5 + p.vitality * 2);
                return { damage: dmg, desc: `⚖️ *Judgement!*\nHukuman ilahi turun dari langit!\nDMG: *${dmg}*` };
            }
        },
    ],

    // ══════════════════════════════════════════
    // BERSERKER — Rage DPS
    // ══════════════════════════════════════════
    berserker: [
        {
            id: 'rage_strike',
            name: 'Rage Strike',
            emoji: '🪓',
            mpCost: 10,
            cooldownTurns: 2,
            unlockLevel: 1,
            desc: 'DMG = STR × 4.25. Penuh amarah!',
            effect: (p) => {
                const dmg = Math.floor(p.strength * 4.25);
                return { damage: dmg, desc: `🪓 *Rage Strike!*\nSerangan penuh amarah!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'blood_frenzy',
            name: 'Blood Frenzy',
            emoji: '🩸',
            mpCost: 20,
            cooldownTurns: 3,
            unlockLevel: 1,
            desc: 'DMG = STR × 4 + AGI × 2. Steal HP 20%.',
            effect: (p) => {
                const dmg = Math.floor(p.strength * 4 + p.agility * 2);
                const lifesteal = Math.floor(dmg * 0.2);
                return { damage: dmg, heal: lifesteal, desc: `🩸 *Blood Frenzy!*\nKamu mencuri darah musuh!\nDMG: *${dmg}* | HP Steal: *+${lifesteal}*` };
            }
        },
        {
            id: 'berserk_mode',
            name: 'Berserk Mode',
            emoji: '💢',
            mpCost: 40,
            cooldownTurns: 5,
            unlockLevel: 8,
            desc: 'DMG = STR × 7.5. Resiko: HP berkurang 20%.',
            effect: (p) => {
                const dmg = Math.floor(p.strength * 7.5);
                const hpCost = Math.floor(p.hp * 0.2);
                return { damage: dmg, hpCost, desc: `💢 *Berserk Mode!*\nKamu mengamuk tanpa kendali!\nDMG: *${dmg}* | HP Berkurang: *-${hpCost}*` };
            }
        },
        {
            id: 'war_cry',
            name: 'War Cry',
            emoji: '📯',
            mpCost: 15,
            cooldownTurns: 3,
            unlockLevel: 17,
            desc: 'Teriakan perang — DMG = STR × 2 + AGI × 3',
            effect: (p) => {
                const dmg = Math.floor(p.strength * 2 + p.agility * 3);
                return { damage: dmg, desc: `📯 *War Cry!*\nTeriakanmu mengguncang medan perang!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'feral_charge',
            name: 'Feral Charge',
            emoji: '🐂',
            mpCost: 25,
            cooldownTurns: 3,
            unlockLevel: 29,
            desc: '突撃 — DMG = STR × 5 + AGI × 2',
            effect: (p) => {
                const dmg = Math.floor(p.strength * 5 + p.agility * 2);
                return { damage: dmg, desc: `🐂 *Feral Charge!*\n突撃 menerobos pertahanan musuh!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'titan_smash',
            name: 'Titan Smash',
            emoji: '💥',
            mpCost: 50,
            cooldownTurns: 44,
            unlockLevel: 35,
            desc: 'Ultimate smash. DMG = STR × 10. Resiko HP -15%.',
            effect: (p) => {
                const dmg = Math.floor(p.strength * 10);
                const hpCost = Math.floor(p.hp * 0.15);
                return { damage: dmg, hpCost, desc: `💥 *Titan Smash!*\nSerangan setara Titan!\nDMG: *${dmg}* | HP Berkurang: *-${hpCost}*` };
            }
        },
    ],

    // ══════════════════════════════════════════
    // WIZARD — Pure Magic
    // ══════════════════════════════════════════
    wizard: [
        {
            id: 'arcane_bolt',
            name: 'Arcane Bolt',
            emoji: '🔮',
            mpCost: 20,
            cooldownTurns: 2,
            unlockLevel: 1,
            desc: 'DMG = INT × 3 + WIS × 2',
            effect: (p) => {
                const dmg = Math.floor(p.intelligence * 3 + p.wisdom * 2);
                return { damage: dmg, desc: `🔮 *Arcane Bolt!*\nBola energi magis menghantam musuh.\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'mana_surge',
            name: 'Mana Surge',
            emoji: '💠',
            mpCost: 0,
            cooldownTurns: 3,
            unlockLevel: 1,
            desc: 'Regenerasi MP = WIS × 3 + INT × 1',
            effect: (p) => {
                const regen = Math.floor(p.wisdom * 3 + p.intelligence * 1);
                return { mpRegen: regen, desc: `💠 *Mana Surge!*\nKamu menyerap energi aether.\nMP +*${regen}*` };
            }
        },
        {
            id: 'meteor',
            name: 'Meteor',
            emoji: '☄️',
            mpCost: 50,
            cooldownTurns: 5,
            unlockLevel: 7,
            desc: 'DMG = INT × 6 + WIS × 4. Skill paling kuat.',
            effect: (p) => {
                const dmg = Math.floor(p.intelligence * 6 + p.wisdom * 4);
                return { damage: dmg, desc: `☄️ *Meteor!*\nBatu langit jatuh menghancurkan musuh!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'time_warp',
            name: 'Time Warp',
            emoji: '⏱️',
            mpCost: 30,
            cooldownTurns: 4,
            unlockLevel: 18,
            desc: 'Manipulasi waktu — skip 1 giliran musuh + DMG = WIS × 3',
            effect: (p) => {
                const dmg = Math.floor(p.wisdom * 3);
                return { damage: dmg, desc: `⏱️ *Time Warp!*\nKamu memanipulasi waktu!\nDMG: *${dmg}* + giliran musuh skip` };
            }
        },
        {
            id: 'mana_shield',
            name: 'Mana Shield',
            emoji: '🔵',
            mpCost: 25,
            cooldownTurns: 3,
            unlockLevel: 26,
            desc: 'Konversi 50 MP jadi HP. Heal = 50 + WIS × 2',
            effect: (p) => {
                const heal = Math.floor(50 + p.wisdom * 2);
                return { heal, desc: `🔵 *Mana Shield!*\nKamu mengkonversi mana jadi pelindung!\nHP +*${heal}*` };
            }
        },
        {
            id: 'chain_lightning',
            name: 'Chain Lightning',
            emoji: '⚡',
            mpCost: 35,
            cooldownTurns: 4,
            unlockLevel: 38,
            desc: 'Petir berantai. DMG = INT × 4 + WIS × 3',
            effect: (p) => {
                const dmg = Math.floor(p.intelligence * 4 + p.wisdom * 3);
                return { damage: dmg, desc: `⚡ *Chain Lightning!*\nPetir berantai menyambar musuh!\nDMG: *${dmg}*` };
            }
        },
    ],

    // ══════════════════════════════════════════
    // MAGE — Elemental Magic
    // ══════════════════════════════════════════
    mage: [
        {
            id: 'fireball',
            name: 'Fireball',
            emoji: '🔥',
            mpCost: 20,
            cooldownTurns: 2,
            unlockLevel: 1,
            desc: 'DMG = INT × 2.5 + LUK × 1',
            effect: (p) => {
                const dmg = Math.floor(p.intelligence * 2.5 + p.luck * 1);
                return { damage: dmg, desc: `🔥 *Fireball!*\nBola api melesat ke arah musuh!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'frost_nova',
            name: 'Frost Nova',
            emoji: '❄️',
            mpCost: 25,
            cooldownTurns: 3,
            unlockLevel: 1,
            desc: 'DMG = INT × 2 + WIS × 1.5. Musuh freeze.',
            effect: (p) => {
                const dmg = Math.floor(p.intelligence * 2 + p.wisdom * 1.5);
                return { damage: dmg, desc: `❄️ *Frost Nova!*\nEs membekukan musuh!\nDMG: *${dmg}* (musuh freeze!)` };
            }
        },
        {
            id: 'arcane_rain',
            name: 'Arcane Rain',
            emoji: '🌌',
            mpCost: 40,
            cooldownTurns: 4,
            unlockLevel: 7,
            desc: 'DMG = INT × 4 + WIS × 2 + LUK × 1',
            effect: (p) => {
                const dmg = Math.floor(p.intelligence * 4 + p.wisdom * 2 + p.luck * 1);
                return { damage: dmg, desc: `🌌 *Arcane Rain!*\nHujan energi magis!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'thunder_clap',
            name: 'Thunder Clap',
            emoji: '🌩️',
            mpCost: 22,
            cooldownTurns: 2,
            unlockLevel: 16,
            desc: 'DMG = INT × 3 + LUK × 1.5',
            effect: (p) => {
                const dmg = Math.floor(p.intelligence * 3 + p.luck * 1.5);
                return { damage: dmg, desc: `🌩️ *Thunder Clap!*\nPetir menggelegar!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'poison_cloud',
            name: 'Poison Cloud',
            emoji: '☁️',
            mpCost: 30,
            cooldownTurns: 4,
            unlockLevel: 25,
            desc: 'Awan racun. DMG = INT × 2 + WIS × 2 + LUK × 2',
            effect: (p) => {
                const dmg = Math.floor(p.intelligence * 2 + p.wisdom * 2 + p.luck * 2);
                return { damage: dmg, desc: `☁️ *Poison Cloud!*\nAwan racun menyelimuti musuh!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'ultima',
            name: 'Ultima',
            emoji: '🌠',
            mpCost: 60,
            cooldownTurns: 6,
            unlockLevel: 37,
            desc: 'Ultimate magic. DMG = INT × 7 + WIS × 4 + LUK × 3',
            effect: (p) => {
                const dmg = Math.floor(p.intelligence * 7 + p.wisdom * 4 + p.luck * 3);
                return { damage: dmg, desc: `🌠 *Ultima!*\nMantra kehancuran ultimate!\nDMG: *${dmg}*` };
            }
        },
    ],

    // ══════════════════════════════════════════
    // ASSASSIN — Speed & Stealth
    // ══════════════════════════════════════════
    assassin: [
        {
            id: 'backstab',
            name: 'Backstab',
            emoji: '🗡️',
            mpCost: 15,
            cooldownTurns: 2,
            unlockLevel: 1,
            desc: 'DMG = (DEX × 3 + AGI × 2) × 1.5. Selalu crit.',
            effect: (p) => {
                const base = Math.floor(p.dexterity * 3 + p.agility * 2);
                const dmg = Math.floor(base * 1.5);
                return { damage: dmg, desc: `🗡️ *Backstab!*\nSerangan dari balik bayangan — CRITICAL!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'shadow_step',
            name: 'Shadow Step',
            emoji: '🌑',
            mpCost: 20,
            cooldownTurns: 3,
            unlockLevel: 1,
            desc: 'Dodge aktif + DMG = AGI × 3',
            effect: (p) => {
                const dmg = Math.floor(p.agility * 3);
                return { damage: dmg, desc: `🌑 *Shadow Step!*\nMenghilang dan menyerang dari bayang-bayang!\nDMG: *${dmg}* + Dodge aktif` };
            }
        },
        {
            id: 'deadly_poison',
            name: 'Deadly Poison',
            emoji: '☠️',
            mpCost: 30,
            cooldownTurns: 4,
            unlockLevel: 7,
            desc: 'DMG = DEX × 4 + AGI × 3 + efek racun.',
            effect: (p) => {
                const dmg = Math.floor(p.dexterity * 4 + p.agility * 3);
                return { damage: dmg, desc: `☠️ *Deadly Poison!*\nRacun mematikan!\nDMG: *${dmg}* + Poison` };
            }
        },
        {
            id: 'smoke_bomb',
            name: 'Smoke Bomb',
            emoji: '💨',
            mpCost: 15,
            cooldownTurns: 3,
            unlockLevel: 18,
            desc: 'Bom asap — naikkan dodge 50% + DMG = AGI × 2',
            effect: (p) => {
                const dmg = Math.floor(p.agility * 2);
                return { damage: dmg, desc: `💨 *Smoke Bomb!*\nAsap pekat membutakan musuh!\nDMG: *${dmg}* + Dodge +50%` };
            }
        },
        {
            id: 'blade_dance',
            name: 'Blade Dance',
            emoji: '🌪️',
            mpCost: 28,
            cooldownTurns: 3,
            unlockLevel: 27,
            desc: 'Serang 4x cepat. DMG = DEX × 2 + AGI × 2 per hit × 4',
            effect: (p) => {
                const dmg = Math.floor((p.dexterity * 2 + p.agility * 2) * 4);
                return { damage: dmg, desc: `🌪️ *Blade Dance!*\nEmpatserangan kilat beruntun!\nTotal DMG: *${dmg}*` };
            }
        },
        {
            id: 'death_mark',
            name: 'Death Mark',
            emoji: '💀',
            mpCost: 45,
            cooldownTurns: 5,
            unlockLevel: 39,
            desc: 'Ultimate — DMG = DEX × 6 + AGI × 5 + LUK × 3',
            effect: (p) => {
                const dmg = Math.floor(p.dexterity * 6 + p.agility * 5 + p.luck * 3);
                return { damage: dmg, desc: `💀 *Death Mark!*\nTanda kematian terukir di tubuh musuh!\nDMG: *${dmg}*` };
            }
        },
    ],

    // ══════════════════════════════════════════
    // PHANTOM — Ghost / Lifesteal
    // ══════════════════════════════════════════
    phantom: [
        {
            id: 'phantom_slash',
            name: 'Phantom Slash',
            emoji: '👻',
            mpCost: 15,
            cooldownTurns: 3,
            unlockLevel: 1,
            desc: 'DMG = AGI × 2.5 + DEX × 2',
            effect: (p) => {
                const dmg = Math.floor(p.agility * 2.5 + p.dexterity * 2);
                return { damage: dmg, desc: `👻 *Phantom Slash!*\nSayatan tak kasat mata!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'ghost_form',
            name: 'Ghost Form',
            emoji: '🌫️',
            mpCost: 25,
            cooldownTurns: 3,
            unlockLevel: 1,
            desc: 'Heal HP = LUK × 3 + AGI × 2',
            effect: (p) => {
                const heal = Math.floor(p.luck * 3 + p.agility * 2);
                return { heal, desc: `🌫️ *Ghost Form!*\nMenyatu dengan bayangan untuk pulih.\nHP +*${heal}*` };
            }
        },
        {
            id: 'soul_drain',
            name: 'Soul Drain',
            emoji: '💜',
            mpCost: 35,
            cooldownTurns: 5,
            unlockLevel: 7,
            desc: 'DMG = DEX × 3 + LUK × 3. Steal HP 30%.',
            effect: (p) => {
                const dmg = Math.floor(p.dexterity * 3 + p.luck * 3);
                const lifesteal = Math.floor(dmg * 0.3);
                return { damage: dmg, heal: lifesteal, desc: `💜 *Soul Drain!*\nKamu menyedot jiwa musuh!\nDMG: *${dmg}* | HP Steal: *+${lifesteal}*` };
            }
        },
        {
            id: 'dark_mirage',
            name: 'Dark Mirage',
            emoji: '🖤',
            mpCost: 20,
            cooldownTurns: 3,
            unlockLevel: 17,
            desc: 'Bayangan palsu — Dodge 70% + DMG = LUK × 3',
            effect: (p) => {
                const dmg = Math.floor(p.luck * 3);
                return { damage: dmg, desc: `🖤 *Dark Mirage!*\nBayangan palsu membingungkan musuh!\nDMG: *${dmg}* + Dodge aktif` };
            }
        },
        {
            id: 'void_touch',
            name: 'Void Touch',
            emoji: '🌀',
            mpCost: 30,
            cooldownTurns: 4,
            unlockLevel: 29,
            desc: 'Sentuhan kekosongan. DMG = DEX × 3 + AGI × 2 + LUK × 2',
            effect: (p) => {
                const dmg = Math.floor(p.dexterity * 3 + p.agility * 2 + p.luck * 2);
                return { damage: dmg, desc: `🌀 *Void Touch!*\nKekosongan melahap musuh!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'phantom_requiem',
            name: 'Phantom Requiem',
            emoji: '🎭',
            mpCost: 55,
            cooldownTurns: 6,
            unlockLevel: 37,
            desc: 'Ultimate. DMG = DEX × 5 + LUK × 5 + AGI × 3 + HP Steal 40%',
            effect: (p) => {
                const dmg = Math.floor(p.dexterity * 5 + p.luck * 5 + p.agility * 3);
                const lifesteal = Math.floor(dmg * 0.4);
                return { damage: dmg, heal: lifesteal, desc: `🎭 *Phantom Requiem!*\nNyanyian kematian sang Phantom!\nDMG: *${dmg}* | HP Steal: *+${lifesteal}*` };
            }
        },
    ],

    // ══════════════════════════════════════════
    // ARCHER — Ranged Physical
    // ══════════════════════════════════════════
    archer: [
        {
            id: 'quick_shot',
            name: 'Quick Shot',
            emoji: '🏹',
            mpCost: 10,
            cooldownTurns: 1,
            unlockLevel: 1,
            desc: 'DMG = DEX × 2.5 + AGI × 1.5',
            effect: (p) => {
                const dmg = Math.floor(p.dexterity * 2.5 + p.agility * 1.5);
                return { damage: dmg, desc: `🏹 *Quick Shot!*\nPanah melesat cepat!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'arrow_rain',
            name: 'Arrow Rain',
            emoji: '🌧️',
            mpCost: 25,
            cooldownTurns: 3,
            unlockLevel: 1,
            desc: 'Hujan 5 panah. DMG = DEX × 4 + AGI × 2',
            effect: (p) => {
                const dmg = Math.floor(p.dexterity * 4 + p.agility * 2);
                return { damage: dmg, desc: `🌧️ *Arrow Rain!*\nHujan panah menghujam musuh!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'piercing_shot',
            name: 'Piercing Shot',
            emoji: '💥',
            mpCost: 35,
            cooldownTurns: 4,
            unlockLevel: 9,
            desc: 'Tembus armor. DMG = DEX × 5 + AGI × 3',
            effect: (p) => {
                const dmg = Math.floor(p.dexterity * 5 + p.agility * 3);
                return { damage: dmg, desc: `💥 *Piercing Shot!*\nPanah menembus baju besi musuh!\nDMG: *${dmg}* (abaikan DEF)` };
            }
        },
        {
            id: 'flame_arrow',
            name: 'Flame Arrow',
            emoji: '🔥',
            mpCost: 22,
            cooldownTurns: 2,
            unlockLevel: 17,
            desc: 'Panah api. DMG = DEX × 3 + AGI × 1.5 + LUK × 1',
            effect: (p) => {
                const dmg = Math.floor(p.dexterity * 3 + p.agility * 1.5 + p.luck * 1);
                return { damage: dmg, desc: `🔥 *Flame Arrow!*\nPanah api melesat!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'wind_step',
            name: 'Wind Step',
            emoji: '🍃',
            mpCost: 18,
            cooldownTurns: 3,
            unlockLevel: 29,
            desc: 'Melangkah secepat angin — Dodge + DMG = AGI × 3',
            effect: (p) => {
                const dmg = Math.floor(p.agility * 3);
                return { damage: dmg, desc: `🍃 *Wind Step!*\nKamu bergerak secepat angin!\nDMG: *${dmg}* + Dodge aktif` };
            }
        },
        {
            id: 'volley',
            name: 'Volley',
            emoji: '🎯',
            mpCost: 45,
            cooldownTurns: 5,
            unlockLevel: 40,
            desc: 'Ultimate barrage. DMG = DEX × 7 + AGI × 4 + LUK × 2',
            effect: (p) => {
                const dmg = Math.floor(p.dexterity * 7 + p.agility * 4 + p.luck * 2);
                return { damage: dmg, desc: `🎯 *Volley!*\nHujan tembakan tak terhenti!\nDMG: *${dmg}*` };
            }
        },
    ],

    // ══════════════════════════════════════════
    // HAWKEYE — Precision & Crit
    // ══════════════════════════════════════════
    hawkeye: [
        {
            id: 'eagle_eye',
            name: 'Eagle Eye',
            emoji: '🦅',
            mpCost: 15,
            cooldownTurns: 2,
            unlockLevel: 1,
            desc: 'DMG = DEX × 3 + LUK × 2. Hit rate +99%.',
            effect: (p) => {
                const dmg = Math.floor(p.dexterity * 3 + p.luck * 2);
                return { damage: dmg, desc: `🦅 *Eagle Eye!*\nBidikan sempurna tak bisa meleset!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'lucky_shot',
            name: 'Lucky Shot',
            emoji: '🍀',
            mpCost: 20,
            cooldownTurns: 3,
            unlockLevel: 1,
            desc: 'DMG = LUK × 3 × (1.0–2.0). Acak!',
            effect: (p) => {
                const multiplier = 1 + Math.random();
                const dmg = Math.floor(p.luck * 3 * multiplier);
                return { damage: dmg, desc: `🍀 *Lucky Shot!*\nKeberuntungan menentukan segalanya!\nDMG: *${dmg}* (×${multiplier.toFixed(2)})` };
            }
        },
        {
            id: 'snipe',
            name: 'Snipe',
            emoji: '🎯',
            mpCost: 45,
            cooldownTurns: 5,
            unlockLevel: 9,
            desc: 'Selalu crit. DMG = (DEX × 6 + LUK × 2.5) × 1.5',
            effect: (p) => {
                const base = Math.floor(p.dexterity * 6 + p.luck * 2.5);
                const dmg = Math.floor(base * 1.5);
                return { damage: dmg, desc: `🎯 *Snipe!*\nBidikan mematikan — CRITICAL!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'hawks_focus',
            name: "Hawk's Focus",
            emoji: '🔍',
            mpCost: 12,
            cooldownTurns: 2,
            unlockLevel: 18,
            desc: 'Fokus bidikan — DMG = DEX × 3.5 + LUK × 1.5',
            effect: (p) => {
                const dmg = Math.floor(p.dexterity * 3.5 + p.luck * 1.5);
                return { damage: dmg, desc: `🔍 *Hawk's Focus!*\nFokus total pada titik lemah!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'fortune_arrow',
            name: 'Fortune Arrow',
            emoji: '✨',
            mpCost: 25,
            cooldownTurns: 3,
            unlockLevel: 29,
            desc: 'Panah keberuntungan. DMG = LUK × 6 + DEX × 2',
            effect: (p) => {
                const dmg = Math.floor(p.luck * 6 + p.dexterity * 2);
                return { damage: dmg, desc: `✨ *Fortune Arrow!*\nPanah keberuntungan melesat!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'hawks_wrath',
            name: "Hawk's Wrath",
            emoji: '💫',
            mpCost: 55,
            cooldownTurns: 6,
            unlockLevel: 40,
            desc: 'Ultimate. DMG = DEX × 8 + LUK × 6, selalu crit.',
            effect: (p) => {
                const base = Math.floor(p.dexterity * 8 + p.luck * 6);
                const dmg = Math.floor(base * 1.5);
                return { damage: dmg, desc: `💫 *Hawk's Wrath!*\nAmarah sang elang — CRITICAL!\nDMG: *${dmg}*` };
            }
        },
    ],

    // ══════════════════════════════════════════
    // SUMMONER — Pet / Summon Magic
    // ══════════════════════════════════════════
    summoner: [
        {
            id: 'summon_golem',
            name: 'Summon Golem',
            emoji: '🗿',
            mpCost: 25,
            cooldownTurns: 3,
            unlockLevel: 1,
            desc: 'Golem menyerang. DMG = INT × 2 + WIS × 2',
            effect: (p) => {
                const dmg = Math.floor(p.intelligence * 2 + p.wisdom * 2);
                return { damage: dmg, desc: `🗿 *Summon Golem!*\nGolem batu menyerang dengan keras!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'spirit_heal',
            name: 'Spirit Heal',
            emoji: '🌿',
            mpCost: 20,
            cooldownTurns: 3,
            unlockLevel: 1,
            desc: 'Roh penjaga memulihkan. HP = WIS × 5 + INT × 2',
            effect: (p) => {
                const heal = Math.floor(p.wisdom * 5 + p.intelligence * 2);
                return { heal, desc: `🌿 *Spirit Heal!*\nRoh penjaga memulihkan lukamu.\nHP +*${heal}*` };
            }
        },
        {
            id: 'dragon_breath',
            name: 'Dragon Breath',
            emoji: '🐉',
            mpCost: 50,
            cooldownTurns: 5,
            unlockLevel: 8,
            desc: 'DMG = INT × 5 + WIS × 3 + LUK × 2.',
            effect: (p) => {
                const dmg = Math.floor(p.intelligence * 5 + p.wisdom * 3 + p.luck * 2);
                return { damage: dmg, desc: `🐉 *Dragon Breath!*\nNagamu memuntahkan api dahsyat!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'wolf_pack',
            name: 'Wolf Pack',
            emoji: '🐺',
            mpCost: 30,
            cooldownTurns: 3,
            unlockLevel: 17,
            desc: 'Kawanan serigala menyerang. DMG = LUK × 3 + INT × 3',
            effect: (p) => {
                const dmg = Math.floor(p.luck * 3 + p.intelligence * 3);
                return { damage: dmg, desc: `🐺 *Wolf Pack!*\nKawanan serigala menerkam musuh!\nDMG: *${dmg}*` };
            }
        },
        {
            id: 'nature_blessing',
            name: 'Nature Blessing',
            emoji: '🌸',
            mpCost: 22,
            cooldownTurns: 3,
            unlockLevel: 26,
            desc: 'Berkah alam — Heal HP = WIS × 4 + LUK × 2',
            effect: (p) => {
                const heal = Math.floor(p.wisdom * 4 + p.luck * 2);
                return { heal, desc: `🌸 *Nature Blessing!*\nAlam memberikan berkah!\nHP +*${heal}*` };
            }
        },
        {
            id: 'ancient_summon',
            name: 'Ancient Summon',
            emoji: '🌌',
            mpCost: 60,
            cooldownTurns: 6,
            unlockLevel: 40,
            desc: 'Ultimate — panggil makhluk purba. DMG = INT × 6 + WIS × 5 + LUK × 3',
            effect: (p) => {
                const dmg = Math.floor(p.intelligence * 6 + p.wisdom * 5 + p.luck * 3);
                return { damage: dmg, desc: `🌌 *Ancient Summon!*\nMakhluk purba hadir dari dimensi lain!\nDMG: *${dmg}*` };
            }
        },
    ],

    non: [],
};

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════

/** Ambil semua skill dari pool berdasarkan class */
function getSkillPool(className) {
    return SKILL_POOL[className] || [];
}

/** Cari skill dari pool by id atau name (case-insensitive) */
function findSkillFromPool(className, query) {
    const pool = getSkillPool(className);
    const q = query.toLowerCase().replace(/\s+/g, '_');
    return pool.find(s =>
        s.id === q ||
        s.name.toLowerCase() === query.toLowerCase() ||
        s.name.toLowerCase().replace(/\s+/g, '_') === q
    ) || null;
}

module.exports = { SKILL_POOL, getSkillPool, findSkillFromPool };
