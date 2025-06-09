const { ethers, network } = require("hardhat");
const web3 = require("@solana/web3.js");
const {
  getAssociatedTokenAddress,
  createInitializeMint2Instruction,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  NATIVE_MINT,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  createApproveInstruction,
  createSyncNativeInstruction,
} = require("@solana/spl-token");
const { Metaplex } = require("@metaplex-foundation/js");
const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
const {
  createSignerFromKeypair,
  signerIdentity,
  publicKey,
} = require("@metaplex-foundation/umi");
const {
  createMetadataAccountV3,
} = require("@metaplex-foundation/mpl-token-metadata");
const bs58 = require("bs58");
const config = require("../config");
const { Buffer } = require("buffer");
const { AccountMeta, PublicKey } = require("@solana/web3.js");
const connection = new web3.Connection(
  config.svm_node[network.name],
  "processed"
);
const umi = createUmi(config.svm_node[network.name]);

async function asyncTimeout(timeout) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), timeout);
  });
}

function asyncForLoop(iterable, asyncCallback, index, result) {
  return new Promise(async (resolve, reject) => {
    try {
      if (index < iterable.length) {
        result = await asyncCallback(iterable, index, result);
        resolve(asyncForLoop(iterable, asyncCallback, index + 1, result));
      } else {
        resolve(result);
      }
    } catch (err) {
      reject(err);
    }
  });
}

function asyncWhileLoop(isConditionFulfilled, asyncCallback, result) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!isConditionFulfilled) {
        const { isConditionFulfilled: fulfilled, result: updatedResult } =
          await asyncCallback(result);
        resolve(asyncWhileLoop(fulfilled, asyncCallback, updatedResult));
      } else {
        resolve(result);
      }
    } catch (err) {
      reject(err);
    }
  });
}

async function airdropNEON(address, amount) {
  const neonAmount = parseInt(ethers.formatUnits(amount.toString(), 18));
  if (neonAmount > 0) {
    const res = await fetch(config.neon_faucet[network.name].url, {
      method: "POST",
      body: JSON.stringify({ amount: neonAmount, wallet: address }),
      headers: { "Content-Type": "application/json" },
    });
    console.log(
      "\nAirdropping " + neonAmount.toString() + " NEON to " + address
    );
    if (res.status !== 200) {
      console.warn("\nAirdrop request failed: " + JSON.stringify(res));
    }
    let accountBalance = BigInt(0);
    await asyncWhileLoop(
      accountBalance >= amount, // condition to fulfill
      async () => {
        await asyncForLoop(1000);
        accountBalance = await ethers.provider.getBalance(address);
        return {
          isConditionFulfilled: accountBalance >= amount,
          result: null,
        };
      },
      null
    );
    // console.log("\nNew account balance: ", accountBalance)
  }
}

async function airdropSOL(solanaConnection, recipientPubKey, solAmount) {
  if (solAmount > 0) {
    const params = [recipientPubKey, solAmount];
    const res = await fetch(config.svm_node[network.name], {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "requestAirdrop",
        params: params,
      }),
      headers: { "Content-Type": "application/json" },
    });
    console.log(
      "\nAirdropping " +
        ethers.formatUnits(solAmount.toString(), 9) +
        " SOL to " +
        recipientPubKey
    );
    if (res.status !== 200) {
      console.warn("\nAirdrop request failed: " + JSON.stringify(res));
    }
    let accountBalance = BigInt(0);
    await asyncWhileLoop(
      accountBalance >= solAmount, // condition to fulfill
      async () => {
        await asyncForLoop(1000);
        accountBalance = await solanaConnection.getBalance(recipientPubKey);
        return {
          isConditionFulfilled: accountBalance >= solAmount,
          result: null,
        };
      },
      null
    );
    // console.log("\nNew account balance: ", accountBalance)
  }
}

