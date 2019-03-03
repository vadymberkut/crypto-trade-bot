
const config = require('../config/index');
const logger = require('../utils/logger');
const BaseTradingBot = require('./baseTradingBot');
const Api = require('../api/bitmexApi');
const DataCollector = require('../dataCollectors/bitmexDataCollector');

// const DataCollector = require('../dataCollectors/bitmexDataCollector');
// const Strategy = require('../strategies/volatilityRangeStrategy');
// const StrategyRunner = require('../strategyRunners/strategyRunner');

class TradingBot  extends BaseTradingBot {
    constructor(props) {
        let api = new Api(config.bot['bitmex'].api);
        super({
            name: 'bitmex',
            config: config.bot['bitmex'],
            api: api,
            dataCollector: new DataCollector({
                api: api
            })
        });
    }

    start() {
        super.start();
    }

    async stop(force = false) {
        super.stop();
    }

    async restart(force = false) {
        super.restart();
    }
}

module.exports = TradingBot;