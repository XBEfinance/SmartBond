
const SecurityAssetToken = artifacts.require('SecurityAssetToken');
const BondTokenMock = artifacts.require('NFBondTokenMock');
const TokenAccessRoles = artifacts.require('TokenAccessRoles');
const AllowList = artifacts.require('AllowList');

module.exports = (deployer) => {
  deployer.then(async () => {
    await deployer.deploy(TokenAccessRoles);
    await deployer.deploy(AllowList);
    await deployer.link(TokenAccessRoles, BondTokenMock);
    await deployer.link(AllowList, BondTokenMock);
    await deployer.link(TokenAccessRoles, SecurityAssetToken);
    await deployer.link(AllowList, SecurityAssetToken);
  });
}
