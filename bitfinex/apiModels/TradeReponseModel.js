let {ValidationSchema, ValidationTypes, registerSchema, validate, validateSync} = require('class-validator');

// define validation schema
const schemaName = 'TradeReponseModel';
let validationSchema = {
    name: schemaName, // this is required, and must be unique
    properties: {
        ID: [{
            type: ValidationTypes.IS_NUMBER
        }],
        PAIR: [{
            type: ValidationTypes.IS_STRING
        }],
        MTS_CREATE: [{
            type: ValidationTypes.IS_NUMBER
        }],
        ORDER_ID: [{
            type: ValidationTypes.IS_NUMBER
        }],
        EXEC_AMOUNT: [{
            type: ValidationTypes.IS_NUMBER
        }],
        EXEC_PRICE: [{
            type: ValidationTypes.IS_NUMBER
        }],
        ORDER_TYPE: [{
            type: ValidationTypes.IS_STRING
        }],
        ORDER_PRICE: [{
            type: ValidationTypes.IS_NUMBER
        }],
        MAKER: [{
            type: ValidationTypes.IS_NUMBER
        }]
    }
};
// register schema
registerSchema(validationSchema);

module.exports = class TradeReponseModel {
    constructor(apiResponseData){
        this.origin = apiResponseData;
        this.updatedOnMs = (new Date()).getTime();

        // these fileds sent for both te, tu
        this.ID = apiResponseData[0]; // Trade database id
        this.PAIR = apiResponseData[1]; // Pair (BTCUSD, …)
        this.MTS_CREATE = apiResponseData[2]; // Execution timestamp
        this.ORDER_ID = apiResponseData[3]; // Order id
        this.EXEC_AMOUNT = apiResponseData[4]; // Positive means buy, negative means sell
        this.EXEC_PRICE = apiResponseData[5]; // Execution price
        this.ORDER_TYPE = apiResponseData[6]; // Order type
        this.ORDER_PRICE = apiResponseData[7]; // Order price
        this.MAKER = apiResponseData[8]; // 1 if true, 0 if false

        // these fileds sent on tu
        this.FEE = apiResponseData[9]; // Fee
        this.FEE_CURRENCY = apiResponseData[10]; // Fee currency
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