pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/roles/WhitelistAdminRole.sol";

contract BistrooToken is 
// ERC20Burnable,
// ERC20Mintable,
// ERC20Pausable,
// WhitelistAdminRole,
ERC777
{
    constructor() public ERC777("Bistroo Token", "BIST", new address[](0)) {
        _mint(msg.sender, msg.sender, 21000000000000 * 10 ** 18, "", "");
    }
}
