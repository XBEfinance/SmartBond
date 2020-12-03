const { assert } = require('chai');
const { expectRevert } = require('@openzeppelin/test-helpers');
const { increaseTime, currentTimestamp, DAY } = require('./common');

const EURxb = artifacts.require('EURxb');

contract('EURxb', (accounts) => {
  const owner = accounts[0];
  const recipient = accounts[1];
  const sender = accounts[2];

  const daysAYear = 365;

  let token;

  beforeEach(async () => {
    token = await EURxb.new(owner);
    await token.configure(owner);
  });

  it('should create EURxb contract and show default parameters', async () => {
    assert.equal(await token.name(), 'EURxb');
    assert.equal(await token.symbol(), 'EURxb');
    assert.equal(await token.decimals(), 18);
    assert.equal(await token.totalSupply(), 0);

    assert.equal(await token.countMaturity(), 100);
    assert.equal(await token.totalActiveValue(), 0);
    assert.equal(await token.annualInterest(), web3.utils.toWei('70', 'finney'));
    assert.equal(await token.accrualTimestamp(), 0);
    assert.equal(await token.expIndex(), web3.utils.toWei('1', 'ether'));
  });

  it('should correct change EURxb parameters', async () => {
    assert.equal(await token.countMaturity(), 100);
    await expectRevert(token.setCountMaturity(0), 'The amount must be greater than zero');
    await token.setCountMaturity(200);
    assert.equal(await token.countMaturity(), 200);
  });

  it('should return correct balance values', async () => {
    const timestamp = await currentTimestamp();
    await token.mint(recipient, web3.utils.toWei('100', 'ether'));
    await token.addNewMaturity(web3.utils.toWei('100', 'ether'), timestamp);
    await increaseTime(DAY * daysAYear);

    let balance = await token.balanceOf(recipient);
    assert(balance > web3.utils.toWei('106999999999999900000', 'wei'));
    assert(balance < web3.utils.toWei('107000000000000900000', 'wei'));

    // await token.approve(sender, web3.utils.toWei('100', 'ether'), { from: recipient });
    await token.transfer(sender, web3.utils.toWei('100', 'ether'), { from: recipient });
    assert.equal(await token.balanceOf(sender), web3.utils.toWei('100', 'ether'));

    balance = await token.balanceOf(recipient);
    assert(balance > web3.utils.toWei('6999999999999900000', 'wei'));
    assert(balance < web3.utils.toWei('7000000000000900000', 'wei'));
  });

  it('should return correct balance approximation values', async () => {
    const timestamp = await currentTimestamp();
    await token.mint(recipient, web3.utils.toWei('100', 'ether'));
    await token.addNewMaturity(web3.utils.toWei('100', 'ether'), timestamp);
    let year = daysAYear;
    while (year > 0) {
      /* eslint-disable */
      await increaseTime(DAY);
      await token.accrueInterest();
      year--;
      /* eslint-enable */
    }
    const balance = await token.balanceOf(recipient);
    assert(balance > web3.utils.toWei('107200000000000000000', 'wei'));
    assert(balance < web3.utils.toWei('107290000000000000000', 'wei'));
  });

  it('should return correct adding maturity', async () => {
    const timestamp = await currentTimestamp();
    // Because in the previous tests the time goes 2 years ahead
    const timestamp1 = timestamp + DAY * (daysAYear * 3) + 1;
    const timestamp2 = timestamp + DAY * (daysAYear * 3) + 2;
    const timestamp3 = timestamp + DAY * (daysAYear * 3) + 3;
    await token.mint(recipient, web3.utils.toWei('100', 'ether'));
    await token.addNewMaturity(web3.utils.toWei('100', 'ether'), timestamp1);

    assert.equal(await token.totalSupply(), web3.utils.toWei('100', 'ether'));
    assert.equal(await token.totalActiveValue(), web3.utils.toWei('100', 'ether'));
    assert.equal(await token.getFirstMaturity(), timestamp1);
    assert.equal(await token.getLastMaturity(), timestamp1);

    await token.mint(recipient, web3.utils.toWei('100', 'ether'));
    await token.addNewMaturity(web3.utils.toWei('100', 'ether'), timestamp3);

    assert.equal(await token.totalSupply(), web3.utils.toWei('200', 'ether'));
    assert.equal(await token.totalActiveValue(), web3.utils.toWei('200', 'ether'));
    assert.equal(await token.getFirstMaturity(), timestamp1);
    assert.equal(await token.getLastMaturity(), timestamp3);

    await token.mint(recipient, web3.utils.toWei('100', 'ether'));
    await token.addNewMaturity(web3.utils.toWei('100', 'ether'), timestamp2);

    assert.equal(await token.totalSupply(), web3.utils.toWei('300', 'ether'));
    assert.equal(await token.totalActiveValue(), web3.utils.toWei('300', 'ether'));
    assert.equal(await token.getFirstMaturity(), timestamp1);
    assert.equal(await token.getLastMaturity(), timestamp3);
  });

  it('should return correct calculate interest', async () => {
    const timestamp = await currentTimestamp();

    await token.mint(recipient, web3.utils.toWei('150', 'ether'));
    await token.addNewMaturity(web3.utils.toWei('150', 'ether'), timestamp + DAY * 1);
    let expIndex = await token.expIndex();
    assert.equal(expIndex, web3.utils.toWei('1', 'ether'));

    await increaseTime(DAY * 2);
    await token.mint(recipient, web3.utils.toWei('150', 'ether'));
    await token.addNewMaturity(web3.utils.toWei('150', 'ether'), timestamp + DAY * 2);

    expIndex = await token.expIndex();
    assert(expIndex > web3.utils.toWei('1', 'ether'));
    assert(expIndex < web3.utils.toWei('1001', 'finney')); // 1 ether = 1000 finney

    await token.accrueInterest();

    assert.equal(await token.totalActiveValue(), web3.utils.toWei('150', 'ether'));
    expIndex = await token.expIndex();
    assert(expIndex > web3.utils.toWei('1', 'ether'));
    assert(expIndex < web3.utils.toWei('1001', 'finney')); // 1 ether = 1000 finney
  });

  it('should return correct remove maturity', async () => {
    const timestamp = await currentTimestamp();
    // Because in the previous tests the time goes 5 years ahead
    const timestamp1 = timestamp + DAY * (daysAYear * 6) + 1;
    const timestamp2 = timestamp + DAY * (daysAYear * 6) + 2;
    const timestamp3 = timestamp + DAY * (daysAYear * 6) + 3;
    await token.mint(recipient, web3.utils.toWei('100', 'ether'));
    await token.addNewMaturity(web3.utils.toWei('100', 'ether'), timestamp1);

    await token.mint(recipient, web3.utils.toWei('100', 'ether'));
    await token.addNewMaturity(web3.utils.toWei('100', 'ether'), timestamp2);

    await token.mint(recipient, web3.utils.toWei('100', 'ether'));
    await token.addNewMaturity(web3.utils.toWei('100', 'ether'), timestamp3);

    assert.equal(await token.totalSupply(), web3.utils.toWei('300', 'ether'));
    assert.equal(await token.totalActiveValue(), web3.utils.toWei('300', 'ether'));
    assert.equal(await token.getFirstMaturity(), timestamp1);
    assert.equal(await token.getLastMaturity(), timestamp3);

    await token.removeMaturity(web3.utils.toWei('100', 'ether'), timestamp3);
    // Deletion does not occur, but only records that this
    // maturity should not be taken into account in the calculations.
    // Made for optimization
    assert.equal(await token.getLastMaturity(), timestamp3);
  });

  it('should throw an exception when the configure is called', async () => {
    await expectRevert(token.configure(sender, { from: sender }), 'Caller is not an admin');
  });

  it('should throw an exception when the mint and burn is called', async () => {
    await token.configure(recipient);
    await expectRevert(token.mint(sender, 0, { from: sender }), 'Caller is not an minter');
    await expectRevert(token.burn(sender, 0, { from: sender }), 'Caller is not an burner');
  });

  it('should throw an exception when the addNewMaturity is called', async () => {
    await expectRevert(token.addNewMaturity(0, 0), 'The amount must be greater than zero');
    await expectRevert(token.addNewMaturity(1, 0), 'End date must be greater than zero');
  });

  it('should throw an exception when the removeMaturity is called', async () => {
    await expectRevert(token.removeMaturity(0, 0), 'The amount must be greater than zero');
    await expectRevert(token.removeMaturity(1, 0), 'End date must be greater than zero');
    await expectRevert(token.removeMaturity(1, 1), 'The list does not exist');
  });
});
