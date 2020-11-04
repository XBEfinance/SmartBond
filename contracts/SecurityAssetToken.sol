pragma solidity ^0.6.2;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./roles.sol";

/// contract SecurityAssetToken
contract SecurityAssetToken is ERC721, AccessControl {
    string _token_name = "SecurityAssetToken";
    string _token_symbol = "SecurityAssetToken";
    string _baseURI;

    function _getBaseURI() internal view returns (string memory) {
        return _baseURI;
    }

    constructor(string memory baseURI) public ERC721(_token_name, _token_name) {
        _baseURI = baseURI;
        // set role
    }

    // use parent implementation
    // balanceOf(owner)

    // use parent implementation
    // ownerOf(tokenId)

    function transferFrom(address from, address to, uint256 tokenId) public override {
        safeTransferFrom(from, to, tokenId);
    }

    /// по факту, внутри этой функции будет просто вызываться расширенный вариант этой же функции safeTransferFrom(from, to, tokenId, data).
    /// но данная операция будет доступна только для роли TRANSFERER_ROLE,
    /// которой будут обладать только Miris (multi-sig contract) и Bond NFTs контракт.
    function safeTransferFrom(address from, address to, uint256 tokenId) public override {
        require(hasRole(roles.transfererRole(), msg.sender));
        super.safeTransferFrom(from, to, tokenId);
    }

    /// В нашем случае, в качестве параметра “to” подразумевается account,
    /// которому текущий владелец хотел бы передать токен, если это будет одобрено Miris.
    /// Здесь подразумевается, что пользователи не могут свободно обмениваться или торговать токенами между собой.
    /// Но могут в off-chain согласовать с Miris такую сделку между собой.
    /// Если Miris согласует сделку, то текущий владелец через вызов функции “approve” и указания идентификатора токена и
    /// account нового владельца оставляет заявку на перевод токена новому владельцу.
    /// Но при этом сам перевод токена может осуществить только Miris (multi-sig contract).
    /// Также подразумевается, что новый владелец, - это акцептованный account со стороны Miris.
    function approve(address to, uint256 tokenId) public override {

    }

    /// функция будет возвращать account (если установлен текущим владельцем токена),
    /// которому текущий владелец хотел бы передать токен, если это будет одобрено Miris.
    function getApproved(uint256 tokenId) public view override returns (address) {
        revert();
    }

    /// в качестве параметра “operator” подразумевается account, которому текущий владелец хотел бы
    /// передать все свои токены, если это будет одобрено Miris.
    /// Здесь подразумевается, что пользователи не могут свободно обмениваться или торговать токенами между собой.
    /// Но могут в off-chain согласовать с Miris такую сделку между собой. В данном случае подразумевается сделка,
    /// когда текущий владелец желает продать все свои токены.
    /// Если Miris согласует сделку, то текущий владелец через вызов функции “setApprovalForAll” и
    /// указания account нового владельца оставляет заявку на перевод всех своих токенов новому владельцу.
    /// Но при этом сам перевод токенов может осуществить только Miris (multi-sig contract).
    /// Также подразумевается, что новый владелец, - это акцептованный account со стороны Miris.
    function setApprovalForAll(address operator, bool _approved) public override {

    }

    /// функция будет возвращать “true”, если текущий владелец (“owner”) хотел бы передать все свои токены
    /// указанному account (“operator”), если это будет одобрено Miris.
    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return false;
    }

    // IERC721 EVENTS:

    // --- event Transfer(from, to, tokenId) ---
    //     будет формировать ивент, который подразумевается стандартом.
    //     Ивент будет формироваться:
    //     - когда Miris (multi-sig contract) осуществляет mint нового токена;
    //     - когда Miris (multi-sig contract) осуществляет burn существующего токена;
    //     - когда Miris (multi-sig contract) осуществляет передачу токена от одного account другому account
    //     (если текущим владельцем был оформлен запрос на такую передачу токена и Miris согласовал это off-chain,
    //     в том числе текущий владелец указал кому передать токен через вызов функции “approve” или “setApprovalForAll”).
    //     Также подразумевается, что новый владелец, - это акцептованный account со стороны Miris;
    //     - когда Bond NFTs контракт осуществляет передачу Security/Asset NFT токена от одного account другому account
    //     (в случае, если погашение токена осуществляет другой пользователь,
    //     т.к. Miris разрешило такую операцию в связи с тем, что Security/Asset NFT токен не был предъявлен к погашению
    //     текущим владельцем после завершения maturity токена).

    // --- event Approval(owner, approved, tokenId) ---
    //     будет формировать особенный ивент, который не подразумевается стандартом.
    //     Ивент будет формироваться, когда текущий владелец указал кому хотел бы передать токен через вызов функции “approve”.

    // --- event ApprovalForAll(owner, operator, approved) ---
    //     будет формировать особенный ивент, который не подразумевается стандартом.
    //     Ивент будет формироваться, когда текущий владелец указал кому хотел бы передать все свои токены
    //     через вызов функции “setApprovalForAll”.


    // IERC721Metadata FUNCTIONS:
    // function name() public view override returns (string memory); // use parent method

    // function symbol() public view override returns (string memory); // use parent method

    /// tokenURI(tokenId) - будет реализовывать логику, которая подразумевается стандартом.
    /// Формирование tokenURI будет происходить автоматически за счет конкатенации baseURI
    /// (общий для всех токенов) и идентификатора токена, т.е. tokenURI = baseURI + tokenId
    /// Итоговый URI указывает на JSON с метаданными токена,
    /// который stored on the Miris website (out of the layer1 on-chain scope).
    // как сконвертить tokenId в строку? hex или еще как-то?
    function tokenURI(uint256 tokenId) public view override(ERC721) returns (string memory) {
        string memory tokenURIString = string(abi.encodePacked(_baseURI, Strings.toString(tokenId)));
        return tokenURIString;
    }
}
