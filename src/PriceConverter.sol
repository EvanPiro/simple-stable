// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {AggregatorV3Interface} from "lib/chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "./BasketHandler.sol";
import "forge-std/Test.sol";

library PriceConverter {
    function getPrice(
        AggregatorV3Interface priceFeed
    ) internal view returns (uint256) {
        (, int256 answer, , , ) = priceFeed.latestRoundData();
        uint8 decimals = priceFeed.decimals();
        return uint256(answer * int256(1e18 / 10 ** decimals));
    }

    function getPriceOfBasket(
        Basket storage basketOfTokens
    ) internal view returns (IERC20[] memory tokens, uint256[] memory prices) {
        uint256 length = basketOfTokens.erc20s.length;
        tokens = new IERC20[](length);
        prices = new uint256[](length);
        for (uint256 i = 0; i < length; ++i) {
            tokens[i] = basketOfTokens.erc20s[i];
            prices[i] = getPrice(
                basketOfTokens.priceFeedBasket[basketOfTokens.erc20s[i]]
            );

            // ETH/USD rate in 18 digit
            // answer is in decimal digits
            // or (Both will do the same thing)
            // return uint256(answer * 1e10); // 1* 10 ** 10 == 10000000000
        }
        return (tokens, prices);
    }

    function getConversionRate(
        uint256 tokenAmount,
        AggregatorV3Interface priceFeed
    ) internal view returns (uint256) {
        uint256 tokenPrice = getPrice(priceFeed);
        uint256 tokenAmountInUsd = (tokenPrice * tokenAmount) /
            1000000000000000000;
        return tokenAmountInUsd;
    }

    // 1000000000
    function getConversionRateOfBasket(
        Basket storage basketOfTokens,
        uint256 tokenAmount
    ) internal view returns (uint256 price) {
        uint256 length = basketOfTokens.erc20s.length;
        (IERC20[] memory tokens, uint256[] memory prices) = getPriceOfBasket(
            basketOfTokens
        );
        for (uint256 i = 0; i < length; ++i) {
            price +=
                (tokenAmount *
                    basketOfTokens.weightsInPercent[tokens[i]] *
                    prices[i]) /
                (100 * 1000000000000000000);
            // or (Both will do the same thing)
            // uint256 ethAmountInUsd = (ethPrice * ethAmount) / 1e18; // 1 * 10 ** 18 == 1000000000000000000
            // the actual ETH/USD conversion rate, after adjusting the extra 0s.
        }
        return price;
    }
}