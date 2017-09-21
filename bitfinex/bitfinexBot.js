// Do not parse text descriptions, use only codes
// All times are UTC timestamps expressed as seconds (eg 1477409622)

// Price Precision - For all pairs on Bitfinex we use 5 significant digits. Examples of five significant digits would be 12.123, 1.1234, 123.43, and 1234.5.
// Note: API will truncate price with precision > 5

const WebSocket = require('ws');
const bitfinexApi = require('./bitfinexApi.js');

let BookResponseModel = require('./apiModels/BookResponseModel.js');

const BookStore = require('./stores/bookStore.js');

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

class BitfinexBot {
    constructor(config){
        this.connected = false;
        this.connecting = false;
        this.webSocketConfig = {
            url: 'wss://api.bitfinex.com/ws/2'
        };
        this.subscribtion = new Subscribtion();
        
        // stores
        this.bookStore = new BookStore();
        this.saveBookInterval = setInterval(() => {
            this.bookStore.saveBook();
        // }, 60000);
        }, 10000);
    }

    __connect(){
        if (this.connecting || this.connected) 
            return;
        this.connecting = true;

        // init ws
        this.wss = new WebSocket(this.webSocketConfig.url);

        this.wss.onopen = () => {
            // API keys setup here (See "Authenticated Channels")

            console.log('WS open');
            this.connecting = false;
            this.connected = true;

            // subscribe to channels
            // this._subscribeToBook('tBTCUSD');
            // this._subscribeToBook('tETHUSD');
            // this._subscribeToBook('tIOTUSD');
            this._subscribeToAllBooks();
            // ...
        };

        this.wss.onclose = () => {
            console.log('WS close');
            this.connecting = false;
            this.connected = false;

            // unsubscribe from channels
            this._unsubscribeFromAll();
        };

        this.wss.onmessage = (response) => {
            // msg = JSON.parse(msg)
            let msg = JSON.parse(response.data);
            // console.log('ws: new message: ', msg);

            if (msg.event){
                if(msg.event == 'subscribed'){
                    // change status to confirmed
                    console.log(`subscribed to ${msg.channel}_${msg.symbol}`);
                    let name = `${msg.channel}_${msg.symbol}`;
                    this.subscribtion.confirm(name, msg);
                }
                if(msg.event == 'error'){
                    console.error(`error (${msg.channel}_${msg.symbol}): `, msg.msg);
                }
                return;
            };
            if (msg[1] === 'hb') return;

            // console.log('ws: new message: ', msg);

            // check channel id and use appropriate message handler
            let chanId = msg[0];
            let data = msg[1];
            this.subscribtion.handle(chanId, data);
        };
    }

    start(){
        console.log('starting bitfinex bot...')
        this.__connect();

        setInterval(() => {
            if (this.connected) return;
            console.log('reconecting to ws...');
            this.__connect();
        }, 2500)
    }

    stop(){
        console.log('stopping bitfinex bot...')
        // unsubscribe from channels
        this._unsubscribeFromAll();

        // save state

    }

    // WEBSOCKET PUBLIC CHANNELS
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

        // save
        this.subscribtion.add(request, (data) => {
            // console.log('book handler data: ', data);

            // convert data to model
            if(Array.isArray(data) && Array.isArray(data[0])){
                let models = data.map((d) => new BookResponseModel(symbol.charAt(0), d));
                this.bookStore.update(symbol, models);
            }
            if(Array.isArray(data) && !Array.isArray(data[0])){
                let model = new BookResponseModel(symbol.charAt(0), data);
                this.bookStore.update(symbol, model);
            }
        });

        // send
        this.wss.send(JSON.stringify(request));
    }
    _subscribeToAllBooks(){
        bitfinexSymbols.forEach((symbol) => {
            this._subscribeToBook(symbol);
        });
    }

    _unsubscribeFromAll(){
        this.subscribtion.removeAll();
    }
}

// track subscibtions list
class Subscribtion {
    constructor(){
        this.subscribtions = {};
    }

    // add pending subcribtion
    add(request, handler){
        let name = `${request.channel}_${request.symbol}`;
        if(this.subscribtions[name])
            return;
        this.subscribtions[name] = {
            reqest: request, // request used to subscribe
            response: null,
            confirmed: false,
            handler: handler
        };
    }

    findByName(name){
        let subscribtion = this.subscribtions[name];
        return subscribtion;
    }

    findByChanId(chanId){
        let subscribtionName = Object.keys(this.subscribtions).find((sub) => {
            if(this.subscribtions[sub].confirmed && this.subscribtions[sub].response.chanId === chanId)
                return true;
            return false;
        });
        let subscribtion = this.subscribtions[subscribtionName];
        return subscribtion;
    }

    confirm(name, response){
        let subcribtion = this.findByName(name);
        subcribtion.confirmed = true;
        subcribtion.response = response;
    }

    // call handler when new data received
    handle(chanId, data){
        let subscribtion = this.findByChanId(chanId);
        if(subscribtion && subscribtion.confirmed && subscribtion.handler){
            subscribtion.handler(data);
        }
    }

    remove(chanId){
        let foundName = null;
        for(let name in this.subscribtions){
            if(this.subscribtions[name].confirmed == true){
                foundName = name;
            }
        }
        if(foundName)
            delete this.subscribtions[foundName];
    }

    removeAll(){
        this.subscribtions = {};
    }
}

module.exports = BitfinexBot;