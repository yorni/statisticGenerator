require("dotenv").config();
let { param, deal, commonStatistics } = require("./structures");
const candleM = require("./models/candle");
const mongoose = require("mongoose");
const candle = require("./models/candle");
const { create } = require("./models/candle");
mongoose.connect(process.env["DATABASE_URL"], { useNewUrlParser: true });
const db = mongoose.connection;
db.on("error", (error) => console.log(error));
db.once("open", () => console.log("connection to db established"));
let order = undefined;
let asksLevelsHistory = {}; //{'1.01':{volume:1222, timeExists:1}}
let bidsLevelsHistory = {}; //{'1.01':{volume:1222, timeExists:1}}
let arrayOfAsksLevels = []; //[[1.01,10,0.1],[1.011,11,0.11]]
let arrayOfBidsLevels = []; //[[1.01,10,0.1],[1.011,11,0.11]]
let maxUnprofitLongCount = 0;
let maxUnprofitShortCount = 0;
let maxUnprofitCount = 0;
function initParameters() {
  var myArgs = process.argv.slice(2);
  if (myArgs[0]) {
    param.symbol = myArgs[0];
  }
  if (myArgs[1]) {
    param.startTime = Number(myArgs[1]);
  }
  if (myArgs[2]) {
    param.finishTime = Number(myArgs[2]);
  }
  if (myArgs[3]) {
    param.takeProfit = Number(myArgs[3]);
  }
  if (myArgs[4]) {
    param.stopLoss = Number(myArgs[4]);
  }
  if (myArgs[5]) {
    param.distanceToLevel = Number(myArgs[5]);
  }
  if (myArgs[6]) {
    param.deposit = Number(myArgs[6]);
  }
  if (myArgs[7]) {
    param.minLevelValue = Number(myArgs[7]);
  }
  if (myArgs[8]) {
    param.minSymbolAmount = Number(myArgs[8]);
  }
}

function initCommonStatistics() {
  commonStatistics.symbol = param.symbol;
  commonStatistics.takeProfit = param.takeProfit;
  commonStatistics.stopLoss = param.stopLoss;
  commonStatistics.distanceToLevel = param.distanceToLevel;
  commonStatistics.minLevelValue = param.minLevelValue;
  commonStatistics.maxDeposit = param.deposit;
  commonStatistics.minDeposit = param.deposit;
  commonStatistics.finalDeposit = param.deposit;
}
async function start() {
  initParameters();
  initCommonStatistics();
  for (let i = param.startTime; i < param.finishTime; i += 1000000) {
    await findAndPocessCandles(i, i + 1000000);
  }
  console.log(commonStatistics);
  db.close();
}

async function findAndPocessCandles(timeFrom, timeTo) {
  let candlesObject;
  conditions = {
    ticker: param.symbol,
    time: {
      $gt: timeFrom,
      $lte: timeTo,
    },
  };
  try {
    candlesObject = await candleM
      .find(conditions)
      .skip(0)
      .limit(0)
      .sort({ time: 1 })
      .lean();

    if (candlesObject == null) {
      console.log("Can`t find candles in period", timeFrom, timeTo);
      return;
    }
  } catch (err) {
    console.log("Error during candles search:", err.message);
    return;
  }

  candlesObject.forEach((candle) => {
    processCandle(candle);
  });
}
function processCandle(candle) {
  prepareLevels(candle);
  processActiveOrders(candle);
  checkAndOpenOrders(candle);
}

