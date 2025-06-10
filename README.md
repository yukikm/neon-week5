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

- contract
