// Do not parse text descriptions, use only codes
// All times are UTC timestamps expressed as seconds (eg 1477409622)

// Price Precision - For all pairs on Bitfinex we use 5 significant digits. Examples of five significant digits would be 12.123, 1.1234, 123.43, and 1234.5.
// Note: API will truncate price with precision > 5

const WebSocket = require('ws');
const crypto = require('crypto');
const _ = require('lodash');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

const bitfinexApi = require('./bitfinexApi.js');
const bitfinexHelper = require('./bitfinexHelper.js');
const BitfinexOrderChain = require('./bitfinexOrderChain.js');

let BookResponseModel = require('./apiModels/BookResponseModel.js');
let WalletsResponseModel = require('./apiModels/WalletsResponseModel.js');
let OrderResponseModel = require('./apiModels/OrderResponseModel.js');
let TradeResponseModel = require('./apiModels/TradeResponseModel.js');
let NotificationResponseModel = require('./apiModels/NotificationResponseModel.js');

const BookStore = require('./stores/bookStore.js');
const WalletStore = require('./stores/walletStore.js');
const OrderStore = require('./stores/orderStore.js');
const NotificationStore = require('./stores/notificationStore.js');
const CirclePathAlgorithm = require('./circlePathAlgorithm.js');

const random = require('../utils/random.js');

const TelegramBot = require('../telegram/telegramBot.js');

const API_VERSION = 2;

const bitfinexSymbols = [
    'tBTCUSD', 
    'tBCHUSD', 'tBCHBTC', 'tBCHETH',
    'tETHUSD', 'tETHBTC',
    'tETCUSD', 'tETCBTC',
    'tLTCUSD', 'tLTCBTC',
    'tIOTUSD', 'tIOTBTC', 'tIOTETH',
    'tNEOUSD', 'tNEOBTC', 'tNEOETH',
    'tSANUSD', 'tSANBTC', 'tSANETH',
    'tXMRUSD', 'tXMRBTC',
    'tOMGUSD', 'tOMGBTC', 'tOMGETH',
    'tZECUSD', 'tZECBTC',
    'tDSHUSD', 'tDSHBTC',
    'tXRPUSD', 'tXRPBTC',
    'tEOSUSD', 'tEOSBTC', 'tEOSETH'
];

const bitfinexOrderTypes = {
    MARKET: 'MARKET',
    EXCHANGE_MARKET: 'EXCHANGE MARKET',
    LIMIT: 'LIMIT',
    EXCHANGE_LIMIT: 'EXCHANGE LIMIT',
    STOP: 'STOP',
    EXCHANGE_STOP: 'EXCHANGE STOP',
    TRAILING_STOP: 'TRAILING STOP',
    EXCHANGE_TRAILING_STOP: 'EXCHANGE TRAILING STOP',
    FOK: 'FOK',
    EXCHANGE_FOK: 'EXCHANGE FOK',
    STOP_LIMIT: 'STOP LIMIT',
    EXCHANGE_STOP_LIMIT: 'EXCHANGE STOP LIMIT',
};

const bitfinexWalletTypes = {
    EXCHANGE: 'exchange',
    MARGIN: 'margin',
    FUNDING: 'funding',
};

// Maker fees are paid when you add liquidity to our order book by placing a limit order under the ticker price for buy and above the ticker price for sell.
// Taker fees are paid when you remove liquidity from our order book by placing any order that is executed against an order of the order book.
// Note: If you place a hidden order, you will always pay the taker fee. If you place a limit order that hits a hidden order, you will always pay the maker fee.
const bitfinexOrderExecutionFees = {
    maker:  0.001, // 0.1 %
    taker:  0.002, // 0.2 %
};

const bitfinexMinOrderSize = {
    'BTC': 0.05, //0.01,
    'ZEC': 0.01,
    'OTHER': 0.1,
};
function getMinOrderSize(currency){
    if(bitfinexMinOrderSize[currency]){
        return bitfinexMinOrderSize[currency];
    }
    return bitfinexMinOrderSize['OTHER'];
}

