let {ValidationSchema, ValidationTypes, registerSchema, validate, validateSync} = require('class-validator');

// define validation schema
const schemaName = 'OrderResponseModel';
let validationSchema = {
    name: schemaName, // this is required, and must be unique
    properties: {
        ID: [{
            type: ValidationTypes.IS_NUMBER
        }],
        GID: [{
            type: ValidationTypes.IS_NUMBER
        }],
        CID: [{
            type: ValidationTypes.IS_NUMBER
        }],
        SYMBOL: [{
            type: ValidationTypes.IS_STRING
        }],
        MTS_CREATE: [{
            type: ValidationTypes.IS_NUMBER
        }],
        MTS_UPDATE: [{
            type: ValidationTypes.IS_NUMBER
        }],
        AMOUNT: [{
            type: ValidationTypes.IS_NUMBER
        }],
        AMOUNT_ORIG: [{
            type: ValidationTypes.IS_NUMBER
        }],
        TYPE: [{
            type: ValidationTypes.IS_STRING
        }],
        TYPE_PREV: [{
            type: ValidationTypes.IS_STRING
        }],
        FLAGS: [{
            type: ValidationTypes.IS_NUMBER
        }],
        ORDER_STATUS: [{
            type: ValidationTypes.IS_STRING
        }],
        PRICE: [{
            type: ValidationTypes.IS_NUMBER
        }],
        PRICE_AVG: [{
            type: ValidationTypes.IS_NUMBER
        }],
        PRICE_TRAILING: [{
            type: ValidationTypes.IS_NUMBER
        }],
        PRICE_AUX_LIMIT: [{
            type: ValidationTypes.IS_NUMBER
        }],
        NOTIFY: [{
            type: ValidationTypes.IS_NUMBER
        }],
        HIDDEN: [{
            type: ValidationTypes.IS_NUMBER
        }],
        PLACED_ID: [{
            type: ValidationTypes.IS_NUMBER
        }]
    }
};
// register schema
registerSchema(validationSchema);

module.exports = class OrderResponseModel {
    constructor(apiResponseData){
        this.origin = apiResponseData;
        this.updatedOnMs = (new Date()).getTime();

        // these fileds sent for 
        this.ID = apiResponseData[0]; // Order ID
        this.GID = apiResponseData[1]; // Group ID
        this.CID = apiResponseData[2]; // Client Order ID
        this.SYMBOL = apiResponseData[3]; // Pair (tBTCUSD, …)
        this.MTS_CREATE = apiResponseData[4]; // Millisecond timestamp of creation
        this.MTS_UPDATE = apiResponseData[5]; // Millisecond timestamp of update
        this.AMOUNT = apiResponseData[6]; // Positive means buy, negative means sell.
        this.AMOUNT_ORIG = apiResponseData[7]; // Original amount
        this.TYPE = apiResponseData[8]; // The type of the order: LIMIT, MARKET, STOP, TRAILING STOP, EXCHANGE MARKET, EXCHANGE LIMIT, EXCHANGE STOP, EXCHANGE TRAILING STOP, FOK, EXCHANGE FOK.
        this.TYPE_PREV = apiResponseData[9]; // Previous order type
        this._PLACEHOLDER1 = apiResponseData[10];
        this._PLACEHOLDER2 = apiResponseData[11];
        this.FLAGS = apiResponseData[12]; // Upcoming Params Object (stay tuned)
        this.ORDER_STATUS = apiResponseData[13]; // Order Status: ACTIVE, EXECUTED, PARTIALLY FILLED, CANCELED
        this._PLACEHOLDER3 = apiResponseData[14];
        this._PLACEHOLDER4 = apiResponseData[15];
        this.PRICE = apiResponseData[16]; // Price
        this.PRICE_AVG = apiResponseData[17]; // Average price 
        this.PRICE_TRAILING = apiResponseData[18]; // 	The trailing price
        this.PRICE_AUX_LIMIT = apiResponseData[19]; // 	Auxiliary Limit price (for STOP LIMIT)
        this._PLACEHOLDER5 = apiResponseData[20];
        this._PLACEHOLDER6 = apiResponseData[21];
        this._PLACEHOLDER7 = apiResponseData[22];
        this.NOTIFY = apiResponseData[23]; // 1 if Notify flag is active, 0 if not
        this.HIDDEN = apiResponseData[24]; // 1 if Hidden, 0 if not hidden
        this.PLACED_ID = apiResponseData[25]; // If another order caused this order to be placed (OCO) this will be that other order's ID
    }

    validate(){
        let errors = validateSync(schemaName, this, { skipMissingProperties: true });
        if (errors.length > 0) {
            return false;
        } else {
            return true;
        }
    }
}