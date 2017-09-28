const TelegramBotAPi = require('./telegramBotApi.js');

module.exports = class TelegramBot {
    constructor(options){
        if(!options.httpApiToken){
            throw new Error(`telegramBot: httpApiToken can't be empty`);
        }

        this.httpApiToken = options.httpApiToken;
        this.botApi = new TelegramBotAPi(this.httpApiToken);
    }

    getMe(){
        return this.botApi.getMe();
    }

    sendMessage(params){
        return this.botApi.sendMessage(params);
    }
};