let fs = require('fs');
let path = require('path');
let _ = require('lodash');
let moment = require('moment');

const MIN_PATH_LENGTH = 3;
const MAX_PATH_LENGTH = 6;
const MIN_PATH_PROFIT = 0.01;

module.exports = class CirclePathAlgorithm {
    constructor(bookStore, startState, maxStartStateAmount, minPathLength = 3, maxPathLength = 5, minPathProfitUsd = 0.50, transitionFee = 0.002, convertSymbolToCurrency){
        if(!bookStore){
            throw new Error(`CirclePathAlgorithm: bookStore can't be null or empty`);
        }
        if(!maxStartStateAmount){
            throw new Error(`CirclePathAlgorithm: maxStartStateAmount can't be null or empty`);
        }
        if(minPathLength < MIN_PATH_LENGTH){
            throw new Error(`CirclePathAlgorithm: minPathLength can't be less that ${MIN_PATH_LENGTH}`);
        }
        if(maxPathLength > MAX_PATH_LENGTH){
            throw new Error(`CirclePathAlgorithm: maxPathLength can't be grater that ${MAX_PATH_LENGTH}`);
        }
        if(!minPathProfitUsd || minPathProfitUsd < MIN_PATH_PROFIT){
            throw new Error(`CirclePathAlgorithm: minPathProfitUsd can't be empty or less than ${MIN_PATH_PROFIT}`);
        }
        
        this.bookStore = bookStore;
        this.startState = startState;
        this.maxStartStateAmount = maxStartStateAmount;
        this.minPathLength = minPathLength;
        this.maxPathLength = maxPathLength;
        this.minPathProfitUsd = minPathProfitUsd;
        this.transitionFee = transitionFee;
        this.convertSymbolToCurrency = convertSymbolToCurrency;
        
        this.graphStates = null;
        this.graphStateTransitions = null;

        this.solutions = null;

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
    solve(){
        let pathFindResult = this._findPath([this.startState]);
        // let pathFindCount = this.countPathes(pathFindResult); // FOR DEBUG

        // get final path list (not nested structure) from result
        let solutions = this._buildSolution(pathFindResult);
        let processedSolutions = this._processSolution(solutions);

        if(!processedSolutions || processedSolutions.length === 0){
            throw new Error(`CirclePathAlgorithm: can't find solution for ${this.startState}`);
        }

        // take first solution - because now we allow ONLY 1 start state so ONLY 1 solution for it
        let processedSolution = processedSolutions[0];

        // filter circular pathes. e.g. IOT -> USD -> IOT -> USD -> IOT
        // i.e. where start state occurs more than twice (should oonly at start and end)
        processedSolution = processedSolution.filter((ps) => {
            return ps.path.filter(p => p == this.startState).length == 2;
        });

        // TODO OR NOT - filter pathes with duplicate states. e.g. ... -> BCH -> USD -> BCH -> ...

        //determine profit pathes taking into account token max amount or suggest pathes with specified amount
        let profitSolutions = processedSolution.filter((i) => i.estimatedProfit >= 0 && i.estimatedProfitUsd >= this.minPathProfitUsd);
        profitSolutions = _.orderBy(profitSolutions, i => i.estimatedProfit, 'desc'); //order by profit DESC
        // let profitSolutionsProfit = profitSolutions.map((i) => i.estimatedProfit);
        // let profitSolutionsProfitUsd = profitSolutions.map((i) => i.estimatedProfitUsd);
        // let usedPassAmounts = profitSolutions.map((i) => i.usedPassAmount);
        // let minProfit = _.min(profitSolutionsProfit);
        // let maxProfit = _.max(profitSolutionsProfit);
        // let avgProfit = _.sum(profitSolutionsProfit) / profitSolutionsProfit.length;

        this.solutions = profitSolutions;
        return profitSolutions;
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

    _processSolution(solution){
        if(solution === null)
            return null;
        let result = solution.map((s) => {
            return s.map((path) => {
                let stateInstructions = path.map((state, i) => {
                    let nextState = null;
                    if(i !== path.length - 1)
                        nextState = path[i + 1];

                    // symbol, e.g. tIOTUSD
                    let transition = null;
                    if(i !== path.length - 1){
                        transition = this.bookStore.getSymbol(state, nextState);
                        if(transition === null){
                            throw new Error(`CirclePathAlgorithm: can't find transition from ${state} to ${nextState}`);
                        }
                    }
    
                    // determine action: buy/sell
                    let action = null;
                    if(i !== path.length - 1){
                        action = this.bookStore.getSymbolAction(transition, state);
                        if(action === null){
                            throw new Error(`CirclePathAlgorithm: can't find action (buy/sell) for ${state} using transition ${transition}`);
                        }
                    }
    
                    // determine best book value we can buy/sell by market using bookStore
                    let bestBookValue = null;
                    if(i !== path.length - 1){
                        bestBookValue = this.bookStore.getBestBookValueForAction(transition, action);
                        if(bestBookValue === null){
                            throw new Error(`CirclePathAlgorithm: can't find bestBookValue for ${action} ${transition}`);
                        }
                    }
    
                    return {
                        isStart: i === 0,
                        isEnd: i === path.length - 1,
                        state: state,
                        nextState: nextState,
                        transition: transition,
                        action: action,
                        bestBookValue: bestBookValue
                    };
                });

                // determine max amount of start state (asset) to accomplish path in best prices
                let stateTotalsInUsd = [];
                stateInstructions.forEach((si, i) => {
                    let {isStart, isEnd, action, bestBookValue, nextState, state, transition} = si;

                    if(isEnd){
                        return;
                    } 

                    let {AMOUNT, COUNT, PRICE, type} = bestBookValue;

                    // save cost of the transition in usd
                    // let amount = nextState == 'USD' ? AMOUNT * PRICE : AMOUNT;
                    // let nextStateInUsd = this.bookStore.tryConvertToUsdUsingBestPrice(nextState, amount);
                    let nextStateInUsd = null;
                    let {pair, base, qoute} = this.convertSymbolToCurrency(transition);
                    if(action == 'buy'){
                        let totalInQoute = AMOUNT * PRICE;
                        nextStateInUsd = this.bookStore.tryConvertToUsdUsingBestPrice(qoute, totalInQoute);
                    }
                    if(action == 'sell'){
                        nextStateInUsd = this.bookStore.tryConvertToUsdUsingBestPrice(base, AMOUNT);
                    }
                    if(nextStateInUsd === null){
                        throw new Error(`CirclePathAlgorithm: can't convert ${nextState} to USD`);
                    }
                    stateTotalsInUsd.push(nextStateInUsd);
                });
                let minStateTotalInUsd = _.min(stateTotalsInUsd);
                let minStateAmount = this.bookStore.tryConvertFromUsdUsingBestPrice(minStateTotalInUsd, this.startState);
                if(minStateAmount === null){
                    throw new Error(`CirclePathAlgorithm: can't convert USD to ${this.startState}`);
                }

                // TODO - THIS PART ISN'T COMPLETED
                // simulate path and estimate profit
                let estimatedProfit = 0; // it start state
                let estimatedProfitUsd = 0; // it USD
                let desiredPassAmount = this.maxStartStateAmount;
                // let realPassAmount = minStateAmount * 0.8;
                let realPassAmount = minStateAmount;
                let usedPassAmount = Math.min(desiredPassAmount, realPassAmount);
                // let bestBookValues = stateInstructions.map(si => si.bestBookValue);

                let obtainedAmount = stateInstructions.reduce((prevInstrTotal, si, i) => {
                    let {isStart, isEnd, action, bestBookValue, nextState, state, transition} = si;

                    if(isEnd){
                        // reached the end - do nothing
                        return prevInstrTotal;
                    } 

                    let {AMOUNT, COUNT, PRICE, type} = bestBookValue;
                    let total = AMOUNT * PRICE;

                    // simulate action
                    let resultTotal = 0;
                    let actionAmount = null;
                    if(isStart){
                        prevInstrTotal = usedPassAmount;
                    }
                    if(action == 'buy'){
                        resultTotal = prevInstrTotal / PRICE;
                        resultTotal = resultTotal * (1 - this.transitionFee); // take into account transition fee
                        actionAmount = resultTotal;
                        // actionAmount = actionAmount * (1 - 0.0001); // - delta 0.01%
                    }
                    else if(action == 'sell'){
                        resultTotal = prevInstrTotal * PRICE;
                        resultTotal = resultTotal * (1 - this.transitionFee); // take into account transition fee
                        actionAmount = - prevInstrTotal;
                        // actionAmount = actionAmount * (1 - 0.0001); // - delta 0.01%
                    }
                    si.actionAmount = actionAmount; // save
                    return resultTotal;
                }, 0);
                estimatedProfit = (obtainedAmount - usedPassAmount); // amount of start state
                estimatedProfitUsd = this.bookStore.tryConvertToUsdUsingBestPrice(this.startState, estimatedProfit);
                if(estimatedProfitUsd === null){
                    throw new Error(`CirclePathAlgorithm: can't convert ${this.startState} to USD`);
                }

                return {
                    path: path,
                    instructions: stateInstructions,
                    pathLengthActions: path.length - 1, 
                    pathLengthStates: path.length, 
                    estimatedProfit: estimatedProfit,
                    estimatedProfitUsd: estimatedProfitUsd,
                    usedPassAmount: usedPassAmount,
                    stateTotalsInUsd: stateTotalsInUsd,
                    minStateTotalInUsd: minStateTotalInUsd,
                };
            });
        });
        return result;
    }

    saveToFile(){
        console.log(`CirclePathAlgorithm: save results to a file`);
        let date = moment.utc().format('YYYYMMDDHHmmss');
        // const fileName1 = path.join(__dirname, '../logs/circlePathAlgorithm/', `${this.startState}-${date}-pathFindResult.log`);
        // const fileName2 = path.join(__dirname, '../logs/circlePathAlgorithm/', `${this.startState}-${date}-pathCount.log`);
        const fileName3 = path.join(__dirname, '../logs/circlePathAlgorithm/', `${this.startState}-${date}-solutions.log`);
        // fs.writeFileSync(fileName1, JSON.stringify(this.pathFindResult));
        // fs.writeFileSync(fileName2, JSON.stringify(this.pathFindCount));
        fs.writeFileSync(fileName3, JSON.stringify(this.solutions));
    }
}