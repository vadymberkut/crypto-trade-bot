const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const bitfinexConstants = require('../bitfinexConstants.js');

module.exports = class OrderStore {
    constructor(){
        this.clear();
    }

    clear(){
        this.orders = [];
    }

    // walletModel - arary|array of arrays
    update(orderModel){
        if(Array.isArray(orderModel)){
            orderModel.forEach(om => this._updateFromModel(om));
        }
        else{
            this._updateFromModel(orderModel);
        }
    }

    _updateFromModel(orderModel){
        let valid = orderModel.validate();

        if(valid){
            let index = this._getOrderIndexById(orderModel.ID);
            if(index === -1){
                this.orders.push(orderModel);
            }
            else{
                this.orders[index] = orderModel;
            }
        }
    }

    _getOrderIndexById(id){
        let index = _.findIndex(this.orders, (o) => o.ID === id);
        return index;
    }

    getOrderById(id){
        let order = this.orders.find(o => o.ID === id);
        return order || null;
    }

    getOrdersByGid(gid){
        let orders = this.orders.filter(o => o.GID === gid);
        return orders;
    }

    getOrderByCid(cid){
        let order = this.orders.find(o => o.CID === cid);
        return order || null;
    }

    getActiveOrders(){
        let orders = this.orders.filter(o => o.ORDER_STATUS == bitfinexConstants.orderStatuses.ACTIVE);
        return orders;
    }

    checkActiveOrders(){
        return this.getActiveOrders().length !== 0;
    }

    checkOrderActiveByCid(cid){
        let order = this.getOrderByCid(cid);
        if(!order) return false;
        return order.ORDER_STATUS == bitfinexConstants.orderStatuses.ACTIVE;
    }
}