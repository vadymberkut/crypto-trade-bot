let fs = require('fs');
let path = require('path');
let _ = require('lodash');
let moment = require('moment');

const MIN_PATH_LENGTH = 3;
const MAX_PATH_LENGTH = 6;

module.exports = class CirclePathAlgorithm {
    constructor(bookStore, startState, minPathLength = 3, maxPathLength = 5){
        if(minPathLength < MIN_PATH_LENGTH){
            throw new Error(`CirclePathAlgorithm: minPathLength can't be less that ${MIN_PATH_LENGTH}`);
        }
        if(maxPathLength > MAX_PATH_LENGTH){
            throw new Error(`CirclePathAlgorithm: maxPathLength can't be grater that ${MAX_PATH_LENGTH}`);
        }
        if(!bookStore){
            throw new Error(`CirclePathAlgorithm: bookStore can't be null or empty`);
        }
        this.bookStore = bookStore;
        this.startState = startState;
        this.minPathLength = minPathLength;
        this.maxPathLength = maxPathLength;
        
        this.graphStates = null;
        this.graphStateTransitions = null;

        this.pathFindResult = null;
        this.pathFindCount = null;

        this._buildGraph();
    }

    _buildGraph(){
        let bookSymbols = this.bookStore.getStoredSymbols();

        // TODO - consider gettting states from available wallets
        // get graph states (currencies names e.g. BTC, USD, IOT) from symbols e.g. tIOTUSD
        const symbolLength = 3;
        this.graphStates = bookSymbols.map((s) => {
            if(s.length !== 1 + 2*symbolLength)
                return null;
            return [s.substr(1, symbolLength), s.substr(1 + symbolLength, symbolLength)];
        });
        this.graphStates = _.flatten(this.graphStates); // merge to single array
        this.graphStates = this.graphStates.filter((st) => !!st); // filter null values
        this.graphStates = _.uniq(this.graphStates); // take only uniq

        // get state transitions (currency pair names) e.g. {symbol: tIOTUSD, state1: IOT, state2: USD, bidirectional: true}
        this.graphStateTransitions = bookSymbols.map((s) => {
            return {
                symbol: s,
                state1: s.substr(1, symbolLength),
                state2: s.substr(1 + symbolLength, symbolLength),
                bidirectional: true
            };
        });
    }

    _isStateExist(state){
        return !!this.graphStates.find((gs) => gs === state);
    }

    _findStateTransitions(graphState){
        let result = this.graphStateTransitions.filter((gst) => {
            return gst.state1 == graphState || gst.state2 == graphState;
        });
        return result;
    }

    // for list of transitions find states that we can gor from specisifed state
    _getTransitionsStatesForState(transitions, fromState){
        let result = transitions.map((t) => {
            if(t.state1 != fromState)
                return t.state1;
            if(t.state2 != fromState)
                return t.state2;
            return null;
        }).filter((s) => s !== null);
        return result;
    }

    // returns list of actions
    findPath(){
        this.pathFindResult = this._findPath([this.startState]);
        this.pathFindCount = this.countPathes(this.pathFindResult);

        // get final path list (not nested structure) from result
        let solution = this._buildSolution(this.pathFindResult);

        // filter circular pathes. e.g. IOT -> USD -> IOT -> USD -> IOT
        // ...

        //determine profit pathes taking into account token max amount or suggest pathes with specified amount
        // ...

        return this.pathFindResult;
    }

    _findPath(graphStates, pathLength = -1){
        // pathLength is measured in amount of transitions performed
        // if graphStates.length === 1 it's start point
        
        pathLength += 1;
        let result = graphStates.map((gs) => {
            let stateTransitions = this._findStateTransitions(gs);
            let nextStates = this._getTransitionsStatesForState(stateTransitions, gs);
            let isCirclePathEnd = false;
            if(pathLength >= this.minPathLength && pathLength < this.maxPathLength){
                if(gs == this.startState){
                    // console.log(`found min length circle path (${this.startState} -> ${gs}); pathLength=`, pathLength);
                    // min length circle path reached
                    // so this state can be final or can be proccessed futher
                    isCirclePathEnd = true;
                    return {
                        state: gs,
                        nextStates: null,
                        pathLength: pathLength,
                        isCirclePathEnd: true
                    };
                }
            }
            else if(pathLength === this.maxPathLength){
                // console.log('max level reached; pathLength=', pathLength);
                if(gs == this.startState){
                    return {
                        state: gs,
                        nextStates: null,
                        pathLength: pathLength,
                        isCirclePathEnd: true
                    };
                }
                else
                    return null;
            }
            else if(pathLength > this.maxPathLength)
                return null;
                
            let nextResults = this._findPath(nextStates, pathLength);

            if(nextResults !== null || isCirclePathEnd){
                let result = {
                    state: gs,
                    nextStates: nextResults,
                    pathLength: pathLength,
                    isCirclePathEnd: isCirclePathEnd
                };
                return result;
            }
          
            return null;        
        });
        result = result.filter(r => r !== null);
        if(result.length === 0)
            return null;
        return result;
    }

    countPathes(findResult){
        if(findResult === null)
            return null;
        let result = this._countPathes(findResult, {});
        return result;
    }
    _countPathes(findResult, result = {}){
        if(Array.isArray(findResult)){
            findResult.map((fr) => this._countPathes(fr, result));
        }
        else{
            if(findResult.nextStates !== null){
                this._countPathes(findResult.nextStates, result);
            }
            if(findResult.nextStates === null || findResult.isCirclePathEnd === true){
                if(!result[findResult.pathLength])
                    result[findResult.pathLength] = 0;
                result[findResult.pathLength] += 1;
            }
        }
        return result;
    }

    // TODO - recheck this
    _buildSolution(pathFindResult){
        if(pathFindResult === null)
            return null;
        
        let results = pathFindResult.map((r) => {
            if(r.isCirclePathEnd === true){
                return r.state;
                // return [r.state];
            }
            else{
                let nextResults = this._buildSolution(r.nextStates);
                // nextResults = _.flattenDeep(nextResults);
                nextResults = _.flatten(nextResults);
                nextResults = nextResults.map((nr) => {
                    // return `${r.state} -> ${nr}`;
                    if(Array.isArray(nr)){
                        nr.unshift(r.state);
                        return nr;
                    }
                    else{
                        return [r.state, nr];
                    }
                });
                return nextResults;
            }
        });
        return results;
    }

    saveToFile(){
        console.log(`CirclePathAlgorithm: save results to a file`);
        let date = moment.utc().format('YYYYMMDDHHmmss');
        const fileName1 = path.join(__dirname, '../logs/circlePathAlgorithm/', `${this.startState}-${date}-pathFindResult.log`);
        const fileName2 = path.join(__dirname, '../logs/circlePathAlgorithm/', `${this.startState}-${date}-pathCount.log`);
        fs.writeFileSync(fileName1, JSON.stringify(this.pathFindResult));
        fs.writeFileSync(fileName2, JSON.stringify(this.pathFindCount));
    }
}