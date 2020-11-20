
const SecurityAssetToken = artifacts.require('SecurityAssetToken');
const BondTokenMock = artifacts.require('BondTokenMock');
const BondToken = artifacts.require('BondToken');
const TokenAccessRoles = artifacts.require('TokenAccessRoles');
const DDP = artifacts.require('DDPMock');

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    await deployer.deploy(TokenAccessRoles);
    await deployer.link(TokenAccessRoles, BondTokenMock);
    await deployer.link(TokenAccessRoles, BondToken);
    await deployer.link(TokenAccessRoles, SecurityAssetToken);
  });
}
