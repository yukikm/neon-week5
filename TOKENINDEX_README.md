# TokenIndex - Raydium Pool-Based DeFi Index Fund

TokenIndex is a DeFi index fund that allows users to deposit a single token and automatically diversify across multiple Raydium pools.

## Overview

TokenIndex provides the following features:

1. **Single Token Deposit**: Users can deposit USDC (or any SPL token)
2. **Automatic Pool Allocation**: Distributes across multiple Raydium pools according to predefined weights
3. **IndexLP Token Issuance**: Wraps all LP tokens into a single IndexLP token
4. **Easy Redemption**: Burn IndexLP tokens anytime to recover original tokens

## Architecture

### Contract Structure

```
TokenIndex (Main Contract)
├── ERC20 (OpenZeppelin)
├── Ownable (OpenZeppelin)
├── ReentrancyGuard (OpenZeppelin)
└── CallRaydiumProgram (Integration)
```

### Main Components

#### 1. Pool Management

- Add and update pool allocations
- Weight management (basis points: 1-10000)
- Pool active status management

#### 2. Deposit/Redeem System

- Minimum deposit amount configuration
- Proportional allocation
- IndexLP token minting and burning

#### 3. Position Tracking

- User position tracking
- LP balance management per pool
- Deposit timestamp recording

## Deployment

### Prerequisites

```bash
npm install
```

### Compilation

```bash
npx hardhat compile
```

### Running Tests

```bash
npx hardhat test test/tokenindex.test.js
```

### Deployment

```bash
npx hardhat run scripts/deploy-tokenindex.js --network <network>
```

### Running Usage Examples

```bash
npx hardhat run scripts/tokenindex-example.js
```

## API Reference

### Owner Functions

#### `addPoolAllocation(address tokenA, address tokenB, uint16 configIndex, uint256 weight)`

Add a new pool allocation

**Parameters:**

- `tokenA`: First token of the pool
- `tokenB`: Second token of the pool
- `configIndex`: Raydium configuration index
- `weight`: Weight (basis points: 1-10000)

#### `updatePoolAllocation(uint256 poolId, uint256 newWeight, bool active)`

Update an existing pool allocation

**Parameters:**

- `poolId`: Pool ID
- `newWeight`: New weight
- `active`: Pool active status

#### `rebalance()`

Execute index rebalancing

#### `emergencyWithdraw()`

Emergency fund withdrawal

### User Functions

#### `deposit(uint256 amount)`

Deposit tokens and receive IndexLP tokens

**Parameters:**

- `amount`: Amount of tokens to deposit

**Requirements:**

- `amount >= MIN_DEPOSIT`
- Pools must be configured
- Token approval required

#### `redeem(uint256 indexLPAmount)`

Redeem IndexLP tokens to recover original tokens

**Parameters:**

- `indexLPAmount`: Amount of IndexLP tokens to redeem

### View Functions

#### `getUserPosition(address user)`

Get user position information

**Returns:**

- `indexLPBalance`: User's IndexLP balance
- `depositTimestamp`: Deposit timestamp

#### `getPoolAllocation(uint256 poolId)`

Get pool allocation details

**Returns:**

- `tokenA`: Token A
- `tokenB`: Token B
- `configIndex`: Configuration index
- `weight`: Weight
- `active`: Active status

#### `getActivePoolCount()`

Get number of active pools

## Events

```solidity
event PoolAdded(uint256 indexed poolId, address tokenA, address tokenB, uint256 weight);
event PoolUpdated(uint256 indexed poolId, uint256 newWeight, bool active);
event Deposited(address indexed user, uint256 amount, uint256 indexLPMinted);
event Redeemed(address indexed user, uint256 indexLPBurned, uint256 tokensReturned);
event Rebalanced(uint256 timestamp);
```

## Errors

```solidity
error InvalidWeight();
error PoolNotFound();
error InsufficientBalance();
error InvalidDepositAmount();
error WeightExceedsMaximum();
error ZeroAddress();
error PoolAlreadyExists();
```

## Constants

- `MAX_WEIGHT`: 10000 (100% in basis points)
- `MIN_DEPOSIT`: 1000000 (minimum deposit amount)

## Usage Examples

### Basic Setup

```javascript
// Deploy the contract
const tokenIndex = await TokenIndex.deploy(
  usdcAddress, // Deposit token
  raydiumProgram, // Raydium program
  "TokenIndex LP", // Token name
  "TILP" // Token symbol
);

// Add pool allocations
await tokenIndex.addPoolAllocation(
  usdcAddress, // USDC
  usdtAddress, // USDT
  0, // configIndex
  5000 // 50% weight
);

await tokenIndex.addPoolAllocation(
  solAddress, // SOL
  usdcAddress, // USDC
  1, // configIndex
  3000 // 30% weight
);

await tokenIndex.addPoolAllocation(
  bonkAddress, // BONK
  usdcAddress, // USDC
  2, // configIndex
  2000 // 20% weight
);
```

### Deposit and Redemption

```javascript
// Deposit
const depositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
await usdcToken.approve(tokenIndex.address, depositAmount);
await tokenIndex.deposit(depositAmount);

// Redeem
const indexLPBalance = await tokenIndex.balanceOf(userAddress);
await tokenIndex.redeem(indexLPBalance);
```

## Security Considerations

1. **Owner Privileges**: Owner can manage pool allocations and perform emergency withdrawals
2. **Reentrancy Protection**: Uses ReentrancyGuard
3. **Input Validation**: Validates all input parameters
4. **Weight Management**: Controls total weight not to exceed 100%

## Limitations and Future Improvements

### Current Limitations

1. **Simplified Liquidity Addition**: Current implementation has simplified integration with actual Raydium pools
2. **Lack of Price Oracle**: No price oracle implemented for accurate valuation
3. **Basic Rebalancing**: More advanced rebalancing strategies needed

### Future Improvements

1. **Actual Raydium Integration**:

   - Implement swap functionality
   - Actual liquidity addition/removal
   - LP token management

2. **Price Oracle Integration**:

   - Pyth Network integration
   - Accurate valuation and rebalancing

3. **Advanced Features**:

   - Dynamic weight adjustment
   - Yield optimization
   - Fee management

4. **Governance**:
   - DAO functionality
   - Proposal/voting system

## Testing

A comprehensive test suite is included:

```bash
npx hardhat test test/tokenindex.test.js
```

### Test Coverage

- ✅ Contract deployment
- ✅ Pool management functionality
- ✅ Access control
- ✅ Input validation
- ✅ Error handling
- ✅ Event emission
- ✅ Integration scenarios

## License

MIT License

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Support

If you have issues or need support, please create a GitHub issue.
