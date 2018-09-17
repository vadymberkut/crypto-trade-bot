const axios = require('axios');
const logger = require('./logger');

class Http {
    
    // Make http requests using axios (see config fields here https://github.com/mzabriskie/axios)
    static axios(config){
        return Http._axiosRequest(config);
    }

    static _axiosRequest(config){
        if(!config || !config.url){
            throw {
                message: "Http request error: config required"
            };
        }

        config.method = config.method || 'get';

        if(config.url && config.url.indexOf('http') === -1 && config.url.indexOf('https') === -1 && config.url[0] != '/')
            config.url = '/' + config.url

        return axios(config).then((response)=>{
            return response.data;
        }).catch((err)=>{
            logger.error("HTTP request error: ", `${err.response.status}: ${err.response.statusText}`, err.response);
            throw err;
        })
    }
}

module.exports = Http;