const CLIENT_ORDER_ID_DATE_FORMAT = 'YYYY-MM-DD';

const BITFINEX_MAX_CALCULATIONS_PER_BATCH = 30;

const bitfinexOrderStatuses = {
    ACTIVE: 'ACTIVE',
    EXECUTED: 'EXECUTED',
    PARTIALLY: 'PARTIALLY',
    FILLED: 'FILLED',
    CANCELED: 'CANCELED'
};

class BitfinexBot {
    constructor(options){
        this.apiKey = options.apiKey;
        this.apiSecret = options.apiSecret;
        this.currency = options.currency;
        this.maxAmount = options.maxAmount;
        this.minPathLength = options.minPathLength;
        this.maxPathLength = options.maxPathLength;
        this.minPathProfitUsd = options.minPathProfitUsd;

        this.isAuthenticated = null;
        this.authInfo = null; // e.g.
        // { event: 'auth',
        // status: 'OK',
        // chanId: 0,
        // userId: 315469,
        // auth_id: '1cc28045-946c-46e3-9e60-e96eb58bd31c',
        // caps: 
        //  { orders: { read: 1, write: 1 },
        //    account: { read: 1, write: 0 },
        //    funding: { read: 1, write: 0 },
        //    history: { read: 1, write: 0 },
        //    wallets: { read: 1, write: 0 },
        //    withdraw: { read: 0, write: 0 },
        //    positions: { read: 1, write: 0 } } }

        this.connected = false;
        this.connecting = false;
        this.maintenance = false;

        this.webSocketConfig = {
            url: 'wss://api.bitfinex.com/ws/2'
        };
        this.channelSubscribtion = new ChannelSubscribtion();
        
        // stores
        this.bookStore = new BookStore();
        this.walletStore = new WalletStore();
        this.orderStore = new OrderStore();
        this.notificationStore = new NotificationStore();
        this.telegramBot = new TelegramBot({httpApiToken: process.env.TELEGRAM_HTTP_API_TOKEN});
        this.saveBookInterval = setInterval(() => {
            this.bookStore.saveBook();
        // }, 60000);
        // }, 5000);
        }, 30000);

        this.telegramBot.getMe().then((user)=>{
            console.info(user);
        });
        this.telegramBot.sendMessage({
            chat_id: '375693371',
            text: 'Hi from bot',

        }).then((res)=>{
            console.info(res);
        });

        this.trading = false;
        this.lastTradingMs = (new Date()).getTime();
        this.minTradingIntervalMs = 500;
        this.maxSolveTimeMs = 850; // if greater - do nothing

       this.bitfinexOrderChain = new BitfinexOrderChain(this.bookStore, this.walletStore, this.orderStore, this.telegramBot);

       this.solutionStats = {
           allProfits: [],
           allProfitsUsd: [],
           max: 0,
           min: 0,
           avg: 0,
           sum: 0,
           maxUsd: 0,
           minUsd: 0,
           avgUsd: 0,
           sumUsd: 0,
       };
    }

