const bitfinexHelper = require('./bitfinexHelper.js');

let OrderResponseModel = require('./apiModels/OrderResponseModel.js');
let TradeResponseModel = require('./apiModels/TradeResponseModel.js');

// chain of orders - like queue
// ensure that orders executed one by one
module.exports = class BitfinexOrderChain {
    constructor(bookStore, walletStore, orderStore, telegramBot){
        this.bookStore = bookStore;
        this.walletStore = walletStore;
        this.orderStore = orderStore;
        this.telegramBot = telegramBot;
        this.limitOrderCancelTimeout = null;
        this.LIMIT_ORDER_CANCEL_TIMEOUT = 30000; // waiting for limit order execution, when expired need to cancel and place again
        this.clear();
    }

    clear(){
        this.orders = [];
        this.processed = false; // chain processed
        this.processedCallback = (err) => {}; // mock
    }

    enqueue(orderRequest, newOrderCallback, cancelOrderCallback){
        let order = {
            request: orderRequest,
            orderModel: null,
            tradeModel: null,

            enqueuedOnMs: (new Date()).getTime(),
            sentOnMs: null,

            attempts: 0, // attempts to send order. if > 1 -> order failed, so restart

            processing: false,
            processed: false,
            
            orderPlaced: false, // on - new order
            orderUpdated: false, // ou - order update
            orderCanceled: false, // oc - order cancel
            orderRequestedToBeCanceled: false, // oc-req - order cancel by user
            tradeExecuted: false, // te - trade executed
            tradeExecutionUpdated: false, // tu - trade execution update

            orderPlacedOnMs: null,
            orderUpdatedOnMs: null,
            orderCanceledOnMs: null,
            orderRequestedToBeCanceledOnMs: null,
            tradeExecutedOnMs: null,
            tradeExecutionUpdatedOnMs: null,

            newOrderCallback: newOrderCallback, // sends order request
            cancelOrderCallback: cancelOrderCallback, // cancel order request
        };
        this.orders.push(order);
    }

    // start the chain
    process(processedCallback){
        this.processedCallback = processedCallback;
        this._processNext();
    }

    
    // process next order only if processing not started or prev order executed
    _processNext(){
        // if all executed call processedCallback
        if(this._allProcessed()){
            console.info(`bitfinexOrderChain: all ${this.orders.length + 1} processed`);
            this.processed = true;
            this.processedCallback();
            return;
        }

        // get next not executed order (or current executing)
        let order = this.orders.find(o => o.processed === false && o.tradeExecuted === false && o.tradeExecutionUpdated === false);
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

        // let symbol = order.request[3].symbol;
        // let amount = +order.request[3].amount;
        // let {pair, base, qoute} = bitfinexHelper.convertSymbolToCurrency(symbol);
        // let action = amount > 0 ? 'buy' : 'sell';
        // let amountSign = amount >= 0 ? 1 : -1;
        // let availableBalance = null;
        // let availableAmount = null;
        // if(action == 'buy'){
        //     availableBalance = this.walletStore.getAvailableWalletBalance('exchange', qoute);
        //     if(availableBalance === null) return;
        //     let bestActionPrice = this.bookStore.getBestLimitBookPriceForAction(symbol, action);
        //     if(bestActionPrice === null) return;
        //     availableAmount = availableBalance / bestActionPrice;
        // }
        // if(action == 'sell'){
        //     availableBalance = this.walletStore.getAvailableWalletBalance('exchange', base);
        //     if(availableBalance === null) return;
        //     availableAmount = availableBalance;
        // }
        // if(availableAmount == null) return;
        // if(Math.abs(amount) > availableAmount){
        //     // reduce amount to fit balance
        //     console.log(`bitfinexOrderChain: reduce trade amount from ${order.request[3].amount} to ${availableAmount}`);
        //     amount = amountSign * availableAmount;
        // }
        // if(order.attempts > 0){
        //     // descrease amount
        //     let decreasePercent = 0.001; // 0.1%
        //     amount = amount * (1 - decreasePercent);
        // }
        // order.request[3].amount = amount.toString();
        let logMsg = `bitfinexOrderChain: new order CID=${order.request[3].cid} TYPE=${order.request[3].type} SYMBOL=${order.request[3].symbol} PRICE=${order.request[3].price} AMOUNT=${order.request[3].amount} (${order.attempts})`;
        console.log(logMsg);
        
        order.processing = true;
        order.sentOnMs = (new Date()).getTime();
        order.attempts += 1;

        order.newOrderCallback(order.request);
    }

    // get proceiing order
    _getProcessingOrder(){
        let order = this.orders.find(o => o.processing === true);
        if(!order){
            return null;
        }
        return order;
    }

    _allProcessed(){
        let allProcessed = this.orders.filter(o => o.processed === false).length === 0;
        return allProcessed;
    }

    // called when received notification
    newOrderError(notificationModel, orderModel){
        console.info(`bitfinexOrderChain: new order error CID=${orderModel.CID} TYPE=${orderModel.TYPE} SYMBOL=${orderModel.SYMBOL} PRICE=${orderModel.PRICE} AMOUNT=${orderModel.AMOUNT}`);
        let cid = orderModel.CID; // id null because order not placed (error occurred))

        // check for amount error
        if(
            notificationModel.STATUS.toLowerCase().indexOf('error') !== -1 &&
            notificationModel.TEXT.toLowerCase().indexOf('amount') !== -1 &&
            notificationModel.TEXT.toLowerCase().indexOf('invalid') !== -1
        ){
            console.info(`bitfinexOrderChain: found that error occured due to invalid amount`);

            // TODO - NOTIFY TELEGRAM BOT

            this._processNext();
        }
        else if(
            notificationModel.STATUS.toLowerCase().indexOf('error') !== -1 &&
            notificationModel.TEXT.toLowerCase().indexOf('price') !== -1 &&
            notificationModel.TEXT.toLowerCase().indexOf('invalid') !== -1
        ){
            // TODO - NOTIFY TELEGRAM BOT
            console.info(`bitfinexOrderChain: found that error occured due to invalid price`);
        }
        else{
            // TODO - NOTIFY TELEGRAM BOT THAT UNKNOW ERROR OCCURED OR BITFINEX NOTIFICATION API CHANGED
            console.info(`bitfinexOrderChain: notify telegram bot about the error`);
        }
    }

    // when new message received
    newMessage(wsMessage){
        let channelId = wsMessage[0]; // must be 0
        let msgType = wsMessage[1];
        let msgData = wsMessage[2]; // I CAN'T FIND DOCS FOR THIS

        let order = this._getProcessingOrder();
        if(order === null){
            return;
        }

        // on -> oc -> te -> tu
        switch(msgType){
            case 'os':
                break;
            case 'on':
                order.orderPlaced = true;
                order.orderPlacedOnMs = (new Date()).getTime();
                break;
            case 'ou':
                order.orderUpdated = true;
                order.orderUpdatedOnMs = (new Date()).getTime();
                break;
            case 'oc':
                order.orderCanceled = true;
                order.orderCanceledOnMs = (new Date()).getTime();
                break;
            case 'oc-req':
                order.orderRequestedToBeCanceled = true;
                order.orderRequestedToBeCanceledOnMs = (new Date()).getTime();
                break;
            case 'te':
                order.tradeExecuted = true;
                order.tradeExecutedOnMs = (new Date()).getTime(); 
                break;
            case 'tu':
                order.tradeExecutionUpdated = true;
                order.tradeExecutionUpdatedOnMs = (new Date()).getTime();
                break;
        }

        if(order.orderPlaced === true && order.orderUpdated === true && order.tradeExecuted === false && this.limitOrderCancelTimeout === null){
            // wait order execution for a while and cancel
            this.limitOrderCancelTimeout = setTimeout(() => {
                if(order.processed === true){
                    return;
                }
                let storeOrder = this.orderStore.getOrderByCid(order.request[3].cid)
                let orderId = storeOrder.ID;
                order.cancelOrderCallback(orderId);
            }, this.LIMIT_ORDER_CANCEL_TIMEOUT);
        }

        order.processed =  order.tradeExecuted && order.tradeExecutionUpdated;
        if(order.processed === true){
            order.processing = false;
            clearTimeout(this.limitOrderCancelTimeout);this.limitOrderCancelTimeout = null;
            this._processNext();
        }
    }

    saveState(){

    }
}