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
    await token.mint(recipient, web3.utils.toWei('100', 'ether'));
    await increaseTime(DAY * daysAYear);
    const balance = await token.balanceOf(recipient);
    // TODO: change to real values
    // when the calculations are ready
    // console.log(balance);
    // assert(balance > web3.utils.toWei('106999999999999999000', 'wei'));
    // assert(balance < web3.utils.toWei('107000000000000002000', 'wei'));
  });

  it('should return correct balance approximation values', async () => {
    await token.mint(recipient, web3.utils.toWei('100', 'ether'));
    let year = daysAYear;
    while (year > 0) {
      /* eslint-disable */
      await increaseTime(DAY);
      await token.accrueInterest();
      year--;
      /* eslint-enable */
    }
    const balance = await token.balanceOf(recipient);
    // TODO: change to real values
    // when the calculations are ready
    // console.log(balance);
    // assert(balance > web3.utils.toWei('107200000000000000000', 'wei'));
    // assert(balance < web3.utils.toWei('107290000000000000000', 'wei'));
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
});
