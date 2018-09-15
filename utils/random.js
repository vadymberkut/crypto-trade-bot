module.exports.random = function(low, high) {
    return Math.random() * (high - low) + low;
}

module.exports.randomInt = function(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

module.exports.randomIntInc = function(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}