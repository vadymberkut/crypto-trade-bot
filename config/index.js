// load config
require('dotenv').config({path: './config/.env'});
let env = process.env || { NODE_ENV: 'development' };

let config = {
    development: {

        // Bot config
        bot: {
            bitmex: {
                api: {
                    apiKeyId: process.env.BITMEX_API_KEY_ID,
                    apiKeySecret: process.env.BITMEX_API_KEY_SECRET,
                    testnet: true,
                    maxTableLen: 20000
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