    _connect(){
        if (this.connecting || this.connected) 
            return;
        this.connecting = true;

        // init ws
        this.wss = new WebSocket(this.webSocketConfig.url);

        this.wss.onopen = () => {
            // API keys setup here (See "Authenticated Channels")
            console.log('wss open');
            this.connecting = false;
            this.connected = true;
            this._auth();
            this._subscribeToAllBooks();
        };

        this.wss.onclose = () => {
            console.log('wss close');
            this.connecting = false;
            this.connected = false;
            this.isAuthenticated = false;
            this.authInfo = null;
            this.channelSubscribtion.removeAll(); // forget all subs
        };

        this.wss.onerror = (err) => {
            console.erorr('wss error: ', err);
        };

        this.wss.onmessage = (response) => {
            let message;
            try {
                message = JSON.parse(response.data);
            } catch (e) {
                console.error('[bfx ws2 error] received invalid json');
                console.error('[bfx ws2 error]', response.data);
                console.trace();
                return;
            }
            
            if (!Array.isArray(message) && message.event){
                if(message.event == 'info'){
                    if(message.version){
                        let {event, version} = message;
                        if(version !== API_VERSION){
                            throw new Error(`API version changed. Excected v${API_VERSION}, received v${version}`);
                        }
                        else{
                            console.log(`using api v${version}`);
                        }
                    }
                    if(message.code){
                        let {event, code, msg} = message;
                        console.log(`ws: ${event} ${code} - ${msg}`);
                        // 20051 : Stop/Restart Websocket Server (please reconnect)
                        if(code == 20051){
                            
                        }
                        // 20060 : Entering in Maintenance mode. Please pause any activity and resume after receiving the info message 20061 (it should take 120 seconds at most).
                        if(code == 20060){
                            this.maintenance = true;
                        }
                        // 20061 : Maintenance ended. You can resume normal activity. It is advised to unsubscribe/subscribe again all channels.
                        if(code == 20061){
                            this.maintenance = false;
                            this._unsubscribeFromAll();
                            this._auth();
                            this._subscribeToAllBooks();
                        }
                    }
                }
                if(message.event == 'subscribed'){
                    let {event, channel, chanId, symbol} = message;
                    console.log(`subscribed to ${channel} ${chanId} ${symbol}`);
                    
                    this.channelSubscribtion.confirm(message);
                }
                if(message.event == 'unsubscribed'){
                    let {event, status, chanId} = message;
                    if(status == 'OK'){
                        console.log(`unsubscribed from ${chanId} ${status}`);
                        this.channelSubscribtion.remove(message);
                    }
                    else{
                        console.error(`unsubscribed error from ${chanId} (${status})`);
                    }   
                }
                if(message.event == 'auth'){
                    if(message.status == 'OK'){
                        // all is ok - save auth info (userId, auth_id, api permissions)
                        console.log(`auth OK`, message);
                        this.isAuthenticated = true;
                        this.authInfo = message;

                        
                        // this._addNewOrderRequestToChain(bitfinexOrderTypes.EXCHANGE_LIMIT, 'tIOTUSD', 0.28, 0.12);
                        // this.bitfinexOrderChain.process(() => {
                        //     console.log('orders processed');
                        //     this.bitfinexOrderChain.clear();
                        // });
                    }
                    else{
                        console.error(`auth error`, message);
                    }
                }
                if(message.event == 'error'){
                    let {code, msg} = message;
                    console.error(`error ${code}: `, msg);
                }
                return;
            }
            // handle channel
            else{
                let chanId = message[0];
                let msgType = message[1];

                if (msgType == 'hb'){
                    // console.log(`Received HeatBeart in ${chanId} channel`);
                    return;
                }
                // From Bitfinex Docs:
                // Work In Progress
                // This section (Notifications) is currently a work in progress, but it will be a way to be alerted as to different changes in status, price alerts, etc
                if (msgType == 'n'){
                    console.log(`notification: ${chanId}: `, JSON.stringify(message));
                    let data = message[2];
                    let model = new NotificationResponseModel(data);
                    this.notificationStore.update(model);
                    // new order notification
                    if(model.TYPE == 'on-req'){
                        let orderModel = new OrderResponseModel(model.NOTIFY_INFO);
                        this.bitfinexOrderChain.newOrderError(model, orderModel);
                    }
                    // order cancel notification
                    if(model.TYPE == 'oc-req'){
                    }
                    if(model.TYPE == 'uca'){
                        
                    }
                    if(model.TYPE == 'fon-req'){
                        
                    }
                    if(model.TYPE == 'foc-req'){
                        
                    }
                    return;
                }

                // listen to user info channels
                if(chanId === 0){
                    console.log(`ws: new message in ${chanId} channel: `, message);
                    let data = message[2];
                    
                    // wallet snapshot or update
                    if(msgType == 'ws' || msgType == 'wu'){
                        if(Array.isArray(data) && Array.isArray(data[0])){
                            let models = data.map((d) => new WalletsResponseModel(d));
                            this.walletStore.update(models);
                            let withNullBalancaAvailable = models.filter(model => model.BALANCE_AVAILABLE === null);
                            if(withNullBalancaAvailable.length !== 0){
                                this.walletStore.updating = true;
                                let options = withNullBalancaAvailable.map(model => {return {walletType: model.WALLET_TYPE, currency: model.CURRENCY}});
                                this._calcWalletBalanceForAll(options);
                            }
                        }
                        else if(Array.isArray(data) && !Array.isArray(data[0])){
                            let model = new WalletsResponseModel(data);
                            this.walletStore.update(model);
                            if(model.BALANCE_AVAILABLE === null){
                                this.walletStore.updating = true;
                                this._calcWalletBalance(model.WALLET_TYPE, model.CURRENCY);
                            }
                        }
                        return;
                    }
                    // handle orders messages
                    if(msgType == 'os' || msgType == 'on' || msgType == 'ou' || msgType == 'oc' || msgType == 'oc-req'){
                        if(Array.isArray(data) && Array.isArray(data[0])){
                            let models = data.map((d) => new OrderResponseModel(d));
                            this.orderStore.update(models);
                        }
                        else if(Array.isArray(data) && !Array.isArray(data[0])){
                            let model = new OrderResponseModel(data);
                            this.orderStore.update(model);
                        }
                        this.bitfinexOrderChain.newMessage(message);
                        return;
                    }
                    // handle trades messages
                    if(msgType == 'te' || msgType == 'tu'){
                        this.bitfinexOrderChain.newMessage(message);
                        return;
                    }
                }
                else{
                    this.channelSubscribtion.handle(message);
                }
            }
        };
    }

