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

const SecurityAssetToken = artifacts.require('SecurityAssetToken');
const BondToken = artifacts.require('BondToken');
const AllowList = artifacts.require('AllowList');
const DDP = artifacts.require('DDP');
const EURxb = artifacts.require('EURxbMock');
const Vote = artifacts.require('OperatorVote');
const baseURI = '127.0.0.1/';

contract('OperatorVoteTest', (accounts) => {
  const zero = accounts[0];
  const multisig = accounts[1];
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
  const TOKEN_1 = new BN('1');
  const TOKEN_2 = new BN('2');
  const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

  beforeEach(async () => {
    this.list = await AllowList.new(multisig);
    this.bond = await BondToken.new(baseURI);
    this.sat = await SecurityAssetToken
      .new(baseURI,
        multisig,
        this.bond.address,
        this.list.address);

    this.ddp = await DDP.new(multisig);

    await this.bond.configure(this.list.address, this.sat.address, this.ddp.address);

    this.eurxb = await EURxb.new();

    await this.ddp.configure(
      this.bond.address,
      this.eurxb.address,
      this.list.address,
    );

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
    this.vote = await Vote.new(this.founders, this.threshold, { from: multisig });
    expect(
      await this.vote.getThreshold(),
      'threshold must be 6',
    ).to.be.bignumber.equal(new BN('6'));
  });

  it('operator in the beginning is contract deployer', async () => {
    expect(await this.vote.getOperator(), 'operator is not deployer').equal(multisig);
  });

  it('only founders can vote failure', async () => {
    // multisig is currently operator, but not founder
    await expectRevert(
      this.vote.voteOperator(alice, { from: multisig }),
      'user is not a founder',
    );
  });

  it('one cannot vote twice for same candidate failure', async () => {
    this.vote.voteOperator(alice, { from: zero });
    await expectRevert(
      this.vote.voteOperator(alice, { from: zero }),
      'you have already voted',
    );
  });

  it('one can vote for several candidates', async () => {
    this.vote.voteOperator(alice, { from: zero });
    this.vote.voteOperator(bob, { from: zero });

    expect(
      await this.vote.getNumberVotes(alice),
      '1 vote for alice',
    ).to.be.bignumber.equal(new BN('1'));

    expect(
      await this.vote.getNumberVotes(bob),
      '1 vote for bob',
    ).to.be.bignumber.equal(new BN('1'));
  });

  it('the one who has more votes wins', async () => {
    await this.vote.voteOperator(alice, { from: zero });
    await this.vote.voteOperator(alice, { from: alice });
    await this.vote.voteOperator(alice, { from: bob });
    await this.vote.voteOperator(alice, { from: charlie });
    await this.vote.voteOperator(alice, { from: diana });

    await this.vote.voteOperator(bob, { from: zero });
    await this.vote.voteOperator(bob, { from: alice });
    await this.vote.voteOperator(bob, { from: bob });
    await this.vote.voteOperator(bob, { from: charlie });
    await this.vote.voteOperator(bob, { from: diana });

    expect(
      await this.vote.getNumberVotes(alice),
      '5 votes for bob',
    ).to.be.bignumber.equal(new BN('5'));

    await this.vote.voteOperator(alice, { from: eva });

    expect(
      await this.vote.getNumberVotes(bob),
      '5 votes for bob',
    ).to.be.bignumber.equal(new BN('5'));

    expect(
      await this.vote.getNumberVotes(alice),
      '0 votes for alice',
    ).to.be.bignumber.equal(new BN('0'));
  });

  it('voting in detail', async () => {
    // anyone can call getNumberVotes
    expect(
      await this.vote.getNumberVotes(alice),
      'no votes for alice yet',
    ).to.be.bignumber.equal(new BN('0'));

    await this.vote.voteOperator(alice, { from: zero });
    expect(
      await this.vote.getNumberVotes(alice),
      'one vote for alice',
    ).to.be.bignumber.equal(new BN('1'));

    // yes, you can promote yourself
    await this.vote.voteOperator(alice, { from: alice });
    expect(
      await this.vote.getNumberVotes(alice),
      '2 votes for alice',
    ).to.be.bignumber.equal(new BN('2'));

    await this.vote.voteOperator(alice, { from: bob });
    await this.vote.voteOperator(alice, { from: charlie });
    await this.vote.voteOperator(alice, { from: diana });
    expect(
      await this.vote.getNumberVotes(alice),
      '5 votes for alice',
    ).to.be.bignumber.equal(new BN('5'));

    await this.vote.voteOperator(alice, { from: eva });
    expect(
      await this.vote.getNumberVotes(alice),
      '0 votes for alice',
    ).to.be.bignumber.equal(new BN('0'));

    expect(await this.vote.getOperator(), 'operator is now alice').equal(alice);
  });
});
