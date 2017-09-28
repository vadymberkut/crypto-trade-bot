let {ValidationSchema, ValidationTypes, registerSchema, validate, validateSync} = require('class-validator');

// define validation schema
const schemaName = 'NotificationResponseModel';
let validationSchema = {
    name: schemaName, // this is required, and must be unique
    properties: {
        MTS: [{
            type: ValidationTypes.IS_NUMBER
        }],
        TYPE: [{
            type: ValidationTypes.IS_STRING
        }],
        STATUS: [{
            type: ValidationTypes.IS_STRING
        }],
        TEXT: [{
            type: ValidationTypes.IS_STRING
        }],
    }
};
// register schema
registerSchema(validationSchema);

module.exports = class NotificationResponseModel {
    constructor(apiResponseData){
        this.origin = apiResponseData;
        this.updatedOnMs = (new Date()).getTime();

        this.MTS = apiResponseData[0]; // Millisecond Time Stamp of the update
        this.TYPE = apiResponseData[1]; // Purpose of notification ('on-req', 'oc-req', 'uca', 'fon-req', 'foc-req')
        this.MESSAGE_ID = apiResponseData[2]; // unique ID of the message
        this._PLACEHOLDER1 = apiResponseData[3];
        this.NOTIFY_INFO = apiResponseData[4]; // array/object A message containing information regarding the notification
        this.CODE = apiResponseData[5]; // null or integer Work in progress
        this.STATUS = apiResponseData[6]; // Status of the notification; it may vary over time (SUCCESS, ERROR, FAILURE, ...)
        this.TEXT = apiResponseData[7]; // Text of the notification
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