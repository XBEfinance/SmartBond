const LinkedList = artifacts.require('LinkedList');
const MockLinkedList = artifacts.require('MockLinkedList');

const EURxb = artifacts.require('EURxb');
const XBE = artifacts.require('XBE');
const Multisig = artifacts.require('MultiSignature');
const AllowList = artifacts.require('AllowList');
const SecurityAssetToken = artifacts.require('SecurityAssetToken');
const BondTokenMock = artifacts.require('BondTokenMock');
const BondToken = artifacts.require('BondToken');
const TokenAccessRoles = artifacts.require('TokenAccessRoles');
const DDP = artifacts.require('DDP');

// const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
// const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
// const BUSD = "0x4Fabb145d64652a948d72533023f6E7A623C7C53";
// const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

const baseSecurityURI = 'https://nft.eurxb.finance/security/';
const baseBondURI = 'https://nft.eurxb.finance/bond/';

const usd = (n) => web3.utils.toWei(n, 'Mwei');
const ether = (n) => web3.utils.toWei(n, 'ether');

module.exports = function (deployer, network) {
  deployer.then(async () => {
    if (network === 'test' || network === 'soliditycoverage') {
      await deployer.deploy(LinkedList);
      await deployer.link(LinkedList, MockLinkedList);
      await deployer.link(LinkedList, EURxb);

      await deployer.deploy(TokenAccessRoles);
      await deployer.link(TokenAccessRoles, BondTokenMock);
      await deployer.link(TokenAccessRoles, BondToken);
      await deployer.link(TokenAccessRoles, SecurityAssetToken);
      await deployer.link(TokenAccessRoles, DDP);
      await deployer.link(TokenAccessRoles, EURxb);
    } else if (network.startsWith('rinkeby')) {
      if (network === 'rinkeby_part_1' || network === 'rinkeby_part_1-fork') {
        await deployer.deploy(LinkedList, { overwrite: false });
        await deployer.link(LinkedList, EURxb);

        await deployer.deploy(TokenAccessRoles, { overwrite: false });
        await deployer.link(TokenAccessRoles, BondToken);
        await deployer.link(TokenAccessRoles, SecurityAssetToken);
        await deployer.link(TokenAccessRoles, DDP);
        await deployer.link(TokenAccessRoles, EURxb);

        const multisig = await deployer.deploy(
          Multisig, [
            process.env.FOUNDER_1,
            process.env.FOUNDER_2,
            process.env.FOUNDER_3,
            process.env.FOUNDER_4,
            process.env.FOUNDER_5],
          3,
        );
        const allowList = await deployer.deploy(AllowList, multisig.address);
        const bond = await deployer.deploy(BondToken, baseBondURI);
        const sat = await deployer.deploy(
          SecurityAssetToken, baseSecurityURI, multisig.address, bond.address, allowList.address,
        );
        const ddp = await deployer.deploy(DDP, multisig.address);
        const eurxb = await deployer.deploy(EURxb, multisig.address);

        const xbe = await deployer.deploy(XBE, ether('15000'));

        await eurxb.configure(ddp.address);

        await bond.configure(
          allowList.address,
          sat.address,
          ddp.address,
        );

        await multisig.configure(
          allowList.address,
          ddp.address,
          sat.address,
        );

        await ddp.configure(
          bond.address,
          eurxb.address,
          allowList.address,
        );

        await multisig.allowAccount(process.env.TOKENS_OWNER_1);
        await multisig.allowAccount(process.env.TOKENS_OWNER_2);
        await multisig.allowAccount(process.env.TOKENS_OWNER_3);
        await multisig.allowAccount(process.env.TOKENS_OWNER_4);
        await multisig.allowAccount(process.env.TOKENS_OWNER_5);
        await multisig.allowAccount(process.env.TOKENS_OWNER_6);
        await multisig.allowAccount(process.env.TOKENS_OWNER_7);
      } else if (network === 'rinkeby_part_2' || network === 'rinkeby_part_2-fork') {
        const multisig = await Multisig.deployed();
        for (let i = 0; i < 27; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_1, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 1);
        }
      } else if (network === 'rinkeby_part_3' || network === 'rinkeby_part_3-fork') {
        const multisig = await Multisig.deployed();
        for (let i = 0; i < 26; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_1, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 28);
        }
      } else if (network === 'rinkeby_part_4' || network === 'rinkeby_part_4-fork') {
        const multisig = await Multisig.deployed();
        for (let i = 0; i < 21; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_2, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 54);
        }
      } else if (network === 'rinkeby_part_5' || network === 'rinkeby_part_5-fork') {
        const multisig = await Multisig.deployed();
        for (let i = 0; i < 10; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_3, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 75);
        }
        for (let i = 0; i < 10; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_4, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 85);
        }
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_5, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 95);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_5, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 96);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_5, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 97);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_6, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 98);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_6, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 99);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_7, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 100);

      } else if (network === 'rinkeby_part_6' || network === 'rinkeby_part_6-fork') {
      } else {
        console.log('unsupported rinkeby fork', network);
      }
    } else if (network.startsWith('mainnet')) {
      if (network === 'mainnet_part_1' || network === 'mainnet_part_1-fork') {
        await deployer.deploy(LinkedList, { overwrite: false });
        await deployer.link(LinkedList, EURxb);

        await deployer.deploy(TokenAccessRoles, { overwrite: false });
        await deployer.link(TokenAccessRoles, BondToken);
        await deployer.link(TokenAccessRoles, SecurityAssetToken);
        await deployer.link(TokenAccessRoles, DDP);
        await deployer.link(TokenAccessRoles, EURxb);

        const multisig = await deployer.deploy(
          Multisig, [
            process.env.FOUNDER_1,
            process.env.FOUNDER_2,
            process.env.FOUNDER_3,
            process.env.FOUNDER_4,
            process.env.FOUNDER_5],
          3,
        );
        const allowList = await deployer.deploy(AllowList, multisig.address);
        const bond = await deployer.deploy(BondToken, baseBondURI);
        const sat = await deployer.deploy(
          SecurityAssetToken, baseSecurityURI, multisig.address, bond.address, allowList.address,
        );
        const ddp = await deployer.deploy(DDP, multisig.address);
        const eurxb = await deployer.deploy(EURxb, multisig.address);

        const xbe = await deployer.deploy(XBE, ether('15000'));

        await eurxb.configure(ddp.address);

        await bond.configure(
          allowList.address,
          sat.address,
          ddp.address,
        );

        await multisig.configure(
          allowList.address,
          ddp.address,
          sat.address,
        );

        await ddp.configure(
          bond.address,
          eurxb.address,
          allowList.address,
        );

        await multisig.allowAccount(process.env.TOKENS_OWNER_1);
        await multisig.allowAccount(process.env.TOKENS_OWNER_2);
        await multisig.allowAccount(process.env.TOKENS_OWNER_3);
        await multisig.allowAccount(process.env.TOKENS_OWNER_4);
        await multisig.allowAccount(process.env.TOKENS_OWNER_5);
        await multisig.allowAccount(process.env.TOKENS_OWNER_6);
        await multisig.allowAccount(process.env.TOKENS_OWNER_7);
      } else if (network === 'mainnet_part_2' || network === 'mainnet_part_2-fork') {
        const multisig = await Multisig.deployed();
        for (let i = 0; i < 27; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_1, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 1);
        }
      } else if (network === 'mainnet_part_3' || network === 'mainnet_part_3-fork') {
        const multisig = await Multisig.deployed();
        for (let i = 0; i < 26; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_1, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 28);
        }
      } else if (network === 'mainnet_part_4' || network === 'mainnet_part_4-fork') {
        const multisig = await Multisig.deployed();
        for (let i = 0; i < 21; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_2, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 54);
        }
      } else if (network === 'mainnet_part_5' || network === 'mainnet_part_5-fork') {
        const multisig = await Multisig.deployed();
        for (let i = 0; i < 10; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_3, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 75);
        }
        for (let i = 0; i < 10; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_4, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 85);
        }
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_5, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 95);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_5, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 96);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_5, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 97);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_6, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 98);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_6, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 99);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_7, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 100);

      } else if (network === 'mainnet_part_6' || network === 'mainnet_part_6-fork') {
      } else {
        console.log('unsupported mainnet fork', network);
      }
    } else {
      console.log('unsupported network', network);
    }
  });
};
