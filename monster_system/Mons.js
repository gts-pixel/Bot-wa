const rpg = require('../rpg_system/rpg');
const msgg = require('../msgg');
const dbitem = require('../dbitem');
const { TIER_E_MONSTERS } = require('./monsters_tier_e');
const { TIER_D_MONSTERS } = require('./monsters_tier_d');

// ============================================================
//  monsters_tier_f.js
//  Struktur data monster Tier F untuk bot WA RPG
//
//  Damage type rules:
//    - physical : Beast, Insect, Amphibian, Construct → pakai STR
//    - magic    : Plant, Undead, Elemental           → pakai INT + WIS
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

const TIER_F_MONSTERS = {
    grey_wolf: {
        name       : 'Grey Wolf',
        emoji      : '🐺',
        type       : 'Beast',
        damageType : 'physical',
        tier       : 'F',
        stats: {
            str : 28,
            agi : 32,
            int : 10,
            dex : 20,
            def : 16,
            vit : 16,
            wis : 10,
            luk : 16,
        },
        reward: {
            xp   : 24,
            gold : { min: 5, max: 12 },
            drops: [
                { item: 'wolf_pelt',     rate: 0.80 },
                { item: 'claw_fragment', rate: 0.40 },
            ],
        },
        skill: {
            name    : 'Pack Instinct',
            type    : 'passive',
            desc    : 'Jika ada Wolf lain di field, ATK +15%.',
            trigger : 'on_battle_start',
            effect  : { atkBuff: 0.15, condition: 'ally_wolf_present' },
        },
    },

    trickster_fox: {
        name       : 'Trickster Fox',
        emoji      : '🦊',
        type       : 'Beast',
        damageType : 'physical',
        tier       : 'F',
        stats: {
            str : 20,
            agi : 44,
            int : 10,
            dex : 28,
            def : 10,
            vit : 12,
            wis :  8,
            luk : 24,
        },
        reward: {
            xp   : 19, //done
            gold : { min: 4, max: 9 },
            drops: [
                { item: 'fox_tail', rate: 0.75 },
                { item: 'soft_fur', rate: 0.50 },
            ],
        },
        skill: {
            name    : 'Feint',
            type    : 'passive',
            desc    : '35% chance dodge serangan berikutnya setelah menyerang.',
            trigger : 'after_attack',
            effect  : { dodgeChance: 0.35, duration: 1 },
        },
    },

    silk_caterpillar: {
        name       : 'Silk Caterpillar',
        emoji      : '🐛',
        type       : 'Insect',
        damageType : 'physical',
        tier       : 'F',
        stats: {
            str : 12,
            agi :  8,
            int :  8,
            dex : 12,
            def : 20,
            vit : 12,
            wis :  8,
            luk : 10,
        },
        reward: {
            xp   : 17,
            gold : { min: 4, max: 12 },
            drops: [
                { item: 'silk_thread', rate: 0.85 },
                { item: 'cocoon_dust', rate: 0.40 },
            ],
        },
        skill: {
            name    : 'Sticky Web',
            type    : 'active',
            desc    : '40% chance kurangi AGI musuh −5 selama 2 turn.',
            apCost  : 2,
            mpCost  : 0,
            trigger : 'on_use',
            effect  : { debuff: { stat: 'agi', amount: -5, duration: 2 }, chance: 0.40 },
        },
    },

    bandit_raccoon: {
        name       : 'Bandit Raccoon',
        emoji      : '🦝',
        type       : 'Beast',
        damageType : 'physical',
        tier       : 'F',
        stats: {
            str : 20,
            agi : 28,
            int : 12,
            dex : 24,
            def : 14,
            vit : 14,
            wis : 10,
            luk : 28,
        },
        reward: {
            xp   : 22,
            gold : { min: 6, max: 15 },
            drops: [
                { item: 'raccoon_mask', rate: 0.50 },
                { item: 'stolen_coin',  rate: 0.65 },
            ],
        },
        skill: {
            name    : 'Pickpocket',
            type    : 'active',
            desc    : '25% chance steal 1 item consumable dari inventory musuh.',
            apCost  : 2,
            mpCost  : 0,
            trigger : 'on_use',
            effect  : { stealItem: true, chance: 0.25 },
        },
    },

    cave_bat: {
        name       : 'Cave Bat',
        emoji      : '🦇',
        type       : 'Beast',
        damageType : 'physical',
        tier       : 'F',
        stats: {
            str : 16,
            agi : 48, 
            int :  8,
            dex : 32,
            def :  6,
            vit :  8,
            wis :  6,
            luk : 16,
        },
        reward: {
            xp   : 18,
            gold : { min: 2, max: 7 },
            drops: [
                { item: 'bat_wing',   rate: 0.80 },
                { item: 'echo_stone', rate: 0.25 },
            ],
        },
        skill: {
            name    : 'Screech',
            type    : 'active',
            desc    : '30% chance stun musuh 1 turn dari suara keras.',
            apCost  : 2,
            mpCost  : 0,
            trigger : 'on_use',
            effect  : { stun: true, duration: 1, chance: 0.30 },
        },
    },

    stone_spider: {
        name       : 'Stone Spider',
        emoji      : '🕷️',
        type       : 'Insect',
        damageType : 'physical',
        tier       : 'F',
        stats: {
            str : 24,
            agi : 20,
            int : 10,
            dex : 20,
            def : 12,
            vit : 14,
            wis :  8,
            luk : 16,
        },
        reward: {
            xp   : 22,
            gold : { min: 4, max: 10 },
            drops: [
                { item: 'spider_silk',  rate: 0.75 },
                { item: 'venom_gland',  rate: 0.45 },
                { item: 'spider_eye',   rate: 0.30 },
            ],
        },
        skill: {
            name    : 'Web Trap',
            type    : 'active',
            desc    : 'Musuh skip giliran berikutnya jika kena jebakan (50% hit).',
            apCost  : 2,
            mpCost  : 0,
            trigger : 'on_use',
            effect  : { skipTurn: true, duration: 1, chance: 0.50 },
        },
    },

    pebble_golem: {
        name       : 'Pebble Golem',
        emoji      : '🪨',
        type       : 'Construct',
        damageType : 'physical',
        tier       : 'F',
        stats: {
            str : 16,
            agi :  4,
            int :  8,
            dex :  8,
            def : 44,
            vit : 24,
            wis :  6,
            luk :  8,
        },
        reward: {
            xp   : 26,
            gold : { min: 8, max: 18 },
            drops: [
                { item: 'pebble_core', rate: 0.60 },
                { item: 'stone_dust',  rate: 0.80 },
            ],
        },
        skill: {
            name    : 'Roll',
            type    : 'active',
            desc    : 'DMG diterima −60% turn ini, lalu ATK ×1.5 turn depan.',
            apCost  : 2,
            mpCost  : 0,
            trigger : 'on_use',
            effect  : {
                selfDefBuff   : { dmgReduction: 0.60, duration: 1 },
                nextTurnAtkMult: 1.5,
            },
        },
    },

    fire_ant_soldier: {
        name       : 'Fire Ant Soldier',
        emoji      : '🐜',
        type       : 'Insect',
        damageType : 'physical',
        tier       : 'F',
        stats: {
            str : 20,
            agi : 36,
            int :  8,
            dex : 16,
            def : 10,
            vit :  8,
            wis :  6,
            luk : 12,
        },
        reward: {
            xp   : 18,
            gold : { min: 3, max: 8 },
            drops: [
                { item: 'ant_mandible', rate: 0.70 },
                { item: 'formic_acid',  rate: 0.45 },
            ],
        },
        skill: {
            name    : 'Acid Spray',
            type    : 'active',
            desc    : 'DEF musuh −3 permanen sampai akhir battle.',
            apCost  : 2,
            mpCost  : 0,
            trigger : 'on_use',
            effect  : { debuff: { stat: 'def', amount: -3, duration: 'battle' } },
        },
    },

    mud_toad: {
        name       : 'Mud Toad',
        emoji      : '🐸',
        type       : 'Amphibian',
        damageType : 'physical',
        tier       : 'F',
        stats: {
            str : 14,
            agi : 12,
            int : 12,
            dex : 12,
            def : 24,
            vit : 18,
            wis : 10,
            luk : 12,
        },
        reward: {
            xp   : 19,
            gold : { min: 3, max: 8 },
            drops: [
                { item: 'toad_slime', rate: 0.75 },
                { item: 'mud_gem',    rate: 0.20 },
            ],
        },
        skill: {
            name    : 'Mud Splash',
            type    : 'active',
            desc    : '45% chance kurangi HIT_RATE musuh −20% selama 2 turn.',
            apCost  : 2,
            mpCost  : 0,
            trigger : 'on_use',
            effect  : { debuff: { stat: 'hitRate', amount: -20, duration: 2 }, chance: 0.45 },
        },
    },

    giant_mosquito: {
        name       : 'Giant Mosquito',
        emoji      : '🦟',
        type       : 'Insect',
        damageType : 'physical',
        tier       : 'F',
        stats: {
            str : 24,
            agi : 32, // +6 aj
            int :  8,
            dex : 24,
            def :  4,
            vit :  8,
            wis :  6,
            luk : 16,
        },
        reward: {
            xp   : 17,
            gold : { min: 2, max: 6 },
            drops: [
                { item: 'proboscis_needle', rate: 0.60 },
                { item: 'blood_sac',        rate: 0.45 },
            ],
        },
        skill: {
            name    : 'Blood Drain',
            type    : 'passive',
            desc    : 'Steal 8 HP dari setiap damage yang diberikan.',
            trigger : 'on_hit',
            effect  : { lifeSteal: 8 },
        },
    },

    swamp_rat: {
        name       : 'Swamp Rat',
        emoji      : '🐀',
        type       : 'Beast',
        damageType : 'physical',
        tier       : 'F',
        stats: {
            str : 18,
            agi : 16,
            int :  8,
            dex : 16,
            def : 10,
            vit : 14,
            wis :  6,
            luk : 12,
        },
        reward: {
            xp   : 19,
            gold : { min: 3, max: 8 },
            drops: [
                { item: 'rat_fur',     rate: 0.80 },
                { item: 'bone_shard',  rate: 0.35 },
            ],
        },
        skill: {
            name    : 'Nibble',
            type    : 'passive',
            desc    : 'Ignore 10% DEF musuh saat menyerang.',
            trigger : 'on_attack',
            effect  : { defPenetration: 0.10 },
        },
    },

    spore_shroom: {
        name       : 'Spore Shroom',
        emoji      : '🍄',
        type       : 'Plant',
        damageType : 'magic',        // Plant → magic
        tier       : 'F',
        stats: {
            str :  8,
            agi :  4,
            int : 20,
            dex :  8,
            def : 10,
            vit : 10,
            wis : 16,
            luk : 10,
        },
        reward: {
            xp   : 16,
            gold : { min: 2, max: 5 },
            drops: [
                { item: 'spore_dust',    rate: 0.85 },
                { item: 'mushroom_cap',  rate: 0.55 },
            ],
        },
        skill: {
            name    : 'Spore Cloud',
            type    : 'active',
            desc    : '50% chance racun ringan (−3 HP/turn selama 2 turn).',
            apCost  : 2,
            mpCost  : 5,
            trigger : 'on_use',
            effect  : { dot: { dmgPerTurn: 3, duration: 2, type: 'poison' }, chance: 0.50 },
        },
    },

    wild_boar: {
        name       : 'Wild Boar',
        emoji      : '🐗',
        type       : 'Beast',
        damageType : 'physical',
        tier       : 'F',
        stats: {
            str : 36,
            agi : 24,
            int :  6,
            dex : 16,
            def : 20,
            vit : 20,
            wis :  6,
            luk : 10,
        },
        reward: {
            xp   : 26,
            gold : { min: 6, max: 14 },
            drops: [
                { item: 'boar_tusk',   rate: 0.60 },
                { item: 'thick_hide',  rate: 0.70 },
            ],
        },
        skill: {
            name    : 'Charge',
            type    : 'active',
            desc    : 'Turn pertama battle, ATK ×1.8 sekali.',
            apCost  : 3,
            mpCost  : 0,
            trigger : 'turn_1_only',
            effect  : { atkMultiplier: 1.8, usageLimit: 1 },
        },
    },

    thorn_wisp: {
        name       : 'Thorn Wisp',
        emoji      : '🌵',
        type       : 'Plant',
        damageType : 'magic',        // Plant → magic
        tier       : 'F',
        stats: {
            str :  8,
            agi : 12,
            int : 20,
            dex : 12,
            def : 16,
            vit : 10,
            wis : 20,
            luk : 16,
        },
        reward: {
            xp   : 19,
            gold : { min: 3, max: 8 },
            drops: [
                { item: 'thorn_spike', rate: 0.65 },
                { item: 'wisp_dust',   rate: 0.50 },
            ],
        },
        skill: {
            name    : 'Reflect Thorn',
            type    : 'passive',
            desc    : '25% chance musuh menerima 5 damage balik tiap hit.',
            trigger : 'on_hit_received',
            effect  : { reflectDmg: 5, chance: 0.25 },
        },
    },

    bone_skeleton: {
        name       : 'Bone Skeleton',
        emoji      : '💀',
        type       : 'Undead',
        damageType : 'magic',        // Undead → magic
        tier       : 'F',
        stats: {
            str : 12,
            agi : 12,
            int : 24,
            dex : 12,
            def : 28,
            vit : 14,
            wis : 16,
            luk : 12,
        },
        reward: {
            xp   : 24,
            gold : { min: 5, max: 12 },
            drops: [
                { item: 'bone_fragment', rate: 0.85 },
                { item: 'rusted_sword',  rate: 0.25 },
                { item: 'grave_dust',    rate: 0.55 },
            ],
        },
        skill: {
            name    : 'Rattle Scare',
            type    : 'active',
            desc    : '30% chance musuh skip giliran karena takut.',
            apCost  : 2,
            mpCost  : 5,
            trigger : 'on_use',
            effect  : { skipTurn: true, duration: 1, chance: 0.30 },
        },
    },

};

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

