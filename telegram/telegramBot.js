
const moment = require('moment');
const { Queue, PriorityQueue } = require('../utils/queue');
const TelegramBotAPi = require('./telegramBotApi.js');

module.exports = class TelegramBot {
    constructor(options){
        if(!options.httpApiToken){
            throw new Error(`telegramBot: httpApiToken can't be empty`);
        }

        this.httpApiToken = options.httpApiToken;
        this.botApi = new TelegramBotAPi(this.httpApiToken);
        this.queue = new PriorityQueue({
            items: [],
            comparer: (a, b) => {
                return (a.priority < b.priority ? -1 : (a.priority > b.priority ? 1 : 0));
            }
        });
        this.processing = false;
    }

    _processMessageQueue() {
        if(this.queue.isEmpty() || this.processing) {
            return;
        }

        let current = this.queue.remove();
        this.processing = true;

        this.botApi.sendMessage(current.params).then(response => {
            let { ok, result } = response;
            if(ok === false) {
                
            }
            this.processing = false;
            this._processMessageQueue(); // Go to next
        }).catch(err => {
            this.processing = false;
            this._processMessageQueue(); // Go to next
        });
    }

    getMe(){
        return this.botApi.getMe();
    }

    sendMessage(params){
        return this.botApi.sendMessage(params);
    }

    sendMessageQueue(params){
        this.queue.add({
            priority: moment().valueOf(),
            params: params
        });
        this._processMessageQueue();
        return true;
    }
};