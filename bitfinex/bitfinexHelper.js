const _ = require('lodash');
const bitfinexConstants = require('./bitfinexConstants.js');

module.exports = {
    
    // converts tIOTUSD to {pair: IOTUSD, base: IOT, qoute: USD}
    convertSymbolToCurrency: function(symbol){
        let pair = symbol.substr(1, symbol.length);
        let currencies = pair.match(/.{3}/g);
        let base = currencies[0];
        let qoute = currencies[1];
        return {
            symbol: symbol,
            pair: pair,
            base: base,
            qoute: qoute
        };
    },

    // converts IOTUSD to {pair: IOTUSD, base: IOT, qoute: USD}
    convertPairToCurrency: function(pair){
        let currencies = pair.match(/.{3}/g);
        let base = currencies[0];
        let qoute = currencies[1];
        return {
            pair: pair,
            base: base,
            qoute: qoute
        };
    },

    // converts IOTUSD to tIOTUSD or fIOTUSD
    convertPairToSymbol: function(pair, type = 't'){
        return type + pair;
    },

    getMaxVolumeCurrencies: function(){
        let maxVolumeSymbols = bitfinexConstants.maxVolumeSymbols;
        const currencyLength = 3;
        let currencies = maxVolumeSymbols.map((s) => {
            if(s.length !== 1 + 2*currencyLength)
                return null;
            return [s.substr(1, currencyLength), s.substr(1 + currencyLength, currencyLength)];
        });
        currencies = _.flatten(currencies); // merge to single array
        currencies = currencies.filter((st) => st !== null); // filter null values
        currencies = _.uniq(currencies); // take only uniq
        return currencies;
    },

    getMaxVolumePairs: function(){
        let maxVolumeSymbols = bitfinexConstants.maxVolumeSymbols;
        let pairs = maxVolumeSymbols.map(s => s.substr(1, s.length));
        return pairs;
    },

    // tIOTUSD, IOT -> sell
    // tIOTUSD, USD -> buy
    getSymbolAction: function(symbol, currency){
        let regex1 = new RegExp(`^t${currency}[A-Z]{3}$`);
        let regex2 = new RegExp(`^t\[A-Z]{3}${currency}$`);
        let action = null;
        
        if(regex1.test(symbol)){
            action = 'sell';
        }
        else if(regex2.test(symbol)){
            action = 'buy';
        }
        return action;
    }
};