async function deployContract(contractName, contractAddress = null) {
  if (!process.env.PRIVATE_KEY_OWNER) {
    throw new Error("\nMissing private key: PRIVATE_KEY_OWNER");
  }
  if (!process.env.PRIVATE_KEY_USER_1) {
    throw new Error("\nMissing private key: PRIVATE_KEY_USER_1");
  }
  const minBalance = BigInt(
    ethers.parseUnits(config.neon_faucet[network.name].min_balance, 18)
  );
  const deployer = (await ethers.getSigners())[0];
  let deployerBalance = BigInt(
    await ethers.provider.getBalance(deployer.address)
  );
  if (deployerBalance < minBalance) {
    await airdropNEON(deployer.address, minBalance - deployerBalance);
  }
  const user = (await ethers.getSigners())[1];
  let userBalance = BigInt(
    await ethers.provider.getBalance(process.env.OWNER_WALLWET_ADDRESS)
  );
  if (userBalance < minBalance) {
    await airdropNEON(
      process.env.OWNER_WALLWET_ADDRESS,
      minBalance - userBalance
    );
  }
  const otherUser = ethers.Wallet.createRandom(ethers.provider);
  await airdropNEON(otherUser.address, minBalance);

  const contractFactory = await ethers.getContractFactory(contractName);
  let contract;
  if (!config.composability[contractName][network.name] && !contractAddress) {
    console.log("\nDeployer address: " + deployer.address);
    deployerBalance = BigInt(
      await ethers.provider.getBalance(deployer.address)
    );
    console.log(
      "\nDeployer balance: " +
        ethers.formatUnits(deployerBalance.toString(), 18) +
        " NEON"
    );

    console.log(
      "\nDeploying " + contractName + " contract to " + network.name + "..."
    );
    contract = await contractFactory.deploy();
    await contract.waitForDeployment();
    console.log(
      "\n" + contractName + " contract deployed to: " + contract.target
    );
  } else {
    const deployedContractAddress = contractAddress
      ? contractAddress
      : config.composability[contractName][network.name];
    console.log(
      "\n" +
        contractName +
        " contract already deployed to: " +
        deployedContractAddress
    );
    contract = contractFactory.attach(deployedContractAddress);
  }

  return { deployer, user, otherUser, contract };
}

async function getSolanaTransactions(neonTxHash) {
  return await fetch(network.config.url, neonTxHash, {
    method: "POST",
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "neon_getSolanaTransactionByNeonTransaction",
      params: [neonTxHash],
      id: 1,
    }),
    headers: { "Content-Type": "application/json" },
  });
}

async function executeSolanaInstruction(
  instruction,
  lamports,
  contractInstance,
  salt,
  msgSender
) {
  if (salt === undefined) {
    salt = "0x0000000000000000000000000000000000000000000000000000000000000000";
  }

  const tx = await contractInstance
    .connect(msgSender)
    .execute(lamports, salt, prepareInstruction(instruction));

  const receipt = await tx.wait(3);
  return [tx, receipt];
}

function prepareInstructionAccounts(instruction, overwriteAccounts) {
  let encodeKeys = "";
  for (let i = 0, len = instruction.keys.length; i < len; ++i) {
    if (
      typeof overwriteAccounts != "undefined" &&
      Object.hasOwn(overwriteAccounts, i)
    ) {
      // console.log(publicKeyToBytes32(overwriteAccounts[i].key), 'publicKey');
      encodeKeys += ethers
        .solidityPacked(
          ["bytes32"],
          [publicKeyToBytes32(overwriteAccounts[i].key)]
        )
        .substring(2);
      encodeKeys += ethers
        .solidityPacked(["bool"], [overwriteAccounts[i].isSigner])
        .substring(2);
      encodeKeys += ethers
        .solidityPacked(["bool"], [overwriteAccounts[i].isWritable])
        .substring(2);
    } else {
      // console.log(publicKeyToBytes32(instruction.keys[i].pubkey.toString()), 'publicKey');
      encodeKeys += ethers
        .solidityPacked(
          ["bytes32"],
          [publicKeyToBytes32(instruction.keys[i].pubkey.toString())]
        )
        .substring(2);
      encodeKeys += ethers
        .solidityPacked(["bool"], [instruction.keys[i].isSigner])
        .substring(2);
      encodeKeys += ethers
        .solidityPacked(["bool"], [instruction.keys[i].isWritable])
        .substring(2);
    }
  }

  return (
    "0x" +
    ethers
      .zeroPadBytes(ethers.toBeHex(instruction.keys.length), 8)
      .substring(2) +
    encodeKeys
  );
}

function prepareInstructionData(instruction) {
  const packedInstructionData = ethers
    .solidityPacked(["bytes"], [instruction.data])
    .substring(2);
  // console.log(packedInstructionData, 'packedInstructionData');

  return (
    "0x" +
    ethers
      .zeroPadBytes(ethers.toBeHex(instruction.data.length), 8)
      .substring(2) +
    packedInstructionData
  );
}

function prepareInstruction(instruction) {
  return (
    publicKeyToBytes32(instruction.programId.toBase58()) +
    prepareInstructionAccounts(instruction).substring(2) +
    prepareInstructionData(instruction).substring(2)
  );
}

function publicKeyToBytes32(pubkey) {
  return ethers.zeroPadValue(ethers.toBeHex(ethers.decodeBase58(pubkey)), 32);
}

