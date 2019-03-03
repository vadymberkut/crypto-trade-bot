
const logger = require('../utils/logger');

class BaseTradingBot {
    constructor(props) {
        this.name = props.name;
        this.config = props.config;
        this.api = props.api;
        this.dataCollector = props.dataCollector;
    }

    start() {
        logger.infoImportant(`Starting '${this.name}' bot`);
        this.dataCollector.start();
    }

    async stop(force = false) {
        logger.infoImportant(`Stopping '${this.name}' bot`);
        await this.dataCollector.stop(force);
    }

    async restart(force = false) {
        logger.infoImportant(`Restarting '${this.name}' bot`);
        await this.stop(force);
        this.start();
    }
}

module.exports = BaseTradingBot;