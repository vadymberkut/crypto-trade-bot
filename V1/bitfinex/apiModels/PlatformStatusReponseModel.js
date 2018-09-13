let {ValidationSchema, ValidationTypes, registerSchema, validate, validateSync} = require('class-validator');

// define validation schema
const schemaName = 'PlatformStatusReponseModel';
let validationSchema = {
    name: schemaName, // this is required, and must be unique
    properties: {
        OPERATIVE: [{
            type: ValidationTypes.IS_NUMBER
        }]
    }
};
// register schema
registerSchema(validationSchema);

module.exports = class PlatformStatusReponseModel {
    constructor(apiResponseData){
        this.origin = apiResponseData;

        this.OPERATIVE = apiResponseData[0]; // 1=operative, 0=maintenance
    }

    validate(){
        // let valid = true;
        
        // // validate api response is valid
        // valid = valid && datamodel('apiResponseData').validate(this.origin);

        // // validate model is valid
        // valid = valid && datamodel('model').validate(this);

        // return valid;

        let errors = validateSync(schemaName, this, { skipMissingProperties: true });
        if (errors.length > 0) {
            return false;
        } else {
            return true;
        }
    }
}