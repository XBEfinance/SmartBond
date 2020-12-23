const { expectRevert, BN, ether, time } = require('@openzeppelin/test-helpers');
const { increaseTime, currentTimestamp, DAY } = require('./utils/common');

const chai = require('chai');
chai.use(require('chai-as-promised'));
// chai.use(require('chai-bignumber')(BN));

const { expect, assert } = chai;

const TetherToken = artifacts.require('TetherToken'); // USDT
const BUSDImplementation = artifacts.require('BUSDImplementation'); // BUSD
const FiatTokenV2 = artifacts.require('FiatTokenV2'); // USDC
const Dai = artifacts.require('Dai'); // DAI

const MockToken = artifacts.require('MockToken');
const BFactory = artifacts.require('BFactory');
const BPool = artifacts.require('BPool');

const Router = artifacts.require('Router');
const StakingManager = artifacts.require('StakingManager');

// const WETH9 = artifacts.require('WETH9');
// const UniswapV2Factory = artifacts.require('UniswapV2Factory');
// const UniswapV2Pair = artifacts.require('UniswapV2Pair');
// const UniswapV2Router02 = artifacts.require('UniswapV2Router02');
// const EURxb = artifacts.require('EURxb');

contract('Router', (accounts) => {
  const owner = accounts[0];
  const recipient = accounts[1];
  const staker = accounts[2];
  const team = accounts[3];

  const newBalancer = accounts[4];
  const newTeam = accounts[5];

  const mockStableToken = accounts[6];

  const balancerTokens = [ 'USDC', 'DAI' ];
  const uniswapTokens = ['USDT', 'BUSD'];
  const mixedTokens = [ 'USDT', 'USDC' ];

  let EURxb;
  let xbg;

  let staking;
  let router;

  let timestamp;

  describe('Router tests', async () => {
    beforeEach(async () => {
      EURxb = await MockToken.new('EURxb', 'EURxb', ether('50000'));
      xbg = await MockToken.new('xbg', 'xbg', ether('8000'));
      timestamp = await currentTimestamp();
      staking = await StakingManager.new(xbg.address, timestamp + DAY);
      await xbg.approve(staking.address, ether('8000'));

      await increaseTime(DAY);
    });

    for (let i = 0; i < balancerTokens.length; i++) {
      describe('Token tests for '.concat(balancerTokens[i]), async () => {
        let bFactory;
        let balancer;
        let token;
        // let eurxb;
        beforeEach(async () => {
          // eurxb = await EURxb.new(owner);
          // await eurxb.configure(owner);
          // await eurxb.mint(owner, ether('1000000'));

          if (balancerTokens[i] === 'USDC') {
            token = await FiatTokenV2.new();
            await token.updateMasterMinter(owner);
            await token.configureMinter(owner, ether('1000'));
            await token.mint(owner, ether('1000'));

            router = await Router.new(
              team, staking.address, timestamp,
              mockStableToken, token.address, mockStableToken, mockStableToken, EURxb.address,
            );
          }

          if (balancerTokens[i] === 'DAI') {
            token = await Dai.new(1);
            await token.mint(owner, ether('1000'));

            router = await Router.new(
              team, staking.address, timestamp,
              mockStableToken, mockStableToken, mockStableToken, token.address, EURxb.address,
            );
          }

          await token.transfer(recipient, ether('200'));
          await token.transfer(staker, ether('200'));

          bFactory = await BFactory.deployed();
          await bFactory.newBPool();
          const balancerAddress = await bFactory.getLastBPool();
          balancer = await BPool.at(balancerAddress);

          await EURxb.approve(balancer.address, ether('46'));
          await token.approve(balancer.address, ether('54'));
          await balancer.bind(EURxb.address, ether('46'), ether('23'));
          await balancer.bind(token.address, ether('54'), ether('27'));
          await balancer.setSwapFee(web3.utils.toWei('1', 'finney'));
          await balancer.finalize();

          const lpToken1 = await MockToken.new('LPToken', 'LPT1', ether('400.0'));
          const lpToken2 = await MockToken.new('LPToken', 'LPT2', ether('400.0'));
          const lpToken3 = await MockToken.new('LPToken', 'LPT3', ether('400.0'));

          await router.setBalancerPool(token.address, balancer.address);
          await staking.configure([balancer.address, lpToken1.address, lpToken2.address, lpToken3.address]);
        });

        it('should return correct balancer values', async () => {
          assert.equal(await balancer.getNumTokens(), 2);
          expect(await balancer.getBalance(EURxb.address)).to.be.bignumber.equal(ether('46'));
          expect(await balancer.getBalance(token.address)).to.be.bignumber.equal(ether('54'));
          expect(await balancer.getSwapFee()).to.be.bignumber.equal(web3.utils.toWei('1', 'finney'));
        });

        it('should return correct router values', async () => {
          assert.equal(await router.isClosedContract(), false);
          assert.equal(await router.balancerPools(token.address), balancer.address);
          assert.equal(await router.teamAddress(), team);
          assert.equal(await router.stakingManager(), staking.address);
          assert.equal(await router.startTime(), timestamp);
        });

        it('should return correct change router values', async () => {
          await router.setTeamAddress(newTeam);
          assert.equal(await router.teamAddress(), newTeam);
        });

        it('should return correct balance EURxb values', async () => {
          await EURxb.transfer(router.address, ether('400'));
          await token.approve(router.address, ether('54'), { from: recipient });
          await router.exchangeForEuroXB(token.address, ether('54'), { from: recipient });
          const balance = await EURxb.balanceOf(recipient);
          assert.equal(web3.utils.fromWei(balance), 46);
        });

        it('should return correct pool values when adding liquidity through a contract', async () => {
          await EURxb.transfer(router.address, ether('400'));
          await token.approve(router.address, ether('200'), { from: recipient });
          await router.addLiquidity(token.address, ether('108'), { from: recipient });

          assert.equal(await balancer.getBalance(EURxb.address), web3.utils.toWei('91540', 'finney'));
          assert.equal(await balancer.getBalance(token.address), web3.utils.toWei('107460', 'finney'));

          await token.approve(router.address, ether('200'), { from: staker });
          await router.addLiquidity(token.address, ether('108'), { from: staker });
          assert.equal(await balancer.getBalance(EURxb.address), web3.utils.toWei('137079999999999999886', 'wei'));
          assert.equal(await balancer.getBalance(token.address), web3.utils.toWei('160919999999999999867', 'wei'));
        });

        it('should return correct pool values when adding liquidity through a contract', async () => {
          await token.approve(router.address, ether('200'), { from: recipient });
          await router.addLiquidity(token.address, ether('27'), { from: recipient });

          expect(await balancer.getBalance(EURxb.address)).to.be.bignumber.equal(ether('46'));
          expect(await balancer.getBalance(token.address)).to.be.bignumber.equal(ether('81'));
        });
      });
    }

    // for (let i = 0; i < uniswapTokens.length; i++) {
    //   describe('Token tests for '.concat(uniswapTokens[i]), async () => {
    //     let token;
    //     let pair;
    //     let eurxb;
    //
    //     timestamp = await currentTimestamp();
    //     timestamp += DAY;
    //
    //     staking = await StakingManager.new(xbg.address, timestamp+DAY, 150);
    //     console.log('staking manager = ', staking);
    //
    //     await increaseTime(DAY);
    //
    //     beforeEach(async () => {
    //       eurxb = await EURxb.new(owner);
    //       await eurxb.configure(owner);
    //       await eurxb.mint(owner, ether('1000000'));
    //
    //       if (uniswapTokens[i] === 'USDT') {
    //         token = await TetherToken.deployed();
    //         timestamp = await currentTimestamp();
    //         timestamp += DAY;
    //         router = await Router.new(
    //           team, staking.address, timestamp,
    //           token.address, mockStableToken, mockStableToken, mockStableToken, eurxb.address,
    //         );
    //       }
    //
    //       if (uniswapTokens[i] === 'BUSD') {
    //         token = await BUSDImplementation.new();
    //         await token.increaseSupply(100000);
    //         await token.unpause();
    //
    //         router = await Router.new(
    //           team, staking.address, timestamp,
    //           mockStableToken, mockStableToken, token.address, mockStableToken, eurxb.address,
    //         );
    //       }
    //
    //       // create uniswap router and dependancies
    //       const factory = await UniswapV2Factory.new(owner);
    //       const weth = await WETH9.new();
    //       const uniswap_router = await UniswapV2Router02.new(factory.address, weth.address);
    //       await factory.createPair(token.address, eurxb.address);
    //
    //       const pairAddress = await factory.allPairs.call(new BN('0'));
    //       pair = await UniswapV2Pair.at(pairAddress);
    //
    //       await router.configure(uniswap_router.address);
    //       await router.setUniswapPair(token.address, pair.address);
    //
    //       // await eurxb.approve(uniswap_router.address, ether('1000000'));
    //       await token.approve(router.address, ether('12042213561'));
    //       await eurxb.approve(router.address, ether('1000000'));
    //       await eurxb.transfer(router.address, ether('1000000'));
    //       // await token.approve(uniswap_router.address, ether('12042213561'));
    //       console.log('token owner balance = ', await token.balanceOf(owner));
    //       console.log('eur owner balance = ', await eurxb.balanceOf(owner));
    //
    //       const printRatios = async function () {
    //         const { tokenRes, eurRes } = await router.getUinswapReservesRatio(token.address);
    //         console.log('ratio = ', tokenRes, '/', eurRes);
    //       };
    //
    //       await printRatios();
    //
    //       console.log('router eurxb balance = ', await eurxb.balanceOf(router.address));
    //       console.log('router token balance = ', await token.balanceOf(router.address));
    //       let expectedPair = await factory.getPair(token.address, eurxb.address);
    //       expect(expectedPair, 'wrong pair address').equal(pairAddress);
    //
    //       await router.addLiquidity(token.address, 100);
    //       let eurResult = router.calculateEuroAmount(token, 50);
    //       console.log('euro amount = ', eurResult);
    //
    //       let timestamp = await currentTimestamp();
    //       timestamp += DAY;
    //       await uniswap_router.addLiquidity(
    //         token.address,
    //         eurxb.address,
    //         50,
    //         eurResult,
    //         0,
    //         0,
    //         router.address,
    //         timestamp,
    //       );
    //
    //       await printRatios();
    //
    // await token.transfer(recipient, ether('200'));
    // await token.transfer(staker, ether('200'));
    // });
    //
    // it('should return correct uniswap values', async () => {
    //   console.log('liquidity balance = ', await pair.balanceOf(owner));
    //   // assert.equal(await pair.balanceOf(owner), ether('100'));
    // });
    //
    // it('should return correct router values', async () => {
    //   assert.equal(await router.isClosedContract(), false);
    //   assert.equal(await router.balancerPools(token.address), balancer.address);
    //   assert.equal(await router.uniswapPair(token.address), pair.address);
    //   assert.equal(await router.teamAddress(), team);
    //   assert.equal(await router.stakingManager(), staking.address);
    //   assert.equal(await router.startTime(), timestamp);
    // });
    //
    // it('should return correct change router values', async () => {
    //   await router.setUniswapPair(token.address, newPair);
    //   await router.setTeamAddress(newTeam);
    //
    //   assert.equal(await router.getUniswapPair(token.address), newPair);
    //   assert.equal(await router.teamAddress(), newTeam);
    // });
    //
    // it('should return correct balance EURxb values', async () => {
    //   await EURxb.transfer(router.address, ether('400'));
    //   await token.approve(router.address, ether('54'), { from: recipient });
    //   await router.exchangeForEuroXB(token.address, ether('54'), { from: recipient });
    //   const balance = await EURxb.balanceOf(recipient);
    //   assert.equal(web3.utils.fromWei(balance), 46);
    // });
    //
    // it('should return correct pool values when adding liquidity through a contract', async () => {
    //   await EURxb.transfer(router.address, ether('400'));
    //   await token.approve(router.address, ether('200'), { from: recipient });
    //   await router.addLiquidity(token.address, ether('108'), { from: recipient });
    //
    //   assert.equal(await pair.balanceOf(EURxb.address), ether('91540', 'finney'));
    //   assert.equal(await pair.balanceOf(token.address), ether('107460', 'finney'));
    //
    //   await token.approve(router.address, ether('200'), { from: staker });
    //   await router.addLiquidity(token.address, ether('108'), { from: staker });
    //   assert.equal(await pair.balanceOf(EURxb.address), ether('137079999999999999886', 'wei'));
    //   assert.equal(await pair.balanceOf(token.address), ether('160919999999999999867', 'wei'));
    // });
    //
    // it('should return correct pool values when adding liquidity through a contract', async () => {
    //   await token.approve(router.address, ether('200'), { from: recipient });
    //   await router.addLiquidity(token.address, ether('27'), { from: recipient });
    //
    //   assert.equal(await pair.balanceOf(EURxb.address), ether('46'));
    //   assert.equal(await pair.balanceOf(token.address), ether('81'));
    // });
    // });
    // }

    it('should return correct close contract', async () => {
      expect(await EURxb.balanceOf(owner)).to.be.bignumber.equal(ether('50000'));

      router = await Router.new(
        team, staking.address, timestamp,
        mockStableToken, mockStableToken, mockStableToken, mockStableToken, EURxb.address,
      );

      await expectRevert(router.closeContract(), 'Time is not over');

      // we leave 8 days ahead
      await increaseTime(DAY * 8);
      await EURxb.transfer(router.address, ether('100'));
      assert.equal(await router.isClosedContract(), false);

      // you can close the contract only after 7 days from the start time
      await router.closeContract();

      assert.equal(await router.isClosedContract(), true);
      expect(await EURxb.balanceOf(owner)).to.be.bignumber.equal(ether('50000'));

      await expectRevert(
        router.exchangeForEuroXB(mockStableToken, ether('54'), { from: recipient }),
        'Contract closed',
      );
      await expectRevert(
        router.addLiquidity(mockStableToken, ether('27'), { from: recipient }),
        'Contract closed'
      );
    });

    it('should throw an exception when the exchange is called', async () => {
      router = await Router.new(
        team, staking.address, timestamp,
        mockStableToken, mockStableToken, mockStableToken, mockStableToken, EURxb.address,
      );

      await expectRevert(
        router.exchangeForEuroXB(EURxb.address, ether('54'), { from: recipient }),
        'Token not found',
      );
      await expectRevert(
        router.exchangeForEuroXB(mockStableToken, ether('54'), { from: recipient }),
        'Invalid pool address',
      );
    });

    it('should throw an exception when the exchangeForEuroXB is called and not enough tokens', async () => {
      let token = await FiatTokenV2.new();
      await token.updateMasterMinter(owner);
      await token.configureMinter(owner, ether('1000'));
      await token.mint(owner, ether('1000'));

      let router = await Router.new(
        team, staking.address, timestamp,
        mockStableToken, token.address, mockStableToken, mockStableToken, EURxb.address,
      );

      await token.transfer(recipient, ether('200'));
      await token.transfer(staker, ether('200'));

      bFactory = await BFactory.deployed();
      await bFactory.newBPool();
      const balancerAddress = await bFactory.getLastBPool();
      balancer = await BPool.at(balancerAddress);

      await EURxb.approve(balancer.address, ether('46'));
      await token.approve(balancer.address, ether('54'));
      await balancer.bind(EURxb.address, ether('46'), ether('23'));
      await balancer.bind(token.address, ether('54'), ether('27'));
      await balancer.setSwapFee(web3.utils.toWei('1', 'finney'));
      await balancer.finalize();

      const lpToken1 = await MockToken.new('LPToken', 'LPT1', ether('400.0'));
      const lpToken2 = await MockToken.new('LPToken', 'LPT2', ether('400.0'));
      const lpToken3 = await MockToken.new('LPToken', 'LPT3', ether('400.0'));

      await router.setBalancerPool(token.address, balancer.address);
      await staking.configure([balancer.address, lpToken1.address, lpToken2.address, lpToken3.address]);

      await expectRevert(
        router.exchangeForEuroXB(token.address, ether('54'), { from: recipient }),
        'Not enough tokens',
      );
    });
  });
});
