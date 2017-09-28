const bitfinexHelper = require('./bitfinexHelper.js');

// chain of orders - like queue
// ensure that orders executed one by one
module.exports = class BitfinexOrderChain {
    constructor(bookStore, walletStore){
        this.bookStore = bookStore;
        this.walletStore = walletStore;
        this.limitOrderCancelTimeout = null;
        this.clear();
    }

    clear(){
        this.orders = [];
        this.processed = false; // chain processed
    }

    enqueue(orderRequest, sendCallback){
        let order = {
            request: orderRequest,

            enqueuedOnMs: (new Date()).getTime(),
            sentOnMs: null,
            waitingForAmount: orderRequest.amount === null, // TODO

            attempts: 0, // attempts to send order. if > 1 -> order failed, so restart

            processing: false,
            processed: false,
            
            orderPlaced: false, // on - new order
            orderUpdated: false, // ou - order update
            orderCanceled: false, // oc or oc-req - order cancel

            tradeExecuted: false, // te - trade executed
            tradeExecutionUpdated: false, // tu - trade execution update

            sendCallback: sendCallback, // sends order request
        };
        this.orders.push(order);
    }

    // start the chain
    process(){
        this._processNext();
        this.processed = this.orders.filter(o => o.processed === false).length === 0;
        return this.processed;
    }

    
    // process next order only if processing not started or prev order executed
    _processNext(){
        

        // get next not executed order (or current executing)
        let order = this.orders.find(o => o.processed === false && o.tradeExecuted === false&& o.tradeExecutionUpdated === false);
        if(!order){
            return;
        }

        // check there are no processing orders at the moment
        let processing = this.orders.filter(o => o.processing === true).length !== 0;
        if(processing){
            // check how long processing. if more than timeout - retry
            let diff = (new Date()).getTime() - order.sentOnMs;
            let retryInterval = 2000;
            if(diff < retryInterval)
                return;
        }

        if(order.waitingForAmount === true) return;

        let symbol = order.request[3].symbol;
        let amount = +order.request[3].amount;
        let {pair, base, qoute} = bitfinexHelper.convertSymbolToCurrency(symbol);
        let action = amount > 0 ? 'buy' : 'sell';
        let amountSign = amount >= 0 ? 1 : -1;
        let availableBalance = null;
        let availableAmount = null;
        if(action == 'buy'){
            availableBalance = this.walletStore.getAvailableWalletBalance('exchange', qoute);
            if(availableBalance === null) return;
            let bestActionPrice = this.bookStore.getBestLimitBookPriceForAction(symbol, action);
            if(bestActionPrice === null) return;
            availableAmount = availableBalance / bestActionPrice;
        }
        if(action == 'sell'){
            availableBalance = this.walletStore.getAvailableWalletBalance('exchange', base);
            if(availableBalance === null) return;
            availableAmount = availableBalance;
        }
        if(availableAmount == null) return;
        if(Math.abs(amount) > availableAmount){
            // reduce amount to fit balance
            console.log(`bitfinexOrderChain: reduce trade amount from ${order.request[3].amount} to ${availableAmount}`);
            amount = amountSign * availableAmount;
        }
        if(order.attempts > 0){
            // descrease amount
            let decreasePercent = 0.001; // 0.1%
            amount = amount * (1 - decreasePercent);
        }
        order.request[3].amount = amount.toString();
        let logMsg = `bitfinexOrderChain: placing order TYPE=${order.request[3].type} SYMBOL=${order.request[3].symbol} SYMBOL=${order.request[3].price} AMOUNT=${order.request[3].amount} (${order.attempts})`;
        console.log(logMsg);
        
        order.processing = true;
        order.sentOnMs = (new Date()).getTime();
        order.attempts += 1;
        order.sendCallback(order.request);
    }

    // get proceiing order
    _getProcessingOrder(){
        let order = this.orders.find(o => o.processing === true);
        if(!order){
            return null;
        }
        return order;
    }

    // when new message received
    newMessage(msg){
        let channelId = msg[0]; // must be 0
        let msgType = msg[1];
        let msgData = msg[2]; // I CAN'T FIND DOCS FOR THIS

        let order = this._getProcessingOrder();
        if(order === null){
            return;
        }

        // on -> oc -> te -> tu

        switch(msgType){
            case 'on':
                order.orderPlaced = true;
                break;
            case 'ou':
                order.orderUpdated = true;
                break;
            case 'oc':
                order.orderCanceled = true;
                break;
            case 'oc-req':
                order.orderCanceled = true;
                break;
            case 'te':
                order.tradeExecuted = true;
                break;
            case 'tu':
                order.tradeExecutionUpdated = true;
                break;
        }

        order.processed =  order.tradeExecuted && order.tradeExecutionUpdated;
        if(order.processed === true){
            order.processing = false;
        }

        // if trade executed - go to next
        // if(order.tradeExecuted){
        //     this._processNext();
        // }

        // TODO - process again if error
        if(order.tradeExecuted === false && order.orderCanceled === true){
            
        }
    }
}