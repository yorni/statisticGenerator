param = {
  symbol: "GMTUSDT",
  deposit: 100,
  takeProfit: 0.2,
  stopLoss: 0.1,
  distanceToLevel: 0.1,
  minLevelValue: 150000,
  startTime: 1653742291000,
  finishTime: 1653749291000,
  minSymbolAmount: 0.0001,
  fee: 0.000108,
};

deal = {
  symbol: "",
  direction: "",
  openPrice: 0,
  openLevel: "",
  takePrice: 0,
  stopPrice: 0,
  closePrice: 0,
  coinQuantity: 0,
  profit: 0,
  inProfit: 0,
  timeLevelExistsOnOpen: 0,
  levelVolume: 0,
  salesVolumeMarketBuy: 0,
  salesVolumeMarketSell: 0,
  prevSalesVolumeMarketBuy: 0,
  prevSalesVolumeMarketSell: 0,
  distanceToLevel: 0,
  startTime: 0,
  finishTime: 0,
  dealTime: 0,
  openFee: 0,
  closeFee: 0,
  timeLevelExistsOnClose: 0,
  levelRemoved: false,
  biggestLevelTakeX2: 0,
  DistanceToBiggestLevelTakeX2: 0,
  candleOpen: undefined,
  candleClose: undefined,
};

commonStatistics = {
  symbol: "",
  startTime: 0,
  finishTime: 0,
  takeProfit: 0,
  stopLoss: 0,
  distanceToLevel: 0,
  minLevelValue: 0,
  profitLongCount: 0,
  profitShortCount: 0,
  unprofitLongCount: 0,
  unprofitShortCount: 0,
  inProfitLongCount: 0,
  inProfitShortCount: 0,
  unInProfitLongCount: 0,
  unInProfitShortCount: 0,
  ordersCount: 0,
  profitCount: 0,
  inProfitCount: 0,
  maxUnprofitLongCount: 0,
  maxUnprofitShortCount: 0,
  maxUnprofitCount: 0,
  profitLong: 0,
  profitShort: 0,
  maxUnInProfitLongCount: 0,
  maxUnInProfitShortCount: 0,
  maxUnInProfitCount: 0,
  InProfitLong: 0,
  InProfitShort: 0,
  profit: 0,
  inProfit: 0,
  maxDeposit: 0,
  minDeposit: 0,
  finalDeposit: 0,
  finalDepositIn: 0,
};

module.exports = {
  param: param,
  deal: deal,
  commonStatistics: commonStatistics,
};
