const { assert } = require('chai');
const { increaseTime, DAY } = require('./common');

const EURxb = artifacts.require('EURxb');

contract('EURxb', (accounts) => {
  const recipient = accounts[1];

  let token;

  beforeEach(async () => {
    token = await EURxb.new();
  });

  it('should return correct balance values', async () => {
    await token.mint(recipient, web3.utils.toWei('100', 'ether'));
    await increaseTime(DAY * 365);
    const balance = await token.balanceOf(recipient);
    assert(balance > web3.utils.toWei('106999999999999999000', 'wei'));
    assert(balance < web3.utils.toWei('107000000000000002000', 'wei'));
  });

  it('should return correct balance approximation values', async () => {
    await token.mint(recipient, web3.utils.toWei('100', 'ether'));
    let year = 365;
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
    const timestamp1 = DAY * 1;
    const timestamp2 = DAY * 2;
    const timestamp3 = DAY * 3;
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
