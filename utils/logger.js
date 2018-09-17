// Custom logger
// Used to save logs elsewhere if needed

const config = require('../config/index');
const os = require('os');
const fs = require('fs');
const path = require('path');
const util = require('util');
const colors = require('colors/safe');
const moment = require('moment');
const _ = require('lodash');
const { Queue, PriorityQueue } = require('./queue');
const fsHelper = require('./fsHelper');
const LogModel = require('../models/logModel');
const TelegramBot = require('../telegram/telegramBot');

// // set theme 
// colors.setTheme({
//     silly: 'rainbow',
//     input: 'grey',
//     verbose: 'cyan',
//     prompt: 'grey',
//     info: 'green',
//     data: 'grey',
//     help: 'cyan',
//     warn: 'yellow',
//     debug: 'blue',
//     error: 'red'
//   });
// // outputs red text 
// console.log(colors.error("this is an error"));

// // // outputs yellow text 
// console.log(colors.warn("this is a warning"));

const readFileAsync = util.promisify(fs.readFile);
const appendFileAsync = util.promisify(fs.appendFile); // Creates file if doesn't exist
const writeFileAsync = util.promisify(fs.writeFile);

const messageType = {
    LOG: 'LOG',
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR'
};
const messagePriority = {
    LOG: 1,
    INFO: 2,
    WARNING: 3,
    ERROR: 4
};

const getMessageTypes = () => Object.keys(messageType);

class Logger {
    constructor(){
        this.queue = new PriorityQueue({
            items: [],
            comparer: (a, b) => {
                if(a.priority !== b.priority) {
                    return (a.priority < b.priority ? -1 : (a.priority > b.priority ? 1 : 0));
                } else {
                    // Use timestamp to determine priority precisely
                    return (a.timestamp < b.timestamp ? -1 : (a.timestamp > b.timestamp ? 1 : 0));
                }
            }
        });
        this.telegramBot = new TelegramBot(config.telegram);
        this._saveToFile = _.throttle(this._saveToFile.bind(this), config.logger.saveInterval);
    }

    /**
     * Builds LogModel instance
     *
     * @param {*} message
     * @memberof Logger
     */
    _buildLogModel(message, type, data = null) {
        if(typeof message === 'string' || message === null || message === undefined) {
            return new LogModel({
                type: type,
                message: message,
                data: data
             });
        } else if(typeof message === 'object') {
            return new LogModel({
                ...message,
                type: type,
                data: data
            });
        } else if(typeof message === 'object' && Array.isArray(message)) {
            return message.map(m => this._buildLogModel(m));
        } else {
            throw new Error('Invalid log message received');
        }
    }

    _process() {
        if(this.queue.isEmpty()) {
            return;
        }

        let current = this.queue.remove();

        if(current.notify) {
            // Send message to telegram bot with data as JSON
            let botMessage = current.model.message;
            if(current.model.type === messageType.ERROR) {
                botMessage = botMessage + os.EOL + current.model.stack;
            }
            this.telegramBot.sendMessage({
                chat_id: '375693371', // TODO: use config
                text: botMessage,
            }).then(response => {
                let { ok, result } = response;
                if(ok === false) {
                    throw result;
                }
            }).catch(err => {
                this.error(err);
            });
        }

        this._saveToFile(current.model).catch(err => {
            console.error(`Logger: can't save logs to file. Error: `, err);
        });

        this._process(); // Go to next
    }

