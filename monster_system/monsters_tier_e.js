// ============================================================
//  monsters_tier_e.js
//  Struktur data monster Tier E (Semi-Common) untuk bot WA RPG
//  Target level player: 3–8
//
//  Damage type rules:
//    - physical : Beast, Insect, Reptile  → pakai STR
//    - magic    : Undead, Plant           → pakai INT + WIS
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

const TIER_E_MONSTERS = {

    // ── HUTAN ──────────────────────────────────────────────
    iron_boar: {
        name       : 'Iron Boar',
        emoji      : '🐗',
        type       : 'Beast',
        damageType : 'physical',
        area       : 'forest',
        tier       : 'E',
        stats: {
            str : 17,
            agi : 12,
            int :  4,
            dex : 10,
            def : 14,
            vit : 12,
            wis :  4,
            luk :  7,
        },
        reward: {
            xp   : 30,
            gold : { min: 8, max: 18 },
            drops: [
                { item: 'Iron Tusk',   rate: 0.65 },
                { item: 'Thick Hide',  rate: 0.70 },
            ],
        },
        skill: {
            name    : 'Tusk Slam',
            type    : 'active',
            desc    : 'Damage ×1.4 + 25% chance knockback (musuh −1 AP next turn).',
            apCost  : 3,
            mpCost  : 0,
            cooldown: 2,
            trigger : 'on_use',
            effect  : { atkMultiplier: 1.4, knockback: { chance: 0.25, apLoss: 1, duration: 1 } },
        },
    },

    moss_gecko: {
        name       : 'Moss Gecko',
        emoji      : '🦎',
        type       : 'Reptile',
        damageType : 'physical',
        area       : 'forest',
        tier       : 'E',
        stats: {
            str : 12,
            agi : 18,
            int :  5,
            dex : 16,
            def :  8,
            vit : 10,
            wis :  5,
            luk : 10,
        },
        reward: {
            xp   : 26,
            gold : { min: 7, max: 15 },
            drops: [
                { item: 'Gecko Tail',  rate: 0.75 },
                { item: 'Moss Scale',  rate: 0.55 },
            ],
        },
        skill: {
            name    : 'Camouflage',
            type    : 'active',
            desc    : '35% chance dodge serangan fisik selama 2 turn.',
            apCost  : 1,
            mpCost  : 0,
            cooldown: 3,
            trigger : 'on_use',
            effect  : { conditionalDodge: { chance: 0.35, duration: 2, condition: 'physical_only' } },
        },
    },

    hornet_guard: {
        name       : 'Hornet Guard',
        emoji      : '🐝',
        type       : 'Insect',
        damageType : 'physical',
        area       : 'forest',
        tier       : 'E',
        stats: {
            str : 14,
            agi : 20,
            int :  5,
            dex : 14,
            def :  6,
            vit :  8,
            wis :  4,
            luk :  9,
        },
        reward: {
            xp   : 28,
            gold : { min: 7, max: 16 },
            drops: [
                { item: 'Hornet Stinger', rate: 0.70 },
                { item: 'Honey Comb',     rate: 0.45 },
            ],
        },
        skill: {
            name    : 'Swarm',
            type    : 'active',
            desc    : 'Serang 2× dalam 1 turn, masing-masing 0.7× ATK.',
            apCost  : 3,
            mpCost  : 0,
            cooldown: 2,
            trigger : 'on_use',
            effect  : { multiHit: { count: 2, atkMultiplier: 0.7 } },
        },
    },

    // ── GUA ────────────────────────────────────────────────
    spike_mole: {
        name       : 'Spike Mole',
        emoji      : '🦔',
        type       : 'Beast',
        damageType : 'physical',
        area       : 'cave',
        tier       : 'E',
        stats: {
            str : 13,
            agi :  8,
            int :  4,
            dex :  8,
            def : 18,
            vit : 13,
            wis :  4,
            luk :  6,
        },
        reward: {
            xp   : 27,
            gold : { min: 8, max: 17 },
            drops: [
                { item: 'Mole Spike', rate: 0.70 },
                { item: 'Cave Dirt',  rate: 0.60 },
            ],
        },
        skill: {
            name    : 'Curl',
            type    : 'active',
            desc    : 'DEF +50% selama 1 turn. Musuh yang menyerang saat Curl aktif kena 8 damage balik.',
            apCost  : 1,
            mpCost  : 0,
            cooldown: 2,
            trigger : 'on_use',
            effect  : { selfBuff: { stat: 'def', multiplier: 1.5, duration: 1 }, thorns: { dmg: 8, duration: 1 } },
        },
    },

    cave_beetle: {
        name       : 'Cave Beetle',
        emoji      : '🪲',
        type       : 'Insect',
        damageType : 'physical',
        area       : 'cave',
        tier       : 'E',
        stats: {
            str : 11,
            agi : 10,
            int :  4,
            dex : 10,
            def : 16,
            vit : 11,
            wis :  4,
            luk :  7,
        },
        reward: {
            xp   : 25,
            gold : { min: 6, max: 14 },
            drops: [
                { item: 'Beetle Shell', rate: 0.80 },
                { item: 'Cave Gem',     rate: 0.20 },
            ],
        },
        skill: {
            name    : 'Shell Charge',
            type    : 'active',
            desc    : 'Cooldown 2. Damage ×1.5, abaikan 20% DEF musuh.',
            apCost  : 2,
            mpCost  : 0,
            cooldown: 2,
            trigger : 'on_use',
            effect  : { atkMultiplier: 1.5, defPenetration: 0.20 },
        },
    },

    lost_spirit: {
        name       : 'Lost Spirit',
        emoji      : '👻',
        type       : 'Undead',
        damageType : 'magic',
        area       : 'cave',
        tier       : 'E',
        stats: {
            str :  5,
            agi : 14,
            int : 14,
            dex : 12,
            def :  6,
            vit :  8,
            wis : 10,
            luk : 10,
        },
        reward: {
            xp   : 32,
            gold : { min: 9, max: 18 },
            drops: [
                { item: 'Spirit Shard', rate: 0.65 },
                { item: 'Ectoplasm',    rate: 0.50 },
            ],
        },
        skill: {
            name    : 'Haunt',
            type    : 'active',
            desc    : '45% chance musuh panik, skip giliran berikutnya.',
            apCost  : 2,
            mpCost  : 8,
            cooldown: 2,
            trigger : 'on_use',
            effect  : { panic: { chance: 0.45, skipTurn: true, duration: 1 } },
        },
    },

    // ── RAWA ───────────────────────────────────────────────
    mud_turtle: {
        name       : 'Mud Turtle',
        emoji      : '🐢',
        type       : 'Reptile',
        damageType : 'physical',
        area       : 'swamp',
        tier       : 'E',
        stats: {
            str : 10,
            agi :  5,
            int :  4,
            dex :  6,
            def : 22,
            vit : 16,
            wis :  4,
            luk :  6,
        },
        reward: {
            xp   : 28,
            gold : { min: 8, max: 16 },
            drops: [
                { item: 'Turtle Shell', rate: 0.60 },
                { item: 'Mud Stone',    rate: 0.50 },
            ],
        },
        skill: {
            name    : 'Shell Guard',
            type    : 'active',
            desc    : 'DEF ×2 selama 1 turn, tidak menyerang. HP regen +10 turn itu.',
            apCost  : 1,
            mpCost  : 0,
            cooldown: 2,
            trigger : 'on_use',
            effect  : { selfBuff: { stat: 'def', multiplier: 2.0, duration: 1 }, hpRegen: 10, skipAttack: true },
        },
    },

    bog_creeper: {
        name       : 'Bog Creeper',
        emoji      : '🌿',
        type       : 'Plant',
        damageType : 'magic',
        area       : 'swamp',
        tier       : 'E',
        stats: {
            str :  5,
            agi :  5,
            int : 12,
            dex :  6,
            def : 10,
            vit : 12,
            wis : 12,
            luk :  7,
        },
        reward: {
            xp   : 26,
            gold : { min: 7, max: 14 },
            drops: [
                { item: 'Creeper Root', rate: 0.75 },
                { item: 'Bog Herb',     rate: 0.60 },
            ],
        },
        skill: {
            name    : 'Poison Spore',
            type    : 'active',
            desc    : '55% chance racun (−4 HP/turn selama 2 turn).',
            apCost  : 2,
            mpCost  : 8,
            cooldown: 2,
            trigger : 'on_use',
            effect  : { dot: { dmgPerTurn: 4, duration: 2, type: 'poison' }, chance: 0.55 },
        },
    },

    swamp_crab: {
        name       : 'Swamp Crab',
        emoji      : '🦞',
        type       : 'Beast',
        damageType : 'physical',
        area       : 'swamp',
        tier       : 'E',
        stats: {
            str : 15,
            agi :  7,
            int :  4,
            dex :  7,
            def : 18,
            vit : 14,
            wis :  4,
            luk :  8,
        },
        reward: {
            xp   : 30,
            gold : { min: 9, max: 18 },
            drops: [
                { item: 'Crab Claw',   rate: 0.65 },
                { item: 'Crab Shell',  rate: 0.70 },
                { item: 'Swamp Pearl', rate: 0.15 },
            ],
        },
        skill: {
            name    : 'Pincer Lock',
            type    : 'active',
            desc    : '40% chance immobilize musuh 1 turn + damage ×1.2.',
            apCost  : 2,
            mpCost  : 0,
            cooldown: 2,
            trigger : 'on_use',
            effect  : { atkMultiplier: 1.2, immobilize: { chance: 0.40, duration: 1 } },
        },
    },

    // ── PADANG ─────────────────────────────────────────────
    prairie_bull: {
        name       : 'Prairie Bull',
        emoji      : '🐂',
        type       : 'Beast',
        damageType : 'physical',
        area       : 'plains',
        tier       : 'E',
        stats: {
            str : 20,
            agi : 10,
            int :  3,
            dex :  8,
            def : 12,
            vit : 14,
            wis :  3,
            luk :  6,
        },
        reward: {
            xp   : 35,
            gold : { min: 10, max: 22 },
            drops: [
                { item: 'Bull Horn', rate: 0.60 },
                { item: 'Bull Hide', rate: 0.65 },
            ],
        },
        skill: {
            name    : 'Stampede',
            type    : 'active',
            desc    : 'Turn pertama battle saja, damage ×2.0.',
            apCost  : 3,
            mpCost  : 0,
            cooldown: 0,
            trigger : 'turn_1_only',
            effect  : { atkMultiplier: 2.0, usageLimit: 1 },
        },
    },

    sun_wisp: {
        name       : 'Sun Wisp',
        emoji      : '🌻',
        type       : 'Plant',
        damageType : 'magic',
        area       : 'plains',
        tier       : 'E',
        stats: {
            str :  4,
            agi :  8,
            int : 14,
            dex :  8,
            def :  7,
            vit :  8,
            wis : 12,
            luk : 10,
        },
        reward: {
            xp   : 27,
            gold : { min: 7, max: 15 },
            drops: [
                { item: 'Sun Petal',  rate: 0.70 },
                { item: 'Light Dust', rate: 0.50 },
            ],
        },
        skill: {
            name    : 'Solar Flare',
            type    : 'active',
            desc    : '40% chance blind musuh, HIT_RATE −25% selama 2 turn.',
            apCost  : 2,
            mpCost  : 10,
            cooldown: 3,
            trigger : 'on_use',
            effect  : { debuff: { stat: 'hitRate', amount: -25, duration: 2 }, chance: 0.40 },
        },
    },

    dust_bison: {
        name       : 'Dust Bison',
        emoji      : '🦬',
        type       : 'Beast',
        damageType : 'physical',
        area       : 'plains',
        tier       : 'E',
        stats: {
            str : 18,
            agi : 11,
            int :  3,
            dex :  9,
            def : 14,
            vit : 15,
            wis :  3,
            luk :  7,
        },
        reward: {
            xp   : 33,
            gold : { min: 10, max: 20 },
            drops: [
                { item: 'Bison Fur',  rate: 0.70 },
                { item: 'Bison Horn', rate: 0.55 },
            ],
        },
        skill: {
            name    : 'Dust Cloud',
            type    : 'active',
            desc    : '35% chance kurangi akurasi semua serangan musuh −20% selama 2 turn.',
            apCost  : 2,
            mpCost  : 0,
            cooldown: 3,
            trigger : 'on_use',
            effect  : { debuff: { stat: 'hitRate', amount: -20, duration: 2 }, chance: 0.35 },
        },
    },

    // ── RERUNTUHAN ─────────────────────────────────────────
    stone_imp: {
        name       : 'Stone Imp',
        emoji      : '🧌',
        type       : 'Beast',
        damageType : 'physical',
        area       : 'ruins',
        tier       : 'E',
        stats: {
            str : 14,
            agi : 13,
            int :  6,
            dex : 12,
            def : 10,
            vit : 10,
            wis :  5,
            luk : 12,
        },
        reward: {
            xp   : 32,
            gold : { min: 10, max: 20 },
            drops: [
                { item: 'Imp Tooth',   rate: 0.65 },
                { item: 'Ruin Shard',  rate: 0.50 },
                { item: 'Copper Coin', rate: 0.40 },
            ],
        },
        skill: {
            name    : 'Taunt',
            type    : 'active',
            desc    : '30% chance musuh wajib menyerang Imp selama 1 turn.',
            apCost  : 1,
            mpCost  : 0,
            cooldown: 2,
            trigger : 'on_use',
            effect  : { taunt: { chance: 0.30, duration: 1, forceTarget: 'self' } },
        },
    },

    candle_wraith: {
        name       : 'Candle Wraith',
        emoji      : '🕯️',
        type       : 'Undead',
        damageType : 'magic',
        area       : 'ruins',
        tier       : 'E',
        stats: {
            str :  4,
            agi : 10,
            int : 15,
            dex : 10,
            def :  8,
            vit :  9,
            wis : 11,
            luk :  9,
        },
        reward: {
            xp   : 35,
            gold : { min: 11, max: 22 },
            drops: [
                { item: 'Ghost Wax',   rate: 0.65 },
                { item: 'Dim Ember',   rate: 0.55 },
                { item: 'Soul Thread', rate: 0.25 },
            ],
        },
        skill: {
            name    : 'Wax Seal',
            type    : 'active',
            desc    : '35% chance segel musuh, mencegah penggunaan skill 1 turn.',
            apCost  : 2,
            mpCost  : 10,
            cooldown: 3,
            trigger : 'on_use',
            effect  : { silence: { chance: 0.35, duration: 1 } },
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

/**
 * Ambil data monster lengkap + derived stats
 */
function getMonster(monsterId) {
    const m = TIER_E_MONSTERS[monsterId];
    if (!m) return null;
    return { ...m, derived: calcMonsterDerived(m.stats, m.damageType) };
}

/**
 * Ambil random monster dari area tertentu
 */
function getRandomMonsterByArea(area) {
    const pool = Object.values(TIER_E_MONSTERS).filter(m => m.area === area);
    if (!pool.length) return null;
    const m = pool[Math.floor(Math.random() * pool.length)];
    return { ...m, derived: calcMonsterDerived(m.stats, m.damageType) };
}

/**
 * Roll gold reward dari range
 */
function rollGold({ min, max }) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Roll item drops berdasarkan rate
 */
function rollDrops(drops) {
    return drops
        .filter(d => Math.random() < d.rate)
        .map(d => d.item);
}

module.exports = {
    TIER_E_MONSTERS,
    calcMonsterDerived,
    getMonster,
    getRandomMonsterByArea,
    rollGold,
    rollDrops,
};
