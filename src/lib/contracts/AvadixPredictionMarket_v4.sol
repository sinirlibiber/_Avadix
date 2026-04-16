// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  AvadixPredictionMarket v4.0
 * @notice Binary + Multi-option prediction markets — CPMM AMM, sell, slippage protection
 * @dev    Changes from v3.1:
 *         - VIRTUAL_LIQUIDITY 0.1 → 5 AVAX  (price impact fix)
 *         - createMarket restricted to owner only
 *         - Multi-option market support (up to 8 outcomes)
 *         - 12 Chainlink oracle price feeds (Avalanche Mainnet)
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
    uint256 public constant VIRTUAL_LIQUIDITY   = 5 ether;   // ← v4: 0.1 → 5
    uint8   public constant MAX_OPTIONS         = 8;

    enum Outcome    { NONE, YES, NO }
    enum MarketType { MANUAL, ORACLE }

    // ── Binary market structs (geriye dönük uyumluluk) ───────────────────────
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

    // ── Multi-option structs ─────────────────────────────────────────────────
    struct MultiMarket {
        address   creator;
        string    question;
        string    category;
        string    imageURI;
        uint256   endTime;
        bool      resolved;
        bool      exists;
        uint8     winnerIndex;   // 0 = not resolved yet
        uint8     optionCount;
        string[]  options;       // option labels (e.g. ["Team A","Team B","Draw"])
        uint256[] pools;         // pool[i] = AVAX in option i
        uint256[] totalShares;   // totalShares[i]
    }

    struct MultiPosition {
        uint256[] shares;   // shares[i] per option
        bool      claimed;
    }

    // ── Create params ────────────────────────────────────────────────────────
    struct CreateMarketParams {
        string  question;
        string  category;
        string  imageURI;
        uint256 duration;
        uint8   marketType;   // 0=MANUAL 1=ORACLE
        uint8   tokenPair;
        int256  targetPrice;
        bool    targetAbove;
    }

    struct CreateMultiParams {
        string   question;
        string   category;
        string   imageURI;
        uint256  duration;
        string[] options;    // 3-8 options
    }

    // ── State ────────────────────────────────────────────────────────────────
    address public owner;
    address public pendingOwner;
    uint256 public marketCount;
    uint256 public multiMarketCount;
    uint256 public protocolFeeBps;
    uint256 public accumulatedFees;
    uint256 private _locked;

    mapping(uint256 => MarketCore)                   public marketCore;
    mapping(uint256 => MarketMeta)                   public marketMeta;
    mapping(uint256 => mapping(address => Position)) public positions;

    mapping(uint256 => MultiMarket)                            public multiMarkets;
    mapping(uint256 => mapping(address => MultiPosition))      private _multiPositions;

    // 12 price feeds — index → Chainlink feed address (Avalanche Mainnet)
    mapping(uint8 => address) public priceFeeds;

    // ── Events ────────────────────────────────────────────────────────────────
    event MarketCreated(uint256 indexed marketId, address indexed creator,
        string question, string category, string imageURI, uint256 endTime, uint8 marketType);
    event MultiMarketCreated(uint256 indexed multiId, address indexed creator,
        string question, string category, uint256 endTime, uint8 optionCount);
    event TradePlaced(uint256 indexed marketId, address indexed trader,
        bool isYes, uint256 amount, uint256 shares);
    event MultiTradePlaced(uint256 indexed multiId, address indexed trader,
        uint8 optionIndex, uint256 amount, uint256 shares);
    event SharesSold(uint256 indexed marketId, address indexed trader,
        bool isYes, uint256 shares, uint256 amountOut);
    event MultiSharesSold(uint256 indexed multiId, address indexed trader,
        uint8 optionIndex, uint256 shares, uint256 amountOut);
    event MarketResolved(uint256 indexed marketId, Outcome outcome, bool byOracle);
    event MultiMarketResolved(uint256 indexed multiId, uint8 winnerIndex);
    event RewardClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event MultiRewardClaimed(uint256 indexed multiId, address indexed user, uint256 amount);
    event FeesWithdrawn(address indexed to, uint256 amount);
    event OwnershipTransferInitiated(address indexed prev, address indexed pending);
    event OwnershipTransferAccepted(address indexed prev, address indexed next);

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyOwner()    { require(msg.sender == owner, "NO"); _; }
    modifier nonReentrant() { require(_locked == 0, "RE"); _locked = 1; _; _locked = 0; }
    modifier mExists(uint256 id)      { require(marketMeta[id].exists, "NF"); _; }
    modifier notResolved(uint256 id)  { require(!marketMeta[id].resolved, "AR"); _; }
    modifier mMultiExists(uint256 id) { require(multiMarkets[id].exists, "NF"); _; }
    modifier notMultiResolved(uint256 id) { require(!multiMarkets[id].resolved, "AR"); _; }

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(uint256 _feeBps) {
        require(_feeBps <= MAX_FEE_BPS, "FH");
        owner = msg.sender;
        protocolFeeBps = _feeBps;

        // ── Avalanche Mainnet Chainlink Feeds (12 pairs) ──────────────────────
        // Kaynak: https://build.avax.network/integrations/chainlink-data-feeds
        // Tüm adresler Avalanche C-Chain mainnet'te aktif olan resmi feed'lerdir.
        // NOT: LINK, SOL, BNB, MATIC, DOT, ATOM, UNI feed'leri Avalanche mainnet'te
        // Chainlink tarafından desteklenmediğinden yerlerine aktif feed'ler atandı.
        // İleride setPriceFeed() ile güncellenebilir.

        // 0: AVAX/USD
        priceFeeds[0]  = 0x0A77230d17318075983913bC2145DB16C7366156;
        // 1: BTC/USD
        priceFeeds[1]  = 0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743;
        // 2: ETH/USD
        priceFeeds[2]  = 0x976B3D034E162d8bD72D6b9C989d545b839003b0;
        // 3: AAVE/USD  (LINK Avax mainnet'te yok → AAVE kullanıldı)
        priceFeeds[3]  = 0x3CA13391E9fb38a75330fb28f8cc2eB3D9ceceED;
        // 4: ADA/USD   (SOL Avax mainnet'te yok → ADA kullanıldı)
        priceFeeds[4]  = 0x69C2703b8F1A85a2EF6aBDd085699a9F909BE053;
        // 5: USDT/USD  (BNB Avax mainnet'te yok → USDT kullanıldı)
        priceFeeds[5]  = 0xeBe676Ee90fE1112671F19B6b7459BC678b4E8f7;
        // 6: USDC/USD  (MATIC Avax mainnet'te yok → USDC kullanıldı)
        priceFeeds[6]  = 0xF096872672F44d6EBA71458D74fe67F9a77a23B9;
        // 7: ALPHA/USD (DOT Avax mainnet'te yok → ALPHA kullanıldı)
        priceFeeds[7]  = 0x7B0ca9A6D03FE0467A31Ca850f5bcA51e027B3aF;
        // 8: AXS/USD   (ATOM Avax mainnet'te yok → AXS kullanıldı)
        priceFeeds[8]  = 0x155835C5755205597d62703a5A0b37e57a26Ee5C;
        // 9: BAT/USD   (UNI Avax mainnet'te yok → BAT kullanıldı)
        priceFeeds[9]  = 0xe89B3CE86D25599D1e615C0f6a353B4572FF868D;
        // 10: BEAM/USD
        priceFeeds[10] = 0x3427232b88Ce4e7d62A03289247eE0cA5324f6ba;
        // 11: AAVE/USD (tekrar — index 3 ile aynı, dilersen setPriceFeed ile değiştir)
        priceFeeds[11] = 0x3CA13391E9fb38a75330fb28f8cc2eB3D9ceceED;
    }

    // ── CPMM ─────────────────────────────────────────────────────────────────

    function _sharesOut(uint256 pIn, uint256 pOut, uint256 amt)
        internal pure returns (uint256)
    {
        uint256 newOut = (pIn * pOut) / (pIn + amt);
        require(pOut > newOut, "ZO");
        return pOut - newOut;
    }

    function _amountOut(uint256 pIn, uint256 pOut, uint256 shares)
        internal pure returns (uint256)
    {
        require(shares < pOut, "IL");
        uint256 newIn = (pIn * pOut) / (pOut - shares);
        require(newIn > pIn, "ZA");
        return newIn - pIn;
    }

    // ── PREVIEW (binary) ──────────────────────────────────────────────────────

    function getSharesOut(uint256 id, bool isYes, uint256 amount)
        external view mExists(id)
        returns (uint256 sharesOut, uint256 effectivePrice, uint256 priceImpact)
    {
        MarketCore storage c = marketCore[id];
        uint256 net = amount - (amount * protocolFeeBps) / 10_000;
        uint256 yV  = c.yesPool + VIRTUAL_LIQUIDITY;
        uint256 nV  = c.noPool  + VIRTUAL_LIQUIDITY;
        uint256 spot = isYes
            ? (yV * 1e18) / (yV + nV)
            : (nV * 1e18) / (yV + nV);
        sharesOut = isYes ? _sharesOut(yV, nV, net) : _sharesOut(nV, yV, net);
        if (sharesOut == 0) return (0, 0, 0);
        effectivePrice = (net * 1e18) / sharesOut;
        priceImpact = effectivePrice > spot
            ? ((effectivePrice - spot) * 1e18) / spot : 0;
    }

    function getAmountOut(uint256 id, bool isYes, uint256 sharesIn)
        external view mExists(id)
        returns (uint256 amountOut, uint256 effectivePrice, uint256 priceImpact)
    {
        MarketCore storage c = marketCore[id];
        uint256 yV   = c.yesPool + VIRTUAL_LIQUIDITY;
        uint256 nV   = c.noPool  + VIRTUAL_LIQUIDITY;
        uint256 spot = isYes
            ? (yV * 1e18) / (yV + nV)
            : (nV * 1e18) / (yV + nV);
        uint256 gross = isYes ? _amountOut(yV, nV, sharesIn) : _amountOut(nV, yV, sharesIn);
        amountOut = gross - (gross * protocolFeeBps) / 10_000;
        if (amountOut == 0) return (0, 0, 0);
        effectivePrice = (amountOut * 1e18) / sharesIn;
        priceImpact = spot > effectivePrice
            ? ((spot - effectivePrice) * 1e18) / spot : 0;
    }

    // ── BINARY MARKET OLUŞTURMA (sadece owner) ────────────────────────────────

    function createMarket(CreateMarketParams calldata p)
        external payable onlyOwner returns (uint256)
    {
        require(msg.value >= MARKET_CREATION_FEE);
        require(bytes(p.question).length > 0 && bytes(p.question).length <= MAX_QUESTION_LEN);
        require(bytes(p.category).length > 0 && bytes(p.category).length <= MAX_CATEGORY_LEN);
        require(bytes(p.imageURI).length <= MAX_IMAGE_BYTES);
        require(p.duration >= MIN_DURATION && p.duration <= MAX_DURATION);
        require(p.marketType <= 1 && p.tokenPair <= 11);
        if (p.marketType == 1) require(p.targetPrice > 0);

        accumulatedFees += msg.value;
        uint256 mid = ++marketCount;
        uint256 end = block.timestamp + p.duration;

        MarketCore storage c = marketCore[mid];
        c.creator = msg.sender; c.question = p.question;
        c.category = p.category; c.imageURI = p.imageURI; c.endTime = end;

        MarketMeta storage me = marketMeta[mid];
        me.exists = true; me.marketType = MarketType(p.marketType);
        me.tokenPair = p.tokenPair; me.targetPrice = p.targetPrice;
        me.targetAbove = p.targetAbove;

        emit MarketCreated(mid, msg.sender, p.question, p.category, p.imageURI, end, p.marketType);
        return mid;
    }

    // ── MULTI-OPTION MARKET OLUŞTURMA (sadece owner) ──────────────────────────

    function createMultiMarket(CreateMultiParams calldata p)
        external payable onlyOwner returns (uint256)
    {
        require(msg.value >= MARKET_CREATION_FEE);
        require(bytes(p.question).length > 0 && bytes(p.question).length <= MAX_QUESTION_LEN);
        require(bytes(p.category).length > 0 && bytes(p.category).length <= MAX_CATEGORY_LEN);
        require(bytes(p.imageURI).length <= MAX_IMAGE_BYTES);
        require(p.duration >= MIN_DURATION && p.duration <= MAX_DURATION);
        require(p.options.length >= 3 && p.options.length <= MAX_OPTIONS, "OC");

        accumulatedFees += msg.value;
        uint256 mid = ++multiMarketCount;
        uint256 end = block.timestamp + p.duration;

        MultiMarket storage m = multiMarkets[mid];
        m.creator     = msg.sender;
        m.question    = p.question;
        m.category    = p.category;
        m.imageURI    = p.imageURI;
        m.endTime     = end;
        m.exists      = true;
        m.optionCount = uint8(p.options.length);

        for (uint8 i = 0; i < p.options.length; i++) {
            m.options.push(p.options[i]);
            m.pools.push(0);
            m.totalShares.push(0);
        }

        emit MultiMarketCreated(mid, msg.sender, p.question, p.category, end, uint8(p.options.length));
        return mid;
    }

    // ── BINARY ALIM ───────────────────────────────────────────────────────────

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
            c.yesPool += net; c.totalYesShares += shares;
            positions[id][msg.sender].yesShares += shares;
        } else {
            shares = _sharesOut(nV, yV, net);
            c.noPool += net; c.totalNoShares += shares;
            positions[id][msg.sender].noShares += shares;
        }

        require(shares >= minShares, "SLIP");
        emit TradePlaced(id, msg.sender, isYes, msg.value, shares);
    }

    // ── MULTI-OPTION ALIM ─────────────────────────────────────────────────────

    function buyMultiOption(uint256 id, uint8 optionIndex, uint256 minShares)
        external payable nonReentrant mMultiExists(id) notMultiResolved(id)
    {
        MultiMarket storage m = multiMarkets[id];
        require(block.timestamp < m.endTime, "ME");
        require(msg.value >= MIN_BET, "BM");
        require(optionIndex < m.optionCount, "OI");

        uint256 fee = (msg.value * protocolFeeBps) / 10_000;
        uint256 net = msg.value - fee;
        accumulatedFees += fee;

        // CPMM: pool "in" = seçilen opsiyon, pool "out" = diğerlerinin toplamı
        uint256 pIn  = m.pools[optionIndex] + VIRTUAL_LIQUIDITY;
        uint256 pOut = VIRTUAL_LIQUIDITY; // diğer opsiyonlar için sanal havuz toplamı
        for (uint8 i = 0; i < m.optionCount; i++) {
            if (i != optionIndex) pOut += m.pools[i] + VIRTUAL_LIQUIDITY;
        }

        uint256 shares = _sharesOut(pIn, pOut, net);
        require(shares >= minShares, "SLIP");

        m.pools[optionIndex] += net;
        m.totalShares[optionIndex] += shares;

        MultiPosition storage pos = _multiPositions[id][msg.sender];
        // Initialize shares array if needed
        if (pos.shares.length == 0) {
            for (uint8 i = 0; i < m.optionCount; i++) pos.shares.push(0);
        }
        pos.shares[optionIndex] += shares;

        emit MultiTradePlaced(id, msg.sender, optionIndex, msg.value, shares);
    }

    // ── BINARY SATIŞ ─────────────────────────────────────────────────────────

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
            c.yesPool -= gross; c.totalYesShares -= sharesIn;
            p.yesShares -= sharesIn;
        } else {
            require(p.noShares >= sharesIn, "IS");
            gross = _amountOut(nV, yV, sharesIn);
            require(c.noPool >= gross, "LP");
            c.noPool -= gross; c.totalNoShares -= sharesIn;
            p.noShares -= sharesIn;
        }

        uint256 fee = (gross * protocolFeeBps) / 10_000;
        uint256 out = gross - fee;
        accumulatedFees += fee;

        require(out >= minOut, "SLIP");
        (bool ok,) = payable(msg.sender).call{value: out}("");
        require(ok, "TF");
        emit SharesSold(id, msg.sender, isYes, sharesIn, out);
    }

    // ── MULTI-OPTION SATIŞ ────────────────────────────────────────────────────

    function sellMultiShares(uint256 id, uint8 optionIndex, uint256 sharesIn, uint256 minOut)
        external nonReentrant mMultiExists(id) notMultiResolved(id)
    {
        MultiMarket storage m = multiMarkets[id];
        require(block.timestamp < m.endTime, "ME");
        require(sharesIn > 0, "ZS");
        require(optionIndex < m.optionCount, "OI");

        MultiPosition storage pos = _multiPositions[id][msg.sender];
        require(pos.shares.length > optionIndex && pos.shares[optionIndex] >= sharesIn, "IS");

        uint256 pIn  = m.pools[optionIndex] + VIRTUAL_LIQUIDITY;
        uint256 pOut = VIRTUAL_LIQUIDITY;
        for (uint8 i = 0; i < m.optionCount; i++) {
            if (i != optionIndex) pOut += m.pools[i] + VIRTUAL_LIQUIDITY;
        }

        uint256 gross = _amountOut(pIn, pOut, sharesIn);
        require(m.pools[optionIndex] >= gross, "LP");

        m.pools[optionIndex]      -= gross;
        m.totalShares[optionIndex] -= sharesIn;
        pos.shares[optionIndex]    -= sharesIn;

        uint256 fee = (gross * protocolFeeBps) / 10_000;
        uint256 out = gross - fee;
        accumulatedFees += fee;

        require(out >= minOut, "SLIP");
        (bool ok,) = payable(msg.sender).call{value: out}("");
        require(ok, "TF");
        emit MultiSharesSold(id, msg.sender, optionIndex, sharesIn, out);
    }

    // ── BINARY ÇÖZÜMLEME ─────────────────────────────────────────────────────

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

        require(upd > 0 && block.timestamp - upd <= STALE_PRICE_SECONDS, "SP");
        require(air >= rid && ans > 0, "BP");

        Outcome oc = (me.targetAbove ? ans >= me.targetPrice : ans <= me.targetPrice)
            ? Outcome.YES : Outcome.NO;
        me.outcome = oc; me.resolved = true;
        emit MarketResolved(id, oc, true);
    }

    // ── MULTI-OPTION ÇÖZÜMLEME ────────────────────────────────────────────────

    function resolveMultiMarket(uint256 id, uint8 winnerIndex)
        external onlyOwner nonReentrant mMultiExists(id) notMultiResolved(id)
    {
        MultiMarket storage m = multiMarkets[id];
        require(block.timestamp >= m.endTime, "NE");
        require(winnerIndex < m.optionCount, "OI");
        m.winnerIndex = winnerIndex + 1; // 1-indexed, 0 = unresolved
        m.resolved    = true;
        emit MultiMarketResolved(id, winnerIndex);
    }

    // ── BINARY ÖDÜL ───────────────────────────────────────────────────────────

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

        uint256 reward = (userShares / totalShares) * totalPool
            + (userShares % totalShares) * totalPool / totalShares;

        require(reward > 0, "ZR");
        require(reward <= address(this).balance, "IB");

        (bool ok,) = payable(msg.sender).call{value: reward}("");
        require(ok, "TF");
        emit RewardClaimed(id, msg.sender, reward);
    }

    // ── MULTI-OPTION ÖDÜL ────────────────────────────────────────────────────

    function claimMultiReward(uint256 id) external nonReentrant mMultiExists(id) {
        MultiMarket storage m   = multiMarkets[id];
        MultiPosition storage p = _multiPositions[id][msg.sender];

        require(m.resolved,   "NR");
        require(!p.claimed,   "AC");
        require(m.winnerIndex > 0, "UO");

        uint8 wi = m.winnerIndex - 1; // back to 0-indexed
        require(p.shares.length > wi && p.shares[wi] > 0, "LW");

        uint256 userShares  = p.shares[wi];
        uint256 totalShares = m.totalShares[wi];
        require(totalShares > 0, "ZT");

        uint256 totalPool;
        for (uint8 i = 0; i < m.optionCount; i++) totalPool += m.pools[i];
        require(totalPool > 0, "ZP");

        p.claimed = true;

        uint256 reward = (userShares / totalShares) * totalPool
            + (userShares % totalShares) * totalPool / totalShares;

        require(reward > 0, "ZR");
        require(reward <= address(this).balance, "IB");

        (bool ok,) = payable(msg.sender).call{value: reward}("");
        require(ok, "TF");
        emit MultiRewardClaimed(id, msg.sender, reward);
    }

    // ── READ ─────────────────────────────────────────────────────────────────

    function getMarketCore(uint256 id) external view returns (MarketCore memory) {
        return marketCore[id];
    }

    function getMarketMeta(uint256 id) external view returns (MarketMeta memory) {
        return marketMeta[id];
    }

    function getPosition(uint256 id, address user)
        external view returns (Position memory)
    { return positions[id][user]; }

    function getMultiMarket(uint256 id) external view returns (
        address creator, string memory question, string memory category,
        string memory imageURI, uint256 endTime, bool resolved, uint8 winnerIndex,
        uint8 optionCount, string[] memory options, uint256[] memory pools, uint256[] memory totShares
    ) {
        MultiMarket storage m = multiMarkets[id];
        return (m.creator, m.question, m.category, m.imageURI, m.endTime,
                m.resolved, m.winnerIndex, m.optionCount, m.options, m.pools, m.totalShares);
    }

    function getMultiPosition(uint256 id, address user)
        external view returns (uint256[] memory shares, bool claimed)
    {
        MultiPosition storage p = _multiPositions[id][user];
        return (p.shares, p.claimed);
    }

    function getYesProbability(uint256 id)
        external view mExists(id) returns (uint256)
    {
        MarketCore storage c = marketCore[id];
        uint256 y = c.yesPool + VIRTUAL_LIQUIDITY;
        uint256 n = c.noPool  + VIRTUAL_LIQUIDITY;
        return (y * 100) / (y + n);
    }

    function getMultiProbabilities(uint256 id)
        external view mMultiExists(id) returns (uint256[] memory probs)
    {
        MultiMarket storage m = multiMarkets[id];
        probs = new uint256[](m.optionCount);
        uint256 total = 0;
        for (uint8 i = 0; i < m.optionCount; i++) {
            total += m.pools[i] + VIRTUAL_LIQUIDITY;
        }
        for (uint8 i = 0; i < m.optionCount; i++) {
            probs[i] = ((m.pools[i] + VIRTUAL_LIQUIDITY) * 100) / total;
        }
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
        require(bps <= MAX_FEE_BPS); protocolFeeBps = bps;
    }

    function setPriceFeed(uint8 pair, address feed) external onlyOwner {
        require(feed != address(0)); priceFeeds[pair] = feed;
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
        require(newOwner != address(0));
        pendingOwner = newOwner;
        emit OwnershipTransferInitiated(owner, newOwner);
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "NP");
        emit OwnershipTransferAccepted(owner, pendingOwner);
        owner = pendingOwner;
        pendingOwner = address(0);
    }

    receive()  external payable { revert(); }
    fallback() external payable { revert(); }
}
