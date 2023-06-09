const numeric = require("numeric");
const axios = require("axios");
const mathjs = require("mathjs");
var cov = require("compute-covariance");

let portfolio = {
  tokens: {
    BTC: {
      name: "BTC",
      symbol: "bitcoin",
      address: "",
      decimals: "",
      priceFeedAddress: "",
    },
    FIAT: {
      name: "Tether",
      symbol: "tether",
      address: "",
      decimals: "",
      priceFeedAddress: "",
    },
    LinkToken: {
      name: "LINK",
      symbol: "chainlink",
      address: "",
      decimals: "",
      priceFeedAddress: "",
    },
    ETH: {
      name: "ETH",
      symbol: "ethereum", // This is ethereum on CoinGecko
      address: "",
      decimals: "",
      priceFeedAddress: "",
    },
    GOLD: {
      name: "Gold Token",
      symbol: "pax-gold",
      address: "",
      decimals: "",
      priceFeedAddress: "",
    },
  },
};

let returns, covMatrix;

async function fetchHistoricalData(asset) {
  // Convert asset symbol to lowercase as required by CoinGecko API
  const assetToLower = asset.toLowerCase();

  // CoinGecko API endpoint for historical data (max 90 days)
  const url = `https://api.coingecko.com/api/v3/coins/${assetToLower}/market_chart?vs_currency=usd&days=90&interval=daily`;
  const response = await axios.get(url);

  // The response is an object with two arrays: prices and market_caps.
  // We're interested in prices, where each entry is an array: [time, price].
  const prices = response.data.prices;

  // We only need the price, not the timestamp, so we map over the prices to get an array of only prices.
  const closingPrices = prices.map((entry) => entry[1]);

  return closingPrices;
}

async function getReturnsAndCovMatrix() {
  const assets = Object.values(portfolio.tokens).map((token) => token.symbol);

  let prices = [];
  let minLen = Infinity;
  for (let asset of assets) {
    const historicalData = await fetchHistoricalData(asset);
    minLen = Math.min(minLen, historicalData.length);
    prices.push(historicalData);
  }
  // Trim all price arrays to the same length
  // prices = prices.map((assetPrices) => assetPrices.slice(0, minLen));

  const returns = prices.map((assetPrices) => {
    const assetReturns = [];
    for (let i = 1; i < assetPrices.length; i++) {
      const arithmeticReturn =
        (assetPrices[i] - assetPrices[i - 1]) / assetPrices[i - 1];
      assetReturns.push(arithmeticReturn * Math.sqrt(252));
    }
    return assetReturns;
  });

  const covMatrix = cov(returns);

  return { returns, covMatrix };
}

async function calculatePortfolio() {
  ({ returns, covMatrix } = await getReturnsAndCovMatrix());

  const numPortfolios = 100000;

  let allWeights = new Array(numPortfolios);
  let retArr = new Array(numPortfolios);
  let volArr = new Array(numPortfolios);

  for (let i = 0; i < numPortfolios; i++) {
    // Create random weights
    let weights = returns.map(() => Math.random());
    let sumWeights = numeric.sum(weights);
    weights = weights.map((w) => w / sumWeights);

    // Save weights
    allWeights[i] = weights;

    // Expected return
    retArr[i] = numeric.sum(
      returns.map((assetReturns, idx) => {
        const weightedReturns = numeric.mul(assetReturns, weights[idx]);
        return numeric.sum(weightedReturns);
      })
    );
    // Expected volatility
    let intermediate = numeric.dot(covMatrix, weights);
    volArr[i] = Math.sqrt(
      mathjs.multiply(mathjs.multiply(weights, covMatrix), weights)
    );
  }

  // Find the portfolio with the highest Sharpe Ratio
  let sharpeArr = retArr.map((ret, idx) => ret / volArr[idx]);

  let maxSharpeIdx = sharpeArr.indexOf(Math.max(...sharpeArr));
  let maxSrReturns = retArr[maxSharpeIdx];
  let maxSrVolatility = volArr[maxSharpeIdx];

  return allWeights[maxSharpeIdx];
}

async function main() {
  const firstWeight = await calculatePortfolio();
  console.log("First Token Weight:", firstWeight[0] * 100);
  console.log("Second Token Weight:", firstWeight[1] * 100);
  console.log("Third Token Weight:", firstWeight[2] * 100);
  console.log("Fourth Token Weight:", firstWeight[3] * 100);
  console.log("Fifth Token Weight:", firstWeight[4] * 100);
}

main();
