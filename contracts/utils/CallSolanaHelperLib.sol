// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title CallSolanaHelperLib
/// @notice This contract serves as a helper library when interacting with precompile CallSolana ( 0xFF00000000000000000000000000000000000006 )
/// @author https://twitter.com/mnedelchev_
library CallSolanaHelperLib {
    /// @notice This method prepares Solana's instruction data into bincode serialized format
    /// @param programId The programId of the instruction
    /// @param accounts List of instruction accounts in bytes32 format
    /// @param isSigner List of bool format containing info if the particular account is signer
    /// @param isWritable List of bool format containing info if the particular account is writable
    /// @param instructionData The instruction data
    function prepareSolanaInstruction(
        bytes32 programId,
        bytes32[] memory accounts,
        bool[] memory isSigner,
        bool[] memory isWritable,
        bytes memory instructionData
    ) internal pure returns (bytes memory) {
        bytes memory programIdAndAccounts;
        assembly {
            // get the free memory pointer
            programIdAndAccounts := mload(64)

            // define the accounts length
            let accountsLen := mload(accounts)

            // define the instructionData length
            let instructionDataLen := mload(instructionData)

            // define the total output bytes length
            let dataLength := add(32, add(8, mul(accountsLen, 34)))
            if gt(instructionDataLen, 0) {
                dataLength := add(dataLength, add(8, instructionDataLen))
            }

            // set the new free memory pointer to accommodate the new bytes variable
            mstore(64, add(programIdAndAccounts, add(dataLength, 32)))

            // store dataLength ( the total output bytes length )
            mstore(programIdAndAccounts, dataLength)

            let dataPtr := add(programIdAndAccounts, 32)

            // store programId
            mstore(dataPtr, programId)
            dataPtr := add(dataPtr, 32)

            // store accountsLen
            mstore8(dataPtr, accountsLen)
            dataPtr := add(dataPtr, 8)
            
            // loop store accounts + isSigner + isWritable
            for { let i := 0 } lt(i, accountsLen) { i := add(i, 1) } {
                let dataLen := add(32, mul(i, 32))
                mstore(dataPtr, mload(add(accounts, dataLen)))
                mstore8(add(dataPtr, 32), mload(add(isSigner, dataLen)))
                mstore8(add(dataPtr, 33), mload(add(isWritable, dataLen)))
                dataPtr := add(dataPtr, 34)
            }

            if gt(instructionDataLen, 0) {
                // store instructionDataLen
                mstore8(dataPtr, instructionDataLen)
                dataPtr := add(dataPtr, 8)

                // loop store instructionData
                for { let i := 0 } lt(i, instructionDataLen) { i := add(i, 32) } {
                    mstore(add(dataPtr, i), mload(add(instructionData, add(32, i))))
                }
            }
        }
        return programIdAndAccounts;
    }

    /// @notice Converts address type into bytes32
    /// @param account EVM address of EOA or smart contract
    function addressToBytes32(address account) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(account)));
    }

    /// @notice Returns the Neon EVM's program arbitrary token account seeds for given EVM wallet
    /// @param token EVM address of ERC20ForSPL token
    /// @param owner EVM address of EOA or smart contract
    function getArbitraryTokenAccountSeeds(address token, address owner) internal pure returns (bytes memory) {
        return abi.encodePacked(
            hex"03",
            hex"436f6e747261637444617461", // ContractData
            token,
            addressToBytes32(owner)
        );
    }

    /// @notice Returns a Solana ATA account seeds.
    /// @param owner SVM address of EOA or smart contract in bytes32 format
    /// @param programId SVM address of a program on Solana
    /// @param mint SVM address of SPLToken
    function getAssociateTokenAccountSeeds(bytes32 owner, bytes32 programId, bytes32 mint) internal pure returns (bytes memory) {
        return abi.encodePacked(
            owner,
            programId,
            mint
        );
    }
}