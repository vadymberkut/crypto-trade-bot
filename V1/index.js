
// load config
require('dotenv').config({path: './development.env'});

const _ = require('lodash');
const logger = require('./utils/logger');

//#region Bots setup

const BitfinexBot = require('./bitfinex/bitfinexBot.js');
const bitfinexBot = new BitfinexBot({
    apiKey: process.env.BITFINEX_API_KEY,
    apiSecret: process.env.BITFINEX_API_SECRET,
    currency: 'IOT',
    maxAmount: 100,
    minPathLength: 3,
    maxPathLength: 4,
    minPathProfitUsd: 1
});
bitfinexBot.start();

//#endregion

//#region Error handling

// handle process stop
process.on('exit', processExitHandler.bind(null, {cleanup: true}));

// ctrl-c
process.on('SIGINT', processExitHandler.bind(null, {cleanup: false, exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', processExitHandler.bind(null, {cleanup: true, exit:true}));
process.on('SIGUSR2', processExitHandler.bind(null, {cleanup: true, exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', processExitHandler.bind(null, {cleanup: true, exit:true}));

function processExitHandler(options, err){
    if(options.cleanup){
        
    }
    if(err){
        console.log('Uncaught exception. Exiting...');
        console.error(err);
    }
    if(options.exit){
        console.log('Exiting...');
        bitfinexBot.stop().then(() => {
            logger.infoImportant('Bitfinex bot gracefully stopped');
            process.exit();
        }).catch((err)=>{
            logger.error(`Error occurred while stopping bitfinex bot: `, err);
        });
    }
}

//#endregion

//#region Test code

// test rest api
// const bitfinexApi = require('./bitfinex/bitfinexApi.js');
// bitfinexApi.platformStatus().then((data)=>{

// });

// bitfinexApi.tickers('tBTCUSD').then((data)=>{

// });
// bitfinexApi.tickers('tBTCUSD,tETHUSD').then((data)=>{

// });
// bitfinexApi.tickers('fUSD').then((data)=>{

// });

// bitfinexApi.books('tBTCUSD').then((data)=>{

// });
// bitfinexApi.books('fUSD').then((data)=>{

// });

// // test algorithm
// const fs = require('fs');
// const path = require('path');
// const CirclePathAlgorithm = require('./bitfinex/circlePathAlgorithm.js');
// const BookStore = require('./bitfinex/stores/bookStore.js');

// // TEST FROM ONE FILE
// let startState = 'ETH';
// let maxAmount = 3;
// let hrstart = process.hrtime();
// let bookStore = new BookStore();
// // let fileName = path.join(__dirname, '/logs/bitfinex/bookStore', 'tmp-ws-book-20170921102547.log'); // IOTUSD
// // let fileName = path.join(__dirname, '/logs/bitfinex/bookStore', 'tmp-ws-book-20170921110644.log'); // ALL
// let fileName = path.join(__dirname, '/logs/bitfinex/bookStore', 'tmp-ws-book-20170924141040.log'); // +63.3374$ IOT
// // let fileName = path.join(__dirname, '/logs/bitfinex/bookStore', 'tmp-ws-book-20170925112408.log');
// // let fileName = path.join(__dirname, '/logs/bitfinex/bookStore', 'tmp-ws-book-20170924134805.log');
// let json = fs.readFileSync(fileName, 'utf8');
// let obj = JSON.parse(json);
// bookStore.initBookFromObject(obj);
// let circlePathAlgorithm = new CirclePathAlgorithm(bookStore, startState, maxAmount, 3, 5, 0.01, 0.002);
// let solutions = circlePathAlgorithm.solve();
// circlePathAlgorithm.saveToFile();
// let hrend = process.hrtime(hrstart);
// console.info("Execution time: %ds %dms", hrend[0], hrend[1]/1000000);

//#endregion