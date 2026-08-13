// ============================================================
//  monsters_tier_d.js  (redesign — 20 monster)
//  Struktur data monster Tier D (Uncommon) untuk bot WA RPG
//  Target level player: 8–18
//
//  Area:
//    Lama : forest, cave, swamp, plains, ruins
//    Baru : frozen (Pegunungan Beku), coast (Pesisir Gelap)
//
//  Damage type rules:
//    - physical : Beast, Insect, Reptile, Construct → pakai STR
//    - magic    : Undead, Plant, Elemental          → pakai INT + WIS
//
//  Formula derived stats (sama persis dengan player):
//    maxHP     = VIT × 10 + DEF × 3 + 50
//    maxMP     = INT × 2  + WIS × 3  + 30
//    physATK   = STR × 2.5 + 10
//    magicATK  = INT × 2   + WIS × 1.5 + 5
//    critRate  = LUK × 0.8              (maks 60%)
//    dodgeRate = AGI × 0.5              (maks 40%)
//    maxAP     = 3 + Math.floor(AGI / 10)
// ============================================================

const TIER_D_MONSTERS = {

    // ── HUTAN (3) ──────────────────────────────────────────
    dark_bear: {
        name       : 'Dark Bear',
        emoji      : '🐻',
        type       : 'Beast',
        damageType : 'physical',
        area       : 'forest',
        tier       : 'D',
        stats: {
            str : 83,
            agi : 38,
            int : 16,
            dex : 32,
            def : 58,
            vit : 64,
            wis : 16,
            luk : 26,
        },
        reward: {
            xp   : { min: 166, max: 218 },
            gold : { min: 84, max: 160 },
            drops: [
                { item: 'Bear Claw',  rate: 0.70 },
                { item: 'Dark Fur',   rate: 0.65 },
                { item: 'Bear Gall',  rate: 0.20 },
            ],
        },
        skill: {
            name    : 'Maul',
            type    : 'active',
            desc    : '3 hit kecil cepat, total 1.5× ATK. Cooldown 2.',
            apCost  : 3,
            mpCost  : 0,
            cooldown: 2,
            trigger : 'on_use',
            effect  : { multiHit: { count: 3, totalMultiplier: 1.5 } },
        },
    },

    ancient_treant: {
        name       : 'Ancient Treant',
        emoji      : '🌳',
        type       : 'Plant',
        damageType : 'magic',
        area       : 'forest',
        tier       : 'D',
        stats: {
            str : 26,
            agi : 13,
            int : 64,
            dex : 19,
            def : 70,
            vit : 70,
            wis : 58,
            luk : 22,
        },
        reward: {
            xp   : { min: 186, max: 244 },
            gold : { min: 93, max: 168 },
            drops: [
                { item: 'Ancient Bark', rate: 0.75 },
                { item: 'Life Sap',     rate: 0.50 },
                { item: 'Forest Core',  rate: 0.18 },
            ],
        },
        skill: {
            name    : 'Root Bind',
            type    : 'active',
            desc    : '50% chance ikat musuh 2 turn + magic damage 0.8×.',
            apCost  : 2,
            mpCost  : 15,
            cooldown: 3,
            trigger : 'on_use',
            effect  : {
                damageType    : 'magic',
                atkMultiplier : 0.8,
                immobilize    : { chance: 0.50, duration: 2 },
            },
        },
    },

    crimson_lion: {
        name       : 'Crimson Lion',
        emoji      : '🦁',
        type       : 'Beast',
        damageType : 'physical',
        area       : 'forest',
        tier       : 'D',
        stats: {
            str : 90,
            agi : 58,
            int : 16,
            dex : 45,
            def : 45,
            vit : 54,
            wis : 16,
            luk : 45,
        },
        reward: {
            xp   : { min: 192, max: 252 },
            gold : { min: 101, max: 185 },
            drops: [
                { item: 'Lion Mane',    rate: 0.65 },
                { item: 'Crimson Fang', rate: 0.45 },
                { item: 'Pride Stone',  rate: 0.20 },
            ],
        },
        skill: {
            name    : 'Roar',
            type    : 'active',
            desc    : 'Cooldown 3. Kurangi ATK musuh −20% + crit rate musuh −10% selama 2 turn.',
            apCost  : 2,
            mpCost  : 0,
            cooldown: 3,
            trigger : 'on_use',
            effect  : {
                debuffs: [
                    { stat: 'atk',      amount: -0.20, mode: 'percent', duration: 2 },
                    { stat: 'critRate', amount: -10,   mode: 'flat',    duration: 2 },
                ],
            },
        },
    },

    // ── GUA (3) ────────────────────────────────────────────
    plague_zombie: {
        name       : 'Plague Zombie',
        emoji      : '🧟',
        type       : 'Undead',
        damageType : 'magic',
        area       : 'cave',
        tier       : 'D',
        stats: {
            str : 22,
            agi : 22,
            int : 58,
            dex : 26,
            def : 51,
            vit : 64,
            wis : 45,
            luk : 29,
        },
        reward: {
            xp   : { min: 160, max: 210 },
            gold : { min: 67, max: 126 },
            drops: [
                { item: 'Plague Flesh', rate: 0.80 },
                { item: 'Zombie Bone',  rate: 0.60 },
                { item: 'Plague Vial',  rate: 0.25 },
            ],
        },
        skill: {
            name    : 'Plague Touch',
            type    : 'active',
            desc    : '60% chance infeksi: −6 HP/turn selama 3 turn + DEF −4.',
            apCost  : 2,
            mpCost  : 10,
            cooldown: 2,
            trigger : 'on_use',
            effect  : {
                chance : 0.60,
                dot    : { dmgPerTurn: 6, duration: 3, type: 'plague' },
                debuff : { stat: 'def', amount: -4, duration: 'battle' },
            },
        },
    },

    blood_vampire_bat: {
        name       : 'Blood Vampire Bat',
        emoji      : '🦇',
        type       : 'Beast',
        damageType : 'physical',
        area       : 'cave',
        tier       : 'D',
        stats: {
            str : 64,
            agi : 83,
            int : 22,
            dex : 64,
            def : 26,
            vit : 38,
            wis : 22,
            luk : 51,
        },
        reward: {
            xp   : { min: 173, max: 227 },
            gold : { min: 77, max: 143 },
            drops: [
                { item: 'Vampire Wing', rate: 0.70 },
                { item: 'Blood Shard',  rate: 0.40 },
                { item: 'Dark Crystal', rate: 0.22 },
            ],
        },
        skill: {
            name    : 'Blood Feast',
            type    : 'passive',
            desc    : 'Steal 20% dari damage yang diberikan sebagai HP.',
            trigger : 'on_hit',
            effect  : { lifeSteal: 0.20 },
        },
    },

    boulder_golem: {
        name       : 'Boulder Golem',
        emoji      : '🪨',
        type       : 'Construct',
        damageType : 'physical',
        area       : 'cave',
        tier       : 'D',
        stats: {
            str : 70,
            agi : 10,
            int : 13,
            dex : 16,
            def : 96,
            vit : 77,
            wis : 13,
            luk : 16,
        },
        reward: {
            xp   : { min: 198, max: 260 },
            gold : { min: 101, max: 185 },
            drops: [
                { item: 'Golem Core',    rate: 0.60 },
                { item: 'Boulder Chunk', rate: 0.75 },
                { item: 'Iron Dust',     rate: 0.45 },
            ],
        },
        skill: {
            name    : 'Seismic Slam',
            type    : 'active',
            desc    : 'Damage ×1.8, 35% chance stun 1 turn. Cooldown 3.',
            apCost  : 3,
            mpCost  : 0,
            cooldown: 3,
            trigger : 'on_use',
            effect  : { atkMultiplier: 1.8, stun: { chance: 0.35, duration: 1 } },
        },
    },

    // ── RAWA (3) ───────────────────────────────────────────
    venomfang_croc: {
        name       : 'Venomfang Croc',
        emoji      : '🐊',
        type       : 'Reptile',
        damageType : 'physical',
        area       : 'swamp',
        tier       : 'D',
        stats: {
            str : 80,
            agi : 29,
            int : 19,
            dex : 29,
            def : 64,
            vit : 70,
            wis : 19,
            luk : 29,
        },
        reward: {
            xp   : { min: 186, max: 244 },
            gold : { min: 92, max: 168 },
            drops: [
                { item: 'Venom Scale', rate: 0.70 },
                { item: 'Croc Fang',   rate: 0.55 },
                { item: 'Venom Sac',   rate: 0.30 },
            ],
        },
        skill: {
            name    : 'Death Roll',
            type    : 'active',
            desc    : 'Damage ×1.5 + 45% chance racun parah (−8 HP/turn, 3 turn).',
            apCost  : 3,
            mpCost  : 0,
            cooldown: 2,
            trigger : 'on_use',
            effect  : {
                atkMultiplier : 1.5,
                dot           : { dmgPerTurn: 8, duration: 3, type: 'poison', chance: 0.45 },
            },
        },
    },

    corpse_flower: {
        name       : 'Corpse Flower',
        emoji      : '🌺',
        type       : 'Plant',
        damageType : 'magic',
        area       : 'swamp',
        tier       : 'D',
        stats: {
            str : 16,
            agi : 16,
            int : 70,
            dex : 22,
            def : 45,
            vit : 58,
            wis : 64,
            luk : 32,
        },
        reward: {
            xp   : { min: 176, max: 231 },
            gold : { min: 76, max: 147 },
            drops: [
                { item: 'Death Petal',   rate: 0.70 },
                { item: 'Corpse Pollen', rate: 0.55 },
                { item: 'Black Seed',    rate: 0.20 },
            ],
        },
        skill: {
            name    : 'Stench Cloud',
            type    : 'active',
            desc    : 'AoE magic damage 0.7× + 40% chance mual (skip 1 turn) ke semua musuh.',
            apCost  : 3,
            mpCost  : 20,
            cooldown: 3,
            trigger : 'on_use',
            effect  : {
                aoe           : true,
                damageType    : 'magic',
                atkMultiplier : 0.7,
                nausea        : { chance: 0.40, skipTurn: true, duration: 1 },
            },
        },
    },

    swamp_lurker: {
        name       : 'Swamp Lurker',
        emoji      : '🐙',
        type       : 'Beast',
        damageType : 'physical',
        area       : 'swamp',
        tier       : 'D',
        stats: {
            str : 58,
            agi : 38,
            int : 19,
            dex : 45,
            def : 38,
            vit : 51,
            wis : 19,
            luk : 38,
        },
        reward: {
            xp   : { min: 166, max: 218 },
            gold : { min: 76, max: 15 },
            drops: [
                { item: 'Tentacle Shard', rate: 0.65 },
                { item: 'Murky Ink',      rate: 0.60 },
                { item: 'Lurker Eye',     rate: 0.25 },
            ],
        },
        skill: {
            name    : 'Ink Blast',
            type    : 'active',
            desc    : '55% chance blind musuh: HIT_RATE −30% selama 2 turn.',
            apCost  : 2,
            mpCost  : 0,
            cooldown: 2,
            trigger : 'on_use',
            effect  : { debuff: { stat: 'hitRate', amount: -30, duration: 2 }, chance: 0.55 },
        },
    },

    // ── PADANG (2) ─────────────────────────────────────────
    war_rhino: {
        name       : 'War Rhino',
        emoji      : '🦏',
        type       : 'Beast',
        damageType : 'physical',
        area       : 'plains',
        tier       : 'D',
        stats: {
            str : 96,
            agi : 32,
            int : 13,
            dex : 26,
            def : 70,
            vit : 77,
            wis : 13,
            luk : 22,
        },
        reward: {
            xp   : { min: 208, max: 273 },
            gold : { min: 109, max: 202 },
            drops: [
                { item: 'Rhino Horn',  rate: 0.60 },
                { item: 'Thick Plate', rate: 0.70 },
                { item: 'War Stone',   rate: 0.18 },
            ],
        },
        skill: {
            name    : 'Horn Charge',
            type    : 'active',
            desc    : 'Ignore 40% DEF musuh + damage ×1.7. Cooldown 3.',
            apCost  : 3,
            mpCost  : 0,
            cooldown: 3,
            trigger : 'on_use',
            effect  : { atkMultiplier: 1.7, defPenetration: 0.40 },
        },
    },

    thunder_hawk: {
        name       : 'Thunder Hawk',
        emoji      : '🦅',
        type       : 'Beast',
        damageType : 'physical',
        area       : 'plains',
        tier       : 'D',
        stats: {
            str : 70,
            agi : 90,
            int : 19,
            dex : 70,
            def : 32,
            vit : 42,
            wis : 19,
            luk : 51,
        },
        reward: {
            xp   : { min: 179, max: 235 },
            gold : { min: 84, max: 160 },
            drops: [
                { item: 'Thunder Feather', rate: 0.70 },
                { item: 'Hawk Talon',      rate: 0.50 },
                { item: 'Storm Gem',       rate: 0.20 },
            ],
        },
        skill: {
            name    : 'Lightning Dive',
            type    : 'active',
            desc    : 'Damage ×1.6, abaikan dodge musuh. Cooldown 2.',
            apCost  : 3,
            mpCost  : 0,
            cooldown: 2,
            trigger : 'on_use',
            effect  : { atkMultiplier: 1.6, ignoresDodge: true },
        },
    },

    // ── RERUNTUHAN (3) ─────────────────────────────────────
    death_knight: {
        name       : 'Death Knight',
        emoji      : '💀',
        type       : 'Undead',
        damageType : 'magic',
        area       : 'ruins',
        tier       : 'D',
        stats: {
            str : 32,
            agi : 32,
            int : 70,
            dex : 32,
            def : 77,
            vit : 58,
            wis : 51,
            luk : 32,
        },
        reward: {
            xp   : { min: 224, max: 194 },
            gold : { min: 118, max: 210 },
            drops: [
                { item: 'Knight Armor Shard', rate: 0.55 },
                { item: 'Soul Blade',         rate: 0.35 },
                { item: 'Dark Emblem',        rate: 0.20 },
            ],
        },
        skill: {
            name    : 'Soul Slash',
            type    : 'active',
            desc    : 'Magic damage ×1.4, abaikan DEF 30%. Cooldown 2.',
            apCost  : 3,
            mpCost  : 15,
            cooldown: 2,
            trigger : 'on_use',
            effect  : { damageType: 'magic', atkMultiplier: 1.4, defPenetration: 0.30 },
        },
    },

    cursed_idol: {
        name       : 'Cursed Idol',
        emoji      : '🧿',
        type       : 'Undead',
        damageType : 'magic',
        area       : 'ruins',
        tier       : 'D',
        stats: {
            str : 16,
            agi : 26,
            int : 83,
            dex : 32,
            def : 51,
            vit : 45,
            wis : 58,
            luk : 51,
        },
        reward: {
            xp   : { min: 208, max: 273 },
            gold : { min: 101, max: 193 },
            drops: [
                { item: 'Cursed Eye Stone', rate: 0.60 },
                { item: 'Idol Fragment',    rate: 0.65 },
                { item: 'Ancient Rune',     rate: 0.22 },
            ],
        },
        skill: {
            name    : 'Curse Beam',
            type    : 'active',
            desc    : '45% chance: STR −8, AGI −8, LUK −8 selama 3 turn.',
            apCost  : 2,
            mpCost  : 18,
            cooldown: 3,
            trigger : 'on_use',
            effect  : {
                chance  : 0.45,
                debuffs : [
                    { stat: 'str', amount: -8, duration: 3 },
                    { stat: 'agi', amount: -8, duration: 3 },
                    { stat: 'luk', amount: -8, duration: 3 },
                ],
            },
        },
    },

    ruin_guardian: {
        name       : 'Ruin Guardian',
        emoji      : '⚔️',
        type       : 'Construct',
        damageType : 'physical',
        area       : 'ruins',
        tier       : 'D',
        stats: {
            str : 77,
            agi : 26,
            int : 19,
            dex : 26,
            def : 83,
            vit : 70,
            wis : 19,
            luk : 26,
        },
        reward: {
            xp   : { min: 218, max: 286 },
            gold : { min: 109, max: 202 },
            drops: [
                { item: 'Guardian Core', rate: 0.55 },
                { item: 'Ancient Steel', rate: 0.60 },
                { item: 'Ruin Badge',    rate: 0.25 },
            ],
        },
        skill: {
            name    : 'Guardian Strike',
            type    : 'active',
            desc    : 'Damage ×1.5 + self DEF +15 selama 2 turn. Cooldown 2.',
            apCost  : 3,
            mpCost  : 0,
            cooldown: 2,
            trigger : 'on_use',
            effect  : {
                atkMultiplier : 1.5,
                selfBuff      : { stat: 'def', amount: 15, duration: 2 },
            },
        },
    },

    // ── PEGUNUNGAN BEKU (3) ────────────────────────────────
    frost_wolf: {
        name       : 'Frost Wolf',
        emoji      : '🐺',
        type       : 'Beast',
        damageType : 'physical',
        area       : 'frozen',
        tier       : 'D',
        stats: {
            str : 70,
            agi : 70,
            int : 26,
            dex : 58,
            def : 45,
            vit : 48,
            wis : 26,
            luk : 38,
        },
        reward: {
            xp   : { min: 173, max: 227 },
            gold : { min: 84, max: 160 },
            drops: [
                { item: 'Frost Pelt', rate: 0.70 },
                { item: 'Ice Fang',   rate: 0.50 },
                { item: 'Frost Gem',  rate: 0.20 },
            ],
        },
        skill: {
            name    : 'Blizzard Howl',
            type    : 'active',
            desc    : 'Cooldown 3. AGI semua musuh −12 selama 2 turn (efek beku).',
            apCost  : 2,
            mpCost  : 0,
            cooldown: 3,
            trigger : 'on_use',
            effect  : { debuff: { stat: 'agi', amount: -12, duration: 2 }, target: 'all_enemies' },
        },
    },

    avalanche_elemental: {
        name       : 'Avalanche Elemental',
        emoji      : '🏔️',
        type       : 'Elemental',
        damageType : 'magic',
        area       : 'frozen',
        tier       : 'D',
        stats: {
            str : 19,
            agi : 26,
            int : 77,
            dex : 26,
            def : 58,
            vit : 58,
            wis : 64,
            luk : 32,
        },
        reward: {
            xp   : { min: 192, max: 252 },
            gold : { min: 92, max: 176 },
            drops: [
                { item: 'Ice Core',        rate: 0.65 },
                { item: 'Avalanche Shard', rate: 0.50 },
                { item: 'Frozen Crystal',  rate: 0.22 },
            ],
        },
        skill: {
            name    : 'Avalanche',
            type    : 'active',
            desc    : 'AoE magic 1.2×, 40% chance freeze: musuh skip 1 turn.',
            apCost  : 3,
            mpCost  : 22,
            cooldown: 3,
            trigger : 'on_use',
            effect  : {
                aoe           : true,
                damageType    : 'magic',
                atkMultiplier : 1.2,
                freeze        : { chance: 0.40, skipTurn: true, duration: 1 },
            },
        },
    },

    arctic_fox_spirit: {
        name       : 'Arctic Fox Spirit',
        emoji      : '🦊',
        type       : 'Undead',
        damageType : 'magic',
        area       : 'frozen',
        tier       : 'D',
        stats: {
            str : 19,
            agi : 77,
            int : 64,
            dex : 64,
            def : 32,
            vit : 38,
            wis : 51,
            luk : 58,
        },
        reward: {
            xp   : { min: 186, max: 244 },
            gold : { min: 84, max: 168 },
            drops: [
                { item: 'Spirit Fur', rate: 0.65 },
                { item: 'Ice Wisp',   rate: 0.45 },
                { item: 'Arctic Gem', rate: 0.22 },
            ],
        },
        skill: {
            name    : 'Phantom Blizzard',
            type    : 'active',
            desc    : 'Magic damage + 50% chance dodge buff diri sendiri +20% selama 2 turn.',
            apCost  : 2,
            mpCost  : 15,
            cooldown: 2,
            trigger : 'on_use',
            effect  : {
                damageType : 'magic',
                selfBuff   : { stat: 'dodgeRate', amount: 20, duration: 2, chance: 0.50 },
            },
        },
    },

    // ── PESISIR GELAP (3) ──────────────────────────────────
    tide_crab: {
        name       : 'Tide Crab',
        emoji      : '🦀',
        type       : 'Beast',
        damageType : 'physical',
        area       : 'coast',
        tier       : 'D',
        stats: {
            str : 64,
            agi : 32,
            int : 16,
            dex : 32,
            def : 77,
            vit : 64,
            wis : 16,
            luk : 29,
        },
        reward: {
            xp   : { min: 166, max: 218 },
            gold : { min: 76, max: 151 },
            drops: [
                { item: 'Tide Claw',       rate: 0.70 },
                { item: 'Sea Shell Armor', rate: 0.60 },
                { item: 'Ocean Pearl',     rate: 0.18 },
            ],
        },
        skill: {
            name    : 'Crushing Claw',
            type    : 'active',
            desc    : 'Damage ×1.4, DEF musuh −6 permanen sampai battle selesai.',
            apCost  : 2,
            mpCost  : 0,
            cooldown: 2,
            trigger : 'on_use',
            effect  : {
                atkMultiplier : 1.4,
                debuff        : { stat: 'def', amount: -6, duration: 'battle' },
            },
        },
    },

    wave_specter: {
        name       : 'Wave Specter',
        emoji      : '🌊',
        type       : 'Undead',
        damageType : 'magic',
        area       : 'coast',
        tier       : 'D',
        stats: {
            str : 15,
            agi : 58,
            int : 70,
            dex : 51,
            def : 32,
            vit : 42,
            wis : 58,
            luk : 45,
        },
        reward: {
            xp   : { min: 179, max: 235 },
            gold : { min: 84, max: 160 },
            drops: [
                { item: 'Wave Essence', rate: 0.65 },
                { item: 'Ghost Coral',  rate: 0.50 },
                { item: 'Deep Gem',     rate: 0.20 },
            ],
        },
        skill: {
            name    : 'Tidal Drain',
            type    : 'active',
            desc    : 'Steal 18% MP musuh + magic damage sebesar MP yang dicuri.',
            apCost  : 2,
            mpCost  : 0,
            cooldown: 3,
            trigger : 'on_use',
            effect  : { stealMpPercent: 0.18, dealDmgEqualToStolenMp: true, damageType: 'magic' },
        },
    },

    dark_dolphin: {
        name       : 'Dark Dolphin',
        emoji      : '🐬',
        type       : 'Beast',
        damageType : 'physical',
        area       : 'coast',
        tier       : 'D',
        stats: {
            str : 58,
            agi : 96,
            int : 26,
            dex : 77,
            def : 32,
            vit : 45,
            wis : 26,
            luk : 58,
        },
        reward: {
            xp   : { min: 173, max: 227},
            gold : { min: 84, max: 160 },
            drops: [
                { item: 'Dark Fin',    rate: 0.65 },
                { item: 'Echo Stone',  rate: 0.50 },
                { item: 'Sea Crystal', rate: 0.20 },
            ],
        },
        skill: {
            name    : 'Sonic Burst',
            type    : 'active',
            desc    : '50% chance stun 1 turn + damage 0.9×. Crit rate +20% turn ini via LUK.',
            apCost  : 2,
            mpCost  : 0,
            cooldown: 2,
            trigger : 'on_use',
            effect  : {
                atkMultiplier : 0.9,
                stun          : { chance: 0.50, duration: 1 },
                tempCritBuff  : { amount: 20, duration: 1 },
            },
        },
    },

};

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

