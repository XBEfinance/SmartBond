const {assert} = require('chai');
const {time, BN, expectRevert} = require('openzeppelin-test-helpers');

const SecurityAssetToken = artifacts.require('SecurityAssetToken');
const BondToken = artifacts.require('NFBondTokenMock');
const AllowList = artifacts.require('AllowList');

const baseURI = "127.0.0.1/";

contract('SecurityAssetTokenTest', accounts => {
  const miris = accounts[1];
  const alice = accounts[2];
  const bob = accounts[3];

  beforeEach(async () => {
    this.list = await AllowList.new(miris);
    this.bond = await BondToken.new();
    this.sat = await SecurityAssetToken.new(baseURI, miris, this.bond.address,
                                            this.list.address);
  });

  // ----------- check minting -----------

  it('mint new SAT and Bond tokens', async () => {
    await this.list.allowAccount(alice, {from : miris});
    assert(!await this.bond.hasToken(new BN("0")),
           'bond token must not exist at this time point');

    await this.sat.mint(alice, web3.utils.toWei('100', 'ether'), new BN("100"),
                        {from : miris});
    assert(await this.bond.hasToken(new BN("0")),
           'Bond token `0` must has being created');
  });

  it('when minting tokenId increases', async () => {
    await this.list.allowAccount(alice, {from : miris});
    assert(!await this.bond.hasToken(new BN("0")),
           'bond token must not exist at this time point');

    await this.sat.mint(alice, web3.utils.toWei('100', 'ether'), new BN("100"),
                        {from : miris});

    assert(!await this.bond.hasToken(new BN("1")),
           'bond token `1` must not exist at this time point');

    assert(await this.bond.hasToken(new BN("0")),
           'Bond token `0` must has being created');

    await this.sat.mint(alice, web3.utils.toWei('100', 'ether'), new BN("100"),
                        {from : miris});

    assert(await this.bond.hasToken(new BN("1")),
           'bond token `1` must exist at this time point');
  });

  it('minting is not allowed for account not in allow list', async () => {
    await expectRevert(this.sat.mint(alice, web3.utils.toWei('100', 'ether'),
                                     new BN("100"), {from : miris}),
                       'user is not allowed to receive tokens');
  });

  //  // ----------- check burning -----------

  it('burning SAT is not allowed for non-miris account', async () => {
    await this.list.allowAccount(alice, {from : miris});
    await this.sat.mint(alice, web3.utils.toWei('100', 'ether'), new BN("100"),
                        {from : miris});
    await this.bond.burn(new BN("0")); // tokenId
    // owner cannot burn his token either
    await expectRevert(this.sat.burn(new BN("0"), {from : alice}),
                       'sender isn\'t a burner');
  });

  it('burning SAT is not allowed when corresponding Bond is still alive',
     async () => {
       await this.list.allowAccount(alice, {from : miris});
       await this.sat.mint(alice, web3.utils.toWei('100', 'ether'),
                           new BN("100"), {from : miris});
       assert(await this.bond.hasToken(new BN("0")),
              "bond token doesn't exist");
       expectRevert(this.sat.burn(new BN("0"), {from : miris}),
                    'bond token is still alive');
     });

  it('burn SAT', async () => {
    await this.list.allowAccount(alice, {from : miris});
    await this.sat.mint(alice, web3.utils.toWei('100', 'ether'), new BN("100"),
                        {from : miris});
    await this.bond.burn(new BN("0"));
    assert(!await this.bond.hasToken(new BN("0")), "bond token was not burned");
    await this.sat.burn(new BN("0"), {from : miris});
  });

  // ----------- check transfers -----------
  //  it('transfer token from alice to bob (single approval)', async () => {
  //    await this.list.allowAccount(alice, {from : miris});
  //    await this.list.allowAccount(bob, {from : miris});
  //
  //    await this.sat.mint(alice, web3.utils.toWei('100', 'ether'), new
  //    BN('100'), {from : miris}); await this.sat.approve(bob, new
  //    BN('0'), {from : alice}); await this.sat.transferFrom(alice, bob, new
  //    BN('0'), {from : miris});
  //  });

  //  it('transfer token from alice to bob (approve for all)', async () => {
  //    await this.list.allowAccount(alice, {from : miris});
  //    await this.list.allowAccount(bob, {from : miris});
  //
  //    await this.sat.mint(alice, new BN('100'), new BN('100'), {from :
  //    miris}); await this.sat.setApprovalForAll(bob, true, {from : alice});
  //    await this.sat.transferFrom(alice, bob, new BN('0'), {from : miris});
  //  });
  //
  //  it('transfer token from alice to bob: no approval failure', async () => {
  //    await this.list.allowAccount(alice, {from : miris});
  //    await this.list.allowAccount(bob, {from : miris});
  //
  //    await this.sat.mint(alice, new BN('100'), new BN('100'), {from :
  //    miris}); expectRevert(this.sat.transferFrom(alice, bob, new
  //    BN('1'), {from : miris}),
  //                 "transfer was not approved");
  //  });
  //
  //  it('transfer token from alice to bob: no transferer role failure ',
  //     async () => {
  //       await this.list.allowAccount(alice, {from : miris});
  //       await this.list.allowAccount(bob, {from : miris});
  //
  //       await this.sat.mint(alice, new BN('1'), new BN('100'), new BN('100'),
  //                           {from : miris});
  //       await this.sat.setApprovalForAll(bob, true, {from : alice});
  //       expectRevert(
  //           this.sat.transferFrom(alice, bob, new BN('1'), {from : alice}),
  //           "sender isn\'t a transferer");
  //     });
  //
  //  it('transfer token from alice to bob: not allowed account failure ',
  //     async () => {
  //       await this.list.allowAccount(alice, {from : miris});
  //       await this.sat.mint(alice, new BN('1'), new BN('100'), new BN('100'),
  //                           {from : miris});
  //       await this.sat.setApprovalForAll(bob, true, {from : alice});
  //       expectRevert(
  //           this.sat.transferFrom(alice, bob, new BN('1'), {from : miris}),
  //           "user is not allowed to receive tokens");
  //     });
  //
  
  // ----------- check total value -----------
  it('total value = 0 in the beginning', async () => {
    assert(await this.sat.totalValue() == web3.utils.toWei('0', 'ether'),
           "total value is not 0 in the beginning");
    await this.list.allowAccount(alice, {from : miris});
    await this.sat.mint(alice, web3.utils.toWei('100', 'ether'), new BN("100"),
                        {from : miris});
  });

  it('total value increases after minting', async () => {
    assert(await this.sat.totalValue() == web3.utils.toWei('0', 'ether'),
           "total value is not 0 in the beginning");
    await this.list.allowAccount(alice, {from : miris});
    await this.sat.mint(alice, web3.utils.toWei('100', 'ether'), new BN("100"),
                        {from : miris});
    assert(await this.sat.totalValue() == web3.utils.toWei('100', 'ether'),
           "total value is wrong after minting");
  });

  it('total value decreases after burning', async () => {
    assert(await this.sat.totalValue() == web3.utils.toWei('0', 'ether'),
           "total value is not 0 in the beginning");
    await this.list.allowAccount(alice, {from : miris});
    await this.sat.mint(alice, web3.utils.toWei('100', 'ether'), new BN("100"),
                        {from : miris});
    assert(await this.sat.totalValue() == web3.utils.toWei('100', 'ether'),
           "total value is wrong after minting");
    await this.bond.burn(new BN("0")); // burn bond before sat
    await this.sat.burn(new BN("0"), {from : miris});
    assert(await this.sat.totalValue() == web3.utils.toWei('0', 'ether'), "total value must be 0 again");
  });
});
