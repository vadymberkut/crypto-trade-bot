
const logger = require('../utils/logger');
const WebSocket = require('ws');
const crypto = require('crypto');
const BitMEXClient = require('../vendor/bitmex/api-connectors/official-ws/nodejs/index'); // !!!!! Very buggy don't use in production. Only for tests

const { 
    WsInfoModel, 
    WsErrorModel,
    WsSuccessModel,
    WsTableDataModel,
} = require('../models/bitmex/wsModels');

// BitMEXClient.getData has a bug when tableName is null
// BitMEXClient.clone can't clone object with array inside

const logPrefix = 'bitmexApi';

const publicStreams = [
    "announcement",// Site announcements
    "chat",        // Trollbox chat
    "connected",   // Statistics of connected users/bots
    "funding",     // Updates of swap funding rates. Sent every funding interval (usually 8hrs)
    "instrument",  // Instrument updates including turnover and bid/ask
    "insurance",   // Daily Insurance Fund updates
    "liquidation", // Liquidation orders as they're entered into the book
    "orderBookL2", // Full level 2 orderBook
    "orderBook10", // Top 10 levels using traditional full book push
    "publicNotifications", // System-wide notifications (used for short-lived messages)
    "quote",       // Top level of the book
    "quoteBin1m",  // 1-minute quote bins
    "quoteBin5m",  // 5-minute quote bins
    "quoteBin1h",  // 1-hour quote bins
    "quoteBin1d",  // 1-day quote bins
    "settlement",  // Settlements
    "trade",       // Live trades
    "tradeBin1m",  // 1-minute trade bins
    "tradeBin5m",  // 5-minute trade bins
    "tradeBin1h",  // 1-hour trade bins
    "tradeBin1d",  // 1-day trade bins
];

const privateStreams = [
    "affiliate",   // Affiliate status, such as total referred users & payout %
    "execution",   // Individual executions; can be multiple per order
    "order",       // Live updates on your orders
    "margin",      // Updates on your current account balance and margin requirements
    "position",    // Updates on your positions
    "privateNotifications", // Individual notifications - currently not used
    "transact",     // Deposit/Withdrawal updates
    "wallet"       // Bitcoin address balance data, including total deposits & withdrawals
];

// Not sure that it's correct list
// const noSymbolTables = [
//     'account',
//     'affiliate',
//     'funds',
//     'insurance',
//     'margin',
//     'transact',
//     'wallet',
//     'announcement',
//     'connected',
//     'chat',
//     'publicNotifications',
//     'privateNotifications'
// ];

class Api {
    constructor(config) {
        this.config = config;

        this.ws = null;
        this.wsConnecting = false;
        this.wsConnected = false;
        this.wsReconnectionInterval = null;
        this.wsInfo = null; // Is sent when connected
        this.subs = {};

        //#region BitMEXClient
        
        // // Create WS client means to start receiving data
        // this.wsClient = new BitMEXClient({
        //     testnet,
        //     apiKeyId,
        //     apiKeySecret,
        //     maxTableLen  // the maximum number of table elements to keep in memory (FIFO queue)
        // });

        // this.wsClient.on('initialize', (error) => { // client.streams available
        //     logger.log("BitMEX: Websocket initialized: Streams: ", this.wsClient.streams);
        // });

        // this.wsClient.on('open', (error) => {
        //     logger.log("BitMEX: Websocket opened");
        // });

        // // !!! Don't forget to attach an error handler! If one is not attached, errors will be thrown and crash your client.
        // this.wsClient.on('error', (error) => {
        //     logger.error("BitMEX: Websocket error:", error);
        // });
        
        // this.wsClient.on('end', () => {
        //     logger.error('BitMEX: Websocket end. Client closed due to unrecoverable WebSocket error. Please check errors above.');
        // });

        // this.wsClient.addStream('XBTUSD', 'quote', (data, symbol, tableName) => {
        //     if(!data.length) return;
        //     const quotes = data;

        //     let clientData = this.wsClient._data;
        //     let symbolData = this.wsClient.getData('XBTUSD');
        // });

        //#endregion
    }

    //#region Private members

    _connectWs() {
        if(this.wsConnected || this.wsConnecting) {
            return;
        }

        this.wsConnecting = true;
        this.ws = new WebSocket(this.config.wsUrl + this.config.wsEndpoint);
        
        this.ws.on('open', () => {
            logger.log(`${logPrefix} - ws on open`);
            this.wsConnecting = false;
            this.wsConnected = true;
            this._processSubs();
        });

        this.ws.on('close', (code, reason) => {
            logger.log(`${logPrefix} - ws on close. code: ${code}, reason: ${reason}`, { code, reason });
            this.wsConnecting = false;
            this.wsConnected = false;
        });

        this.ws.on('error', (err) => {
            logger.error(`${logPrefix} - ws on error. err: ${err}`, err);
            this.wsConnecting = false;
            this.wsConnected = false;
        });

        this.ws.on('message', (data) => {
            logger.log(`${logPrefix} - ws on message`);
            this._handleMessage(data);
        });
        
        this.ws.on('ping', (data) => { // Emitted when a ping is received from the server.
            logger.log(`${logPrefix} - ws on ping`);
        });

        this.ws.on('pong', () => { // Emitted when a pong is received from the server.
            logger.log(`${logPrefix} - ws on pong`);
        });

        this.ws.on('unexpected-response', (request, response) => {
            logger.warn(`${logPrefix} - ws on unexpected-response`, { request, response });
        });

        this.ws.on('upgrade', (response) => {
            logger.log(`${logPrefix} - ws on upgrade`, { response });
        });
    }    

