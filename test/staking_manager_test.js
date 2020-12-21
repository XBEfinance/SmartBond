const { expect } = require('chai');

const { expectRevert, BN, ether, time } = require('@openzeppelin/test-helpers');

const MockToken = artifacts.require('MockToken');
const StakingManager = artifacts.require('StakingManager');

function checkStakeInfoPerDay(stakeInfo, expectInfo) {
  for(let i = 0; i < stakeInfo.length; ++i) {
    expect(stakeInfo[i]).to.be.bignumber.equal(expectInfo[i]);
  }
}

contract('StakingManager', (accounts) => {
  const recipient = accounts[1];
  const staker1 = accounts[2];
  const staker2 = accounts[3];
  const staker3 = accounts[4];
  const staker4 = accounts[5];

  beforeEach(async () => {
    this.lpToken1 = await MockToken.new('LPToken', 'LPT1', ether('400.0'));
    this.lpToken2 = await MockToken.new('LPToken', 'LPT2', ether('400.0'));
    this.lpToken3 = await MockToken.new('LPToken', 'LPT3', ether('400.0'));
    this.lpToken4 = await MockToken.new('LPToken', 'LPT4', ether('400.0'));
    this.xbg = await MockToken.new('xbg', 'xbg', ether('8000.0'));

    const timestamp = await time.latest();
    this.startTime = timestamp.add(time.duration.days('1'));

    this.sm = await StakingManager.new(this.xbg.address, this.startTime);
    await time.increase(time.duration.hours('12'));
  });

  it('should return correct timing parameters', async () => {
    expect(await this.sm.startTime()).to.be.bignumber.equal(this.startTime);
    expect(await this.sm.endTime()).to.be.bignumber.equal(this.startTime.add(time.duration.days('7')));
    expect(await this.sm.currentDay()).to.be.bignumber.equal(new BN('0'));
    await time.increase(time.duration.days('1'));
    expect(await this.sm.currentDay()).to.be.bignumber.equal(new BN('1'));
    await time.increase(time.duration.days('6'));
    expect(await this.sm.currentDay()).to.be.bignumber.equal(new BN('7'));
    await time.increase(time.duration.days('1'));
    expect(await this.sm.currentDay()).to.be.bignumber.equal(new BN('0'));
  });

  describe('when contract has initialized', async () => {
    beforeEach(async () => {
      await this.xbg.approve(this.sm.address, ether('8000.0'));
      await this.sm.configure([this.lpToken1.address, this.lpToken2.address, this.lpToken3.address, this.lpToken4.address]);
    });

    it('should return correct pool parameters', async () => {
      expect(await this.sm.tokenXbg()).to.equal(this.xbg.address);
      const poolAddresses = await this.sm.getPools();
      expect(poolAddresses[0]).to.equal(this.lpToken1.address);
      expect(poolAddresses[1]).to.equal(this.lpToken2.address);
      expect(poolAddresses[2]).to.equal(this.lpToken3.address);
      expect(poolAddresses[3]).to.equal(this.lpToken4.address);
    });

    it('should throw an exception when liquidity has added outside staking period', async () => {
      await this.lpToken1.approve(this.sm.address, ether('100.0'));
      await expectRevert(this.sm.addStake(recipient, this.lpToken1.address, ether('10.0')),
        'The time has not come yet');
      await time.increase(time.duration.days('8'));
      await expectRevert(this.sm.addStake(recipient, this.lpToken1.address, ether('10.0')),
        'stakings has finished');
    });

    describe('when contract has started', async () => {
      beforeEach(async () => {
        await time.increase(time.duration.days('1'));
      });

      it('should return correct pool values when adding liquidity through a contract', async () => {
        await this.lpToken1.approve(this.sm.address, ether('100.0'));
        await this.lpToken2.approve(this.sm.address, ether('100.0'));
        await this.lpToken3.approve(this.sm.address, ether('100.0'));
        await this.lpToken4.approve(this.sm.address, ether('100.0'));
        await this.sm.addStake(recipient, this.lpToken1.address, ether('50.0'));
        await time.increase(time.duration.days('1'));
        await this.sm.addStake(recipient, this.lpToken1.address, ether('50.0'));
        await time.increase(time.duration.days('1'));
        await this.sm.addStake(recipient, this.lpToken2.address, ether('50.0'));
        await this.sm.addStake(recipient, this.lpToken3.address, ether('25.0'));
        await time.increase(time.duration.days('4'));
        await this.sm.addStake(recipient, this.lpToken4.address, ether('10.0'));
        const stakes = await this.sm.getStake(recipient);
        expect(stakes[0]).to.be.bignumber.equal(ether('100.0'));
        expect(stakes[1]).to.be.bignumber.equal(ether('50.0'));
        expect(stakes[2]).to.be.bignumber.equal(ether('25.0'));
        expect(stakes[3]).to.be.bignumber.equal(ether('10.0'));
        checkStakeInfoPerDay(await this.sm.getStakeInfoPerDay(recipient, this.lpToken1.address),
          [
            ether('50'),
            ether('50'),
            ether('0'),
            ether('0'),
            ether('0'),
            ether('0'),
            ether('0')]);
        checkStakeInfoPerDay(await this.sm.getStakeInfoPerDay(recipient, this.lpToken2.address),
          [
            ether('0'),
            ether('0'),
            ether('50'),
            ether('0'),
            ether('0'),
            ether('0'),
            ether('0')]);
        checkStakeInfoPerDay(await this.sm.getStakeInfoPerDay(recipient, this.lpToken3.address),
          [
            ether('0'),
            ether('0'),
            ether('25'),
            ether('0'),
            ether('0'),
            ether('0'),
            ether('0')]);
        checkStakeInfoPerDay(await this.sm.getStakeInfoPerDay(recipient, this.lpToken4.address),
          [
            ether('0'),
            ether('0'),
            ether('0'),
            ether('0'),
            ether('0'),
            ether('0'),
            ether('10')]);
      });

      it('should throw an exception when using unacceptable pool token', async () => {
        const lpToken = await MockToken.new('LPToken', 'LPT', ether('400.0'));
        await lpToken.approve(this.sm.address, ether('100.0'));
        await expectRevert(this.sm.addStake(recipient, lpToken.address, ether('100.0')),
          'Pool not found');
      });

      it('should right calculate reward', async () => {
        expect(await this.sm.totalRewardForPool(this.lpToken1.address)).to.be.bignumber.equal(ether('2000.0'));
        expect(await this.sm.totalRewardForPool(this.lpToken2.address)).to.be.bignumber.equal(ether('2000.0'));
        expect(await this.sm.totalRewardForPool(this.lpToken3.address)).to.be.bignumber.equal(ether('2000.0'));
        expect(await this.sm.totalRewardForPool(this.lpToken4.address)).to.be.bignumber.equal(ether('2000.0'));
      });
    });
  });
});