    async _saveToFile(logModel) {
        let p1, p2;
        let r1, r2;
        let basePath = process.cwd(); // current working directory

        let logsPath = path.join(basePath, config.logger.savePath);
        let logsStorePath = path.join(basePath, config.logger.storePath);

        // Ensure directories are created
        p1 = fsHelper.pathExistsAsync(logsPath);
        p2 = fsHelper.pathExistsAsync(logsStorePath);
        r1 = await p1;
        r2 = await p2;
        
        if(!r1) {
            // await fsHelper.mkDirByPathAsync(logsPath);
            fsHelper.mkDirByPathSync(logsPath);
        }
        if(!r2) {
            // await fsHelper.mkDirByPathAsync(logsStorePath);
            fsHelper.mkDirByPathSync(logsStorePath);
        }

        // Save logs to .log files
        let allLogsFilePath = path.join(logsPath, `all.log`);
        let typeLogsFilePath = path.join(logsPath, `${logModel.type}.log`);
        let fullMessage = logModel.getFullMessageWithData();
        fullMessage += os.EOL + os.EOL; // Keep empty line at the end
        await appendFileAsync(allLogsFilePath, fullMessage, { encoding: 'utf8' })
        if(config.logger.saveTypeSpecificLogs) {
            await appendFileAsync(typeLogsFilePath, fullMessage, { encoding: 'utf8' })
        }

        // Save model to .json
        // TODO: Consider way to append to file and not to read all logs into memory each time
        // maybe use a cache
        let logStoreFilePath = path.join(logsStorePath, `${logModel.type}.json`);
        let currentStore = [];
        if(await fsHelper.pathExistsAsync(logStoreFilePath)) {
            // Read store from file
            let content = await readFileAsync(logStoreFilePath, { encoding:'utf8' });
            try {
                currentStore = JSON.parse(content);
                if(!Array.isArray(currentStore)) {
                    currentStore = [];
                }
            } catch(err) {
                currentStore = [];
            }
        }
        currentStore.push(logModel);

        let currentStoreJson;
        if(config.logger.formatJson) {
            currentStoreJson = JSON.stringify(currentStore, null, 4);
        } else {
            currentStoreJson = JSON.stringify(currentStore, null, 0);
        }
        await writeFileAsync(logStoreFilePath, currentStoreJson, { encoding:'utf8' });
    }


    log(){
        console.log.apply(console, arguments);
    }

    logImportant(){
        console.log.apply(console, arguments);
    }

    info(message, data = null){
        let model = this._buildLogModel(message, messageType.INFO, data);

        console.info(colors.green(`${model.message}`));

        this.queue.add({
            priority: messagePriority.INFO,
            timestamp: moment().valueOf(),
            notify: false,
            model: model
        });
        this._process();
    }

    infoImportant(message, data = null){
        let model = this._buildLogModel(message, messageType.INFO, data);

        console.info(colors.green(`${model.message}`));

        this.queue.add({
            priority: messagePriority.INFO,
            timestamp: moment().valueOf(),
            notify: true,
            model: model
        });
        this._process();
    }

    warn(message, data = null){
        let model = this._buildLogModel(message, messageType.WARNING, data);

        console.warn(colors.yellow(`${model.message}`));

        this.queue.add({
            priority: messagePriority.WARNING,
            timestamp: moment().valueOf(),
            notify: false,
            model: model
        });
        this._process();
    }

    warnImportant(message, data = null){
        let model = this._buildLogModel(message, messageType.WARNING, data);

        console.warn(colors.yellow(`${model.message}`));

        this.queue.add({
            priority: messagePriority.WARNING,
            timestamp: moment().valueOf(),
            notify: true,
            model: model
        });
        this._process();
    }

    error(message, data = null){
        let model = this._buildLogModel(message, messageType.ERROR, data);
        model.stack = model.stack || (new Error()).stack;

        console.error(colors.red(`${model.message}`));

        this.queue.add({
            priority: messagePriority.ERROR,
            timestamp: moment().valueOf(),
            notify: false,
            model: model
        });
        this._process();
    }

    errorImportant(message, data = null){
        let model = this._buildLogModel(message, messageType.ERROR, data);
        model.stack = model.stack || (new Error()).stack;

        console.error(colors.red(`${model.message}`));

        this.queue.add({
            priority: messagePriority.ERROR,
            timestamp: moment().valueOf(),
            notify: true,
            model: model
        });
        this._process();
    }

    trace(){
        console.trace();
    }
}

module.exports = new Logger();