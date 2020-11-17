
const SecurityAssetToken = artifacts.require('SecurityAssetToken');
const BondTokenMock = artifacts.require('NFBondTokenMock');
const TokenAccessRoles = artifacts.require('TokenAccessRoles');

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    await deployer.deploy(TokenAccessRoles);
    await deployer.link(TokenAccessRoles, BondTokenMock);
    await deployer.link(TokenAccessRoles, SecurityAssetToken);
  });
}
