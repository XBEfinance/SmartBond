const { expectRevert, ether, time } = require('@openzeppelin/test-helpers');

const chai = require('chai');
chai.use(require('chai-as-promised'));

const { expect, assert } = chai;

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

  const newTeam = accounts[4];

  const mockStableToken = accounts[5];

  const balancerTokens = ['USDC', 'DAI'];

  describe('Router tests', async () => {
    beforeEach(async () => {
      this.eurxb = await MockToken.new('EURxb', 'EURxb', ether('50000'));
      const xbg = await MockToken.new('xbg', 'xbg', ether('12000'));
      this.staking = await StakingManager.new(xbg.address, await time.latest());
      await xbg.approve(this.staking.address, ether('12000'));

      this.bFactory = await BFactory.deployed();
    });

    for (let i = 0; i < balancerTokens.length; i++) {
      describe('Token tests for '.concat(balancerTokens[i]), async () => {
        beforeEach(async () => {
          if (balancerTokens[i] === 'USDC') {
            this.token = await FiatTokenV2.new();
            await this.token.updateMasterMinter(owner);
            await this.token.configureMinter(owner, ether('1000'));
            await this.token.mint(owner, ether('1000'));

            this.router = await Router.new(
              team, this.staking.address, await time.latest(),
              mockStableToken, this.token.address, mockStableToken,
              mockStableToken, this.eurxb.address,
            );
          } else if (balancerTokens[i] === 'DAI') {
            this.token = await Dai.new(1);
            await this.token.mint(owner, ether('1000'));

            this.router = await Router.new(
              team, this.staking.address, await time.latest(),
              mockStableToken, mockStableToken, mockStableToken,
              this.token.address, this.eurxb.address,
            );
          }

          await this.token.transfer(recipient, ether('200'));
          await this.token.transfer(staker, ether('200'));

          await this.bFactory.newBPool();
          const balancerAddress = await this.bFactory.getLastBPool();
          this.balancer = await BPool.at(balancerAddress);

          await this.eurxb.approve(this.balancer.address, ether('46'));
          await this.token.approve(this.balancer.address, ether('54'));
          await this.balancer.bind(this.eurxb.address, ether('46'), ether('23'));
          await this.balancer.bind(this.token.address, ether('54'), ether('27'));
          await this.balancer.setSwapFee(ether('0.001'));
          await this.balancer.finalize();

          const lpToken1 = await MockToken.new('LPToken', 'LPT1', ether('400.0'));
          const lpToken2 = await MockToken.new('LPToken', 'LPT2', ether('400.0'));
          const lpToken3 = await MockToken.new('LPToken', 'LPT3', ether('400.0'));

          await this.router.setBalancerPool(this.token.address, this.balancer.address);
          await this.staking.configure([
            this.balancer.address, lpToken1.address, lpToken2.address, lpToken3.address]);
        });

        it('should return correct balancer values', async () => {
          assert.equal(await this.balancer.getNumTokens(), 2);
          expect(await this.balancer.getBalance(this.eurxb.address)).to.be.bignumber.equal(ether('46'));
          expect(await this.balancer.getBalance(this.token.address)).to.be.bignumber.equal(ether('54'));
          expect(await this.balancer.getSwapFee()).to.be.bignumber.equal(ether('0.001'));
        });

        it('should return correct router values', async () => {
          assert.equal(await this.router.isClosedContract(), false);
          assert.equal(await this.router.balancerPools(this.token.address), this.balancer.address);
          assert.equal(await this.router.teamAddress(), team);
          assert.equal(await this.router.stakingManager(), this.staking.address);
        });

        it('should return correct change router values', async () => {
          await this.router.setTeamAddress(newTeam);
          assert.equal(await this.router.teamAddress(), newTeam);
        });

        // it('should return correct balance EURxb values', async () => {
        //   await this.eurxb.transfer(this.router.address, ether('400'));
        //   await this.token.approve(this.router.address, ether('54'), { from: recipient });
        //   await this.router.exchangeForEuroXB(this.token.address, ether('54'), { from: recipient });
        //   const balance = await this.eurxb.balanceOf(recipient);
        //   assert.equal(web3.utils.fromWei(balance), 46);
        // });

        it('should return correct pool values when adding liquidity through a contract', async () => {
          await this.eurxb.transfer(this.router.address, ether('400'));
          expect(await this.token.balanceOf(this.router.address)).to.be.bignumber.equal(ether('0'));

          await this.token.approve(this.router.address, ether('200'), { from: recipient });
          await this.router.addLiquidity(this.token.address, ether('108'), { from: recipient });

          expect(await this.balancer.getBalance(this.eurxb.address)).to.be.bignumber.equal(ether('91.540'));
          expect(await this.balancer.getBalance(this.token.address)).to.be.bignumber.equal(ether('107.460'));
          expect(await this.token.balanceOf(this.router.address)).to.be.bignumber.equal(ether('0'));

          await this.token.approve(this.router.address, ether('200'), { from: staker });
          await this.router.addLiquidity(this.token.address, ether('108'), { from: staker });
          expect(await this.balancer.getBalance(this.eurxb.address)).to.be.bignumber.equal(web3.utils.toWei('137079999999999999978', 'wei'));
          expect(await this.balancer.getBalance(this.token.address)).to.be.bignumber.equal(web3.utils.toWei('160919999999999999974', 'wei'));

          expect(await this.eurxb.balanceOf(this.router.address)).to.be.bignumber.equal(ether('308.920000000000000022'));
          expect(await this.token.balanceOf(team)).to.be.bignumber.equal(ether('109.080000000000000026'));
        });

        it('should return correct pool values when adding liquidity through a contract', async () => {
          await this.token.approve(this.router.address, ether('200'), { from: recipient });
          await this.router.addLiquidity(this.token.address, ether('27'), { from: recipient });

          expect(await this.balancer.getBalance(this.eurxb.address)).to.be.bignumber.equal(ether('46'));
          expect(await this.balancer.getBalance(this.token.address)).to.be.bignumber.equal(ether('81'));
        });
      });
    }

    it('should return correct close contract', async () => {
      expect(await this.eurxb.balanceOf(owner)).to.be.bignumber.equal(ether('50000'));

      const router = await Router.new(
        team, this.staking.address, await time.latest(),
        mockStableToken, mockStableToken, mockStableToken, mockStableToken, this.eurxb.address,
      );

      await expectRevert(router.closeContract(), 'Time is not over');

      // we leave 8 days ahead
      await time.increase(time.duration.days('8'));
      await this.eurxb.transfer(router.address, ether('100'));
      assert.equal(await router.isClosedContract(), false);

      // you can close the contract only after 7 days from the start time
      await router.closeContract();

      assert.equal(await router.isClosedContract(), true);
      expect(await this.eurxb.balanceOf(owner)).to.be.bignumber.equal(ether('50000'));

      // await expectRevert(
      //   router.exchangeForEuroXB(mockStableToken, ether('54'), { from: recipient }),
      //   'Contract closed',
      // );
      await expectRevert(
        router.addLiquidity(mockStableToken, ether('27'), { from: recipient }),
        'Contract closed',
      );
    });

    // it('should throw an exception when the exchangeForEuroXB is called and not enough tokens', async () => {
    //   const token = await FiatTokenV2.new();
    //   await token.updateMasterMinter(owner);
    //   await token.configureMinter(owner, ether('1000'));
    //   await token.mint(owner, ether('1000'));
    //
    //   const router = await Router.new(
    //     team, this.staking.address, await time.latest(),
    //     mockStableToken, token.address, mockStableToken, mockStableToken, this.eurxb.address,
    //   );
    //
    //   await token.transfer(recipient, ether('200'));
    //   await token.transfer(staker, ether('200'));
    //
    //   bFactory = await BFactory.deployed();
    //   await bFactory.newBPool();
    //   const balancerAddress = await bFactory.getLastBPool();
    //   const balancer = await BPool.at(balancerAddress);
    //
    //   await this.eurxb.approve(balancer.address, ether('46'));
    //   await token.approve(balancer.address, ether('54'));
    //   await balancer.bind(this.eurxb.address, ether('46'), ether('23'));
    //   await balancer.bind(token.address, ether('54'), ether('27'));
    //   await balancer.setSwapFee(web3.utils.toWei('1', 'finney'));
    //   await balancer.finalize();
    //
    //   const lpToken1 = await MockToken.new('LPToken', 'LPT1', ether('400.0'));
    //   const lpToken2 = await MockToken.new('LPToken', 'LPT2', ether('400.0'));
    //   const lpToken3 = await MockToken.new('LPToken', 'LPT3', ether('400.0'));
    //
    //   await router.setBalancerPool(token.address, balancer.address);
    //   await this.staking.configure([balancer.address, lpToken1.address, lpToken2.address, lpToken3.address]);
    //
    //   await expectRevert(
    //     router.exchangeForEuroXB(token.address, ether('54'), { from: recipient }),
    //     'Not enough tokens',
    //   );
    // });
  });
});
