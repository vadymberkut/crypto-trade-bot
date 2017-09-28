const logger = require('../../utils/logger');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const logfile = path.join(__dirname, '../../logs/bitfinex/bookStore/ws-book-err.log');


module.exports = class BookStore {
    constructor(){
        this.clear();
    }

    clear(){
        this.BOOK = {};
    }

    initSymbolBookIfNotExists(symbol){
        if(!this.BOOK[symbol]){
            this.BOOK[symbol] = {
                bids: {},
                asks: {},
                psnap: {},
                mcount: 0
            };
        }
    }

    initBookFromObject(obj){
        if(obj)
            this.BOOK = obj;
    }

    // hen new data received
    update(symbol, model){
        this.initSymbolBookIfNotExists(symbol);

        if(this.BOOK[symbol].mcount === 0 && Array.isArray(model)){
            _.each(model, (pp) => {
                const side = pp.AMOUNT >= 0 ? 'bids' : 'asks';
                pp.AMOUNT = Math.abs(pp.AMOUNT);
                this.BOOK[symbol][side][pp.PRICE] = pp;
              });
        }
        else{
            let pp = model;

            // when count = 0 then you have to delete the price level.
            if (pp.COUNT === 0) {
              let found = true;

              //if amount = 1 then remove from bids
              if (pp.AMOUNT > 0) {
                if (this.BOOK[symbol]['bids'][pp.PRICE]) {
                  delete this.BOOK[symbol]['bids'][pp.PRICE];
                } else {
                  found = false;
                }
              } 

            // if amount = -1 then remove from asks
              else if (pp.AMOUNT < 0) {
                if (this.BOOK[symbol]['asks'][pp.PRICE]) {
                  delete this.BOOK[symbol]['asks'][pp.PRICE];
                } else {
                  found = false;
                }
              }
              if (!found) {
                let logMsg = "[" + moment().format() + "] " + symbol + " | " + JSON.stringify(pp) + " BOOK delete fail side not found";
                fs.appendFileSync(logfile, logMsg + '\n');
                logger.warn(logMsg);
              }
            } 

            // when count > 0 then you have to add or update the price level
            else {
              let side = pp.AMOUNT >= 0 ? 'bids' : 'asks';
              pp.AMOUNT = Math.abs(pp.AMOUNT);
              this.BOOK[symbol][side][pp.PRICE] = pp;
            }
        }

        _.each(['bids', 'asks'], (side) => {
            let sbook = this.BOOK[symbol][side];
            let bprices = Object.keys(sbook);
      
            let prices = bprices.sort((a, b) => {
              if (side === 'bids') {
                return +a >= +b ? -1 : 1;
              } else {
                return +a <= +b ? -1 : 1;
              }
            })
      
            this.BOOK[symbol].psnap[side] = prices
            //logger.log("num price points", side, prices.length)
        });

        this.BOOK[symbol].mcount++;
        this.checkCross(symbol, model);
    }

    checkCross(symbol, model) {
        let bid = this.BOOK[symbol].psnap.bids[0];
        let ask = this.BOOK[symbol].psnap.asks[0];
        if (bid >= ask) {
            let lm = [moment.utc().format(), symbol, "bid(" + bid + ")>=ask(" + ask + ")"];
            let logMsg = lm.join(' / ') + "\r\n";
            fs.appendFileSync(logfile, logMsg);
            // logger.warn(logMsg);
        }
    }

    saveBookSync() {
        if(!this.BOOK)
            return;
        // logger.log('bookStore: save sync ');
        const now = moment.utc().format('YYYYMMDDHHmmss');
        const savefile = path.join(__dirname, '../../logs/bitfinex/bookStore/' + 'tmp-ws-book-' + now + '.log');
        fs.writeFileSync(savefile, JSON.stringify(this.BOOK));
    }

    saveBook() {
        if(!this.BOOK)
            return;
        // logger.log('bookStore: save async');
        const now = moment.utc().format('YYYYMMDDHHmmss');
        const savefile = path.join(__dirname, '../../logs/bitfinex/bookStore/' + 'tmp-ws-book-' + now + '.log');
        fs.writeFile(savefile, JSON.stringify(this.BOOK));
    }



    getStoredSymbols(){
        return Object.keys(this.BOOK).filter((s) => !!s);
    }

    getStoredPairs(){
        let symbols = this.getStoredSymbols();
        let pairs = symbols.map(s => s.substr(1, s.length));
        return pairs;
    }

    getStoredCurrencies(){
        let symbols = this.getStoredSymbols();
        const symbolLength = 3;
        let currencies = symbols.map((s) => {
            if(s.length !== 1 + 2*symbolLength)
                return null;
            return [s.substr(1, symbolLength), s.substr(1 + symbolLength, symbolLength)];
        });
        currencies = _.flatten(currencies); // merge to single array
        currencies = currencies.filter((st) => st !== null); // filter null values
        currencies = _.uniq(currencies); // take only uniq
        return currencies;
    }

    // ETH, IOT -> tIOTETH
    getSymbol(currency1, currency2){
        let symbols = this.getStoredSymbols();
        let symbol = symbols.find((s) => {
            let regex1 = new RegExp(`t${currency1}${currency2}`);
            let regex2 = new RegExp(`t${currency2}${currency1}`);
            if(regex1.test(s) || regex2.test(s)){
                return true;
            }
            return false;
        });
        return symbol || null;
    }

    // tIOTUSD, IOT -> sell
    // tIOTUSD, USD -> buy
    getSymbolAction(symbol, currency){
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

    // symbol - tIOTUSD
    // action - buy | sell
    getBestMarketBookValueForAction(symbol, action){
        let symbolBook = this.BOOK[symbol];
        if(!symbol || !symbolBook || !action || (action != 'buy' && action != 'sell')){
            return null;
        }
        let side = action == 'buy' ? 'asks' : 'bids';

        // take best ask or bid depending on action
        let bestPrice = symbolBook.psnap[side][0];
        let bestBookValue = symbolBook[side][bestPrice];
        return bestBookValue;
    }

    // symbol - tIOTUSD
    // action - buy | sell
    getBestLimitBookValueForAction(symbol, action){
        let symbolBook = this.BOOK[symbol];
        if(!symbol || !symbolBook || !action || (action != 'buy' && action != 'sell')){
            return null;
        }
        let side = action == 'buy' ? 'bids' : 'asks';

        // take best ask or bid depending on action
        let bestPrice = symbolBook.psnap[side][0];
        let bestBookValue = symbolBook[side][bestPrice];
        return bestBookValue;
    }

    getBestMarketBookPriceForAction(symbol, action){
        let bestBookValue = this.getBestBookValueForAction(symbol, action);
        if(bestBookValue === null) return null;
        return bestBookValue.PRICE;
    }

    getBestLimitBookPriceForAction(symbol, action){
        let bestBookValue = this.getBestLimitBookValueForAction(symbol, action);
        if(bestBookValue === null) return null;
        return bestBookValue.PRICE;
    }

    // get first n book values
    // returned values sorted by price (desc for bids, asc for asks)
    getFirstBookValuesByCount(symbol, side, count = 10){
        let prices = this.BOOK[symbol].psnap[side].slice(0, count);
        let result = prices.map(p => this.BOOK[symbol][side][p]);
        return result;
    }

    // get first book values by percent deviation from first price
    // returned values sorted by price (desc for bids, asc for asks)
    getFirstBookValuesByPercent(symbol, side, percent = 0.01){
        let firstPrice = +this.BOOK[symbol].psnap[side][0];
        let deviation = firstPrice * percent;
        let sign = side == 'bids' ? -1 : +1;
        let lastPrice = firstPrice + (sign * deviation);
        let condition = (p) => side == 'bids' ? firstPrice >= p && p >= lastPrice : firstPrice <= p && p <= lastPrice;
        let prices = this.BOOK[symbol].psnap[side].filter(p => condition(p));
        let result = prices.map(p => this.BOOK[symbol][side][p]);
        return result;
    }

    getSpread(symbol){
        let bestBidPrice = +this.BOOK[symbol].psnap['bids'][0];
        let bestAskPrice = +this.BOOK[symbol].psnap['asks'][0];
        let spread = Math.abs(bestBidPrice - bestAskPrice);
        return spread;
    }

    tryConvertToUsdUsingBestPrice(assetName, amount){
        if(assetName == 'USD')
            return amount;
        let regex1 = new RegExp(`^t${assetName}USD$`);
        let symbols = this.getStoredSymbols();
        let found = symbols.filter((s) => regex1.test(s));
        if(found && found.length === 1){
            let symbol = found[0];
            let  side = 'bids';
            let bestPrice = this.BOOK[symbol].psnap[side][0];
            let totalInUsd = amount * bestPrice;
            return totalInUsd;
        }
        return null;
    }

    // returns amount
    tryConvertFromUsdUsingBestPrice(totalUsd, assetName){
        if(assetName == 'USD')
            return totalUsd;
        let regex1 = new RegExp(`^t${assetName}USD$`);
        let symbols = this.getStoredSymbols();
        let found = symbols.filter((s) => regex1.test(s));
        if(found && found.length === 1){
            let symbol = found[0];
            let  side = 'asks';
            let bestPrice = this.BOOK[symbol].psnap[side][0];
            let assetAmount = totalUsd / bestPrice;
            return assetAmount;
        }
        return null;
    }

    // check that book has data for all passed symbols
    hasSymbols(symbols){
        let stored = this.getStoredSymbols();
        let matching = stored.filter(s => symbols.indexOf(s) !== -1);
        let hasAll = matching.length === symbols.length;
        return hasAll;
    }

}