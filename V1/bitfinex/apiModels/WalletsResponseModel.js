let {ValidationSchema, ValidationTypes, registerSchema, validate, validateSync} = require('class-validator');

// define validation schema
const schemaName = 'WalletsResponseModel';
let validationSchema = {
    name: schemaName, // this is required, and must be unique
    properties: {
        WALLET_TYPE: [{
            type: ValidationTypes.IS_STRING
        }],
        CURRENCY: [{
            type: ValidationTypes.IS_STRING
        }],
        BALANCE: [{
            type: ValidationTypes.IS_NUMBER
        }],
        UNSETTLED_INTEREST: [{
            type: ValidationTypes.IS_NUMBER
        }],
        // float or null
        // BALANCE_AVAILABLE: [{
        //     type: ValidationTypes.IS_NUMBER
        // }]
    }
};
// register schema
registerSchema(validationSchema);

module.exports = class WalletsResponseModel {
    constructor(apiResponseData){
        this.origin = apiResponseData;
        this.updatedOnMs = (new Date()).getTime();

        this.WALLET_TYPE = apiResponseData[0]; // Wallet name (exchange, margin, funding)
        this.CURRENCY = apiResponseData[1]; // Currency (IOT, USD, fUSD, etc)
        this.BALANCE = apiResponseData[2]; // Wallet balance
        this.UNSETTLED_INTEREST = apiResponseData[3]; // Unsettled interest
        this.BALANCE_AVAILABLE = apiResponseData[4]; // Amount not tied up in active orders, positions or funding (null if the value is not fresh enough).
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