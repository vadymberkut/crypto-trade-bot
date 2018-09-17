const fs = require('fs');
const path = require('path');
const util = require('util');

// USe Node 8 promisify util to convert callback based functions to promise based
const mkdirAsync = util.promisify(fs.mkdir);
const statAsync = util.promisify(fs.stat);

class FSHelper {
    constructor() {

    }

    mkDirByPathSync(targetDir, { isRelativeToScript = false } = {}) {
        const sep = path.sep;
        const initDir = path.isAbsolute(targetDir) ? sep : '';
        const baseDir = isRelativeToScript ? __dirname : '.';
        
        return targetDir.split(sep).reduce((parentDir, childDir) => {
            const curDir = path.resolve(baseDir, parentDir, childDir);
            try {
                fs.mkdirSync(curDir);
            } catch (err) {
                if (err.code === 'EEXIST') { // curDir already exists!
                    return curDir;
                }
            
                // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
                if (err.code === 'ENOENT') { // Throw the original parentDir error on curDir `ENOENT` failure.
                    throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
                }
            
                const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;
                if (!caughtErr || caughtErr && targetDir === curDir) {
                    throw err; // Throw if it's just the last created dir.
                }
            }
        
            return curDir;
        }, initDir);
    }

    // async mkDirByPathAsync(targetDir, { isRelativeToScript = false } = {}) {
    //     const sep = path.sep;
    //     const initDir = path.isAbsolute(targetDir) ? sep : '';
    //     const baseDir = isRelativeToScript ? __dirname : '.';
        
    //     return targetDir.split(sep).reduce((parentDir, childDir) => {
    //         const curDir = path.resolve(baseDir, parentDir, childDir);
    //         try {
    //             await mkdirAsync(curDir);
    //         } catch (err) {
    //             if (err.code === 'EEXIST') { // curDir already exists!
    //                 return curDir;
    //             }
            
    //             // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
    //             if (err.code === 'ENOENT') { // Throw the original parentDir error on curDir `ENOENT` failure.
    //                 throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
    //             }
            
    //             const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;
    //             if (!caughtErr || caughtErr && targetDir === curDir) {
    //                 throw err; // Throw if it's just the last created dir.
    //             }
    //         }
        
    //         return curDir;
    //     }, initDir);
    // }

    async pathExistsAsync(path) {
        try {
            let result = await statAsync(path);
            return true;
        } catch(err) {
            if(err.code === 'ENOENT') {
                // Path doesn't exist
                return false;
            } else {
                // Some other error
                throw err;
            }
        }
    }

    async statAsync(path) {
        return await statAsync(path);
    }
}

module.exports = new FSHelper();