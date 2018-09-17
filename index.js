
const _ = require('lodash');
const logger = require('./utils/logger');

const App = require('./app');

//#region Application setup

App.start();

//#endregion

//#region Error handling

// handle process stop
process.on('exit', processExitHandler.bind(null, {cleanup: true}));

// ctrl-c
process.on('SIGINT', processExitHandler.bind(null, {cleanup: false, exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', processExitHandler.bind(null, {cleanup: true, exit:true}));
process.on('SIGUSR2', processExitHandler.bind(null, {cleanup: true, exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', processExitHandler.bind(null, {cleanup: true, exit:true}));

function processExitHandler(options, err){
    if(options.cleanup){
        
    }
    if(err){
        logger.error(err);
    }
    if(options.exit){
        logger.log('Exiting...');
    }
}

//#endregion

//#region Test code

//#endregion