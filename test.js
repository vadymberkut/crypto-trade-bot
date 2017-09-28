
// test algorithm
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const CirclePathAlgorithm = require('./bitfinex/circlePathAlgorithm.js');
const BookStore = require('./bitfinex/stores/bookStore.js');
const bitfinexHelper = require('./bitfinex/bitfinexHelper.js');

// // // TEST FROM ONE FILE




// // run on all store logs
let dir = './logs/bitfinex/bookStore';
let logFiles = fs.readdirSync(dir);
logFiles = logFiles.filter(f => f.indexOf('ws-book-err') === -1);
console.log(`Start processing files`);

let startState = 'IOT';
let maxAmount = 1000;
let profits = [];
let profitsUsd = [];

let hrstart, hrend;

let startFrom = 1200;
let processCount = 5000;
let count = 0;
logFiles = logFiles.slice(startFrom, logFiles.length - 1);
logFiles.forEach((logFile, i) => {
    // console.log(`Processing file: ${logFile}`);
    count += 1;
    if(count >= processCount) return;
    let index = i + startFrom;
    try{
        hrstart = process.hrtime();
        logFile = path.join(dir ,logFile);
        let json = fs.readFileSync(logFile, 'utf8');
        let obj = JSON.parse(json);
        // skip empty data
        if(obj === null || obj === undefined || _.isEmpty(obj)){
            console.log(`file ${index}: skiping empty file`);
            return;
        }
        hrend = process.hrtime(hrstart);
        // console.info("Read file and parsing JSON time: %ds %dms", hrend[0], hrend[1]/1000000);
    
        hrstart = process.hrtime();
    
        let bookStore = new BookStore();
        bookStore.initBookFromObject(obj);
        let circlePathAlgorithm = new CirclePathAlgorithm(bookStore, startState, maxAmount, 3, 5, 1, 0.002, bitfinexHelper);

        let solutions = circlePathAlgorithm.solve();

        if(solutions.length === 0){
            console.log(`file ${index}: profit solution not found`);
            return;
        }
    
        // take 1 profit
        let profit = solutions[0].estimatedProfit;
        let profitUsd = solutions[0].estimatedProfitUsd;
        profits.push(profit);
        profitsUsd.push(profitUsd);

        hrend = process.hrtime(hrstart);
        console.log(`file ${index}: +${profit} ${startState}, +${profitUsd} USD. ${hrend[0]}s ${hrend[1]/1000000}ms. (${logFile})`);
    }
    catch(e){
        console.log(`file ${index}: error - `, e);
    }
});
console.log(`End processing files`);
console.log('TOTAL:');
console.log(`${startState}: min=${_.min(profits)}, max=${_.max(profits)}, avg=${_.sum(profits)/profits.length}, sum=${_.sum(profits)}`);
console.log(`USD: min=${_.min(profitsUsd)}, max=${_.max(profitsUsd)}, avg=${_.sum(profitsUsd)/profitsUsd.length}, sum=${_.sum(profitsUsd)}`);

