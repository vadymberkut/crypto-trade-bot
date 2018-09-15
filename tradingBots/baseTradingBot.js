
const logger = require('../utils/logger');

class BaseTradingBot {
    constructor(props) {
        this.name = props.name;
        this.config = props.config;
        this.api = props.api;
    }

    start() {
        logger.infoImportant(`Starting '${this.name}' bot`);
    }

    stop(force = false) {
        logger.infoImportant(`Stopping '${this.name}' bot`);
    }

    restart(force = false) {
        logger.infoImportant(`Restarting '${this.name}' bot`);
    }
}

module.exports = BaseTradingBot;