function checkAndOpenOrders(candle) {
  let buySignal = false;
  let sellSignal = false;
  let distanceToLevelAsks;
  let distanceToLevelBids;
  if (!order) {
    if (arrayOfAsksLevels.length) {
      priceAsks = arrayOfAsksLevels[0][0];
      levelVolumeAsks = arrayOfAsksLevels[0][1];
      distanceToLevelAsks = arrayOfAsksLevels[0][2];
      if (distanceToLevelAsks <= param.distanceToLevel) {
        sellSignal = true;
      }
    }
    if (arrayOfBidsLevels.length) {
      priceBids = arrayOfBidsLevels[0][0];
      levelVolumeBids = arrayOfBidsLevels[0][1];
      distanceToLevelBids = arrayOfBidsLevels[0][2];
      // console.log(candle.c, arrayOfBidsLevels);
      if (distanceToLevelBids <= param.distanceToLevel) {
        buySignal = true;
        //console.log(buySignal);
      }
    }

    if (sellSignal && !buySignal) {
      createOrder(
        priceAsks,
        levelVolumeAsks,
        distanceToLevelAsks,
        candle,
        "SHORT"
      );
    }
    if (buySignal && !sellSignal) {
      createOrder(
        priceBids,
        levelVolumeBids,
        distanceToLevelBids,
        candle,
        "LONG"
      );
    }
  }
}

function createOrder(priceLevel, volume, distanceToLevel, candle, direction) {
  // {
  //   salesVolumeMarketBuy: 0,
  //   salesVolumeMarketSell: 0,
  //   prevSalesVolumeMarketBuy: 0,
  //   prevSalesVolumeMarketSell: 0,
  //   biggestLevelTakeX2: 0,
  //   DistanceToBiggestLevelTakeX2: 0,

  // }

  price = Number(priceLevel);
  order = Object.assign({}, deal);
  order.symbol = param.symbol;
  order.direction = direction;
  if (direction == "SHORT") {
    return;
    order.openPrice =
      price * (1 - param.distanceToLevel / 100) + param.minSymbolAmount;
    order.stopPrice = price * (1 + param.stopLoss / 100);
    order.takePrice = order.openPrice * (1 - param.takeProfit / 100);
    order.timeLevelExistsOnOpen = asksLevelsHistory[priceLevel].timeExists;
  } else {
    order.openPrice =
      price * (1 + param.distanceToLevel / 100) - param.minSymbolAmount;
    order.stopPrice = price * (1 - param.stopLoss / 100);
    order.takePrice = order.openPrice * (1 + param.takeProfit / 100);
    order.timeLevelExistsOnOpen = bidsLevelsHistory[priceLevel].timeExists;
  }

  order.startTime = candle.time;
  order.openFee = price * (param.fee / 100);
  order.openLevel = priceLevel;
  order.levelVolume = volume;
  order.distanceToLevel = distanceToLevel;

  order.coinQuantity = param.deposit / order.openPrice;
  // console.log("order created", order);
}

function processCommonOrdersParams(candle) {
  if (order.direction == "SHORT") {
    if (
      !order.levelRemoved &&
      order.openLevel in candle.asks &&
      candle.asks[order.openLevel] >= param.minLevelValue
    ) {
      order.timeLevelExistsOnClose++;
    } else {
      order.levelRemoved = true;
    }
  }
  //LONG
  else {
    if (
      !order.levelRemoved &&
      order.openLevel in candle.bids &&
      candle.bids[order.openLevel] >= param.minLevelValue
    ) {
      order.timeLevelExistsOnClose++;
    } else {
      order.levelRemoved = true;
    }
  }
}
function processActiveOrders(candle) {
  if (order) {
    processCommonOrdersParams(candle);
    if (order.direction == "SHORT") {
      if (order.takePrice >= candle.l) {
        closeOrder(candle.time, order.takePrice);
      } else if (order.stopPrice <= candle.h) {
        closeOrder(candle.time, order.stopPrice);
      }
    } else {
      if (order.takePrice <= candle.h) {
        closeOrder(candle.time, order.takePrice);
      } else if (order.stopPrice >= candle.l) {
        closeOrder(candle.time, order.stopPrice);
      }
    }
  }
}

