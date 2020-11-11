
const SecurityAssetToken = artifacts.require('SecurityAssetToken');
const BondToken = artifacts.require('NFBondTokenMock');
const roles = artifacts.require('TokenAccessRoles');

module.exports = (deployer) => {
  deployer.then(async () => {
    await deployer.deploy(roles);
    await deployer.link(roles, BondToken);
    await deployer.link(roles, SecurityAssetToken);
  });
}
