const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

module.exports = class WalletStore {
    constructor(){
        this.clear();
    }

    clear(){
        this.wallet = {
            'exchange': {},
            'margin': {},
            'funding': {},
        };
        this.updating = false;
    }

    // walletModel - arary|array of arrays
    update(walletModel){
        if(Array.isArray(walletModel)){
            walletModel.forEach(wm => this._updateFromModel(wm));
        }
        else{
            this._updateFromModel(walletModel);
        }
        this.updating = false;
    }

    _updateFromModel(walletModel){
        let valid = walletModel.validate();
        if(valid){
            this.wallet[walletModel.WALLET_TYPE][walletModel.CURRENCY] = walletModel;
        }
    }

    getWalletBalance(walletType, currrency){
        if(this.wallet[walletType] && this.wallet[walletType][currrency]){
            return this.wallet[walletType][currrency].BALANCE;
        }
        return 0;
    }

    getAvailableWalletBalance(walletType, currrency){
        if(this.wallet[walletType] && this.wallet[walletType][currrency]){
            return this.wallet[walletType][currrency].BALANCE_AVAILABLE;
        }
        return null;
    }

}