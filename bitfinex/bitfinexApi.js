const http = require('../utils/http.js');
let datamodel = require('data-model');
let PlatformStatusReponseModel = require('./apiModels/PlatformStatusReponseModel.js');
let TickersReponseModel = require('./apiModels/TickersReponseModel.js');
let BookResponseModel = require('./apiModels/BookResponseModel.js');

// Limits
// In order to offer the best service possible we have added a rate limit to the number of REST requests.
// Our rate limit policy can vary in a range of 10 to 90 requests per minute depending on some factors (e.g. servers load, endpoint, etc.).

// Maintenance error
// When in maintenance few API endpoints (eg. books, ...) will return a maintenance error to prevent you to use potentially inconsistent data.
// ["error", 20060, "maintenance"]

// Maintenance mode
// When the platform is marked in maintenance mode bots should stop trading activity. Cancelling orders will be still possible.

class BitfinexApi {
    constructor(){
        //https://api.bitfinex.com/v2/<endpoint>/?parameter=value...
        this.urlTemplate = 'https://api.bitfinex.com/v2/<endpoint>/';
    }

    _buildUrl(endpoint, queryStringParams = {}){
        if(!endpoint)
            throw new Error('endpoint can\'t be empty');
        let url = this.urlTemplate.replace("<endpoint>", endpoint);

        // build query string
        if(queryStringParams && typeof queryStringParams == 'object'){
            let queryString = Object.keys(queryStringParams).reduce((res, key, i) => {
                if(queryStringParams[key] === null || queryStringParams[key] === undefined)
                    return res;
                if(i === 0)
                    res += '?';
                else
                    res += '&';
                res += `${key}=${queryStringParams[key]}`;
                return res;
            }, "");
    
            url = `${url}${queryString}`;
        }
        return url;
    }

    _validateSymbol(symbol){
        // A symbol can be a trading pair or a margin currency.
        // Trading pairs symbols are formed prepending a "t" before the pair (i.e tBTCUSD, tETHUSD).
        // Margin currencies symbols are formed prepending a "f" before the currency (i.e fUSD, fBTC, ...)
        datamodel('symbol').setTemplate(String);
        let valid = datamodel('symbol').validate(symbol);
        return valid;
    }
    _validateSymbols(symbols){
        let valid = symbols.reduce((allValid, symbol) => allValid && this._validateSymbol(symbol), true);
        return valid;
    }

    // t or f
    _getSymbolType(symbol){
        return symbol.charAt(0);
    }

    // Get the current status of the platform.
    platformStatus(){
        let endpoint = 'platform/status';
        return http.axios({url: this._buildUrl(endpoint)}).then((response) => {
            let model = new PlatformStatusReponseModel(response);
            if(!model.validate())
                throw new Error(`Invalid response retreived from '${endpoint}' endpoint. response: ${response}`);
            return model;
        });
    }

    //The ticker is a high level overview of the state of the market. 
    // It shows you the current best bid and ask, as well as the last trade price. 
    // It also includes information such as daily volume and how much the price has moved over the last day.
    tickers(symbols){
        let endpoint = 'tickers';
        if(Array.isArray(symbols)){
            symbols = symbols.reduce((res, symbol, i) => i === 0 ? res + symbol : res + ',' + symbol, '');
        }
        else if(typeof(symbols) == 'string'){
            if(!symbols)
                throw new Error('symbols can\'t be empty');
        }
        let params = {
            symbols: symbols
        };
        let url = this._buildUrl(endpoint, params);
        return http.axios({url: url}).then((response) => {
            let models = response.map((r) => {
                let model = new TickersReponseModel(r);
                if(!model.validate())
                    throw new Error(`Invalid response retreived from '${endpoint}' endpoint. response: ${response}`);
                return model;
            });
            return models;
        });
    }

    trades(){

    }

    books(symbol, precision = 'P0'){
        let endpoint = `book/${symbol}/${precision}`;
        let params = {
            len: '100' // Number of price points ("25", "100")            
        };
        let url = this._buildUrl(endpoint, params);
        return http.axios({url: url}).then((response) => {
            let models = response.map((r) => {
                let model = new BookResponseModel(this._getSymbolType(symbol), r);
                if(!model.validate())
                    throw new Error(`Invalid response retreived from '${endpoint}' endpoint. response: ${response}`);
                return model;
            });
            return models;
        });
    }

}

// create sigleton
module.exports = new BitfinexApi();