function closeOrder(time, closePrice) {
  closeSum = order.coinQuantity * closePrice;
  openSum = order.coinQuantity * order.openPrice;
  openFee = (openSum * param.fee) / 100;
  closeFee = (closeSum * param.fee) / 100;
  if (order.direction == "SHORT") {
    profit = openSum - closeSum - openFee - closeFee;
    commonStatistics.profitShort += profit;
  } else {
    profit = closeSum - openSum - openFee - closeFee;
    commonStatistics.profitLong += profit;
  }
  commonStatistics.ordersCount++;

  order.closePrice = closePrice;
  order.openFee = openFee;
  order.closeFee = closeFee;
  order.profit = profit;
  order.finishTime = time;
  order.dealTime = Math.round((order.finishTime - order.startTime) / 1000);
  commonStatistics.profit += profit;
  commonStatistics.finalDeposit += profit;

  if (profit >= 0) {
    if (order.direction == "SHORT") {
      commonStatistics.profitShortCount++;
      maxUnprofitShortCount = 0;
    } else {
      commonStatistics.profitLongCount++;
      maxUnprofitLongCount = 0;
    }
    commonStatistics.profitCount++;
    maxUnprofitCount = 0;
  } else {
    if (order.direction == "SHORT") {
      commonStatistics.unprofitShortCount++;
      maxUnprofitShortCount++;
      if (maxUnprofitShortCount > commonStatistics.maxUnprofitShortCount) {
        commonStatistics.maxUnprofitShortCount = maxUnprofitShortCount;
      }
    } else {
      commonStatistics.unprofitLongCount++;
      maxUnprofitLongCount++;
      if (maxUnprofitLongCount > commonStatistics.maxUnprofitLongCount) {
        commonStatistics.maxUnprofitLongCount = maxUnprofitLongCount;
      }
    }

    maxUnprofitCount++;
    if (maxUnprofitCount > commonStatistics.maxUnprofitCount) {
      commonStatistics.maxUnprofitCount = maxUnprofitCount;
    }
  }
  console.log(
    order.symbol,
    order.direction,
    order.openPrice,
    order.openLevel,
    order.takePrice,
    order.stopPrice,
    order.closePrice,
    order.profit,
    order.timeLevelExistsOnOpen,
    order.levelVolume,
    order.distanceToLevel,
    order.startTime,
    order.finishTime,
    order.dealTime,
    order.timeLevelExistsOnClose,
    order.levelRemoved
  );

  order = undefined;
}

function prepareLevels(candle) {
  removeUnexistingLevels(candle);
  arrayOfAsksLevels = [];
  arrayOfBidsLevels = [];

  highestValue = candle.c * (1 + (param.takeProfit * 2) / 100);
  lowestValue = candle.c * (1 - (param.takeProfit * 2) / 100);

  Object.keys(candle.asks).forEach((ask) => {
    processLevel(ask, asksLevelsHistory, candle.asks);
    if (candle.asks[ask] > param.minLevelValue && Number(ask) <= highestValue) {
      distanceToMarket = ((Number(ask) - candle.c) / Number(ask)) * 100;
      arrayOfAsksLevels.push([ask, candle.asks[ask], distanceToMarket]);
    }
  });

  Object.keys(candle.bids).forEach((bid) => {
    processLevel(bid, bidsLevelsHistory, candle.bids);
    if (candle.bids[bid] > param.minLevelValue && Number(bid) >= lowestValue) {
      distanceToMarket = ((candle.c - Number(bid)) / candle.c) * 100;
      console.log(distanceToMarket);
      arrayOfBidsLevels.push([bid, candle.bids[bid], distanceToMarket]);
    }
  });
}
function processLevel(level, arrayOfHistory, depthObject) {
  if (level in arrayOfHistory) {
    arrayOfHistory[level].volume = depthObject[level];
    arrayOfHistory[level].timeExists++;
  } else {
    arrayOfHistory[level] = { volume: depthObject[level], timeExists: 1 };
  }
}

function removeUnexistingLevels(candle) {
  Object.keys(asksLevelsHistory).forEach((askLevel) => {
    if (!(askLevel in candle.asks)) {
      delete asksLevelsHistory[askLevel];
    }
  });
  Object.keys(bidsLevelsHistory).forEach((bidLevel) => {
    if (!(bidLevel in candle.bids)) {
      delete bidsLevelsHistory[bidLevel];
    }
  });
}

start();
