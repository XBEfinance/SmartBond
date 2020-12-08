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

const { expect, assert } = chai;

const SecurityAssetToken = artifacts.require('SecurityAssetTokenMock');
const BondToken = artifacts.require('BondToken');
const AllowList = artifacts.require('AllowList');
const DDP = artifacts.require('DDPMock');
const Multisig = artifacts.require('MultiSignature');
const baseURI = '127.0.0.1/';

contract('MultiSignatureTest', (accounts) => {
  const zero = accounts[0];
  const deployer = zero;
  // just after deployment the deployer is also the operator
  const operator = deployer;
  const yorick = accounts[1];
  const alice = accounts[2];
  const bob = accounts[3];
  const charlie = accounts[4];
  const diana = accounts[5];
  const eva = accounts[6];
  const frank = accounts[7];
  const george = accounts[8];
  const hannah = accounts[9];

  const ETHER_100 = web3.utils.toWei('100', 'ether');
  const ETHER_0 = web3.utils.toWei('0', 'ether');
  const DATE_SHIFT = new BN('10000');
  const TOKEN_1 = new BN('0');
  const TOKEN_2 = new BN('2');
  const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

  beforeEach(async () => {
    this.founders = [
      zero,
      alice,
      bob,
      charlie,
      diana,
      eva,
      frank,
      george,
      hannah,
    ];

    this.threshold = new BN('6');

    this.multisig = await Multisig.new(
      this.founders,
      this.threshold,
      { from: deployer },
    );

    expect(
      await this.multisig.getThreshold(),
      'threshold must be 6',
    ).to.be.bignumber.equal(new BN('6'));

    this.list = await AllowList.new(this.multisig.address);
    this.bond = await BondToken.new(baseURI);
    this.sat = await SecurityAssetToken.new();
    this.ddp = await DDP.new(this.multisig.address);

    await this.bond.configure(
      this.list.address,
      this.sat.address,
      this.ddp.address,
    );

    await this.multisig.configure(
      this.list.address,
      this.ddp.address,
      this.sat.address,
    );
  });

  it('allow account success', async () => {
    expect(
      await this.list.isAllowedAccount(alice),
      'alice must not be allowed',
    ).equal(false);

    this.multisig.allowAccount(alice);

    expect(
      await this.list.isAllowedAccount(alice),
      'alice must be allowed',
    ).equal(true);
  });

  it('non-operator allow account failure', async () => {
    await expectRevert(
      this.list.allowAccount(alice, { from: yorick }),
      'user is not admin',
    );
  });

  it('disallow account success', async () => {
    expect(
      await this.list.isAllowedAccount(alice),
      'alice must not be allowed',
    ).equal(false);

    this.multisig.allowAccount(alice);

    expect(
      await this.list.isAllowedAccount(alice),
      'alice must be allowed',
    ).equal(true);

    this.multisig.disallowAccount(alice);

    expect(
      await this.list.isAllowedAccount(alice),
      'alice must not be allowed',
    ).equal(false);
  });

  it('non-operator disallow account failure', async () => {
    this.multisig.allowAccount(alice);

    expect(
      await this.list.isAllowedAccount(alice),
      'alice must be allowed',
    ).equal(true);

    await expectRevert(
      this.list.disallowAccount(alice, { from: bob }),
      'user is not admin',
    );
  });

  it('mint success', async () => {
    const { tx } = await this.multisig.mintSecurityAssetToken(
      alice,
      ETHER_100,
      DATE_SHIFT,
      { from: operator },
    );

    await expectEvent.inTransaction(
      tx,
      this.sat,
      'MintInvoked',
      { to: alice, value: ETHER_100, maturity: DATE_SHIFT },
    );
  });

  it('non-operator mint failure', async () => {
    await expectRevert(
      this.multisig.mintSecurityAssetToken(
        alice,
        ETHER_100,
        DATE_SHIFT,
        { from: bob },
      ),
      'user is not the operator',
    );
  });

  it('burn success', async () => {
    const { tx } = await this.multisig.burnSecurityAssetToken(
      TOKEN_1,
      { from: operator },
    );

    await expectEvent.inTransaction(
      tx,
      this.sat,
      'BurnInvoked',
      { tokenId: TOKEN_1 },
    );
  });

  it('non-operator burn failure', async () => {
    await expectRevert(
      this.multisig.burnSecurityAssetToken(TOKEN_1, { from: bob }),
      'user is not the operator',
    );
  });

  it('transfer success', async () => {
    await this.multisig.mintSecurityAssetToken(
      alice,
      ETHER_100,
      DATE_SHIFT,
      { from: operator },
    );

    const { tx } = await this.multisig.transferSecurityAssetToken(
      alice,
      bob,
      TOKEN_1,
      { from: operator },
    );

    await expectEvent.inTransaction(
      tx,
      this.sat,
      'TransferInvoked',
      { from: alice, to: bob, tokenId: TOKEN_1 },
    );
  });

  it('non-operator transfer failure', async () => {
    await this.multisig.mintSecurityAssetToken(
      alice,
      ETHER_100,
      DATE_SHIFT,
      { from: operator },
    );
    await expectRevert(
      this.multisig.transferSecurityAssetToken(
        alice,
        bob,
        TOKEN_1,
        { from: bob },
      ),
      'user is not the operator',
    );
  });

  it('set claim period success', async () => {
    const { tx } = await this.multisig.setClaimPeriod(
      new BN('10'),
      { from: operator },
    );

    await expectEvent.inTransaction(
      tx,
      this.ddp,
      'SetClaimPeriodInvoked',
      { claimPeriod: new BN('10') },
    );
  });

  it('non-operator set claim period failure', async () => {
    await expectRevert(
      this.multisig.setClaimPeriod(
        new BN('10'),
        { from: bob },
      ),
      'user is not the operator',
    );
  });
});
