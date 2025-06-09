require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');
require('solidity-docgen');
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
        compilers:[
            {
                version: '0.8.28',
                settings: {
                    evmVersion: "cancun",
                    viaIR: true,
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    }
                },
            },
        ],
  },
  docgen: {
    path: './docs',
    pages: 'files',
    clear: true,
    runOnCompile: true
  },
  etherscan: {
    apiKey: {
      neonevm: "test",
    },
    customChains: [
      {
        network: "neonevm",
        chainId: 245022926,
        urls: {
          apiURL: "https://devnet-api.neonscan.org/hardhat/verify",
          browserURL: "https://devnet.neonscan.org",
        },
      },
      {
        network: "neonevm",
        chainId: 245022934,
        urls: {
          apiURL: "https://api.neonscan.org/hardhat/verify",
          browserURL: "https://neonscan.org",
        },
      },
    ],
  },
  networks: {
    curvestand: {
      url: "https://curve-stand.neontest.xyz",
      accounts: [process.env.PRIVATE_KEY_OWNER, process.env.PRIVATE_KEY_USER_1, process.env.PRIVATE_KEY_USER_2, process.env.PRIVATE_KEY_USER_3],
      allowUnlimitedContractSize: false,
      gasMultiplier: 2,
      maxFeePerGas: 10000,
      maxPriorityFeePerGas: 5000
    },
    neondevnet: {
      url: "https://devnet.neonevm.org",
      accounts: [process.env.PRIVATE_KEY_OWNER, process.env.PRIVATE_KEY_USER_1, process.env.PRIVATE_KEY_USER_2, process.env.PRIVATE_KEY_USER_3],
      chainId: 245022926,
      allowUnlimitedContractSize: false,
      gasMultiplier: 2,
      maxFeePerGas: '10000000000000',
      maxPriorityFeePerGas: '5000000000000'
    },
    neonmainnet: {
      url: "https://neon-proxy-mainnet.solana.p2p.org",
      accounts: [process.env.PRIVATE_KEY_OWNER, process.env.PRIVATE_KEY_USER_1, process.env.PRIVATE_KEY_USER_2, process.env.PRIVATE_KEY_USER_3],
      chainId: 245022934,
      allowUnlimitedContractSize: false,
      gas: "auto",
      gasPrice: "auto",
    },
  },
  mocha: {
    timeout: 5000000
  }
};
