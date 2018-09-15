// Custom logger
// Used to save logs elsewhere if needed

const config = require('../config/index');
const colors = require('colors/safe');
const TelegramBot = require('../telegram/telegramBot.js');

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

class Logger {
    constructor(){
        this.telegramBot = new TelegramBot(config.telegram);
    }

    log(){
        console.log.apply(console, arguments);
    }

    info(message){
        console.info(colors.green(message));
    }

    infoImportant(message){
        console.info(colors.green(message));

        // send message to telegram bot with data as JSON
        let botMessage = message;
        this.telegramBot.sendMessage({
            chat_id: '375693371',
            text: botMessage,
        });
    }

    warn(message, warnData = null){
        console.warn(colors.yellow(message));

        // send message to telegram bot with data as JSON
        // let json = !!warnData ? JSON.stringify(warnData) : '';
        // let botMessage = `${message} \n\n Warn data: ${json}`;
        // this.telegramBot.sendMessage({
        //     chat_id: '375693371',
        //     text: botMessage,
        // });
    }

    error(message, errorData = null){
        console.error(colors.red(message));

        // send message to telegram bot with data as JSON
        let json = !!errorData ? JSON.stringify(errorData) : '';
        let botMessage = `${message} \n\n Error data: ${json}`;
        this.telegramBot.sendMessage({
            chat_id: '375693371',
            text: botMessage,
        });
    }

    trace(){
        console.trace();
    }
}

module.exports = new Logger();