/**
 * Hitung derived stats monster — formula sama dengan player
 */
function calcMonsterDerived(stats, damageType) {
    const { str, agi, int: INT, dex, def, vit, wis, luk } = stats;
    const physATK  = +(str * 2.5 + 10).toFixed(1);
    const magicATK = +(INT * 2 + wis * 1.5 + 5).toFixed(1);
    return {
        maxHP     : Math.round(vit * 10 + def * 3 + 50),
        maxMP     : Math.round(INT * 2 + wis * 3 + 30),
        atk       : damageType === 'magic' ? magicATK : physATK,
        physATK,
        magicATK,
        critRate  : Math.min(+(luk * 0.8).toFixed(1), 60),
        dodgeRate : Math.min(+(agi * 0.5).toFixed(1), 40),
        maxAP     : 3 + Math.floor(agi / 10),
    };
}

/** Ambil monster lengkap + derived */
function getMonster(monsterId) {
    const m = TIER_D_MONSTERS[monsterId];
    if (!m) return null;
    return { ...m, derived: calcMonsterDerived(m.stats, m.damageType) };
}

/** Random monster dari area tertentu */
function getRandomMonsterByArea(area) {
    const pool = Object.values(TIER_D_MONSTERS).filter(m => m.area === area);
    if (!pool.length) return null;
    const m = pool[Math.floor(Math.random() * pool.length)];
    return { ...m, derived: calcMonsterDerived(m.stats, m.damageType) };
}

/** Semua monster dari area tertentu */
function getMonstersByArea(area) {
    return Object.values(TIER_D_MONSTERS)
        .filter(m => m.area === area)
        .map(m => ({ ...m, derived: calcMonsterDerived(m.stats, m.damageType) }));
}

/** Roll gold */
function rollGold({ min, max }) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Roll item drops */
function rollDrops(drops) {
    return drops.filter(d => Math.random() < d.rate).map(d => d.item);
}

module.exports = {
    TIER_D_MONSTERS,
    calcMonsterDerived,
    getMonster,
    getRandomMonsterByArea,
    getMonstersByArea,
    rollGold,
    rollDrops,
};
