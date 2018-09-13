const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

module.exports = class TradeStore {
    constructor(){
        this.clear();
    }

    clear(){
        this.trades = [];
    }

    // walletModel - array|array of arrays
    update(tradeModel){
        if(Array.isArray(tradeModel)){
            tradeModel.forEach(tm => this._updateFromModel(tm));
        }
        else{
            this._updateFromModel(tradeModel);
        }
    }

    _updateFromModel(tradeModel){
        let valid = tradeModel.validate();

        if(valid){
            let index = this._getTradeIndexById(tradeModel.ID);
            if(index === -1){
                this.trades.push(tradeModel);
            }
            else{
                this.trades[index] = tradeModel;
            }
        }
    }

    _getTradeIndexById(id){
        let index = _.findIndex(this.trades, (t) => t.ID === id);
        return index;
    }

    getTradeById(id){
        let trade = this.trades.find(t => t.ID === id);
        return trade || null;
    }
}