const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

module.exports = class NotificationStore {
    constructor(){
        this.clear();
    }

    clear(){
        this.notifications = [];
    }

    // walletModel - arary|array of arrays
    update(notificationModel){
        if(Array.isArray(notificationModel)){
            notificationModel.forEach(nm => this._updateFromModel(nm));
        }
        else{
            this._updateFromModel(notificationModel);
        }
    }

    _updateFromModel(notificationModel){
        let valid = notificationModel.validate();

        if(valid){
            this.notifications.push(notificationModel);
        }
    }

    getNotification(id){
        let order = this.orders.find(o => o.ID === id);
        return order || null;
    }
}