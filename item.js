// item.js
// Definisi semua item yang ada di game

const ITEMS = {
    // ── HP POTION ──────────────────────────────────────
    'Small HP Potion': {
        key: 'small_hp_potion',
        emoji: '🧪',
        type: 'consumable',
        subtype: 'hp',
        desc: 'Pulihkan HP +50',
        effect: (player) => ({ healHp: 50 }),
        usableInBattle: true,
    },
    'HP Potion': {
        key: 'hp_potion',
        emoji: '❤️',
        type: 'consumable',
        subtype: 'hp',
        desc: 'Pulihkan HP +150',
        effect: (player) => ({ healHp: 150 }),
        usableInBattle: true,
    },
    'Large HP Potion': {
        key: 'large_hp_potion',
        emoji: '💖',
        type: 'consumable',
        subtype: 'hp',
        desc: 'Pulihkan HP +400',
        effect: (player) => ({ healHp: 400 }),
        usableInBattle: true,
    },
    'Full HP Potion': {
        key: 'full_hp_potion',
        emoji: '💝',
        type: 'consumable',
        subtype: 'hp',
        desc: 'Pulihkan HP penuh',
        effect: (player) => ({ healHp: player.max_hp }),
        usableInBattle: true,
    },

    // ── MP POTION ──────────────────────────────────────
    'Small MP Potion': {
        key: 'small_mp_potion',
        emoji: '💧',
        type: 'consumable',
        subtype: 'mp',
        desc: 'Pulihkan MP +30',
        effect: (player) => ({ healMp: 30 }),
        usableInBattle: true,
    },
    'MP Potion': {
        key: 'mp_potion',
        emoji: '💙',
        type: 'consumable',
        subtype: 'mp',
        desc: 'Pulihkan MP +100',
        effect: (player) => ({ healMp: 100 }),
        usableInBattle: true,
    },
    'Large MP Potion': {
        key: 'large_mp_potion',
        emoji: '🔷',
        type: 'consumable',
        subtype: 'mp',
        desc: 'Pulihkan MP +250',
        effect: (player) => ({ healMp: 250 }),
        usableInBattle: true,
    },
    'Full MP Potion': {
        key: 'full_mp_potion',
        emoji: '💎',
        type: 'consumable',
        subtype: 'mp',
        desc: 'Pulihkan MP penuh',
        effect: (player) => ({ healMp: player.max_mp }),
        usableInBattle: true,
    },

    // ── MATERIAL (dari drop monster, tidak bisa dipakai) ──
    'Wolf Pelt':         { key: 'wolf pelt',         emoji: '🐺', type: 'material', desc: 'Kulit serigala' },
    'Claw Fragment':     { key: 'claw fragment',      emoji: '🦴', type: 'material', desc: 'Pecahan cakar' },
    'Fox Tail':          { key: 'fox tail',           emoji: '🦊', type: 'material', desc: 'Ekor rubah' },
    'Soft Fur':          { key: 'soft fur',           emoji: '🧸', type: 'material', desc: 'Bulu lembut' },
    'Silk Thread':       { key: 'silk thread',        emoji: '🕸️', type: 'material', desc: 'Benang sutra' },
    'Cocoon Dust':       { key: 'cocoon dust',        emoji: '✨', type: 'material', desc: 'Serbuk kepompong' },
    'Raccoon Mask':      { key: 'raccoon mask',       emoji: '🦝', type: 'material', desc: 'Topeng rakun' },
    'Stolen Coin':       { key: 'stolen coin',        emoji: '🪙', type: 'material', desc: 'Koin curian' },
    'Bat Wing':          { key: 'bat wing',           emoji: '🦇', type: 'material', desc: 'Sayap kelelawar' },
    'Echo Stone':        { key: 'echo stone',         emoji: '🪨', type: 'material', desc: 'Batu gema' },
    'Spider Silk':       { key: 'spider silk',        emoji: '🕷️', type: 'material', desc: 'Sutra laba-laba' },
    'Venom Gland':       { key: 'venom gland',        emoji: '☠️', type: 'material', desc: 'Kelenjar racun' },
    'Spider Eye':        { key: 'spider eye',         emoji: '👁️', type: 'material', desc: 'Mata laba-laba' },
    'Pebble Core':       { key: 'pebble core',        emoji: '💎', type: 'material', desc: 'Inti batu kerikil' },
    'Stone Dust':        { key: 'stone dust',         emoji: '🌫️', type: 'material', desc: 'Debu batu' },
    'Ant Mandible':      { key: 'ant mandible',       emoji: '🐜', type: 'material', desc: 'Rahang semut' },
    'Formic Acid':       { key: 'formic acid',        emoji: '🧪', type: 'material', desc: 'Asam semut' },
    'Toad Slime':        { key: 'toad slime',         emoji: '🐸', type: 'material', desc: 'Lendir katak' },
    'Mud Gem':           { key: 'mud gem',            emoji: '💠', type: 'material', desc: 'Batu lumpur' },
    'Proboscis Needle':  { key: 'proboscis needle',   emoji: '🦟', type: 'material', desc: 'Jarum nyamuk' },
    'Blood Sac':         { key: 'blood sac',          emoji: '🩸', type: 'material', desc: 'Kantung darah' },
    'Rat Fur':           { key: 'rat fur',            emoji: '🐀', type: 'material', desc: 'Bulu tikus' },
    'Bone Shard':        { key: 'bone shard',         emoji: '🦷', type: 'material', desc: 'Pecahan tulang' },
    'Spore Dust':        { key: 'spore dust',         emoji: '🍄', type: 'material', desc: 'Serbuk spora' },
    'Mushroom Cap':      { key: 'mushroom cap',       emoji: '🍄', type: 'material', desc: 'Topi jamur' },
    'Boar Tusk':         { key: 'boar tusk',          emoji: '🐗', type: 'material', desc: 'Taring babi hutan' },
    'Thick Hide':        { key: 'thick hide',         emoji: '🛡️', type: 'material', desc: 'Kulit tebal' },
    'Thorn Spike':       { key: 'thorn spike',        emoji: '🌵', type: 'material', desc: 'Duri tajam' },
    'Wisp Dust':         { key: 'wisp dust',          emoji: '✨', type: 'material', desc: 'Serbuk cahaya' },
    'Bone Fragment':     { key: 'bone fragment',      emoji: '💀', type: 'material', desc: 'Fragmen tulang' },
    'Rusted Sword':      { key: 'rusted sword',       emoji: '⚔️', type: 'material', desc: 'Pedang berkarat' },
    'Grave Dust':        { key: 'grave dust',         emoji: '⚰️', type: 'material', desc: 'Debu makam' },
};

// Cari item berdasarkan nama (case-insensitive)
function findItem(name) {
    const lower = name.toLowerCase();
    return Object.entries(ITEMS).find(
        ([n]) => n.toLowerCase() === lower || ITEMS[n].key === lower.replace(/\s+/g, '_')
    )?.[1] || null;
}

// Cari nama item dari key
function getItemNameByKey(key) {
    return Object.keys(ITEMS).find(n => ITEMS[n].key === key) || null;
}

module.exports = { ITEMS, findItem, getItemNameByKey };