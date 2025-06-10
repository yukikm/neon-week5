# Week5

- CallRaydiumProgram contract (neonscan): [0xDBeD9f7f1c5699E6d5206f8f53266d48BC62Be04](https://devnet.neonscan.org/address/0xdbed9f7f1c5699e6d5206f8f53266d48bc62be04)

## Idea: TokenIndex – Raydium Pool-Based DeFi Index Fund

TokenIndex is a simple dApp that lets users deposit a single token and automatically diversify it across multiple Raydium liquidity pools. In return, they receive a single “IndexLP” token that tracks the combined performance and fees of those pools.

### What the dApp Does

1. **Single-Token Deposit**  
   A user sends USDC (or any SPL token) to the TokenIndex program.
2. **Automated Pool Allocation**  
   TokenIndex splits the deposit according to a predefined weight—for example:

- 50 % into the USDC–USDT pool
- 30 % into the SOL–USDC pool
- 20 % into the BONK pool

3. **Liquidity Provision**  
   For each pool, the program calls Raydium’s Add Liquidity instruction to mint LP tokens.
4. **IndexLP Minting**  
   All resulting LP tokens are wrapped into one custom token—IndexLP—and sent to the user.
5. **Simple Redemption**  
   At any time, the user can burn their IndexLP token. TokenIndex will

- call Raydium’s Remove Liquidity on each pool
- return the original tokens (USDC, SOL, BONK, etc.) proportional to the user’s share

### How It Leverages Raydium Pools

1. **Add Liquidity**  
   TokenIndex issues Raydium’s add liquidity calls in batch, distributing funds across pools with one transaction per pool.

2. **Remove Liquidity**  
   On redemption, it batches remove liquidity calls to pull tokens back out.

3. **Dynamic Rebalancing**
   By fetching live APR and TVL data from each pool, the dApp can periodically adjust weights and rebalance funds for optimal yield.

4. **IndexLP Abstraction**  
   Wrapping multiple LP tokens into a single IndexLP makes portfolio management easy, a user only needs to hold one token.

### Why It’s Useful

1. **Effortless Diversification**  
   Users get exposure to multiple Raydium pools with a single deposit.

2. **Yield Optimization**
   Automated rebalance keeps capital aligned with the highest-yielding pools.

3. **Lower Learning Curve**  
   Beginners don’t need to understand each pool’s mechanics—holding IndexLP is enough.

4. **Efficient On-Chain Execution**  
   Built on Solana and Raydium, all liquidity operations are fast and low-cost.

### Mock Code

- contract: (TokenIndex.sol)[https://github.com/yukikm/neon-week5/blob/main/contracts/TokenIndex.sol]
- test: (tokenindex.test.js)[https://github.com/yukikm/neon-week5/blob/main/test/tokenindex.test.js]

```
  TokenIndex
    Deployment
      ✔ Should set the correct deposit token
      ✔ Should set the correct raydium program
      ✔ Should set the correct name and symbol
      ✔ Should set the owner correctly
      ✔ Should initialize with zero total weight
      ✔ Should initialize with zero next pool ID
      ✔ Should revert with zero addresses
    Pool Management
      Adding Pool Allocations
        ✔ Should add a pool allocation correctly
        ✔ Should revert when adding pool with zero addresses
        ✔ Should revert when adding pool with invalid weight
        ✔ Should revert when total weight exceeds maximum
        ✔ Should revert when adding duplicate pool
        ✔ Should only allow owner to add pools
      Updating Pool Allocations
        ✔ Should update pool allocation correctly
        ✔ Should deactivate pool
        ✔ Should revert when updating non-existent pool
        ✔ Should revert when setting active pool with zero weight
        ✔ Should only allow owner to update pools
    Deposit and Redeem
      Deposit
        ✔ Should revert with amount less than minimum deposit
        ✔ Should revert when no pools are configured
      Redeem
        ✔ Should revert when user has insufficient balance
    View Functions
      ✔ Should return correct user position
      ✔ Should return correct active pool count
      ✔ Should return correct pool allocation details
    Owner Functions
      ✔ Should allow owner to rebalance
      ✔ Should only allow owner to rebalance
      ✔ Should allow owner to emergency withdraw
      ✔ Should only allow owner to emergency withdraw
    Constants
      ✔ Should have correct constants
    ERC20 Functionality
      ✔ Should have correct ERC20 properties
    Integration Scenarios
      ✔ Should handle multiple pool operations


  31 passing (607ms)
```
