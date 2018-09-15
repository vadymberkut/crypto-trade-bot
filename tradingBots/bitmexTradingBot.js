
const config = require('../config/index');
const logger = require('../utils/logger');
const Api = require('../api/bitmexApi');
const BaseTradingBot = require('./baseTradingBot');

// const DataCollector = require('../dataCollectors/bitmexDataCollector');
// const Strategy = require('../strategies/volatilityRangeStrategy');
// const StrategyRunner = require('../strategyRunners/strategyRunner');

class TradingBot  extends BaseTradingBot {
    constructor(props) {
        super({
            name: 'bitmex',
            config: config.bot['bitmex'],
            api: null
        });
    }

    start() {
        super.start();

        // Start means to create a client
        this.api = new Api(this.config.api);
    }

    stop(force = false) {
        super.stop();

        return Promise.resolve();
    }

    restart(force = false) {
        super.restart();

        return Promise.resolve();
    }
}

module.exports = TradingBot;