    start(){
        console.log('starting bitfinex bot...')
        this._connect();

        setInterval(() => {
            if (this.connected) return;
            console.log('reconecting to ws...');
            this._connect();
        }, 2500)

        // setTimeout(()=>{
        //     let tradeInterval = setInterval(() => {
        //         this._startTrading();
        //     }, this.minTradingIntervalMs);
        // }, 5000);
    }

    stop(){
        console.log('stopping bitfinex bot...')
        this._unsubscribeFromAll();
    }

    // Auth
    // Account info always uses chanId 0.
    _auth (calc = 0) {
        const authNonce = (new Date()).getTime() * 1000;
        const payload = 'AUTH' + authNonce + authNonce;
        const signature = crypto.createHmac('sha384', this.apiSecret).update(payload).digest('hex');
        let request = {
            event: 'auth',
            apiKey: this.apiKey,
            authSig: signature,
            authPayload: payload,
            authNonce: +authNonce + 1,
            calc,

            // Channel filters
            // During authentication you can provide an array to indicate which informations/messages you are interested to receive (default = everything).
            filter: [
                'trading', //orders, positions, trades 
                // 'funding', //offers, credits, loans, funding trades
                'wallet', //wallet 
                'algo', //algorithmic orders
                'balance' //balance (tradable balance, ...)
              ]
        };
        this.wss.send(JSON.stringify(request), (err) => {
            if(err)
                console.error(`wss: auth error `, err);
        });
    }

    _subscribeToBook(symbol){
        if(bitfinexSymbols.indexOf(symbol) === -1){
            console.warn(`can't subscribe to book '${symbol}'`);
            return;
        }
        let request = { 
            event: 'subscribe',
            channel: 'book',
            symbol: symbol,
            prec: "P0", // Level of price aggregation (P0, P1, P2, P3). The default is P0
            freq: "F1", // Frequency of updates (F0, F1, F2, F3). F0=realtime / F1=2sec / F2=5sec / F3=10sec
            len: "100" // Number of price points ("25", "100") [default="25"]
        };

        this.channelSubscribtion.add(request, (symbol, model) => {
            this.bookStore.update(symbol, model);
        });
        this.wss.send(JSON.stringify(request), (err) => {
            if(err)
                console.error(`wss: ${symbol} book subscribe error `, err);
        });
    }

