const { assert } = require('chai');
const { increaseTime, currentTimestamp, DAY } = require('./common');

const EURxb = artifacts.require('EURxb');

contract('EURxb', (accounts) => {
  const recipient = accounts[1];

  const daysAYear = 365;

  let token;

  beforeEach(async () => {
    token = await EURxb.new();
  });

  it('should return correct balance values', async () => {
    const timestamp = await currentTimestamp();
    await token.mint(recipient, web3.utils.toWei('100', 'ether'));
    await token.addNewMaturity(web3.utils.toWei('100', 'ether'), timestamp);
    await increaseTime(DAY * daysAYear);
    const balance = await token.balanceOf(recipient);
    assert(balance > web3.utils.toWei('106999999999999999000', 'wei'));
    assert(balance < web3.utils.toWei('107000000000000002000', 'wei'));
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
    const timestamp1 = timestamp + DAY * (daysAYear * 3);
    const timestamp2 = timestamp + DAY * (daysAYear * 3);
    const timestamp3 = timestamp + DAY * (daysAYear * 3);
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
    await increaseTime(DAY * 2);
    await token.mint(recipient, web3.utils.toWei('150', 'ether'));
    await token.addNewMaturity(web3.utils.toWei('150', 'ether'), timestamp + DAY * 2);

    await token.accrueInterest();

    assert.equal(await token.totalActiveValue(), web3.utils.toWei('150', 'ether'));
    // TODO: Incorrect calculations
    // const expIndex = await token.expIndex()
    // assert(expIndex > web3.utils.toWei('1000000000000000000', 'wei'));
    // assert(expIndex < web3.utils.toWei('1000900000000000000', 'wei'));
  });
});
