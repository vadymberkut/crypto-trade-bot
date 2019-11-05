# Crypto trading bot v2

### Configuration

/config/.env


```
NODE_ENV=development

# Bitfinex
BITFINEX_API_KEY=
BITFINEX_API_SECRET=

# Bitmex
BITMEX_API_KEY_ID=
BITMEX_API_KEY_SECRET=

#Telegram (token to send messages using bot)
TELEGRAM_HTTP_API_TOKEN=455874865:AAEZC8f0kuXTmmmn_dS-9POITX9n_IVwpGo
```


### Exchanges details
    (maker/taker)
    1. Binance 0.1/0.1 LONG
    2. Bitmex -0.0250/0.0750 LONG/SHORT
    3. HitBTC 0 - 0.01/0.1 LONG
    4. 1Broker - 0/0 but floating spread LONG/SHORT
    

### Strategies list
    1. (FAILED) Circle path
        Go throught n markets to get back to original state (currency e.g. USDT) 
        and get profit on order book disbalance.
        
        Pros:
            - Hight return in theory
        Cons:
            - Fee
            - Market always changes
        
        Failed because of exchange fees weren't taken into account when designing 
        algorithm. In v2 was introduced approach with using LINIT orders, but it 
        failed due to low market liquidity and slow order execution, so initial 
        profit conditions have changed already.
        
    2. (PENDING) Volatility range
        Find range with flat volatility and buy on bottom/sell on top of it. 
        Same approach was used by me on WhaleCLub when hight volatility was detected, 
        so profit is made playing in range.
        
        Pros:
            - Checked personally with manual trading
            - Leads to medium risk/reward ratio
        Cons:
            - Tricky to determine a range
            - Range can be broken anytime
        
    3. (PENDING) Indicators setup\
        Hire a few indicators and make decisions based on them. Here we have 
        some set of rules when satisfied allows us to open order in desired direction. 
        The main trick is to pick up set of indicators and calibrate theirs numereous 
        parameters. Every time set of indicators is changed a new strategie is created 
        in fact. So here we need something like 'Constructor' for that indicators. We 
        should have availability to add new module with logic for that set and just 
        plug in it easily.
        
        Pros:
            - Theoretically we can achive > 50% likelihood of profit trades
        Cons:
            - This approach is tight related to indicators setup. It can take 
            a long time until we found that 'correct' setup.
            - Setup can be broken anytime without any reasons