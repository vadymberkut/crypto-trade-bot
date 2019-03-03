
class WsInfoModel {
    constructor(props = {}) {
        this.info = props.info || ''; // Welcome message
        this.version = props.version || ''; // Api version
        this.timestamp = props.timestamp || '';
        this.docs = props.docs || ''; // Link to docs
    }
}

class WsErrorModel {
    constructor(props = {}) {
        this.errorMessage = props.error || '';
        this.status = props.status || ''; // http status
        this.meta = props.meta || '';
        this.request = props.request || '';
    }
}

class WsSuccessModel {
    constructor(props = {}) {
        this.subscriptionName = props.subscribe || '';
        this.isSuccess = props.success || ''; // bool
        this.request = props.request || {}; // object?
    }
}

class WsTableDataModel {
    constructor(props = {}) {

        // Table name / Subscription topic.
        this.table = props.table || ''; // string 

        // The type of the message. Types:
        // 'partial'; This is a table image, replace your data entirely.
        // 'update': Update a single row.
        // 'insert': Insert a new row.
        // 'delete': Delete a row.
        this.action = props.action || '';

        // An array of table rows is emitted here. They are identical in structure to data returned from the REST API.
        this.data = props.data || []; // Object[]

        //
        // The below fields define the table and are only sent on a `partial`
        //
        //#region `partial` only

        // Attribute names that are guaranteed to be unique per object.
        // If more than one is provided, the key is composite.
        // Use these key names to uniquely identify rows. Key columns are guaranteed
        // to be present on all data received.
        this.keys = props.keys || []; // string[]

        // This lists key relationships with other tables.
        // For example, `quote`'s foreign key is {"symbol": "instrument"}
        this.foreignKeys = props.foreignKeys || {}; // {[key: string]: string}

        // This lists the shape of the table. The possible types:
        // "symbol" - In most languages this is equal to "string"
        // "guid"
        // "timestamp"
        // "timespan"
        // "float"
        // "long"
        // "integer"
        // "boolean"
        this.types = props.types || {}; // {[key: string]: string}

        // When multiple subscriptions are active to the same table, use the `filter` to correlate which datagram
        // belongs to which subscription, as the `table` property will not contain the subscription's symbol.
        this.filter = props.filter || {}; // {account?: number, symbol?: string}

        // These are internal fields that indicate how responses are sorted and grouped.
        this.attributes = props.attributes || {}; // {[key: string]: string}

        //#endregion
    }
}



module.exports = {
    WsInfoModel,
    WsErrorModel,
    WsSuccessModel,
    WsTableDataModel,
};