/**
 * Hitung derived stats monster — formula sama dengan player
 * @param {Object} stats - 8 stat monster (str, agi, int, dex, def, vit, wis, luk)
 * @param {string} damageType - 'physical' | 'magic'
 * @returns {Object} derived stats
 */
function calcMonsterDerived(stats, damageType) {
    const { str, agi, int: INT, dex, def, vit, wis, luk } = stats;
    const physATK   = +(str * 2.5 + 10).toFixed(1);
    const magicATK  = +(INT * 2 + wis * 1.5 + 5).toFixed(1);
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
 * @param {string} monsterId - key dari TIER_F_MONSTERS
 * @returns {Object|null}
 */
function getMonster(monsterId) {
    const m = TIER_F_MONSTERS[monsterId];
    if (!m) return null;
    return {
        ...m,
        derived: calcMonsterDerived(m.stats, m.damageType),
    };
}

/**
 * Ambil random monster dari area tertentu
 * @param {string} area - 'forest' | 'cave' | 'swamp' | 'plains' | 'ruins'
 * @returns {Object|null}
 */
function getRandomMonsterByArea(area) {
    const pool = Object.values(TIER_F_MONSTERS).filter(m => m.area === area);
    if (!pool.length) return null;
    const m = pool[Math.floor(Math.random() * pool.length)];
    return { ...m, derived: calcMonsterDerived(m.stats, m.damageType) };
}

// ============================================================
//  RANK-BASED SPAWN (dipakai buat .hunt)
// ============================================================

/**
 * Urutan tier dari terlemah ke terkuat, sinkron sama getRank() di RankSystem.js.
 * Tambah tier baru di sini kalau nanti bikin monsters_tier_c.js dst.
 */
const TIER_ORDER = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];

