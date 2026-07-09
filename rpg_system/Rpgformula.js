// Formula RPG berdasarkan gambar

function physicalDamage(strength) {
    return strength * 2.5 + 10;
}

function magicDamage(intelligence, wisdom) {
    return intelligence * 2 + wisdom * 1.5 + 5;
}

function critRate(luck) {
    const rate = luck * 0.8;
    return Math.min(rate, 60);
}

function critDamage(baseDamage, luck) {
    return baseDamage * 1.5 + luck * 0.1;
}

function maxHP(vitality, defense) {
    return vitality * 12 + defense * 4 + 75;
}

function damageReceived(physicalDamage, defense) {
    return physicalDamage * (100 / (100 + defense));
}

function dodgeRate(dexterity) {
    const rate = dexterity * 0.6;
    return Math.min(rate, 50);
}

function hitRate(dexterity) {
    const rate = 85 + dexterity * 0.3;
    return Math.min(rate, 99);
}

function maxAP(agility) {
    return 3 + Math.floor(agility / 10);
}

function maxMP(intelligence, wisdom) {
    return intelligence * 4 + wisdom * 5 + 40;
}

function mpRegen(wisdom) {
    return wisdom * 0.6 + 2;
}

function calculateDerivedStats(stats) {
    return {
        physicalDamage: physicalDamage(stats.strength || 0),
        magicDamage: magicDamage(stats.intelligence || 0, stats.wisdom || 0),
        critRate: critRate(stats.luck || 0),
        critDamage: critDamage(stats.strength ? physicalDamage(stats.strength) : 0, stats.luck || 0),
        maxHP: maxHP(stats.vitality || 0, stats.defense || 0),
        damageReceived: damageReceived(stats.strength ? physicalDamage(stats.strength) : 0, stats.defense || 0),
        dodgeRate: dodgeRate(stats.dexterity || 0),
        hitRate: hitRate(stats.dexterity || 0),
        maxAP: maxAP(stats.agility || 0),
        maxMP: maxMP(stats.intelligence || 0, stats.wisdom || 0),
        mpRegen: mpRegen(stats.wisdom || 0),
    };
}

module.exports = {
    physicalDamage,
    magicDamage,
    critRate,
    critDamage,
    maxHP,
    damageReceived,
    dodgeRate,
    hitRate,
    maxAP,
    maxMP,
    mpRegen,
    calculateDerivedStats,
};