async function setupSPLTokens() {
  const keypair = web3.Keypair.fromSecretKey(
    bs58.decode(process.env.PRIVATE_KEY_SOLANA)
  );
  const _keypair = umi.eddsa.createKeypairFromSecretKey(keypair.secretKey);
  const authority = createSignerFromKeypair(umi, _keypair);
  const authorityPubkey = new web3.PublicKey(authority.publicKey.toString());

  if ((await connection.getBalance(authorityPubkey)) < 0.05 * 10 ** 9) {
    console.error(
      "Provided Solana wallet needs at least 0.05 SOL to perform the test."
    );
    process.exit();
  }

  const seed = "seed" + Date.now().toString(); // random seed on each script call
  const createWithSeed = await web3.PublicKey.createWithSeed(
    authorityPubkey,
    seed,
    new web3.PublicKey(TOKEN_PROGRAM_ID)
  );
  console.log(createWithSeed, "createWithSeed");

  let tokenAta = await getAssociatedTokenAddress(
    createWithSeed,
    authorityPubkey,
    true
  );
  console.log(tokenAta, "tokenAta");

  let wsolAta = await getAssociatedTokenAddress(
    NATIVE_MINT,
    authorityPubkey,
    true
  );
  console.log(wsolAta, "wsolAta");

  let tx = new web3.Transaction();

  // SOL -> wSOL
  tx.add(
    web3.SystemProgram.transfer({
      fromPubkey: authorityPubkey,
      toPubkey: wsolAta,
      lamports: 50000000, // 0.05 SOL
    }),
    createSyncNativeInstruction(wsolAta)
  );

  // create tokenA
  tx.add(
    web3.SystemProgram.createAccountWithSeed({
      fromPubkey: authorityPubkey,
      basePubkey: authorityPubkey,
      newAccountPubkey: createWithSeed,
      seed: seed,
      lamports: await connection.getMinimumBalanceForRentExemption(MINT_SIZE),
      space: MINT_SIZE,
      programId: new web3.PublicKey(TOKEN_PROGRAM_ID),
    })
  );

  tx.add(
    createInitializeMint2Instruction(
      createWithSeed,
      9, // decimals
      authorityPubkey,
      authorityPubkey
    )
  );

  const metaplex = new Metaplex(connection);
  const metadata = metaplex.nfts().pdas().metadata({ mint: createWithSeed });
  umi.use(signerIdentity(authority));
  const ix = createMetadataAccountV3(umi, {
    metadata: metadata,
    mint: createWithSeed,
    mintAuthority: authorityPubkey,
    payer: authorityPubkey,
    updateAuthority: authorityPubkey,
    data: {
      name: "Dev Neon EVM 2",
      symbol: "devNEON 2",
      uri: "https://ipfs.io/ipfs/QmW2JdmwWsTVLw1Gx4ympCn1VHJiuojfNLS5ZNLEPcBd5x/doge.json",
      sellerFeeBasisPoints: 0,
      collection: null,
      creators: null,
      uses: null,
    },
    isMutable: true,
    collectionDetails: null,
  }).getInstructions()[0];
  const keys = [];
  ix.keys.forEach((_key) => {
    const key = {};
    key.isSigner = _key.isSigner;
    key.isWritable = _key.isWritable;
    key.pubkey = new web3.PublicKey(_key.pubkey);
    keys.push(key);
  });
  tx.add(
    new web3.TransactionInstruction({
      keys,
      programId: ix.programId,
      data: ix.data,
    })
  );

  tx.add(
    createAssociatedTokenAccountInstruction(
      authorityPubkey,
      tokenAta,
      authorityPubkey,
      createWithSeed
    )
  );

  tx.add(
    createMintToInstruction(
      createWithSeed,
      tokenAta,
      authorityPubkey,
      1500 * 10 ** 9 // mint 1500 tokens
    )
  );

  tx.add(
    web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 1400000,
    })
  );

  tx.add(
    web3.ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 100000,
    })
  );

  await web3.sendAndConfirmTransaction(connection, tx, [keypair]);
  await asyncTimeout(3000);
  return createWithSeed.toBase58();
}