/**
 * Pool monster per tier. Tier yang belum ada data-nya (C, B, A, S)
 * sengaja belum dimasukkan — nanti tinggal require + tambahin di sini.
 */
const TIER_POOLS = {
    F: TIER_F_MONSTERS,
    E: TIER_E_MONSTERS,
    D: TIER_D_MONSTERS,
};

/**
 * Ambil random monster dari 1 tier spesifik.
 * @param {string} tier - 'F' | 'E' | 'D' | ...
 * @returns {Object|null}
 */
function getRandomMonsterFromTier(tier) {
    const pool = TIER_POOLS[tier];
    if (!pool) return null;
    const keys = Object.keys(pool);
    if (!keys.length) return null;
    const key = keys[Math.floor(Math.random() * keys.length)];
    const m = pool[key];
    return { id: key, ...m, derived: calcMonsterDerived(m.stats, m.damageType) };
}

/**
 * Ambil random monster berdasarkan rank pemain (F–S).
 * Mayoritas spawn dari tier sesuai rank sendiri, tapi ada small chance
 * ketemu tier tetangga — satu tingkat lebih lemah & satu tingkat lebih kuat.
 * Contoh: rank E → ~80% tier E, ~12% tier F, ~8% tier D.
 * Tier yang belum ada data-nya otomatis dilewat (bukan error).
 * @param {string} rank - hasil dari getRank(level) di RankSystem.js
 * @returns {Object} monster lengkap + derived stats
 */
