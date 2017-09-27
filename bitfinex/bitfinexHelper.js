module.exports = {
    
    // converts tIOTUSD to {pair: IOTUSD, base: IOT, qoute: USD}
    convertSymbolToCurrency: function(symbol){
        let pair = symbol.substr(1, symbol.length);
        let currencies = pair.match(/.{3}/g);
        let base = currencies[0];
        let qoute = currencies[1];
        return {
            pair: pair,
            base: base,
            qoute: qoute
        };
    }
};