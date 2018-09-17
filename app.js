
const logger = require('./utils/logger');
const BitmexTradingBot = require('./tradingBots/bitmexTradingBot');

class App {
    constructor(props) {
        this.tradingBots = [];

        this.tradingBots.push(
            new BitmexTradingBot()
        );
    }


    /**
     * Entry point of the application
     *
     * @memberof App
     */
    start() {
        logger.infoImportant('Starting app...');

        // Run app logic here
        try {
            this.tradingBots.forEach(tb => tb.start());
        } catch(err) {
            // Handle error and then rethrow
            // If we got there, application is in unknown state
            // so exit
            logger.errorImportant('Application is being stopped. Unhandled exception was caught!', err);
            try {
                this.stop().then(() => {
                    logger.infoImportant('Application was gracefully stopped!');
                    throw err; // Don't use catch further to skip this error
                }, (stopErr)=>{
                    logger.errorImportant(`Error occurred while stopping application: `, stopErr);
                    throw err;
                });
            } catch(stopErr) {
                logger.errorImportant(`Error occurred while stopping application: `, stopErr);
            }
        }
    }

    stop(force = false) {
        return Promise.resolve();
    }

    restart(force = false) {
        return Promise.resolve();
    }
}

module.exports = new App();