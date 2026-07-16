function getRank(level) { 
    if (level >= 131) return 'S'
    if (level >= 96) return 'A'
    if (level >= 68) return 'B'
    if (level >= 41) return 'C'
    if (level >= 29) return 'D'
    if (level >= 13) return 'E'
    return 'F'
}

module.exports = { getRank }