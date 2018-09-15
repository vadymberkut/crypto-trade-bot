const http = require('../utils/http.js');

module.exports = class TelegramApi {
    constructor(httpAPiToken){
        this.httpAPiToken = httpAPiToken;
        this.urlTemplate = 'https://api.telegram.org/bot<token>/<endpoint>';
    }

    _buildUrl(endpoint, queryStringParams = {}){
        if(!endpoint)
            throw new Error('endpoint can\'t be empty');
        let url = this.urlTemplate.replace("<token>", this.httpAPiToken);
        url = url.replace("<endpoint>", endpoint);

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

    

    // A simple method for testing your bot's auth token.
    // Returns basic information about the bot in form of a User object.
    getMe(){
        let endpoint = 'getMe';
        return http.axios({url: this._buildUrl(endpoint)}).then((response) => {
            // let model = new PlatformStatusReponseModel(response);
            // if(!model.validate())
            //     throw new Error(`Invalid response retreived from '${endpoint}' endpoint. response: ${response}`);
            // return model;
            return response;
        }).catch((err)=>{
            return null;
        });
    }

    getUpdates(){

    }
    
    // Use this method to send text messages. On success, the sent Message is returned.
    sendMessage(params){
        let endpoint = 'sendMessage';
        return http.axios({url: this._buildUrl(endpoint), method: 'post', data: params}).then((response) => {
            // let model = new PlatformStatusReponseModel(response);
            // if(!model.validate())
            //     throw new Error(`Invalid response retreived from '${endpoint}' endpoint. response: ${response}`);
            // return model;
            return response;
        }).catch((err)=>{
            return null;
        });
    }

}