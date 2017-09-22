const _ = require('lodash');
// const async = require('async');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const logfile = path.join(__dirname, '../../logs/bitfinex/bookStore/ws-book-err.log');


module.exports = class BookStore {
    constructor(){
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
                let logMsg = "[" + moment().format() + "] " + pair + " | " + JSON.stringify(pp) + " BOOK delete fail side not found\n";
                fs.appendFileSync(logfile, logMsg);
                console.warn(logMsg);
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
            //console.log("num price points", side, prices.length)
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
            // console.warn(logMsg);
        }
    }

    saveBook() {
        if(!this.BOOK)
            return;
        console.log('bookStore: save');
        const now = moment.utc().format('YYYYMMDDHHmmss');
        const savefile = path.join(__dirname, '../../logs/bitfinex/bookStore/' + 'tmp-ws-book-' + now + '.log');
        fs.writeFileSync(savefile, JSON.stringify(this.BOOK));
    }

    getStoredSymbols(){
        return Object.keys(this.BOOK).filter((s) => !!s);
    }

    getSymbol(assetName1, assetName2){
        let symbols = this.getStoredSymbols();
        let symbol = symbols.find((s) => {
            let regex1 = new RegExp(`t${assetName1}${assetName2}`);
            let regex2 = new RegExp(`t${assetName2}${assetName1}`);
            if(regex1.test(s) || regex2.test(s)){
                return true;
            }
            return false;
        });
        return symbol;
    }

    // tIOTUSD, IOT -> sell
    // tIOTUSD, USD -> buy
    getSymbolAction(symbol, assetName){
        let regex1 = new RegExp(`^t${assetName}[A-Z]{3}$`);
        let regex2 = new RegExp(`^t\[A-Z]{3}${assetName}$`);
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
    getBestBookValueForAction(symbol, action){
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
}