function getRandomMonsterByRank(rank) {
    const idx = TIER_ORDER.indexOf(rank);
    const safeIdx = idx === -1 ? 0 : idx; // rank gak dikenal → fallback tier F

    const candidates = [{ tier: TIER_ORDER[safeIdx], weight: 80 }];

    const lowerTier = TIER_ORDER[safeIdx - 1];
    if (lowerTier && TIER_POOLS[lowerTier] && Object.keys(TIER_POOLS[lowerTier]).length) {
        candidates.push({ tier: lowerTier, weight: 12 });
    }

    const upperTier = TIER_ORDER[safeIdx + 1];
    if (upperTier && TIER_POOLS[upperTier] && Object.keys(TIER_POOLS[upperTier]).length) {
        candidates.push({ tier: upperTier, weight: 8 });
    }

    const valid = candidates.filter(c => TIER_POOLS[c.tier] && Object.keys(TIER_POOLS[c.tier]).length);
    const pool = valid.length ? valid : [{ tier: 'F', weight: 1 }];

    const totalWeight = pool.reduce((sum, c) => sum + c.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const c of pool) {
        if (roll < c.weight) return getRandomMonsterFromTier(c.tier);
        roll -= c.weight;
    }
    return getRandomMonsterFromTier(pool[0].tier); // safety net
}

/**
 * Roll gold reward dari range
 * @param {{ min: number, max: number }} goldRange
 * @returns {number}
 */
function rollGold(goldRange) {
    return Math.floor(Math.random() * (goldRange.max - goldRange.min + 1)) + goldRange.min;
}

/**
 * Roll item drops berdasarkan rate
 * @param {Array} drops - array of { item, rate }
 * @returns {string[]} item yang berhasil di-drop
 */
function rollDrops(drops) {
    return drops
        .filter(d => Math.random() < d.rate)
        .map(d => d.item);
}

module.exports = {
    TIER_F_MONSTERS,
    TIER_E_MONSTERS,
    TIER_D_MONSTERS,
    getRandomMonsterByRank,
    getRandomMonsterFromTier,
    calcMonsterDerived,
    getMonster,
    getRandomMonsterByArea,
    rollGold,
    rollDrops,
};