
const logger = require('./utils/logger');
const BitmexTradingBot = require('./tradingBots/bitmexTradingBot');

class App {
    constructor(props) {
        this.tradingBots = [];

        this.tradingBots.push(
            new BitmexTradingBot()
        );
    }

    start() {
        logger.infoImportant('Starting app...');

        this.tradingBots.forEach(tb => tb.start());
    }

    stop(force = false) {
        return Promise.resolve();
    }

    restart(force = false) {
        return Promise.resolve();
    }
}

module.exports = new App();