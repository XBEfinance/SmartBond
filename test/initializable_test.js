/* eslint no-unused-vars: 0 */
/* eslint eqeqeq: 0 */

const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require('@openzeppelin/test-helpers');

const chai = require('chai');
chai.use(require('chai-as-promised'));
// chai.use(require('chai-bignumber')(BN));

const { expect, assert } = chai;

const Initializable = artifacts.require('InitializableTest');

contract('InitializableTest', (accounts) => {
  const alice = accounts[2];

  beforeEach(async () => {
    this.initializable = await Initializable.new();
  });

  it('initialize once is ok', async () => {
    this.initializable.configure();
  });

  it('initialize second time fails', async () => {
    this.initializable.configure();
    await expectRevert(this.initializable.configure(),
      'contract already initialized');
  });

  it('non-deployer initialize fails', async () => {
    await expectRevert(this.initializable.configure({ from: alice }),
      'user not allowed to initialize');
  });
});
