const { assert } = require('chai');
const { increaseTime, currentTimestamp, DAY } = require('./common');

// const TetherToken = artifacts.require('TetherToken'); // USDT
const BUSDImplementation = artifacts.require('BUSDImplementation'); // BUSD
const FiatTokenV2 = artifacts.require('FiatTokenV2'); // USDC
const Dai = artifacts.require('Dai'); // DAI

const MockToken = artifacts.require('MockToken');
const BFactory = artifacts.require('BFactory');
const BPool = artifacts.require('BPool');

const Router = artifacts.require('Router');
const StakingManager = artifacts.require('StakingManager');

contract('Router', (accounts) => {
  const owner = accounts[0];
  const recipient = accounts[1];
  const staker = accounts[2];
  const team = accounts[3];

  const newBalancer = accounts[4];
  const newTeam = accounts[5];

  const mockStableToken = accounts[6];

  // TODO: USDT not supported in balancer
  const tokens = ['USDC', 'BUSD', 'DAI'];

  let EURxb;
  let xbg;

  let staking;
  let router;

  let timestamp;

  describe('Router tests', async () => {
    beforeEach(async () => {
      EURxb = await MockToken.new('EURxb', 'EURxb', web3.utils.toWei('50000', 'ether'));
      xbg = await MockToken.new('xbg', 'xbg', web3.utils.toWei('500', 'ether'));

      timestamp = await currentTimestamp();
      staking = await StakingManager.new(xbg.address, timestamp, 150);

      await increaseTime(DAY);
    });

    for (let i = 0; i < tokens.length; i++) {
      describe('Token tests for '.concat(tokens[i]), async () => {
        let bFactory;
        let balancer;
        let token;
        beforeEach(async () => {
          if (tokens[i] === 'USDC') {
            token = await FiatTokenV2.new();
            await token.updateMasterMinter(owner);
            await token.configureMinter(owner, web3.utils.toWei('1000', 'ether'));
            await token.mint(owner, web3.utils.toWei('1000', 'ether'));

            router = await Router.new(
              team, staking.address, timestamp,
              mockStableToken, token.address, mockStableToken, mockStableToken, EURxb.address,
            );
          }

          if (tokens[i] === 'BUSD') {
            token = await BUSDImplementation.new();
            await token.increaseSupply(web3.utils.toWei('1000', 'ether'));
            await token.unpause();

            router = await Router.new(
              team, staking.address, timestamp,
              mockStableToken, mockStableToken, token.address, mockStableToken, EURxb.address,
            );
          }

          if (tokens[i] === 'DAI') {
            token = await Dai.new(1);
            await token.mint(owner, web3.utils.toWei('1000', 'ether'));

            router = await Router.new(
              team, staking.address, timestamp,
              mockStableToken, mockStableToken, mockStableToken, token.address, EURxb.address,
            );
          }

          await token.transfer(recipient, web3.utils.toWei('200', 'ether'));
          await token.transfer(staker, web3.utils.toWei('200', 'ether'));

          bFactory = await BFactory.deployed();
          await bFactory.newBPool();
          const balancerAddress = await bFactory.getLastBPool();
          balancer = await BPool.at(balancerAddress);

          await EURxb.approve(balancer.address, web3.utils.toWei('46', 'ether'));
          await token.approve(balancer.address, web3.utils.toWei('54', 'ether'));
          await balancer.bind(EURxb.address, web3.utils.toWei('46', 'ether'), web3.utils.toWei('23', 'ether'));
          await balancer.bind(token.address, web3.utils.toWei('54', 'ether'), web3.utils.toWei('27', 'ether'));
          await balancer.setSwapFee(web3.utils.toWei('1', 'finney'));
          await balancer.finalize();

          await router.setBalancerPool(token.address, balancer.address);
          await staking.setBalancerPool(balancer.address);
        });

        it('should return correct balancer values', async () => {
          assert.equal(await balancer.getNumTokens(), 2);
          assert.equal(await balancer.getBalance(EURxb.address), web3.utils.toWei('46', 'ether'));
          assert.equal(await balancer.getBalance(token.address), web3.utils.toWei('54', 'ether'));
          assert.equal(await balancer.getSwapFee(), web3.utils.toWei('1', 'finney'));
        });

        it('should return correct router values', async () => {
          assert.equal(await router.isClosedContract(), false);
          assert.equal(await router.balancerPools(token.address), balancer.address);
          assert.equal(await router.teamAddress(), team);
          assert.equal(await router.stakingManager(), staking.address);
          assert.equal(await router.startTime(), timestamp);
        });

        it('should return correct change router values', async () => {
          await router.setBalancerPool(token.address, newBalancer);
          await router.setTeamAddress(newTeam);

          assert.equal(await router.balancerPools(token.address), newBalancer);
          assert.equal(await router.teamAddress(), newTeam);
        });

        it('should return correct balance EURxb values', async () => {
          await EURxb.transfer(router.address, web3.utils.toWei('400', 'ether'));
          await token.approve(router.address, web3.utils.toWei('54', 'ether'), { from: recipient });
          await router.exchange(token.address, web3.utils.toWei('54', 'ether'), { from: recipient });
          const balance = await EURxb.balanceOf(recipient);
          assert.equal(web3.utils.fromWei(balance, 'ether'), 46);
        });

        it('should return correct pool values when adding liquidity through a contract', async () => {
          await EURxb.transfer(router.address, web3.utils.toWei('400', 'ether'));
          await token.approve(router.address, web3.utils.toWei('200', 'ether'), { from: recipient });
          await router.addLiquidity(token.address, web3.utils.toWei('108', 'ether'), { from: recipient });

          assert.equal(await balancer.getBalance(EURxb.address), web3.utils.toWei('91540', 'finney'));
          assert.equal(await balancer.getBalance(token.address), web3.utils.toWei('107460', 'finney'));

          await token.approve(router.address, web3.utils.toWei('200', 'ether'), { from: staker });
          await router.addLiquidity(token.address, web3.utils.toWei('108', 'ether'), { from: staker });
          assert.equal(await balancer.getBalance(EURxb.address), web3.utils.toWei('137079999999999999886', 'wei'));
          assert.equal(await balancer.getBalance(token.address), web3.utils.toWei('160919999999999999867', 'wei'));
        });

        it('should return correct pool values when adding liquidity through a contract', async () => {
          await token.approve(router.address, web3.utils.toWei('200', 'ether'), { from: recipient });
          await router.addLiquidity(token.address, web3.utils.toWei('27', 'ether'), { from: recipient });

          assert.equal(await balancer.getBalance(EURxb.address), web3.utils.toWei('46', 'ether'));
          assert.equal(await balancer.getBalance(token.address), web3.utils.toWei('81', 'ether'));
        });
      });
    }

    it('should return correct close contract', async () => {
      assert.equal(await EURxb.balanceOf(owner), web3.utils.toWei('50000', 'ether'));

      router = await Router.new(
        team, staking.address, timestamp,
        mockStableToken, mockStableToken, mockStableToken, mockStableToken, EURxb.address,
      );

      await increaseTime(DAY * 8);
      await EURxb.transfer(router.address, web3.utils.toWei('100', 'ether'));
      assert.equal(await router.isClosedContract(), false);

      await router.closeContract();

      assert.equal(await router.isClosedContract(), true);
      assert.equal(await EURxb.balanceOf(owner), web3.utils.toWei('50000', 'ether'));
    });
  });
});