    _subscribeToAllBooks(){
        bitfinexSymbols.forEach((symbol) => {
            this._subscribeToBook(symbol);
        });
    }

    _unsubscribeFromAll(){
        let ids = this.channelSubscribtion.getAllChannelIds();
        ids.forEach((id) => {
            let request = { 
                event: 'unsubscribe',
                chanId: id.toString()
            };
            this.wss.send(JSON.stringify(request), (err) => {
                if(err)
                    console.error(`wss: channel ${id} unsubscribe error `, err);
            });
        });
    }

    _startTrading(){
        // start trading when subscribed to all book channels
        // rebuild solution every n seconds
        if(!this.connected || this.connecting) return;
        if(this.maintenance) return;
        if(this.trading) return;

        // check user is autheticated
        if(this.isAuthenticated !== true){
            console.info(`can't start trading - user not authenticated`);
            return;
        }
        // check user permissioms
        if(this.authInfo.caps.orders.read !== 1 || this.authInfo.caps.orders.write !== 1){
            console.info(`user must have access to read and write orders`);
            return;
        }

        // wait interval between trades
        if((new Date()).getTime() - this.lastTradingMs < this.minTradingIntervalMs){
            console.info(`waiting for ${this.minTradingIntervalMs/1000} sec before next trade`);
            return;
        }

        if(this.channelSubscribtion.checkAllBooksConfirmed(bitfinexSymbols) === false) return;

        this.trading = true;
        let hrstart, hrend, executionMs;

        // get solution
        hrstart = process.hrtime();
        let circlePathAlgorithm, solutions;
        try{
            circlePathAlgorithm = new CirclePathAlgorithm(
                this.bookStore, 
                this.currency, 
                this.maxAmount, 
                this.minPathLength, 
                this.maxPathLength, 
                this.minPathProfitUsd, 
                bitfinexOrderExecutionFees.taker,
                bitfinexHelper
            );
            solutions = circlePathAlgorithm.solve();
        }
        catch(err){
            console.error(`bitfinexBot: `, err);
            this.trading = false;
            return;
        }
        hrend = process.hrtime(hrstart);
        executionMs = hrend[1]/1000000;
        if(executionMs > this.maxSolveTimeMs){
            this.trading = false;
            return;
        }
        if(solutions.length === 0){
            this.trading = false;
            return;
        }

        // TEST DATA
        // let bookStore = new BookStore();
        // let fileName2 = path.join(__dirname, '../logs/bitfinex/bookStore', 'tmp-ws-book-20170924141040.log'); // +63.3374$ IOT
        // let json = fs.readFileSync(fileName2, 'utf8');
        // let obj = JSON.parse(json);
        // bookStore.initBookFromObject(obj);
        // circlePathAlgorithm = new CirclePathAlgorithm(bookStore, 'IOT', 2000, 3, 5, 0.01, 0.002, bitfinexHelper);
        // solutions = circlePathAlgorithm.solve();
        
        hrstart = process.hrtime();
        let solution = solutions[0]; // take best solution

        // save stats
        let estProfit = solution.estimatedProfit;
        let estProfitUsd = solution.estimatedProfitUsd;
        this.solutionStats.allProfits.push(estProfit);
        this.solutionStats.allProfitsUsd.push(estProfitUsd);
        this.solutionStats.min = _.min(this.solutionStats.allProfits);
        this.solutionStats.max = _.max(this.solutionStats.allProfits);
        this.solutionStats.avg = _.sum(this.solutionStats.allProfits) / this.solutionStats.allProfits.length;
        this.solutionStats.sum = _.sum(this.solutionStats.allProfits);
        this.solutionStats.minUsd = _.min(this.solutionStats.allProfitsUsd);
        this.solutionStats.maxUsd = _.max(this.solutionStats.allProfitsUsd);
        this.solutionStats.avgUsd = _.sum(this.solutionStats.allProfitsUsd) / this.solutionStats.allProfitsUsd.length;
        this.solutionStats.sumUsd = _.sum(this.solutionStats.allProfitsUsd);
        console.log(`+${estProfit} ${this.currency}, +${estProfitUsd} USD. `);
        // console.log('TOTAL:');
        // console.log(`${'IOT'}: min=${this.solutionStats.min}, max=${this.solutionStats.max}, avg=${ this.solutionStats.avg}, sum=${this.solutionStats.sum}`);
        // console.log(`USD: min=${this.solutionStats.minUsd}, max=${this.solutionStats.maxUsd}, avg=${this.solutionStats.avgUsd}, sum=${this.solutionStats.sumUsd}`);


        // TODO
        // HERE WE need to ensure that when WS connection is lost and reestablished
        // the order chain will continue processing
        let instructions = solution.instructions;

        // TEST
        instructions = [
            {
                transition: 'tIOTUSD',
                actionPrice: 0.53505,
                actionAmount: -4.81,
            },
            {
                transition: 'tIOTUSD',
                actionPrice: 0.53265,
                actionAmount: 4.81
            }
        ];

        // check min order size
        let allMoreThanMinSize = instructions.reduce((res, ins) => {
            if(ins.transition === null) return res && true;
            let {pair, base, qoute} = bitfinexHelper.convertSymbolToCurrency(ins.transition);
            let min = Math.min(getMinOrderSize(base), getMinOrderSize(qoute));
            return res && Math.abs(ins.actionAmount) >= min;
        }, true);
        if(allMoreThanMinSize === false){
            console.warn(`skip solution: transition has amount less that min order amount`);
            this.trading = false;
            return
        }

        this.trading = false;
        return;

        instructions.forEach((ins) => {
            this._addNewOrderRequestToChain(bitfinexOrderTypes.EXCHANGE_LIMIT, ins.transition, ins.actionPrice, ins.actionAmount);
        });
        this.bitfinexOrderChain.process(() => {
            this.trading = false;
            this.lastTradingMs = (new Date()).getTime();
            this.bitfinexOrderChain.clear();
        });
        hrend = process.hrtime(hrstart);
        executionMs = hrend[1]/1000000;
    }

