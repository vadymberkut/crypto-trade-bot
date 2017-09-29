const logger = require('../utils/logger');
let fs = require('fs');
let path = require('path');
let _ = require('lodash');
let moment = require('moment');
const bitfinexConstants = require('./bitfinexConstants.js');
const bitfinexHelper = require('./bitfinexHelper.js');
let OrderResponseModel = require('./apiModels/OrderResponseModel.js');
let TradeResponseModel = require('./apiModels/TradeResponseModel.js');

function getMinOrderSize(currency){
    if(bitfinexConstants.minOrderSize[currency]){
        return bitfinexConstants.minOrderSize[currency];
    }
    return bitfinexConstants.minOrderSize['OTHER'];
}

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
        this.LIMIT_ORDER_CANCEL_TIMEOUT_WHEN_PARTIALLY_EXECUTED = 60000;
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
            tradeExecutedPartially: false,
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
        if(this.orders.length === 0){
            this.processedCallback();
            return;
        }
        this._processNext(this.orders[0]);
    }

    
    // process next order only if processing not started or prev order executed
    _processNext(order = null){
        // if all executed call processedCallback
        if(order === null && this._allProcessed()){
            logger.info(`bitfinexOrderChain: all ${this.orders.length} processed`);
            this.processed = true;
            this.processedCallback();
            return;
        }

        // check for 0 amount
        if(+order.request[3].amount == 0 && order.attempts >= 3){
            logger.error(`bitfinexOrderChain: detected order with AMOUNT=0 (${order.attempts} send attempts)`, order.request[3]);
            order.processing = false;
            order.processed = true;
            this._processNext(this._getNextOrder());
            return;
        }

        // check for amount less than minimum
        let {pair, base, qoute} = bitfinexHelper.convertSymbolToCurrency(order.request[3].symbol);
        let min = Math.min(getMinOrderSize(base), getMinOrderSize(qoute));
        if(Math.abs(+order.request[3].amount) < min){
            logger.error(`bitfinexOrderChain: detected order with less than min amount AMOUNT=${+order.request[3].amount} (${order.attempts} send attempts)`, order.request[3]);
            order.processing = false;
            order.processed = true;
            this._processNext(this._getNextOrder());
            return;
        }

        let logMsg = `bitfinexOrderChain: new order CID=${order.request[3].cid} TYPE=${order.request[3].type} SYMBOL=${order.request[3].symbol} PRICE=${order.request[3].price} AMOUNT=${order.request[3].amount} (${order.attempts})`;
        logger.infoImportant(logMsg);
        
        order.processing = true;
        order.sentOnMs = (new Date()).getTime();
        order.attempts += 1;
        order.newOrderCallback(order.request);
    }

    _orderPlacedErrorCallback(order){
        clearTimeout(this.orderPlacedErrorTimeout);
        logger.warn(`bitfinexOrderChain: fired _orderPlacedErrorCallback`);
        let adjusted = this._adjustOrderPriceAndAmount(order);
        if(adjusted === true){
            // order.processing = false;
            this._processNext(order);
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
            this._processNext(order);
            return;
        }
        logger.warn(`bitfinexOrderChain: fired _limitOrderCancelCallback`);
        if(this.orderStore.checkOrderActiveByCid(order.request[3].cid)){
            let storeOrder = this.orderStore.getOrderByCid(order.request[3].cid)
            if(!storeOrder){
                logger.error(`bitfinexOrderChain: can't find order with CID=${order.request[3].cid} on orderStore`, order);
                return;
            }
            let orderId = storeOrder.ID;
            order.cancelOrderCallback(orderId);
            logger.infoImportant(`bitfinexOrderChain: cancel order with ID=${orderId} CID=${order.request[3].cid}`);
            return;
        }
        let adjusted = this._adjustOrderPriceAndAmount(order);
        if(adjusted === true){
            // order.processing = false;
            order.orderPlaced = false;
            order.orderUpdated = false;
            this._processNext(order);
        }
        else{
            // refresh wallet info and retry
            logger.warn(`bitfinexOrderChain: can't adjust price or amount, fire updateWalletStore`);
            this.updateWalletStore();
            clearTimeout(this.limitOrderCancelTimeout);
            this.limitOrderCancelTimeout = setTimeout(() => {
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
        // subtract fee
        amount = amount * (1 - 0.002);
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

    // get next unprocessed order
    _getNextOrder(){
        for(let i =0; i < this.orders.length; i++){
            if(this.orders[i].processed === false){
                return this.orders[i];
            }
        }
        return null;
    }

    _getOrderByCid(cid){
        let order = this.orders.find(o => o.request[3].cid == cid);
        return order || null;
    }

    _allProcessed(){
        let allProcessed = this.orders.filter(o => o.processed === false).length === 0;
        return allProcessed;
    }

    // called when received notification
    newOrderNotification(notificationModel, orderModel){
        if(
            notificationModel.STATUS == bitfinexConstants.notificationStatuses.ERROR ||
            notificationModel.STATUS == bitfinexConstants.notificationStatuses.FAILURE
        ){
            logger.error(`bitfinexOrderChain: new order error CID=${orderModel.CID} TYPE=${orderModel.TYPE} SYMBOL=${orderModel.SYMBOL} PRICE=${orderModel.PRICE} AMOUNT=${orderModel.AMOUNT}: ${notificationModel.TEXT}`);
            let cid = orderModel.CID; // id null because order not placed (error occurred))

            // adjust order price, amount and retry
            let order = this._getOrderByCid(orderModel.CID);
            if(order === null){
                order = this._getProcessingOrder();
            }
            if(order === null){
                logger.error(`bitfinexOrderChain: can't find order by CID and current processing order after new order error received`,{
                    notificationModel: notificationModel,
                    orderModel: orderModel
                }); // NOTIFY TELEGRAM BOT
                return;
            }
            this._orderPlacedErrorCallback(order);
            return;
        }
        if(notificationModel.STATUS == bitfinexConstants.notificationStatuses.SUCCESS){
            logger.infoImportant(notificationModel.TEXT);
            return;
        }

        // unknow message
        logger.error(`bitfinexOrderChain: received unknown notification error (maybe Bitfinex notification API changed): ${notificationModel.TEXT}`,{
            notificationModel: notificationModel,
            orderModel: orderModel
        }); // NOTIFY TELEGRAM BOT

        //// check for amount error
        // if(
        //     notificationModel.STATUS.toLowerCase().indexOf('error') !== -1 &&
        //     notificationModel.TEXT.toLowerCase().indexOf('amount') !== -1 &&
        //     notificationModel.TEXT.toLowerCase().indexOf('invalid') !== -1
        // ){
        //     logger.error(`bitfinexOrderChain: from notification error found that error occured due to invalid amount`,{
        //         notificationModel: notificationModel,
        //         orderModel: orderModel
        //     }); // NOTIFY TELEGRAM BOT
        // }
        // else if(
        //     notificationModel.STATUS.toLowerCase().indexOf('error') !== -1 &&
        //     notificationModel.TEXT.toLowerCase().indexOf('price') !== -1 &&
        //     notificationModel.TEXT.toLowerCase().indexOf('invalid') !== -1
        // ){
        //     logger.error(`bitfinexOrderChain: from notification error found that error occured due to invalid price`,{
        //         notificationModel: notificationModel,
        //         orderModel: orderModel
        //     });  // NOTIFY TELEGRAM BOT
        // }
        // else{
        //     logger.error(`bitfinexOrderChain: received unknown notification error (maybe Bitfinex notification API changed)`,{
        //         notificationModel: notificationModel,
        //         orderModel: orderModel
        //     }); // NOTIFY TELEGRAM BOT
        // }
    }

    // notificationModel example:
    // [0,"n",[null,"oc-req",null,null,[4051500125,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0,null,null],null,"SUCCESS","Submitted for cancellation; waiting for confirmation (ID: 4051500125)."]]
    newOrderCancelNotification(notificationModel, orderModel){
        logger.log(`bitfinexOrderChain: new order cancel notification: ${notificationModel.TEXT}`);

        if(
            notificationModel.STATUS == bitfinexConstants.notificationStatuses.ERROR ||
            notificationModel.STATUS == bitfinexConstants.notificationStatuses.FAILURE
        ){
            logger.error(`bitfinexOrderChain: new order cancel error CID=${orderModel.CID} TYPE=${orderModel.TYPE} SYMBOL=${orderModel.SYMBOL} PRICE=${orderModel.PRICE} AMOUNT=${orderModel.AMOUNT}: ${notificationModel.TEXT}`);
            let id = orderModel.ID; // all other fields null
            

            // retry cancel
            let order = order = this._getProcessingOrder();
            if(order === null){
                logger.error(`bitfinexOrderChain: can't find current processing order after new order cancel error received`,{
                    notificationModel: notificationModel,
                    orderModel: orderModel
                }); // NOTIFY TELEGRAM BOT
                return;
            }
            this._limitOrderCancelCallback(order);
            return;
        }
    }

    // when new message received
    newMessage(wsMessage){
        let channelId = wsMessage[0]; // must be 0
        let msgType = wsMessage[1];
        let msgData = wsMessage[2]; // I CAN'T FIND DOCS FOR THIS

        let model;

        let order = this._getProcessingOrder();
        if(order === null){
            return;
        }
        let storeOrder = this.orderStore.getOrderByCid(order.request[3].cid);
        if(storeOrder === null){
            return;
        }

        // 1.234 -> 3
        let getPrecision = function(a) {
            a = +a;
            if (!isFinite(a)) return 0;
            var e = 1, p = 0;
            while (Math.round(a * e) / e !== a) { e *= 10; p++; }
            return p;
        }
        let toPrecision = function(a, prec){
            return +((+a).toFixed(prec));
        }

        // on -> oc -> te -> tu
        switch(msgType){
            case 'os':
                break;
            case 'on':
                order.orderPlaced = true;
                order.orderPlacedOnMs = (new Date()).getTime();
                
                // wait order execution for a while and cancel
                // restart with new price and amount
                clearTimeout(this.limitOrderCancelTimeout);
                this.limitOrderCancelTimeout = setTimeout(() => {
                    this._limitOrderCancelCallback(order);
                }, this.LIMIT_ORDER_CANCEL_TIMEOUT);
                break;
            case 'ou':
                order.orderUpdated = true;
                order.orderUpdatedOnMs = (new Date()).getTime();
                break;
            case 'oc':
                order.orderCanceled = true;
                order.orderCanceledOnMs = (new Date()).getTime();
                if(storeOrder.ORDER_STATUS == bitfinexConstants.orderStatuses.CANCELED){
                    this.updateWalletStore();
                    clearTimeout(this.limitOrderCancelTimeout);
                    this.limitOrderCancelTimeout = setTimeout(() => {
                        clearTimeout(this.limitOrderCancelTimeout);
                        this._limitOrderCancelCallback(order);
                    }, this.WAIT_WALLET_STORE_UPDATE_TIMEOUT);
                }
                break;
            case 'oc-req':
                order.orderRequestedToBeCanceled = true;
                order.orderRequestedToBeCanceledOnMs = (new Date()).getTime();
                break;
            case 'te':
                model = new TradeResponseModel(msgData);
                let precision = getPrecision(Math.abs(model.EXEC_AMOUNT));
                let roundedAmount = toPrecision(Math.abs(+order.request[3].amount), precision);
                if(Math.abs(model.EXEC_AMOUNT) >= roundedAmount){
                    // fully executed
                    order.tradeExecuted = true;
                    order.tradeExecutedOnMs = (new Date()).getTime(); 
                }
                else{
                    // partially executed
                    // wait full execution
                    order.tradeExecutedPartially = true;

                    clearTimeout(this.limitOrderCancelTimeout);
                    this.limitOrderCancelTimeout = setTimeout(() => {
                        this._limitOrderCancelCallback(order);
                    }, this.LIMIT_ORDER_CANCEL_TIMEOUT_WHEN_PARTIALLY_EXECUTED);
                }
                break;
            case 'tu':
                order.tradeExecutionUpdated = true;
                order.tradeExecutionUpdatedOnMs = (new Date()).getTime();
                break;
        }

        order.processed =  order.tradeExecuted;
        if(order.processed === true){
            let logMsg = `bitfinexOrderChain: new order processed CID=${order.request[3].cid} TYPE=${order.request[3].type} SYMBOL=${order.request[3].symbol} PRICE=${order.request[3].price} AMOUNT=${order.request[3].amount} (${order.attempts})`;
            logger.infoImportant(logMsg);
            order.processing = false;
            clearTimeout(this.limitOrderCancelTimeout);this.limitOrderCancelTimeout = null;
            let nextOrder = this._getNextOrder();
            this._processNext(nextOrder);
        }
    }

    // walletUpdated(){

    // }

    // save this to file
    save(){
        let date = moment.utc().format('YYYYMMDDHHmmss');
        const fileName = path.join(__dirname, '../logs/bitfinex/orderChain/', `${date}.log`);
        let data = JSON.stringify(this);
        fs.writeFileSync(fileName, data);
    }
}