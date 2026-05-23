const rpg = require('./rpg');
const msgg = require('./msgg');

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
            str : 14,
            agi : 16,
            int :  5,
            dex : 10,
            def :  8,
            vit :  8,
            wis :  5,
            luk :  8,
        },
        reward: {
            xp   : 20,
            gold : { min: 5, max: 12 },
            drops: [
                { item: 'Wolf Pelt',      rate: 0.80 },
                { item: 'Claw Fragment',  rate: 0.40 },
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
            str : 10,
            agi : 22,
            int :  5,
            dex : 14,
            def :  5,
            vit :  6,
            wis :  4,
            luk : 12,
        },
        reward: {
            xp   : 16,
            gold : { min: 4, max: 9 },
            drops: [
                { item: 'Fox Tail', rate: 0.75 },
                { item: 'Soft Fur', rate: 0.50 },
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
            str :  6,
            agi :  4,
            int :  4,
            dex :  6,
            def : 10,
            vit :  6,
            wis :  4,
            luk :  5,
        },
        reward: {
            xp   : 11,
            gold : { min: 2, max: 6 },
            drops: [
                { item: 'Silk Thread', rate: 0.85 },
                { item: 'Cocoon Dust', rate: 0.40 },
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
            str : 10,
            agi : 14,
            int :  6,
            dex : 12,
            def :  7,
            vit :  7,
            wis :  5,
            luk : 14,
        },
        reward: {
            xp   : 17,
            gold : { min: 6, max: 15 },
            drops: [
                { item: 'Raccoon Mask', rate: 0.50 },
                { item: 'Stolen Coin',  rate: 0.65 },
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
            str :  8,
            agi : 24,
            int :  4,
            dex : 16,
            def :  3,
            vit :  4,
            wis :  3,
            luk :  8,
        },
        reward: {
            xp   : 13,
            gold : { min: 2, max: 7 },
            drops: [
                { item: 'Bat Wing',   rate: 0.80 },
                { item: 'Echo Stone', rate: 0.25 },
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
            str : 12,
            agi : 10,
            int :  5,
            dex : 10,
            def :  6,
            vit :  7,
            wis :  4,
            luk :  8,
        },
        reward: {
            xp   : 18,
            gold : { min: 4, max: 10 },
            drops: [
                { item: 'Spider Silk',  rate: 0.75 },
                { item: 'Venom Gland',  rate: 0.45 },
                { item: 'Spider Eye',   rate: 0.30 },
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
            str :  8,
            agi :  2,
            int :  4,
            dex :  4,
            def : 22,
            vit : 12,
            wis :  3,
            luk :  4,
        },
        reward: {
            xp   : 22,
            gold : { min: 8, max: 18 },
            drops: [
                { item: 'Pebble Core', rate: 0.60 },
                { item: 'Stone Dust',  rate: 0.80 },
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
            str : 10,
            agi : 18,
            int :  4,
            dex :  8,
            def :  5,
            vit :  4,
            wis :  3,
            luk :  6,
        },
        reward: {
            xp   : 14,
            gold : { min: 3, max: 8 },
            drops: [
                { item: 'Ant Mandible', rate: 0.70 },
                { item: 'Formic Acid',  rate: 0.45 },
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
            str :  7,
            agi :  6,
            int :  6,
            dex :  6,
            def : 12,
            vit :  9,
            wis :  5,
            luk :  6,
        },
        reward: {
            xp   : 15,
            gold : { min: 3, max: 8 },
            drops: [
                { item: 'Toad Slime', rate: 0.75 },
                { item: 'Mud Gem',    rate: 0.20 },
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
            str : 12,
            agi : 26,
            int :  4,
            dex : 12,
            def :  2,
            vit :  4,
            wis :  3,
            luk :  8,
        },
        reward: {
            xp   : 14,
            gold : { min: 2, max: 6 },
            drops: [
                { item: 'Proboscis Needle', rate: 0.60 },
                { item: 'Blood Sac',        rate: 0.45 },
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
            str :  9,
            agi :  8,
            int :  4,
            dex :  8,
            def :  5,
            vit :  7,
            wis :  3,
            luk :  6,
        },
        reward: {
            xp   : 15,
            gold : { min: 3, max: 8 },
            drops: [
                { item: 'Rat Fur',     rate: 0.80 },
                { item: 'Bone Shard',  rate: 0.35 },
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
            str :  4,
            agi :  2,
            int : 10,
            dex :  4,
            def :  5,
            vit :  5,
            wis :  8,
            luk :  5,
        },
        reward: {
            xp   : 12,
            gold : { min: 2, max: 5 },
            drops: [
                { item: 'Spore Dust',    rate: 0.85 },
                { item: 'Mushroom Cap',  rate: 0.55 },
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
            str : 18,
            agi : 12,
            int :  3,
            dex :  8,
            def : 10,
            vit : 10,
            wis :  3,
            luk :  5,
        },
        reward: {
            xp   : 22,
            gold : { min: 6, max: 14 },
            drops: [
                { item: 'Boar Tusk',   rate: 0.60 },
                { item: 'Thick Hide',  rate: 0.70 },
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
            str :  4,
            agi :  6,
            int : 10,
            dex :  6,
            def :  8,
            vit :  5,
            wis : 10,
            luk :  8,
        },
        reward: {
            xp   : 15,
            gold : { min: 3, max: 8 },
            drops: [
                { item: 'Thorn Spike', rate: 0.65 },
                { item: 'Wisp Dust',   rate: 0.50 },
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
            str :  6,
            agi :  6,
            int : 12,
            dex :  6,
            def : 14,
            vit :  7,
            wis :  8,
            luk :  6,
        },
        reward: {
            xp   : 19,
            gold : { min: 5, max: 12 },
            drops: [
                { item: 'Bone Fragment', rate: 0.85 },
                { item: 'Rusted Sword',  rate: 0.25 },
                { item: 'Grave Dust',    rate: 0.55 },
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
    calcMonsterDerived,
    getMonster,
    getRandomMonsterByArea,
    rollGold,
    rollDrops,
};