    _addNewOrderRequestToChain(type, symbol, price, amount){
        let gid = 1;

        const MAX_CID = Math.pow(2, 45) - 1; // int45 - 2^45 - 1
        const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER; // 2^53 - 1
        const MAX_VALUE = Number.MAX_VALUE; // 1.79E+308 = 1.79*10^308
        let cid = random.randomIntInc(1, MAX_CID) ; // i have tested on 500000 generations - no duplicates

        let request = [
            0,
            'on',
            null,
            {
                "gid": gid, // int32 (optional) Group id for the order
                "cid": cid, // int45 Must be unique in the day (UTC)
                "type": type.toString(),
                "symbol": symbol.toString(), // symbol (tBTCUSD, tETHUSD, ...)
                "amount": amount.toString(), // decimal string, Positive for buy, Negative for sell
                "price": price.toString(), // Price (Not required for market orders)
                // "price_trailing":  // The trailing price
                // "price_aux_limit": , // Auxiliary Limit price (for STOP LIMIT)
                "hidden": 1, // int2 1 or 0
                // "postonly": // int2 (optional) Whether the order is postonly (1) or not (0)
            }
        ];

        this.bitfinexOrderChain.enqueue(request, (requestObj) => {
            this.wss.send(JSON.stringify(requestObj), (err) => {
                if(err){
                    console.error(`wss: new order error `, err);
                }
            });
        }, (id) => {
            // cancel callback
            this._cancelOrderById(id);
        });
    }

    _cancelOrderById(orderId){
        let request = [
            0,
            'oc',
            null,
            {
                id: orderId
            }
        ];
        this.wss.send(JSON.stringify(request), (err) => {
            if(err)
                console.error(`wss: cancel order ${orderId} error `, err);
        });
    }

