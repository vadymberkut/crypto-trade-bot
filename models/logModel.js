
const config = require('../config/index');
const os = require('os');
const moment = require('moment');

class LogModel {
    constructor(props) {
        this.type = props.type || '';
        this.message = props.message || '';
        this.stack = props.stack || '';
        this.createdOn = props.createdOn || moment().format(config.date.format.store); // server local time
        this.createdOnUtc = props.createdOnUtc || moment().utc().format(config.date.format.store);

        this.data = this._convertErrorToObject(props.data) || null; // Additional log data (any type)
        let isEmptyObject = 
            !!this.data &&
            (typeof this.data === 'object') && 
            Object.keys(this.data) === 0 && 
            this.data.constructor === Object;
        let isEmptyArray = Array.isArray(this.data) && this.data.length === 0;
        if(isEmptyObject || isEmptyArray) {
            this.data = null;
        }
    }

    _convertErrorToObject(err) {
        if(err instanceof Error) {
            let errObj = {};

            Object.getOwnPropertyNames(err).forEach(key => {
                errObj[key] = err[key];
            });

            return errObj;
        }
        return err;
    }

    /**
     * Returns detailed log message in single string
     *
     * @memberof LogModel
     */
    getFullMessage() {
        let message = `${this.createdOnUtc}: ${this.type} - ${this.message}`;
        if(!!this.stack) {
            message += os.EOL;
            message += 'Stack: ' + this.stack.padStart(4);
            
        }
        return message;
    }

    getFullMessageWithData() {
        let message = this.getFullMessage();
        if(!!this.data) {
            message += os.EOL;
            message += 'Data: ' + JSON.stringify(this.data, null, 4).padStart(4);
        }
        return message;
    }
}

module.exports = LogModel;