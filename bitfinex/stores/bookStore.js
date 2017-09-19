const _ = require('lodash');
// const async = require('async');
const fs = require('fs');
const moment = require('moment');

module.exports = class BookStore {
    constructor(){
        this.BOOK = {};

        this.saveBookInterval = setInterval(() => {
            this.saveBook();
        }, 60000);
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
                // fs.appendFileSync(logfile, logMsg);
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

        this.BOOK[symbol].mcnt++
        this.checkCross(symbol, model);
    }

    checkCross(symbol, model) {
        let bid = this.BOOK[symbol].psnap.bids[0];
        let ask = this.BOOK[symbol].psnap.asks[0];
        if (bid >= ask) {
            const logfile = __dirname + '/logs/ws-book-err.log';
            let lm = [moment.utc().format(), "bid(" + bid + ")>=ask(" + ask + ")"];
            let logMsg = lm.join(' / ') + "\r\n";
            fs.appendFileSync(logfile, logMsg);
            console.warn(logMsg);
        }
    }

    saveBook() {
        if(!this.BOOK)
            return;
        console.log('bookStore: save');
        const now = moment.utc().format('YYYYMMDDHHmmss')
        fs.writeFileSync(__dirname + "/logs/tmp-ws-book-" + now + '.log', JSON.stringify(this.BOOK));
    }
}