let {ValidationSchema, ValidationTypes, registerSchema, validate, validateSync} = require('class-validator');

// [
//     // on trading pairs (ex. tBTCUSD)
//     [
//       SYMBOL,
//       BID, 
//       BID_SIZE, 
//       ASK, 
//       ASK_SIZE, 
//       DAILY_CHANGE, 
//       DAILY_CHANGE_PERC, 
//       LAST_PRICE, 
//       VOLUME, 
//       HIGH, 
//       LOW
//     ],
//     // on funding currencies (ex. fUSD)
//     [
//       SYMBOL,
//       FRR, 
//       BID, 
//       BID_SIZE, 
//       BID_PERIOD,
//       ASK, 
//       ASK_SIZE,
//       ASK_PERIOD,
//       DAILY_CHANGE,
//       DAILY_CHANGE_PERC, 
//       LAST_PRICE,
//       VOLUME,
//       HIGH, 
//       LOW
//     ],
//     ...
//   ]

// define validation schema
const schemaName_t = 'TickersReponseModel_t';
const schemaName_f = 'TickersReponseModel_f';
let validationSchema_t = {
    name: schemaName_t, // this is required, and must be unique
    properties: {
        SYMBOL: [{
            type: ValidationTypes.IS_STRING
        }],
        BID: [{
            type: ValidationTypes.IS_NUMBER
        }],
        BID_SIZE: [{
            type: ValidationTypes.IS_NUMBER
        }],
        ASK: [{
            type: ValidationTypes.IS_NUMBER
        }],
        ASK_SIZE: [{
            type: ValidationTypes.IS_NUMBER
        }],
        DAILY_CHANGE: [{
            type: ValidationTypes.IS_NUMBER
        }],
        DAILY_CHANGE_PERC: [{
            type: ValidationTypes.IS_NUMBER
        }],
        LAST_PRICE: [{
            type: ValidationTypes.IS_NUMBER
        }],
        VOLUME: [{
            type: ValidationTypes.IS_NUMBER
        }],
        HIGH: [{
            type: ValidationTypes.IS_NUMBER
        }],
        LOW: [{
            type: ValidationTypes.IS_NUMBER
        }],
    }
};
let validationSchema_f = {
    name: schemaName_f, // this is required, and must be unique
    properties: {
        SYMBOL: [{
            type: ValidationTypes.IS_STRING
        }],
        FRR: [{
            type: ValidationTypes.IS_NUMBER
        }],
        BID: [{
            type: ValidationTypes.IS_NUMBER
        }],
        BID_SIZE: [{
            type: ValidationTypes.IS_NUMBER
        }],
        BID_PERIOD: [{
            type: ValidationTypes.IS_NUMBER
        }],
        ASK: [{
            type: ValidationTypes.IS_NUMBER
        }],
        ASK_SIZE: [{
            type: ValidationTypes.IS_NUMBER
        }],
        ASK_PERIOD: [{
            type: ValidationTypes.IS_NUMBER
        }],
        DAILY_CHANGE: [{
            type: ValidationTypes.IS_NUMBER
        }],
        DAILY_CHANGE_PERC: [{
            type: ValidationTypes.IS_NUMBER
        }],
        LAST_PRICE: [{
            type: ValidationTypes.IS_NUMBER
        }],
        VOLUME: [{
            type: ValidationTypes.IS_NUMBER
        }],
        HIGH: [{
            type: ValidationTypes.IS_NUMBER
        }],
        LOW: [{
            type: ValidationTypes.IS_NUMBER
        }],
    }
};
// register schema
registerSchema(validationSchema_t);
registerSchema(validationSchema_f);

module.exports = class TickersReponseModel {
    constructor(apiResponseData){
        this.origin = apiResponseData;
        this.type = apiResponseData[0].charAt(0); // t is trading, f is funcding

        if(this.type == 't'){
            this.SYMBOL = apiResponseData[0]; // 
            this.BID = apiResponseData[1]; // Price of last highest bid
            this.BID_SIZE = apiResponseData[2]; // Size of the last highest bid
            this.ASK = apiResponseData[3]; // Price of last lowest ask
            this.ASK_SIZE = apiResponseData[4]; // Size of the last lowest ask
            this.DAILY_CHANGE = apiResponseData[5]; // Amount that the last price has changed since yesterday
            this.DAILY_CHANGE_PERC = apiResponseData[6]; // Amount that the price has changed expressed in percentage terms
            this.LAST_PRICE = apiResponseData[7]; // Price of the last trade
            this.VOLUME = apiResponseData[8]; // Daily volume
            this.HIGH = apiResponseData[9]; // Daily high
            this.LOW = apiResponseData[10]; // Daily low
        }
        if(this.type == 'f'){
            this.SYMBOL = apiResponseData[0]; // 
            this.FRR = apiResponseData[1]; // Flash Return Rate - average of all fixed rate funding over the last hour
            this.BID = apiResponseData[2]; // Price of last highest bid
            this.BID_SIZE = apiResponseData[3]; // Size of the last highest bid
            this.BID_PERIOD = apiResponseData[4]; // Bid period covered in days
            this.ASK = apiResponseData[5]; // Price of last lowest ask
            this.ASK_SIZE = apiResponseData[6]; // Size of the last lowest ask
            this.ASK_PERIOD = apiResponseData[7]; // Ask period covered in days
            this.DAILY_CHANGE = apiResponseData[8]; // Amount that the last price has changed since yesterday
            this.DAILY_CHANGE_PERC = apiResponseData[9]; // Amount that the price has changed expressed in percentage terms
            this.LAST_PRICE = apiResponseData[10]; // Price of the last trade
            this.VOLUME = apiResponseData[11]; // Daily volume
            this.HIGH = apiResponseData[12]; // Daily high
            this.LOW = apiResponseData[13]; // Daily low
        }
    }

    validate(){
        if(this.type == 't'){
            let errors = validateSync(schemaName_t, this, { skipMissingProperties: true });
            if (errors.length > 0) {
                return false;
            } else {
                return true;
            }
        }
        if(this.type == 'f'){
            let errors = validateSync(schemaName_f, this, { skipMissingProperties: true });
            if (errors.length > 0) {
                return false;
            } else {
                return true;
            }
        }
    }
}