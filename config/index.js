// load config
require('dotenv').config({path: './config/.env'});
let env = process.env || { NODE_ENV: 'development' };

let config = {
    development: {

        date: {
            format: {
                store: 'YYYY-MM-DDTHH:mm:ssZ', // format used to store date
                display: 'YYYY-MM-DD HH:mm:ss' // format used to display date
            }
        },

        logger: {
            saveInterval: 10000,

            savePath: 'data/logs', // for plain logs (.log)
            saveTypeSpecificLogs: true, // Save logs both to all.log and {type}.log

            storePath: 'data/logs/store',  // for log models (.json)
            formatJson: true, // Store log models json formatted
        },

        // Bot config
        bot: {
            bitmex: {
                api: {
                    apiKeyId: process.env.BITMEX_API_KEY_ID,
                    apiKeySecret: process.env.BITMEX_API_KEY_SECRET,
                    // testnet: true,
                    // maxTableLen: 20000,
                    wsUrl: 'wss://testnet.bitmex.com',
                    wsEndpoint: '/realtime',
                    wsReconnectionInterval: 500,
                    httpUrl: '',
                },
                strategy: 'NOT SET'
            }
        },

        telegram: {
            httpApiToken: process.env.TELEGRAM_HTTP_API_TOKEN
        }
    },
    production: {
        
    }
};

module.exports = config[env.NODE_ENV];