    // The Client Order ID is unique per day, so you also have to provide the date of the order as a date string in this format YYYY-MM-DD.
    _cancelOrderByClientOrderId(clientOrderId, clientOrderIdDateTimestamp){
        let clientOrderIdDate = moment(clientOrderIdDateTimestamp).format(CLIENT_ORDER_ID_DATE_FORMAT);
        let request = [
            0,
            'oc',
            null,
            {
                cid: clientOrderId, // Client Order ID
                cid_date: clientOrderIdDate.toString() // Client Order ID Date
            }
        ];
        this.wss.send(JSON.stringify(request), (err) => {
            if(err)
                console.error(`wss: cancel client order ${clientOrderId} ${clientOrderIdDate} error `, err);
        });
    }

    _calcWalletBalance(walletType, currency){
        // Websocket server allows up to 30 calculations per batch
        // The Websocket server performs a maximum of 8 calculations per second per client.
        this.wss.send(JSON.stringify([
            0,
            'calc',
            null,
            [
                [`wallet_${walletType}_${currency}`],
            ]
        ]), (err) => {
            if(err)
                console.error(`wss: calc error `, err);
        });
    }

    // options = [{walletType: string, currency: string}]
    _calcWalletBalanceForAll(options){
        if(!options || options.length === 0) return;
        let chunkSize = Math.min(options.length, BITFINEX_MAX_CALCULATIONS_PER_BATCH);
        let chunks = _.chunk(options, chunkSize);
        chunks.forEach(chunk => {
            let requestData = chunk.map(o => [`wallet_${o.walletType}_${o.currency}`]);
            let request = [
                0,
                'calc',
                null,
                requestData
            ];
            this.wss.send(JSON.stringify(request), (err) => {
                if(err)
                    console.error(`wss: calc wallet balance error `, err);
            });
        });
    }
}

// track subscibtions list
class ChannelSubscribtion {
    constructor(){
        this.subscribtions = [];
    }

    // add unconfirmed subs
    add(request, handler){
        this.subscribtions.push({
            request: request,
            response: null,
            chanId: null,
            channel: request.channel,
            confirmed: false,
            handler: handler
        });
    }

    confirm(wsMessage){
        let {event, channel, chanId, symbol} = wsMessage;

        if(channel == 'book'){
            let sub = this.subscribtions.find(s => s.request.channel == channel && s.request.symbol == symbol && s.confirmed === false);
            if(sub){
                sub.response = wsMessage;
                sub.chanId = chanId;
                sub.confirmed = true;
            }
        }
    }

    remove(wsMessage){
        let {event, status, chanId} = wsMessage;
        this.subscribtions = this.subscribtions.filter(s => s.chanId !== chanId);
    }

    removeAll(){
        this.subscribtions = [];
    }

    getAllChannelIds(){
        return this.subscribtions.map(s => s.chanId).filter(id => id !== null);
    }

    getAllBookSymbols(){
        return this.subscribtions.filter(s => s.channel == 'book').map(s => s.request.symbol);
    }

    checkAllBooksConfirmed(symbols){
        let confirmedSyms = this.getAllBookSymbols();
        return symbols.length == confirmedSyms.length && _.isEqual(symbols, confirmedSyms);
    }

    // invoke handler for channel
    handle(wsMessage){
        let chanId = wsMessage[0];
        let data = wsMessage[1];

        let sub = this.subscribtions.find(s => s.chanId == chanId && s.confirmed === true);
        if(sub){
            if(sub.channel == 'book'){
                let symbol = sub.request.symbol;
                if(Array.isArray(data) && Array.isArray(data[0])){
                    let models = data.map((d) => new BookResponseModel(symbol.charAt(0), d));
                    sub.handler(symbol, models);
                }
                if(Array.isArray(data) && !Array.isArray(data[0])){
                    let model = new BookResponseModel(symbol.charAt(0), data);
                    sub.handler(symbol, model);
                }
            }
        }
    }
}

module.exports = BitfinexBot;