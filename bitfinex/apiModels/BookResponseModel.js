let {ValidationSchema, ValidationTypes, registerSchema, validate, validateSync} = require('class-validator');

// define validation schema
const schemaName_t = 'BookResponseModel_t';
const schemaName_f = 'BookResponseModel_f';
let validationSchema_t = {
    name: schemaName_t, // this is required, and must be unique
    properties: {
        PRICE: [{
            type: ValidationTypes.IS_NUMBER
        }],
        COUNT: [{
            type: ValidationTypes.IS_NUMBER
        }],
        AMOUNT: [{
            type: ValidationTypes.IS_NUMBER
        }]
    }
};
let validationSchema_f = {
    name: schemaName_f, // this is required, and must be unique
    properties: {
        RATE: [{
            type: ValidationTypes.IS_NUMBER
        }],
        PERIOD: [{
            type: ValidationTypes.IS_NUMBER
        }],
        COUNT: [{
            type: ValidationTypes.IS_NUMBER
        }],
        AMOUNT: [{
            type: ValidationTypes.IS_NUMBER
        }]
    }
};
// register schema
registerSchema(validationSchema_t);
registerSchema(validationSchema_f);

module.exports = class BookResponseModel {
    constructor(type, apiResponseData){
        this.origin = apiResponseData;
        this.type = type;

        // For Trading: if AMOUNT > 0 then bid else ask.
        // For Funding: if AMOUNT > 0 then ask else bid.
        if(this.type == 't'){
            this.PRICE = apiResponseData[0];
            this.COUNT = apiResponseData[1]; // Number of orders at that price level
            this.AMOUNT = apiResponseData[2]; // Total amount available at that price level.
        }
        if(this.type == 'f'){
            this.RATE = apiResponseData[0];
            this.PERIOD = apiResponseData[1]; // Period level (Funding only)
            this.COUNT = apiResponseData[2]; // Number of orders at that price level
            this.AMOUNT = apiResponseData[3]; // Total amount available at that price level.
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