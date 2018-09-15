
const logger = require('../utils/logger');
const BitMEXClient = require('../vendor/bitmex/api-connectors/official-ws/nodejs/index');

// BitMEXClient.getData has a bug when tableName is null
// BitMEXClient.clone can't clone object with array inside

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

class Api {
    constructor(props) {

        let {
            testnet,
            apiKeyId,
            apiKeySecret,
            maxTableLen
        } = props;

        // Create WS client means to start receiving data
        this.wsClient = new BitMEXClient({
            testnet,
            apiKeyId,
            apiKeySecret,
            maxTableLen  // the maximum number of table elements to keep in memory (FIFO queue)
        });

        this.wsClient.on('initialize', (error) => { // client.streams available
            logger.log("BitMEX: Websocket initialized: Streams: ", this.wsClient.streams);
        });

        this.wsClient.on('open', (error) => {
            logger.log("BitMEX: Websocket opened");
        });

        // !!! Don't forget to attach an error handler! If one is not attached, errors will be thrown and crash your client.
        this.wsClient.on('error', (error) => {
            logger.error("BitMEX: Websocket error:", error);
        });
        
        this.wsClient.on('end', () => {
            logger.error('BitMEX: Websocket end. Client closed due to unrecoverable WebSocket error. Please check errors above.');
        });

        this.wsClient.addStream('XBTUSD', 'quote', (data, symbol, tableName) => {
            if(!data.length) return;
            const quotes = data;

            let clientData = this.wsClient._data;
            let symbolData = this.wsClient.getData('XBTUSD');
        });
    }

    //#region Superstructor on BitMEXClient to get only required data and control data flow


    //#endregion
}

module.exports = Api;