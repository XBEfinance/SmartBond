const chai = require('chai');
chai.use(require('chai-as-promised'));

const { expect, assert } = chai;
const {
  expectRevert,
  ether,
  time,
  BN,
} = require('@openzeppelin/test-helpers');
const { balanceByTime } = require('./utils/euroxb_calculation');

const EURxb = artifacts.require('EURxb');

const newBN = (value_str = '1.0') => new BN(web3.utils.toWei(value_str, 'ether'));
const compactView = value_BN => web3.utils.fromWei(value_BN.toString(), 'ether');

contract('EURxb', (accounts) => {
  const owner = accounts[0];
  const recipient = accounts[1];
  const sender = accounts[2];

  const days364 = time.duration.years('1') - time.duration.days('1');
  const year = time.duration.years('1');
  const halfYear = time.duration.years('1').div(2);
  const day = time.duration.days('1');

  beforeEach(async () => {
    this.token = await EURxb.new(owner);
    await this.token.configure(owner);
  });

  it('should create EURxb contract and show default parameters', async () => {
    assert.equal(await this.token.name(), 'EURxb');
    assert.equal(await this.token.symbol(), 'EURxb');
    assert.equal(await this.token.decimals(), 18);
    assert.equal(await this.token.totalSupply(), 0);

    assert.equal(await this.token.countMaturity(), 100);
    assert.equal(await this.token.totalActiveValue(), 0);
    expect(await this.token.annualInterest()).to.be.bignumber.equal(newBN('0.07'));
    assert.equal(await this.token.accrualTimestamp(), 0);
    expect(await this.token.expIndex()).to.be.bignumber.equal(newBN());
  });

  it('should correct change EURxb parameters', async () => {
    assert.equal(await this.token.countMaturity(), 100);
    await expectRevert(this.token.setCountMaturity(0), 'The amount must be greater than zero');
    await this.token.setCountMaturity(200);
    assert.equal(await this.token.countMaturity(), 200);
  });

  it('should return correct balance values', async () => {
    const timestamp = await time.latest();
    const startBalanceRecipient = ether('100');

    await this.token.mint(recipient, startBalanceRecipient);
    await this.token.addNewMaturity(startBalanceRecipient, timestamp.add(halfYear));
    await this.token.mint(sender, ether('100'));
    await this.token.addNewMaturity(ether('100'), timestamp.add(days364));

    let balanceRecipient = await this.token.balanceOf(recipient);
    assert(balanceRecipient >= ether('100'));
    assert(balanceRecipient < ether('100.0000000000009'));

    await time.increase(year);

    const { balance: balanceAfterYear } = balanceByTime(
      ether('100'), // userBalance,
      newBN(), // userIndex,
      timestamp, // userTimestamp,
      newBN(), // expIndex,
      timestamp.add(year), // timestamp,
      ether('200'), // totalSupply,
      ether('200'), // totalActiveValue,
      [
        timestamp.add(halfYear),
        timestamp.add(days364)], // maturityEnds,
      [ether('100'), ether('100')], // maturityAmounts,
    );

    balanceRecipient = await this.token.balanceOf(recipient);
    // console.log('balanceRecipient: ', compactView(balanceRecipient));
    // console.log('balanceAfterYear: ', compactView(balanceAfterYear));
    const maxError = (balanceRecipient.sub(startBalanceRecipient)).div(new BN('1000')); // 0.1%
    assert(balanceRecipient > balanceAfterYear.sub(maxError));
    assert(balanceRecipient < balanceAfterYear.add(maxError));

    let balanceSender = await this.token.balanceOf(sender);
    // console.log('balanceSender:    ', compactView(balanceSender));
    // console.log('balanceAfterYear: ', compactView(balanceAfterYear));
    assert(balanceSender > balanceAfterYear.sub(maxError));
    assert(balanceSender < balanceAfterYear.add(maxError));

    // after end of all maturity periods users balances does not increasing
    await time.increase(year);

    balanceRecipient = await this.token.balanceOf(recipient);
    assert(balanceRecipient > balanceAfterYear.sub(maxError));
    assert(balanceRecipient < balanceAfterYear.add(maxError));

    balanceSender = await this.token.balanceOf(sender);
    assert(balanceSender > balanceAfterYear.sub(maxError));
    assert(balanceSender < balanceAfterYear.add(maxError));
  });

  it('should return correct balance approximation values', async () => {
    const timestamp = await time.latest();

    const startBalanceRecipient = ether('100');
    await this.token.mint(recipient, startBalanceRecipient);
    await this.token.addNewMaturity(startBalanceRecipient, timestamp.add(halfYear));
    await this.token.mint(sender, ether('100'));
    await this.token.addNewMaturity(ether('100'), timestamp.add(days364));

    let expIndex = newBN();
    let userTimestamp = timestamp;
    let expectedUserBalance = startBalanceRecipient;

    let days = 365;
    while (days > 0) {
      ({ balance: expectedUserBalance, expIndex } = balanceByTime(
        expectedUserBalance, // userBalance,
        expIndex, // userIndex,
        userTimestamp, // userTimestamp,
        expIndex, // expIndex,
        userTimestamp + day, // timestamp,
        ether('200'), // totalSupply,
        ether('200'), // totalActiveValue,
        [timestamp.add(halfYear), timestamp.add(days364)], // maturityEnds,
        [ether('100'), ether('100')], // maturityAmounts,
      ));
      userTimestamp += day;
      /* eslint-disable */
      await time.increase(day);
      await this.token.accrueInterest();
      days--;
      /* eslint-enable */
    }

    const balanceRecipient = await this.token.balanceOf(recipient);
    // console.log('balanceRecipient:    ', compactView(balanceRecipient));
    // console.log('expectedUserBalance: ', compactView(expectedUserBalance));
    const maxError = (balanceRecipient.sub(startBalanceRecipient)).div(new BN('1000')); // 0.1%
    assert(balanceRecipient > expectedUserBalance.sub(maxError));
    assert(balanceRecipient < expectedUserBalance.add(maxError));

    const balanceSender = await this.token.balanceOf(sender);
    // console.log('balanceSender:       ', compactView(balanceSender));
    // console.log('expectedUserBalance: ', compactView(expectedUserBalance));
    assert(balanceSender > expectedUserBalance.sub(maxError));
    assert(balanceSender < expectedUserBalance.add(maxError));
  });

  it('should return correct adding maturity', async () => {
    const timestamp = await time.latest();

    const timestamp1 = timestamp.add(year).add(time.duration.seconds('1'));
    const timestamp2 = timestamp.add(year).add(time.duration.seconds('2'));
    const timestamp3 = timestamp.add(year).add(time.duration.seconds('3'));
    const timestamp4 = timestamp.add(year).add(time.duration.seconds('4'));

    await this.token.mint(recipient, ether('100'));
    await this.token.addNewMaturity(ether('100'), timestamp2);

    expect(await this.token.totalSupply()).to.be.bignumber.equal(ether('100'));
    expect(await this.token.totalActiveValue()).to.be.bignumber.equal(ether('100'));
    assert.equal(await this.token.getFirstMaturity(), timestamp2);
    assert.equal(await this.token.getLastMaturity(), timestamp2);

    let headId = await this.token.getFirstMaturityId();
    assert.equal(headId, 1);
    let node0 = await this.token.getMaturityInfo(headId);
    expect(node0[0]).to.be.bignumber.equal(ether('100'));
    assert.equal(node0[1], timestamp2);
    assert.equal(node0[2], 0);
    assert.equal(node0[3], 0);

    await this.token.mint(recipient, ether('100'));
    await this.token.addNewMaturity(ether('100'), timestamp4);

    expect(await this.token.totalSupply()).to.be.bignumber.equal(ether('200'));
    expect(await this.token.totalActiveValue()).to.be.bignumber.equal(ether('200'));
    assert.equal(await this.token.getFirstMaturity(), timestamp2);
    assert.equal(await this.token.getLastMaturity(), timestamp4);

    headId = await this.token.getFirstMaturityId();
    assert.equal(headId, 1);
    node0 = await this.token.getMaturityInfo(headId);
    expect(node0[0]).to.be.bignumber.equal(ether('100'));
    assert.equal(node0[1], timestamp2);
    assert.equal(node0[2], 0);
    assert.equal(node0[3], 2);
    let node1 = await this.token.getMaturityInfo(2);
    expect(node1[0]).to.be.bignumber.equal(ether('100'));
    assert.equal(node1[1], timestamp4);
    assert.equal(node1[2], 1);
    assert.equal(node1[3], 0);

    await this.token.mint(recipient, ether('100'));
    await this.token.addNewMaturity(ether('100'), timestamp3);

    expect(await this.token.totalSupply()).to.be.bignumber.equal(ether('300'));
    expect(await this.token.totalActiveValue()).to.be.bignumber.equal(ether('300'));
    assert.equal(await this.token.getFirstMaturity(), timestamp2);
    assert.equal(await this.token.getLastMaturity(), timestamp4);

    headId = await this.token.getFirstMaturityId();
    node0 = await this.token.getMaturityInfo(headId);
    expect(node0[0]).to.be.bignumber.equal(ether('100'));
    assert.equal(node0[1], timestamp2);
    assert.equal(node0[2], 0);
    assert.equal(node0[3], 3);
    node1 = await this.token.getMaturityInfo(3);
    expect(node1[0]).to.be.bignumber.equal(ether('100'));
    assert.equal(node1[1], timestamp3);
    assert.equal(node1[2], 1);
    assert.equal(node1[3], 2);
    let node2 = await this.token.getMaturityInfo(2);
    expect(node2[0]).to.be.bignumber.equal(ether('100'));
    assert.equal(node2[1], timestamp4);
    assert.equal(node2[2], 3);
    assert.equal(node2[3], 0);

    await this.token.mint(recipient, ether('100'));
    await this.token.addNewMaturity(ether('100'), timestamp1);

    expect(await this.token.totalSupply()).to.be.bignumber.equal(ether('400'));
    expect(await this.token.totalActiveValue()).to.be.bignumber.equal(ether('400'));
    assert.equal(await this.token.getFirstMaturity(), timestamp1);
    assert.equal(await this.token.getLastMaturity(), timestamp4);

    headId = await this.token.getFirstMaturityId();
    node0 = await this.token.getMaturityInfo(headId);
    expect(node0[0]).to.be.bignumber.equal(ether('100'));
    assert.equal(node0[1], timestamp1);
    assert.equal(node0[2], 0);
    assert.equal(node0[3], 1);
    node1 = await this.token.getMaturityInfo(1);
    expect(node1[0]).to.be.bignumber.equal(ether('100'));
    assert.equal(node1[1], timestamp2);
    assert.equal(node1[2], 4);
    assert.equal(node1[3], 3);
    node2 = await this.token.getMaturityInfo(3);
    expect(node2[0]).to.be.bignumber.equal(ether('100'));
    assert.equal(node2[1], timestamp3);
    assert.equal(node2[2], 1);
    assert.equal(node2[3], 2);
    let node3 = await this.token.getMaturityInfo(2);
    expect(node3[0]).to.be.bignumber.equal(ether('100'));
    assert.equal(node3[1], timestamp4);
    assert.equal(node3[2], 3);
    assert.equal(node3[3], 0);

    await this.token.mint(recipient, ether('100'));
    await this.token.addNewMaturity(ether('100'), timestamp3);

    expect(await this.token.totalSupply()).to.be.bignumber.equal(ether('500'));
    expect(await this.token.totalActiveValue()).to.be.bignumber.equal(ether('500'));
    assert.equal(await this.token.getFirstMaturity(), timestamp1);
    assert.equal(await this.token.getLastMaturity(), timestamp4);

    headId = await this.token.getFirstMaturityId();
    node0 = await this.token.getMaturityInfo(headId);
    expect(node0[0]).to.be.bignumber.equal(ether('100'));
    assert.equal(node0[1], timestamp1);
    assert.equal(node0[2], 0);
    assert.equal(node0[3], 1);
    node1 = await this.token.getMaturityInfo(1);
    expect(node1[0]).to.be.bignumber.equal(ether('100'));
    assert.equal(node1[1], timestamp2);
    assert.equal(node1[2], 4);
    assert.equal(node1[3], 3);
    node2 = await this.token.getMaturityInfo(3);
    expect(node2[0]).to.be.bignumber.equal(ether('200'));
    assert.equal(node2[1], timestamp3);
    assert.equal(node2[2], 1);
    assert.equal(node2[3], 2);
    node3 = await this.token.getMaturityInfo(2);
    expect(node3[0]).to.be.bignumber.equal(ether('100'));
    assert.equal(node3[1], timestamp4);
    assert.equal(node3[2], 3);
    assert.equal(node3[3], 0);
  });

  it('should return correct calculate interest', async () => {
    const timestamp = await time.latest();

    await this.token.mint(recipient, ether('150'));
    await this.token.addNewMaturity(ether('150'), timestamp.add(halfYear));

    let expIndex = await this.token.expIndex();
    expect(expIndex).to.be.bignumber.equal(newBN());

    await this.token.mint(recipient, ether('150'));
    await this.token.addNewMaturity(ether('150'), timestamp.add(days364));

    expIndex = await this.token.expIndex();
    expect(expIndex).to.be.bignumber.equal(newBN());

    await time.increase(day);
    await this.token.accrueInterest();

    const { expIndex: expectedExpIndex } = balanceByTime(
      ether('100'), // userBalance,
      newBN(), // userIndex,
      timestamp, // userTimestamp,
      newBN(), // expIndex,
      timestamp.add(day), // timestamp,
      ether('300'), // totalSupply,
      ether('300'), // totalActiveValue,
      [timestamp.add(halfYear), timestamp.add(days364)], // maturityEnds,
      [ether('150'), ether('150')], // maturityAmounts,
    );

    expIndex = await this.token.expIndex();
    expect(expIndex).to.be.bignumber.equal(expectedExpIndex);
  });

  it('should return correct remove maturity', async () => {
    const timestamp = await time.latest();

    const timestamp1 = timestamp.add(year).add(time.duration.seconds('1'));
    const timestamp2 = timestamp.add(year).add(time.duration.seconds('1'));

    await this.token.mint(recipient, ether('100'));
    await this.token.addNewMaturity(ether('100'), timestamp1);

    await this.token.mint(recipient, ether('100'));
    await this.token.addNewMaturity(ether('100'), timestamp2);

    await this.token.mint(recipient, ether('100'));
    await this.token.addNewMaturity(ether('100'), timestamp2);

    expect(await this.token.totalSupply()).to.be.bignumber.equal(ether('300'));
    expect(await this.token.totalActiveValue()).to.be.bignumber.equal(ether('300'));
    expect((await this.token.getMaturityInfo(1))[0]).to.be.bignumber.equal(ether('100'));
    expect((await this.token.getMaturityInfo(2))[0]).to.be.bignumber.equal(ether('200'));

    await this.token.removeMaturity(ether('100'), timestamp2);
    // Deletion does not occur, but only records that this
    // maturity should not be taken into account in the calculations.
    // Made for optimization
    expect(await this.token.totalSupply()).to.be.bignumber.equal(ether('300'));
    assert.equal(await this.token.getLastMaturity(), timestamp2);
    expect(await this.token.totalActiveValue()).to.be.bignumber.equal(ether('200'));
    expect((await this.token.getMaturityInfo(1))[0]).to.be.bignumber.equal(ether('100'));
    expect((await this.token.getMaturityInfo(2))[0]).to.be.bignumber.equal(ether('100'));

    await this.token.removeMaturity(ether('100'), timestamp2);
    expect(await this.token.totalActiveValue()).to.be.bignumber.equal(ether('100'));
    expect((await this.token.getMaturityInfo(1))[0]).to.be.bignumber.equal(ether('100'));
    expect((await this.token.getMaturityInfo(2))[0]).to.be.bignumber.equal(ether('0'));

    await this.token.removeMaturity(ether('100'), timestamp1);
    expect(await this.token.totalActiveValue()).to.be.bignumber.equal(ether('0'));
    expect((await this.token.getMaturityInfo(1))[0]).to.be.bignumber.equal(ether('0'));
    expect((await this.token.getMaturityInfo(2))[0]).to.be.bignumber.equal(ether('0'));
  });
});
