const express = require('express');
const _ = require('lodash');
const app = express();
const port = 3000;

const BitfinexBot = require('./bitfinex/bitfinexBot.js');
const bitfinexBot = new BitfinexBot({
    apiKey: 'WFb6GxahaWcpfhjFWZJaF5LYb3lcP1ZnyHVPojcmzx9',
    apiSecret: '7n8Awvh3Tpw7ORfCcVi2rM7NTrJwygk3B4c1yn2lVGe',
    currency: 'IOT',
    maxAmount: 4.8,
    minPathLength: 3,
    maxPathLength: 5,
    minPathProfitUsd: 0.05 
});
bitfinexBot.start();

// // log
// app.use((request, response, next) => {
//     console.log('proccessing request');
//     next();
// });

// app.get('/', (request, response) => {
//     response.send('Этот город боится меня. Я видел его истинное лицо...');
// });

// app.get('/testerr', (request, response) => {
//     throw new Error("Oops!");
// });

// // handle errors - The error handler function should be the last function added with app.use
// app.use((err, request, response, next) => {
//     console.error(err);
//     response.status(500).send('Something broke!');
// });

// app.listen(port, (err) => {
//     if(err){
//         return console.log('server error: ', err);
//     }
//     console.log(`server is listening on port ${port}`);
// });

// handle process stop
process.on('exit', processExitHandler.bind(null, {cleanup: true}));
// ctrl-c
process.on('SIGINT', processExitHandler.bind(null, {cleanup: true, exit:true})); 
// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', processExitHandler.bind(null, {cleanup: true, exit:true}));
process.on('SIGUSR2', processExitHandler.bind(null, {cleanup: true, exit:true}));
//catches uncaught exceptions
process.on('uncaughtException', processExitHandler.bind(null, {cleanup: true, exit:true}));

function processExitHandler(options, err){
    if(options.cleanup){
        bitfinexBot.stop();
    }
    if(err){
        console.log('uncaught exception. exiting...');
        console.error(err);
    }
    if(options.exit){
        console.log('exiting...');
        process.exit();
    }
}

// test rest api
const bitfinexApi = require('./bitfinex/bitfinexApi.js');
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

// test algorithm
const fs = require('fs');
const path = require('path');
const CirclePathAlgorithm = require('./bitfinex/circlePathAlgorithm.js');
const BookStore = require('./bitfinex/stores/bookStore.js');

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

