const express = require('express');
const app = express();
const port = 3000;

const BitfinexBot = require('./bitfinex/bitfinexBot.js');
const bitfinexBot = new BitfinexBot();
bitfinexBot.start();

// log
app.use((request, response, next) => {
    console.log('proccessing request');
    next();
});

app.get('/', (request, response) => {
    response.send('Этот город боится меня. Я видел его истинное лицо...');
});

app.get('/testerr', (request, response) => {
    throw new Error("Oops!");
});

// handle errors - The error handler function should be the last function added with app.use
app.use((err, request, response, next) => {
    console.error(err);
    response.status(500).send('Something broke!');
});

app.listen(port, (err) => {
    if(err){
        return console.log('server error: ', err);
    }
    console.log(`server is listening on port ${port}`);
});

// handle server stop on ctrl-c
process.on('SIGINT', function() {
    console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
    // some other closing procedures go here
    bitfinexBot.stop();

    process.exit();
});

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
