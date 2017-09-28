const logger = require('../utils/logger');
const bitfinexHelper = require('./bitfinexHelper.js');

let OrderResponseModel = require('./apiModels/OrderResponseModel.js');
let TradeResponseModel = require('./apiModels/TradeResponseModel.js');

// chain of orders - like queue
// ensure that orders executed one by one
module.exports = class BitfinexOrderChain {
    constructor(bookStore, walletStore, orderStore, updateWalletStore){
        this.bookStore = bookStore;
        this.walletStore = walletStore;
        this.orderStore = orderStore;
        this.updateWalletStore = updateWalletStore;
        this.orderPlacedErrorTimeout = null;
        this.limitOrderCancelTimeout = null;
        this.ORDER_PLACED_ERROR_TIMEOUT = 10000; // waiting for order placed, when expired consider new order error, so recheck order amount and retry
        this.LIMIT_ORDER_CANCEL_TIMEOUT = 30000; // waiting for limit order execution, when expired need to cancel and place again
        this.WAIT_WALLET_STORE_UPDATE_TIMEOUT = 2000;
        this.clear();
    }

    clear(){
        this.orders = [];
        this.processed = false; // chain processed
        this.processedCallback = (err) => {}; // mock
        clearTimeout(this.orderPlacedErrorTimeout);
        clearTimeout(this.limitOrderCancelTimeout);
    }

    enqueue(orderRequest, newOrderCallback, cancelOrderCallback){
        let order = {
            request: orderRequest,
            // orderModel: null,
            // tradeModel: null,

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
            logger.info(`bitfinexOrderChain: all ${this.orders.length + 1} processed`);
            this.processed = true;
            this.processedCallback();
            return;
        }

        // get next not executed order (or current executing)
        let order = this.orders.find(o => o.processed === false && o.tradeExecuted === false && o.tradeExecutionUpdated === false);
        if(!order){
            return;
        }

        // check for 0 amount
        if(order.request[3].amount == 0 && order.attempts >= 3){
            logger.error(`bitfinexOrderChain: detected order with AMOUNT=0 (${order.attempts} send attempts)`, order.request[3]);
            order.processing = false;
            order.processed = true;
            this._processNext();
            return;
        }

        // check there are no processing orders at the moment
        let processing = this.orders.filter(o => o.processing === true).length !== 0;
        if(processing){
            return;
        }

        let logMsg = `bitfinexOrderChain: new order CID=${order.request[3].cid} TYPE=${order.request[3].type} SYMBOL=${order.request[3].symbol} PRICE=${order.request[3].price} AMOUNT=${order.request[3].amount} (${order.attempts})`;
        logger.info(logMsg);
        
        order.processing = true;
        order.sentOnMs = (new Date()).getTime();
        order.attempts += 1;
        this.orderPlacedErrorTimeout = setTimeout(() => {
            this._orderPlacedErrorCallback(order);
        }, this.ORDER_PLACED_ERROR_TIMEOUT);

        order.newOrderCallback(order.request);
    }

    _orderPlacedErrorCallback(order){
        clearTimeout(this.orderPlacedErrorTimeout);
        if(order.orderPlaced === true){
            return;
        }
        logger.warn(`bitfinexOrderChain: fired _orderPlacedErrorCallback`);
        let adjusted = this._adjustOrderPriceAndAmount(order);
        if(adjusted === true){
            order.processing = false;
            this._processNext();
        }
        else{
            // refresh wallet info and retry
            logger.warn(`bitfinexOrderChain: can't adjust price or amount, fire updateWalletStore`);
            this.updateWalletStore();
            clearTimeout(this.orderPlacedErrorTimeout);
            this.orderPlacedErrorTimeout = setTimeout(() => {
                clearTimeout(this.orderPlacedErrorTimeout);
                this._orderPlacedErrorCallback(order);
            }, this.WAIT_WALLET_STORE_UPDATE_TIMEOUT);
        }
    }

    _limitOrderCancelCallback(order){
        clearTimeout(this.limitOrderCancelTimeout);
        if(order.processed === true){
            return;
        }
        logger.warn(`bitfinexOrderChain: fired _limitOrderCancelCallback`);
        let storeOrder = this.orderStore.getOrderByCid(order.request[3].cid)
        let orderId = storeOrder.ID;
        order.cancelOrderCallback(orderId);
        let adjusted = this._adjustOrderPriceAndAmount(order);
        if(adjusted === true){
            order.processing = false;
            this._processNext();
        }
        else{
            // refresh wallet info and retry
            logger.warn(`bitfinexOrderChain: can't adjust price or amount, fire updateWalletStore`);
            this.updateWalletStore();
            clearTimeout(this.limitOrderCancelTimeout);
            this.orderPlacedErrorTimeout = setTimeout(() => {
                clearTimeout(this.limitOrderCancelTimeout);
                this._limitOrderCancelCallback(order);
            }, this.WAIT_WALLET_STORE_UPDATE_TIMEOUT);
        }
    }

    // adjust order amount according to available balance
    _adjustOrderPriceAndAmount(order){
        const PRICE_INCREASE_DECREASE_PERCENT = 0.0005; // 0.05%
        let symbol = order.request[3].symbol;
        let price = +order.request[3].price;
        let amount = +order.request[3].amount;
        let {pair, base, qoute} = bitfinexHelper.convertSymbolToCurrency(symbol);
        let action = amount > 0 ? 'buy' : 'sell';
        let amountSign = amount >= 0 ? 1 : -1;
        let availableBalance = null;
        if(action == 'buy'){
            availableBalance = this.walletStore.getAvailableWalletBalance('exchange', qoute);
            if(availableBalance === null) return false;
            let bestActionPrice = this.bookStore.getBestLimitBookPriceForAction(symbol, action);
            if(bestActionPrice === null) return false;
            // increase price
            price = bestActionPrice * (1 + PRICE_INCREASE_DECREASE_PERCENT);
            // adjust amount
            amount = amountSign * (availableBalance / price);
        }
        if(action == 'sell'){
            availableBalance = this.walletStore.getAvailableWalletBalance('exchange', base);
            if(availableBalance === null) return false;
            let bestActionPrice = this.bookStore.getBestLimitBookPriceForAction(symbol, action);
            if(bestActionPrice === null) return false;
            // descrease price
            price = bestActionPrice * (1 - PRICE_INCREASE_DECREASE_PERCENT);
            // adjust amount
            amount = amountSign * Math.min(Math.abs(amount), availableBalance);
        }
        order.request[3].price = price.toString();
        order.request[3].amount = amount.toString();
        return true;
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
        logger.error(`bitfinexOrderChain: new order error CID=${orderModel.CID} TYPE=${orderModel.TYPE} SYMBOL=${orderModel.SYMBOL} PRICE=${orderModel.PRICE} AMOUNT=${orderModel.AMOUNT}`);
        let cid = orderModel.CID; // id null because order not placed (error occurred))

        // check for amount error
        if(
            notificationModel.STATUS.toLowerCase().indexOf('error') !== -1 &&
            notificationModel.TEXT.toLowerCase().indexOf('amount') !== -1 &&
            notificationModel.TEXT.toLowerCase().indexOf('invalid') !== -1
        ){
            logger.error(`bitfinexOrderChain: from notification error found that error occured due to invalid amount`,{
                notificationModel: notificationModel,
                orderModel: orderModel
            }); // NOTIFY TELEGRAM BOT
        }
        else if(
            notificationModel.STATUS.toLowerCase().indexOf('error') !== -1 &&
            notificationModel.TEXT.toLowerCase().indexOf('price') !== -1 &&
            notificationModel.TEXT.toLowerCase().indexOf('invalid') !== -1
        ){
            logger.error(`bitfinexOrderChain: from notification error found that error occured due to invalid price`,{
                notificationModel: notificationModel,
                orderModel: orderModel
            });  // NOTIFY TELEGRAM BOT
        }
        else{
            logger.error(`bitfinexOrderChain: received unknown notification error (maybe Bitfinex notification API changed)`,{
                notificationModel: notificationModel,
                orderModel: orderModel
            }); // NOTIFY TELEGRAM BOT
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
                clearInterval(this.orderPlacedErrorTimeout);this.orderPlacedErrorTimeout = null;
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
            // restart with new price and amount
            this.limitOrderCancelTimeout = setTimeout(() => {
                this._limitOrderCancelCallback(order);
            }, this.LIMIT_ORDER_CANCEL_TIMEOUT);
        }

        order.processed =  order.tradeExecuted && order.tradeExecutionUpdated;
        if(order.processed === true){
            order.processing = false;
            clearInterval(this.orderPlacedErrorTimeout);this.orderPlacedErrorTimeout = null;
            clearTimeout(this.limitOrderCancelTimeout);this.limitOrderCancelTimeout = null;
            this._processNext();
        }
    }

    saveState(){

    }
}