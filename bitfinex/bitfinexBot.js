// Do not parse text descriptions, use only codes
// All times are UTC timestamps expressed as seconds (eg 1477409622)

// Price Precision - For all pairs on Bitfinex we use 5 significant digits. Examples of five significant digits would be 12.123, 1.1234, 123.43, and 1234.5.
// Note: API will truncate price with precision > 5

const WebSocket = require('ws');
const bitfinexApi = require('./bitfinexApi.js');

class BitfinexBot {
    constructor(props){
        this.connected = false;
        this.connecting = false;
        this.webSocketConfig = {
            url: 'wss://api.bitfinex.com/ws/2'
        };
        // this.__connect();
    }

    __connect(success){
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

            if(success)
                success();
        };

        this.wss.onclose = () => {
            console.log('WS close');
            this.connecting = false;
            this.connected = false;
        };

        this.wss.onmessage = (msg) => {
            // msg = JSON.parse(msg)

            if (msg.event) return;
            if (msg[1] === 'hb') return;

            console.log('ws: new message: ', msg.data);
        };
    }

    start(){
        this.__connect(() => {

            let msg = ({ 
                event: 'subscribe', 
                channel: 'ticker', 
                symbol: 'tBTCUSD' 
            });
            let msg2 = { 
                event: 'subscribe',
                channel: 'book',
                symbol: 'tBTCUSD',
                prec: "P0",
                freq: "F0",
                len: "25" 
            };
            this.wss.send(JSON.stringify(msg2));

        });
    }
    stop(){
        // 

    }

    // WEBSOCKET PUBLIC CHANNELS

}

module.exports = BitfinexBot;