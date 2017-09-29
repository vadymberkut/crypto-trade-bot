module.exports = {
    API_VERSION: 2,
    symbols: [
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
    ],
    orderTypes: {
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
    },
    walletTypes: {
        EXCHANGE: 'exchange',
        MARGIN: 'margin',
        FUNDING: 'funding',
    },

    // Maker fees are paid when you add liquidity to our order book by placing a limit order under the ticker price for buy and above the ticker price for sell.
    // Taker fees are paid when you remove liquidity from our order book by placing any order that is executed against an order of the order book.
    // Note: If you place a hidden order, you will always pay the taker fee. If you place a limit order that hits a hidden order, you will always pay the maker fee.
    orderExecutionFees: {
        maker:  0.001, // 0.1 %
        taker:  0.002, // 0.2 %
    },

    minOrderSize: {
        'BTC': 0.005, //0.01,
        'ZEC': 0.01,
        'OTHER': 0.1,
    },

    CLIENT_ORDER_ID_DATE_FORMAT: 'YYYY-MM-DD',
    MAX_CALCULATIONS_PER_BATCH: 30,

    orderStatuses: {
        ACTIVE: 'ACTIVE',
        EXECUTED: 'EXECUTED',
        PARTIALLY: 'PARTIALLY',
        FILLED: 'FILLED',
        CANCELED: 'CANCELED'
    },

    notificationStatuses: {
        SUCCESS: 'SUCCESS',
        ERROR: 'ERROR',
        FAILURE: 'FAILURE',
    }
};