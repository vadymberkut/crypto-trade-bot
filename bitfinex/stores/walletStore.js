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

    // returns info in format [{walletType: string, currency: string}]
    getWalletsInfo(){
        let result = [];
        let walletTypes = Object.keys(this.wallet); // exchange, funding, margin
        for(let i = 0; i < walletTypes.length; i++){
            let walletType = walletTypes[i];
            let currencies = Object.keys(this.wallet[walletType]);
            for(let j = 0; j < currencies.length; j++){
                let currency = currencies[j];
                result.push({walletType: walletType, currency: currency});                
            }
        }
        return result;
    }

}