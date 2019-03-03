
// const DataStore = require('../dataStores/bitmexDataStore');

class DataCollector {
    constructor(props) {
        let {
            api
        } = props;

        this.api = api;
    }

    start() {
        // Subscribe on ws api channels
        this.api.startWs();
        // this.api.subscribe('orderBookL2', 'XBTUSD', (model) => {
        // });
        // this.api.subscribe('orderBookL2', 'XBTUSD', (model) => {
        // });
        // this.api.subscribe('trade', 'XBTUSD', (model) => {
        // });
        // this.api.subscribe('wallet', null, (model) => {
        //     console.log(model)
        // });
        // this.api.subscribe('chat', null, (model) => {
        //     console.log(model)
        // });
        this.api.authWs();

        // setTimeout(async () => {
        //     await this.stop(true);
        //     console.log(8)
        // }, 3000);
    }

    async stop(force = false) {
        await this.api.stopWs(force);
    }

    async restart(force = false) {
        await this.stop(force);
        this.start();
    }
}

module.exports = DataCollector;