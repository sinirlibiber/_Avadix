// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  AvadixPredictionMarket v3.1
 * @notice Binary prediction markets — CPMM AMM, sell, slippage protection
 */

interface AggregatorV3Interface {
    function latestRoundData() external view
        returns (uint80, int256, uint256, uint256, uint80);
    function decimals() external view returns (uint8);
}

contract AvadixPredictionMarket {

    uint256 public constant MIN_DURATION        = 1 days;
    uint256 public constant MAX_DURATION        = 90 days;
    uint256 public constant MIN_BET             = 0.001 ether;
    uint256 public constant MAX_FEE_BPS         = 500;
    uint256 public constant MAX_IMAGE_BYTES     = 50_000;
    uint256 public constant MAX_QUESTION_LEN    = 300;
    uint256 public constant MAX_CATEGORY_LEN    = 50;
    uint256 public constant STALE_PRICE_SECONDS = 3600;
    uint256 public constant ORACLE_GRACE_PERIOD = 7200;
    uint256 public constant MARKET_CREATION_FEE = 0.01 ether;
    uint256 public constant VIRTUAL_LIQUIDITY   = 0.1 ether;

    enum Outcome    { NONE, YES, NO }
    enum MarketType { MANUAL, ORACLE }

    struct MarketCore {
        address creator;
        string  question;
        string  category;
        string  imageURI;
        uint256 endTime;
        uint256 yesPool;
        uint256 noPool;
        uint256 totalYesShares;
        uint256 totalNoShares;
    }

    struct MarketMeta {
        Outcome    outcome;
        MarketType marketType;
        bool       resolved;
        bool       exists;
        uint8      tokenPair;
        int256     targetPrice;
        bool       targetAbove;
    }

    struct Position {
        uint256 yesShares;
        uint256 noShares;
        bool    claimed;
    }

    struct CreateMarketParams {
        string  question;
        string  category;
        string  imageURI;
        uint256 duration;
        uint8   marketType;
        uint8   tokenPair;
        int256  targetPrice;
        bool    targetAbove;
    }

    address public owner;
    address public pendingOwner;
    uint256 public marketCount;
    uint256 public protocolFeeBps;
    uint256 public accumulatedFees;
    uint256 private _locked;

    mapping(uint256 => MarketCore)                   public marketCore;
    mapping(uint256 => MarketMeta)                   public marketMeta;
    mapping(uint256 => mapping(address => Position)) public positions;
    mapping(uint8   => address)                      public priceFeeds;

    event MarketCreated(uint256 indexed marketId, address indexed creator,
        string question, string category, string imageURI, uint256 endTime, uint8 marketType);
    event TradePlaced(uint256 indexed marketId, address indexed trader,
        bool isYes, uint256 amount, uint256 shares);
    event SharesSold(uint256 indexed marketId, address indexed trader,
        bool isYes, uint256 shares, uint256 amountOut);
    event MarketResolved(uint256 indexed marketId, Outcome outcome, bool byOracle);
    event RewardClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event FeesWithdrawn(address indexed to, uint256 amount);
    event OwnershipTransferInitiated(address indexed prev, address indexed pending);
    event OwnershipTransferAccepted(address indexed prev, address indexed next);

    modifier onlyOwner()    { require(msg.sender == owner, "NO"); _; }
    modifier nonReentrant() { require(_locked == 0, "RE"); _locked = 1; _; _locked = 0; }
    modifier mExists(uint256 id) { require(marketMeta[id].exists, "NF"); _; }
    modifier notResolved(uint256 id) { require(!marketMeta[id].resolved, "AR"); _; }

    constructor(uint256 _feeBps) {
        require(_feeBps <= MAX_FEE_BPS, "FH");
        owner = msg.sender;
        protocolFeeBps = _feeBps;
        priceFeeds[0] = 0x5498BB86BC934c8D34FDA08E81D444153d0D06aD;
        priceFeeds[1] = 0x31CF013A08c6Ac228C94551d535d5BAfE19c602a;
        priceFeeds[2] = 0x86d67c3D38D2bCeE722E601025C25a575021c6EA;
        priceFeeds[3] = 0x34C4C526902d88A3aA98dB46A1ab0d40551e2f58;
    }

    // ── CPMM ──────────────────────────────────────────────────────────────────

    function _sharesOut(uint256 pIn, uint256 pOut, uint256 amt)
        internal pure returns (uint256)
    {
        uint256 k = pIn * pOut;
        uint256 newIn = pIn + amt;
        uint256 newOut = k / newIn;
        require(pOut > newOut, "ZO");
        return pOut - newOut;
    }

    function _amountOut(uint256 pIn, uint256 pOut, uint256 shares)
        internal pure returns (uint256)
    {
        require(shares < pOut, "IL");
        uint256 k = pIn * pOut;
        uint256 newOut = pOut - shares;
        uint256 newIn = k / newOut;
        require(newIn > pIn, "ZA");
        return newIn - pIn;
    }

    // ── PREVIEW ───────────────────────────────────────────────────────────────

    function getSharesOut(uint256 id, bool isYes, uint256 amount)
        external view mExists(id)
        returns (uint256 sharesOut, uint256 effectivePrice, uint256 priceImpact)
    {
        MarketCore storage c = marketCore[id];
        uint256 fee = (amount * protocolFeeBps) / 10_000;
        uint256 net = amount - fee;
        uint256 yV  = c.yesPool + VIRTUAL_LIQUIDITY;
        uint256 nV  = c.noPool  + VIRTUAL_LIQUIDITY;
        uint256 spot;
        
        if (isYes) {
            spot = (yV * 1e18) / (yV + nV);
            sharesOut = _sharesOut(yV, nV, net);
        } else {
            spot = (nV * 1e18) / (yV + nV);
            sharesOut = _sharesOut(nV, yV, net);
        }
        
        if (sharesOut == 0) return (0, 0, 0);
        
        effectivePrice = (net * 1e18) / sharesOut;
        if (effectivePrice > spot) {
            priceImpact = ((effectivePrice - spot) * 1e18) / spot;
        } else {
            priceImpact = 0;
        }
    }

    function getAmountOut(uint256 id, bool isYes, uint256 sharesIn)
        external view mExists(id)
        returns (uint256 amountOut, uint256 effectivePrice, uint256 priceImpact)
    {
        MarketCore storage c = marketCore[id];
        uint256 yV   = c.yesPool + VIRTUAL_LIQUIDITY;
        uint256 nV   = c.noPool  + VIRTUAL_LIQUIDITY;
        uint256 spot;
        uint256 gross;
        
        if (isYes) {
            spot = (yV * 1e18) / (yV + nV);
            gross = _amountOut(yV, nV, sharesIn);
        } else {
            spot = (nV * 1e18) / (yV + nV);
            gross = _amountOut(nV, yV, sharesIn);
        }
        
        uint256 fee = (gross * protocolFeeBps) / 10_000;
        amountOut = gross - fee;
        
        if (amountOut == 0) return (0, 0, 0);
        
        effectivePrice = (amountOut * 1e18) / sharesIn;
        if (spot > effectivePrice) {
            priceImpact = ((spot - effectivePrice) * 1e18) / spot;
        } else {
            priceImpact = 0;
        }
    }

    // ── MARKET OLUŞTURMA ──────────────────────────────────────────────────────

    function createMarket(CreateMarketParams calldata p)
        external payable returns (uint256)
    {
        require(msg.value >= MARKET_CREATION_FEE, "CF");
        require(bytes(p.question).length > 0, "EQ");
        require(bytes(p.question).length <= MAX_QUESTION_LEN, "QL");
        require(bytes(p.category).length > 0, "EC");
        require(bytes(p.category).length <= MAX_CATEGORY_LEN, "CL");
        require(bytes(p.imageURI).length <= MAX_IMAGE_BYTES, "IL");
        require(p.duration >= MIN_DURATION, "TS");
        require(p.duration <= MAX_DURATION, "TL");
        require(p.marketType <= 1, "IM");
        require(p.tokenPair <= 3, "IP");
        if (p.marketType == 1) require(p.targetPrice > 0, "IT");

        accumulatedFees += msg.value;
        uint256 mid = ++marketCount;
        uint256 end = block.timestamp + p.duration;

        MarketCore storage c = marketCore[mid];
        c.creator = msg.sender;
        c.question = p.question;
        c.category = p.category;
        c.imageURI = p.imageURI;
        c.endTime = end;

        MarketMeta storage me = marketMeta[mid];
        me.exists = true;
        me.marketType = MarketType(p.marketType);
        me.tokenPair = p.tokenPair;
        me.targetPrice = p.targetPrice;
        me.targetAbove = p.targetAbove;

        emit MarketCreated(mid, msg.sender, p.question, p.category, p.imageURI, end, p.marketType);
        return mid;
    }

    // ── ALIM ──────────────────────────────────────────────────────────────────

    function buyYes(uint256 id, uint256 minShares)
        external payable nonReentrant mExists(id) notResolved(id)
    { _buy(id, true, minShares); }

    function buyNo(uint256 id, uint256 minShares)
        external payable nonReentrant mExists(id) notResolved(id)
    { _buy(id, false, minShares); }

    function _buy(uint256 id, bool isYes, uint256 minShares) internal {
        MarketCore storage c = marketCore[id];
        require(block.timestamp < c.endTime, "ME");
        require(msg.value >= MIN_BET, "BM");

        uint256 fee = (msg.value * protocolFeeBps) / 10_000;
        uint256 net = msg.value - fee;
        accumulatedFees += fee;

        uint256 yV = c.yesPool + VIRTUAL_LIQUIDITY;
        uint256 nV = c.noPool  + VIRTUAL_LIQUIDITY;
        uint256 shares;

        if (isYes) {
            shares = _sharesOut(yV, nV, net);
            c.yesPool += net;
            c.totalYesShares += shares;
            positions[id][msg.sender].yesShares += shares;
        } else {
            shares = _sharesOut(nV, yV, net);
            c.noPool += net;
            c.totalNoShares += shares;
            positions[id][msg.sender].noShares += shares;
        }

        require(shares >= minShares, "SLIP");
        require(shares > 0, "ZS");
        emit TradePlaced(id, msg.sender, isYes, msg.value, shares);
    }

    // ── SATIŞ ─────────────────────────────────────────────────────────────────

    function sellShares(uint256 id, bool isYes, uint256 sharesIn, uint256 minOut)
        external nonReentrant mExists(id) notResolved(id)
    {
        MarketCore storage c = marketCore[id];
        require(block.timestamp < c.endTime, "ME");
        require(sharesIn > 0, "ZS");

        Position storage p = positions[id][msg.sender];

        uint256 yV = c.yesPool + VIRTUAL_LIQUIDITY;
        uint256 nV = c.noPool  + VIRTUAL_LIQUIDITY;
        uint256 gross;

        if (isYes) {
            require(p.yesShares >= sharesIn, "IS");
            gross = _amountOut(yV, nV, sharesIn);
            require(c.yesPool >= gross, "LP");
            c.yesPool -= gross;
            c.totalYesShares -= sharesIn;
            p.yesShares -= sharesIn;
        } else {
            require(p.noShares >= sharesIn, "IS");
            gross = _amountOut(nV, yV, sharesIn);
            require(c.noPool >= gross, "LP");
            c.noPool -= gross;
            c.totalNoShares -= sharesIn;
            p.noShares -= sharesIn;
        }

        uint256 fee = (gross * protocolFeeBps) / 10_000;
        uint256 out = gross - fee;
        accumulatedFees += fee;

        require(out >= minOut, "SLIP");
        require(out > 0, "ZO");
        
        (bool ok,) = payable(msg.sender).call{value: out}("");
        require(ok, "TF");
        emit SharesSold(id, msg.sender, isYes, sharesIn, out);
    }

    // ── ÇÖZÜMLEME ─────────────────────────────────────────────────────────────

    function resolveMarket(uint256 id, uint8 outcome)
        external onlyOwner nonReentrant mExists(id) notResolved(id)
    {
        require(block.timestamp >= marketCore[id].endTime, "NE");
        require(outcome == 1 || outcome == 2, "IO");
        marketMeta[id].outcome  = Outcome(outcome);
        marketMeta[id].resolved = true;
        emit MarketResolved(id, Outcome(outcome), false);
    }

    function resolveWithOracle(uint256 id)
        external onlyOwner nonReentrant mExists(id) notResolved(id)
    {
        MarketCore storage c  = marketCore[id];
        MarketMeta storage me = marketMeta[id];

        require(me.marketType == MarketType.ORACLE, "NOM");
        require(block.timestamp >= c.endTime, "NE");
        require(block.timestamp <= c.endTime + ORACLE_GRACE_PERIOD, "GP");

        address feed = priceFeeds[me.tokenPair];
        require(feed != address(0), "NF");

        (uint80 rid, int256 ans, , uint256 upd, uint80 air)
            = AggregatorV3Interface(feed).latestRoundData();

        require(upd > 0, "RU");
        require(block.timestamp - upd <= STALE_PRICE_SECONDS, "SP");
        require(air >= rid, "BR");
        require(ans > 0, "IP");

        Outcome oc;
        if (me.targetAbove) {
            oc = ans >= me.targetPrice ? Outcome.YES : Outcome.NO;
        } else {
            oc = ans <= me.targetPrice ? Outcome.YES : Outcome.NO;
        }
        
        me.outcome = oc;
        me.resolved = true;
        emit MarketResolved(id, oc, true);
    }

    // ── ÖDÜL ──────────────────────────────────────────────────────────────────

    function claimReward(uint256 id) external nonReentrant mExists(id) {
        MarketCore storage c  = marketCore[id];
        MarketMeta storage me = marketMeta[id];
        Position   storage p  = positions[id][msg.sender];

        require(me.resolved,  "NR");
        require(!p.claimed,   "AC");

        uint256 userShares;
        uint256 totalShares;

        if (me.outcome == Outcome.YES) {
            require(p.yesShares > 0, "LY");
            userShares  = p.yesShares;
            totalShares = c.totalYesShares;
        } else if (me.outcome == Outcome.NO) {
            require(p.noShares > 0, "LN");
            userShares  = p.noShares;
            totalShares = c.totalNoShares;
        } else {
            revert("UO");
        }

        require(totalShares > 0, "ZT");
        uint256 totalPool = c.yesPool + c.noPool;
        require(totalPool > 0, "ZP");

        p.claimed = true;

        // Overflow-safe hesaplama
        uint256 reward = (userShares * totalPool) / totalShares;

        require(reward > 0, "ZR");
        require(reward <= address(this).balance, "IB");

        (bool ok,) = payable(msg.sender).call{value: reward}("");
        require(ok, "TF");
        emit RewardClaimed(id, msg.sender, reward);
    }

    // ── READ ──────────────────────────────────────────────────────────────────

    function getMarketCore(uint256 id) external view returns (MarketCore memory) {
        return marketCore[id];
    }

    function getMarketMeta(uint256 id) external view returns (MarketMeta memory) {
        return marketMeta[id];
    }

    function getPosition(uint256 id, address user)
        external view returns (Position memory)
    { return positions[id][user]; }

    function getYesProbability(uint256 id)
        external view mExists(id) returns (uint256)
    {
        MarketCore storage c = marketCore[id];
        uint256 y = c.yesPool + VIRTUAL_LIQUIDITY;
        uint256 n = c.noPool  + VIRTUAL_LIQUIDITY;
        return (y * 100) / (y + n);
    }

    function getCurrentPrice(uint8 pair)
        external view returns (int256 price, uint8 dec)
    {
        address f = priceFeeds[pair];
        require(f != address(0), "NF");
        (, price,,,) = AggregatorV3Interface(f).latestRoundData();
        dec = AggregatorV3Interface(f).decimals();
    }

    // ── ADMIN ─────────────────────────────────────────────────────────────────

    function setProtocolFee(uint256 bps) external onlyOwner {
        require(bps <= MAX_FEE_BPS, "FH");
        protocolFeeBps = bps;
    }

    function setPriceFeed(uint8 pair, address feed) external onlyOwner {
        require(feed != address(0), "ZA");
        priceFeeds[pair] = feed;
    }

    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amt = accumulatedFees;
        require(amt > 0, "NW");
        accumulatedFees = 0;
        (bool ok,) = payable(owner).call{value: amt}("");
        require(ok, "TF");
        emit FeesWithdrawn(owner, amt);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZA");
        pendingOwner = newOwner;
        emit OwnershipTransferInitiated(owner, newOwner);
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "NP");
        emit OwnershipTransferAccepted(owner, pendingOwner);
        owner = pendingOwner;
        pendingOwner = address(0);
    }

    receive()  external payable { revert("NATIVE"); }
    fallback() external payable { revert("NATIVE"); }
}