    //#endregion

    startWs() {
        logger.log(`${logPrefix} - Starting ws...`)
        this._connectWs();

        // Reconnect
        this.wsReconnectionInterval = setInterval(() => {
            if (this.wsConnected || this.wsConnecting) return;
            logger.log(`${logPrefix} - Reconnecting to ws...`);
            this._connectWs();
        }, this.config.wsReconnectionInterval);
    }

    stopWs(force = false) {
        logger.log(`${logPrefix} - Stopping ws...`);
        clearInterval(this.wsReconnectionInterval);

        let promise = new Promise((resolve, reject) => {
            this.ws.on('close', (code, reason) => {
                resolve();
            });
        });

        force ? this.ws.terminate() : this.ws.close();

        return promise;
    }


    subscribe(table, symbol = null, callback) {
        this.subs[table] = this.subs[table] || [];

        // Check for duplicates
        let existing =  this.subs[table].find(x => x.symbol === symbol);

        if(existing) {
            let index = this.subs[table].indexOf(existing);
            existing.callbacks.push(callback);
        } else {
            let data = {
                'op': 'subscribe',
                'args': symbol === null ?  [ `${table}` ] : [ `${table}:${symbol}` ]
            };
    
            this.subs[table].push({
                table,
                symbol,
                callbacks: [ callback ],
                data,
            });
        }
        this._processSubs();
    }

    _processSubs() {
        if(!this.wsConnected) {
            return;
        }

        for(let table in this.subs) {
            let tableSubs = this.subs[table];
            tableSubs.forEach((sub) => {
                let options = {};
                let sendCallback = () => {};
                this.ws.send(JSON.stringify(sub.data), options, sendCallback);
            });
        }
    }

    _handleMessage(rawData) {
        let data;
        try {
            data = JSON.parse(rawData);
        } catch(err) {
            logger.error(`${logPrefix} - can't parse raw data received. rawData: ${rawData}`, rawData);
            return;
        }
        let isInfo = !!data.info && !!data.version; // Initial message with info
        let isError = !!data.error; //  (Emitted upon a malformed request or an attempt to request a locked resource)
        let isSuccess = data.success === true; // (Emitted upon a successful subscription to a topic)
        let isData = !!data.table && !!data.action; // Stream data message

        if(isInfo) {
            this._handleInfoMessage(rawData, data);
        } else if(isError) {
            this._handleErrorMessage(rawData, data);
        } else if(isSuccess) {
            this._handleSuccessMessage(rawData, data);
        } else if(isData) {
            this._handleDataMessage(rawData, data);
        }
    }

    _handleInfoMessage(rawData, data) {
        let model = new WsInfoModel(data);
        logger.log(`${logPrefix} - ws info message received: ${rawData}`);
        this.wsInfo = model;
    }

    _handleErrorMessage(rawData, data) {
        let model = new WsErrorModel(data);
        logger.error(`${logPrefix} - ws error message received: ${rawData}`, model);
    }

    _handleSuccessMessage(rawData, data) {
        let model = new WsSuccessModel(data);
        logger.log(`${logPrefix} - ws success message received: ${rawData}`);
    }

    _handleDataMessage(rawData, data) {
        let model = new WsTableDataModel(data);

        // Find callbacks that must be provided with data
        this.subs[model.table].forEach((sub) => {
            let { table, symbol, callbacks, data } = sub;
            callbacks.forEach(callback => {
                callback(model);
            });
        });
    }

    _computeSignature({ 
        verb, // GET, POST
        path, // '/api/v1/order'
        expires = (new Date().getTime() + 60 * 1000), // timestamp in seconds
        postBody = '', // body JSON string!
     }) {
        let signature = crypto.createHmac('sha256', this.config.apiKeySecret).update(verb + path + expires + postBody).digest('hex');
        return signature;
    }

    authWs() {
        let expires = (new Date().getTime() + 1000 * 60); // seconds. must be a number
        let signature = this._computeSignature({ 
            verb: 'GET',
            path: this.config.wsEndpoint,
            expires: expires,
            postBody: ''
         });
        let data = {
            'op': 'authKeyExpires',
            'args': [ this.config.apiKeyId, expires, signature ]
        };
        this.ws.send(JSON.stringify(data));
    }
}

module.exports = Api;