async function setupATAAccounts(publicKey, tokenMintsArray) {
  console.log(tokenMintsArray, "tokenMintsArray");
  const keypair = web3.Keypair.fromSecretKey(
    bs58.decode(process.env.PRIVATE_KEY_SOLANA)
  );
  let atasToBeCreated = "";
  const tx = new web3.Transaction();

  for (let i = 0, len = tokenMintsArray.length; i < len; ++i) {
    const associatedToken = getAssociatedTokenAddressSync(
      new web3.PublicKey(tokenMintsArray[i]),
      new web3.PublicKey(publicKey),
      true
    );
    const ataInfo = await connection.getAccountInfo(associatedToken);
    console.log(associatedToken, "associatedToken");

    // create ATA only if it's missing
    if (!ataInfo || !ataInfo.data) {
      atasToBeCreated += tokenMintsArray[i] + ", ";

      tx.add(
        createAssociatedTokenAccountInstruction(
          keypair.publicKey,
          associatedToken,
          new web3.PublicKey(publicKey),
          new web3.PublicKey(tokenMintsArray[i])
        )
      );
    }
  }

  if (tx.instructions.length) {
    console.log(
      "\nCreating ATA accounts for the following SPLTokens - ",
      atasToBeCreated.substring(0, atasToBeCreated.length - 2)
    );
    const signature = await web3.sendAndConfirmTransaction(connection, tx, [
      keypair,
    ]);
    await asyncTimeout(3000);
  } else {
    return console.error("\nNo instructions included into transaction.");
  }
}

function isValidHex(hex) {
  const isHexStrict = /^(0x)?[0-9a-f]*$/i.test(hex.toString());
  if (!isHexStrict) {
    throw new Error(`Given value "${hex}" is not a valid hex string.`);
  } else {
    return isHexStrict;
  }
}

function calculatePdaAccount(prefix, tokenEvmAddress, salt, neonEvmProgram) {
  const neonContractAddressBytes = Buffer.from(
    isValidHex(tokenEvmAddress)
      ? tokenEvmAddress.replace(/^0x/i, "")
      : tokenEvmAddress,
    "hex"
  );
  const seed = [
    new Uint8Array([0x03]),
    new Uint8Array(Buffer.from(prefix, "utf-8")),
    new Uint8Array(neonContractAddressBytes),
    Buffer.from(
      Buffer.concat([
        Buffer.alloc(12),
        Buffer.from(isValidHex(salt) ? salt.substring(2) : salt, "hex"),
      ]),
      "hex"
    ),
  ];

  return web3.PublicKey.findProgramAddressSync(seed, neonEvmProgram);
}

async function approveSplTokens(
  tokenAMint,
  tokenBMint,
  ERC20ForSPL_A,
  ERC20ForSPL_B,
  owner
) {
  const keypair = web3.Keypair.fromSecretKey(
    bs58.decode(process.env.PRIVATE_KEY_SOLANA)
  );

  const neon_getEvmParamsRequest = await fetch(network.config.url, {
    method: "POST",
    body: JSON.stringify({
      method: "neon_getEvmParams",
      params: [],
      id: 1,
      jsonrpc: "2.0",
    }),
    headers: { "Content-Type": "application/json" },
  });
  neon_getEvmParams = await neon_getEvmParamsRequest.json();
  console.log(neon_getEvmParams, "neon_getEvmParams");

  const tx = new web3.Transaction();
  const delegatedPdaOwner_A = calculatePdaAccount(
    "AUTH",
    ERC20ForSPL_A.target,
    owner.address,
    new web3.PublicKey(neon_getEvmParams.result.neonEvmProgramId)
  );

  const delegatedPdaOwner_B = calculatePdaAccount(
    "AUTH",
    ERC20ForSPL_B.target,
    owner.address,
    new web3.PublicKey(neon_getEvmParams.result.neonEvmProgramId)
  );

  let tokenA_ATA = await getAssociatedTokenAddress(
    new web3.PublicKey(tokenAMint),
    keypair.publicKey,
    true
  );

  let tokenB_ATA = await getAssociatedTokenAddress(
    new web3.PublicKey(tokenBMint),
    keypair.publicKey,
    true
  );

  tx.add(
    createApproveInstruction(
      tokenA_ATA,
      delegatedPdaOwner_A[0],
      keypair.publicKey,
      "18446744073709551615" // max uint64
    )
  );

  tx.add(
    createApproveInstruction(
      tokenB_ATA,
      delegatedPdaOwner_B[0],
      keypair.publicKey,
      "18446744073709551615" // max uint64
    )
  );

  tx.add(
    web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 1400000,
    })
  );

  tx.add(
    web3.ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 100000,
    })
  );

  const signature = await web3.sendAndConfirmTransaction(connection, tx, [
    keypair,
  ]);
  await asyncTimeout(3000);
  return [tokenA_ATA.toBase58(), tokenB_ATA.toBase58()];
}

module.exports = {
  airdropSOL,
  deployContract,
  setupSPLTokens,
  setupATAAccounts,
  approveSplTokens,
};
