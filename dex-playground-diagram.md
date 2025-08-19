# DEX Playground - Complete Mermaid Visualization

This document demonstrates the complete Mermaid diagram system applied to the existing DEX playground contract, showing both partial and complete order matching scenarios.

## 1. DEX System Overview

```mermaid
graph TB
    %% Initial Parties Setup
    subgraph "🏦 Initial State"
        direction TB
        BP[👤 Buyer<br/>💰 510.01 ERG<br/>🎯 Wants: 100 TKN @ 5 ERG each]
        SP[👤 Seller<br/>💰 10.01 ERG<br/>🪙 100 TKN<br/>💸 Asks: 5 ERG per TKN]
        DP[👤 DEX Operator<br/>💰 Initial funds<br/>🔧 Matches orders]
    end
    
    %% Order Creation Phase
    subgraph "📝 Order Creation Phase"
        direction TB
        BP --> BCT{Create Buy Order<br/>📝 Fee: 0.001 ERG<br/>🎯 Bid: 500 ERG + 10 ERG fee}
        SP --> SCT{Create Sell Order<br/>📝 Fee: 0.001 ERG<br/>💰 Deposit: 10 ERG fee}
        
        BCT --> BO[Buy Order Box 📦<br/>💰 510 ERG (500 + 10 fee)<br/>📋 R4: BoxId reference<br/>🔒 buyerContract<br/>✅ Can refund to buyer<br/>✅ Can partial fill]
        
        SCT --> SO[Sell Order Box 📦<br/>💰 10 ERG (fee deposit)<br/>🪙 100 TKN<br/>📋 R4: BoxId reference<br/>🔒 sellerContract<br/>✅ Can refund to seller<br/>✅ Can partial fill]
    end
    
    %% Partial Matching Phase
    subgraph "⚖️ Partial Match (50 TKN)"
        direction TB
        BO --> PM1{Partial Match Tx<br/>👨‍💼 DEX processes<br/>📊 50% fill}
        SO --> PM1
        
        PM1 --> NBO[New Buy Order 📦<br/>💰 255 ERG (remaining)<br/>📋 R4: Previous BoxId<br/>🔒 buyerContract<br/>🎯 Still wants: 50 TKN]
        
        PM1 --> NSO[New Sell Order 📦<br/>💰 5 ERG (reduced fee)<br/>🪙 50 TKN (remaining)<br/>📋 R4: Previous BoxId<br/>🔒 sellerContract]
        
        PM1 --> BT1[Buyer Tokens 📦<br/>💰 0.1 ERG (min value)<br/>🪙 50 TKN<br/>📋 R4: Source BoxId<br/>🔒 buyerPk]
        
        PM1 --> SP1[Seller Payment 📦<br/>💰 250 ERG<br/>📋 R4: Source BoxId<br/>🔒 sellerPk]
        
        PM1 --> DF1[DEX Fee 📦<br/>💰 4.9 ERG<br/>🔒 dexPk]
    end
    
    %% Complete Matching Phase  
    subgraph "🎯 Complete Match (Remaining 50 TKN)"
        direction TB
        NBO --> CM{Complete Match Tx<br/>👨‍💼 DEX processes<br/>✅ 100% filled}
        NSO --> CM
        
        CM --> BT2[Final Buyer Tokens 📦<br/>💰 0.1 ERG<br/>🪙 50 TKN<br/>📋 R4: Source BoxId<br/>🔒 buyerPk]
        
        CM --> SP2[Final Seller Payment 📦<br/>💰 250 ERG<br/>📋 R4: Source BoxId<br/>🔒 sellerPk]
        
        CM --> DF2[Final DEX Fee 📦<br/>💰 4.9 ERG<br/>🔒 dexPk]
    end
    
    %% Final State
    subgraph "🎉 Final Balances"
        direction TB
        BF[👤 Buyer Final<br/>💰 0.2 ERG (change)<br/>🪙 100 TKN<br/>✅ Order completely filled]
        
        SF[👤 Seller Final<br/>💰 500 ERG (sales proceeds)<br/>🪙 0 TKN<br/>✅ All tokens sold]
        
        DF_FINAL[👤 DEX Final<br/>💰 9.8 ERG (fees collected)<br/>💼 Successful matching]
    end
    
    BT1 --> BF
    BT2 --> BF
    SP1 --> SF
    SP2 --> SF
    DF1 --> DF_FINAL
    DF2 --> DF_FINAL
    
    %% Styling
    classDef participantStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef orderStyle fill:#fff8e1,stroke:#f57c00,stroke-width:2px
    classDef transactionStyle fill:#e8f5e8,stroke:#388e3c,stroke-width:3px
    classDef payoutStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef finalStyle fill:#c8e6c9,stroke:#4caf50,stroke-width:3px
    
    class BP,SP,DP participantStyle
    class BO,SO,NBO,NSO orderStyle
    class BCT,SCT,PM1,CM transactionStyle
    class BT1,SP1,DF1,BT2,SP2,DF2 payoutStyle
    class BF,SF,DF_FINAL finalStyle
```

## 2. Contract Logic Decision Trees

### Buyer Contract Logic Flow

```mermaid
graph TD
    Start([🚀 Buyer Contract Execution]) --> FallbackCheck{🔑 Buyer signature<br/>present?}
    
    FallbackCheck -->|✅ Yes| Accept[✅ Allow buyer refund]
    FallbackCheck -->|❌ No| ServiceLogic[🛍️ DEX service logic]
    
    ServiceLogic --> FindReturn{🔍 Find return box<br/>with SELF.id in R4}
    FindReturn -->|❌ Not found| Reject[❌ Reject transaction]
    FindReturn -->|✅ Found| ValidateToken
    
    ValidateToken{🪙 Validate token<br/>returnTokenId == tokenId}
    ValidateToken -->|❌ Wrong token| Reject
    ValidateToken -->|✅ Correct token| CheckAmount
    
    CheckAmount{📊 Check token amount<br/>returnTokenAmount >= 1}
    CheckAmount -->|❌ Too small| Reject
    CheckAmount -->|✅ Valid amount| ValidateCoins
    
    ValidateCoins{💰 Validate coin conservation<br/>Price calculation correct?}
    ValidateCoins -->|❌ Wrong price| Reject
    ValidateCoins -->|✅ Correct price| CheckNewOrder
    
    CheckNewOrder{📦 Check for new order box<br/>Partial fill scenario?}
    CheckNewOrder -->|Complete fill| Accept
    CheckNewOrder -->|Partial fill| ValidatePartial
    
    ValidatePartial{🔄 Validate partial order<br/>Remaining value correct?}
    ValidatePartial -->|❌ Invalid| Reject  
    ValidatePartial -->|✅ Valid| Accept
    
    %% Styling
    classDef startEnd fill:#c8e6c9,stroke:#4caf50,stroke-width:3px
    classDef decision fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    classDef success fill:#e8f5e8,stroke:#388e3c,stroke-width:3px
    classDef reject fill:#ffebee,stroke:#f44336,stroke-width:3px
    classDef process fill:#e1f5fe,stroke:#2196f3,stroke-width:2px
    
    class Start startEnd
    class FallbackCheck,FindReturn,ValidateToken,CheckAmount,ValidateCoins,CheckNewOrder,ValidatePartial decision
    class Accept success
    class Reject reject
    class ServiceLogic process
```

### Seller Contract Logic Flow  

```mermaid
graph TD
    Start([🚀 Seller Contract Execution]) --> FallbackCheck{🔑 Seller signature<br/>present?}
    
    FallbackCheck -->|✅ Yes| Accept[✅ Allow seller refund]
    FallbackCheck -->|❌ No| ServiceLogic[🛍️ DEX service logic]
    
    ServiceLogic --> FindReturn{🔍 Find return box<br/>with SELF.id in R4}
    FindReturn -->|❌ Not found| Reject[❌ Reject transaction]
    FindReturn -->|✅ Found| CheckReturn
    
    CheckReturn{💰 Check return value<br/>== selfTokenAmount × price}
    CheckReturn -->|✅ Complete sale| Accept
    CheckReturn -->|❌ Partial sale| ValidatePartial
    
    ValidatePartial{📦 Find new order box<br/>for remaining tokens?}
    ValidatePartial -->|❌ Not found| Reject
    ValidatePartial -->|✅ Found| CheckTokenId
    
    CheckTokenId{🪙 Validate new order<br/>tokenId matches?}
    CheckTokenId -->|❌ Wrong token| Reject
    CheckTokenId -->|✅ Correct token| CheckSoldAmount
    
    CheckSoldAmount{📊 Check sold amount<br/>soldTokens >= 1?}
    CheckSoldAmount -->|❌ Too small| Reject
    CheckSoldAmount -->|✅ Valid amount| CheckRemainingValue
    
    CheckRemainingValue{💰 Validate remaining value<br/>newBox.value correct?}
    CheckRemainingValue -->|❌ Invalid| Reject
    CheckRemainingValue -->|✅ Valid| Accept
    
    %% Styling
    classDef startEnd fill:#c8e6c9,stroke:#4caf50,stroke-width:3px
    classDef decision fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    classDef success fill:#e8f5e8,stroke:#388e3c,stroke-width:3px
    classDef reject fill:#ffebee,stroke:#f44336,stroke-width:3px
    classDef process fill:#e1f5fe,stroke:#2196f3,stroke-width:2px
    
    class Start startEnd
    class FallbackCheck,FindReturn,CheckReturn,ValidatePartial,CheckTokenId,CheckSoldAmount,CheckRemainingValue decision
    class Accept success
    class Reject reject
    class ServiceLogic process
```

## 3. Sequence Diagram - Complete Trading Flow

```mermaid
sequenceDiagram
    participant B as 👤 Buyer
    participant BO as 📦 BuyOrderBox
    participant SO as 📦 SellOrderBox  
    participant S as 👤 Seller
    participant D as 👨‍💼 DEX
    participant BC as ⛓️ Blockchain
    
    Note over B, BC: 📝 Order Creation Phase
    B->>BC: Create buy order (500 ERG for 100 TKN @ 5 ERG each)
    BC->>BO: Lock 510 ERG (500 + 10 fee) in buyerContract
    
    S->>BC: Create sell order (100 TKN @ 5 ERG each)  
    BC->>SO: Lock 100 TKN + 10 ERG fee in sellerContract
    
    Note over B, BC: ⚖️ Partial Match Phase (50%)
    D->>BO: Initiate partial match transaction
    D->>SO: Include sell order as input
    
    BO->>BO: Validate: 50 TKN × 5 ERG = 250 ERG
    SO->>SO: Validate: 50 TKN sold, 50 TKN remaining
    
    D->>BC: Create partial match outputs
    BC->>B: New token box: 50 TKN + 0.1 ERG
    BC->>BO: New buy order: 255 ERG remaining (wants 50 more TKN)
    BC->>S: Payment box: 250 ERG
    BC->>SO: New sell order: 50 TKN + 5 ERG fee
    BC->>D: DEX fee: 4.9 ERG
    
    Note over B, BC: 🎯 Complete Match Phase (50%)
    D->>BO: Process remaining order
    D->>SO: Process remaining order
    
    BO->>BO: Validate: 50 TKN × 5 ERG = 250 ERG (final)
    SO->>SO: Validate: All 50 TKN sold
    
    D->>BC: Create final match outputs
    BC->>B: Final token box: 50 TKN + 0.1 ERG  
    BC->>S: Final payment: 250 ERG
    BC->>D: Final DEX fee: 4.9 ERG
    
    Note over B, BC: ✅ Trade Complete
    BC->>B: Total received: 100 TKN
    BC->>S: Total received: 500 ERG
    BC->>D: Total fees: 9.8 ERG
```

## 4. Order Cancellation Scenarios

### Buy Order Cancellation

```mermaid
graph LR
    subgraph "🚫 Buy Order Cancellation"
        BO[Buy Order Box 📦<br/>💰 510 ERG<br/>🔒 buyerContract] --> CT{Cancel Transaction<br/>🔑 Buyer signature}
        
        CT --> RB[Refund Box 📦<br/>💰 509.999 ERG<br/>🪙 1 DEXCNCL token*<br/>📋 R4: Original BoxId<br/>🔒 buyerPk]
        
        note1[*Workaround token for<br/>sigmastate-interpreter issue #628]
    end
    
    %% Styling
    classDef orderStyle fill:#fff8e1,stroke:#f57c00,stroke-width:2px
    classDef transactionStyle fill:#e8f5e8,stroke:#388e3c,stroke-width:2px  
    classDef refundStyle fill:#e1f5fe,stroke:#2196f3,stroke-width:2px
    classDef noteStyle fill:#f5f5f5,stroke:#666,stroke-width:1px
    
    class BO orderStyle
    class CT transactionStyle
    class RB refundStyle
    class note1 noteStyle
```

### Sell Order Cancellation

```mermaid
graph LR
    subgraph "🚫 Sell Order Cancellation"  
        SO[Sell Order Box 📦<br/>💰 10 ERG<br/>🪙 100 TKN<br/>🔒 sellerContract] --> CT{Cancel Transaction<br/>🔑 Seller signature}
        
        CT --> RB[Refund Box 📦<br/>💰 9.999 ERG<br/>🪙 100 TKN<br/>📋 R4: Original BoxId<br/>🔒 sellerPk]
    end
    
    %% Styling  
    classDef orderStyle fill:#fff8e1,stroke:#f57c00,stroke-width:2px
    classDef transactionStyle fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef refundStyle fill:#e1f5fe,stroke:#2196f3,stroke-width:2px
    
    class SO orderStyle
    class CT transactionStyle
    class RB refundStyle
```

## 5. Fee Flow Analysis

```mermaid
sankey-beta
    %% DEX Fee Distribution
    Buyer Order Fee,DEX Revenue,10
    Seller Order Fee,DEX Revenue,10  
    Buyer Match Fee,DEX Revenue,5
    Seller Match Fee,DEX Revenue,5
    Transaction Fees,Network,0.003
    
    DEX Revenue,DEX Operator,30
    DEX Revenue,Protocol Development,0
    DEX Revenue,Liquidity Incentives,0
```

## 6. State Transitions Timeline

```mermaid
timeline
    title 📊 DEX Trading Session Timeline
    
    section Order Creation
        Block N     : 👤 Buyer creates order
                   : 💰 510 ERG locked
        Block N+1   : 👤 Seller creates order  
                   : 🪙 100 TKN locked
    
    section First Match
        Block N+5   : 👨‍💼 DEX matches 50%
                   : 📦 4 new boxes created
                   : 💰 First payments made
    
    section Final Match  
        Block N+8   : 👨‍💼 DEX completes order
                   : 📦 3 final boxes created
                   : ✅ Trade complete
    
    section Settlement
        Block N+10  : 👤 All parties claim funds
                   : 🎯 Orders fully settled
```

This comprehensive visualization system demonstrates how the Mermaid templates can be applied to document any Ergo smart contract pattern. The DEX example shows:

- **Complete transaction flows** with actual values
- **Contract logic validation** paths  
- **Multi-phase interactions** (partial/complete matching)
- **Error handling** scenarios (cancellations)
- **Economic analysis** (fee distribution)
- **Timeline visualization** for complex processes

The same template system can be applied to any Ergo contract by substituting the relevant parameters and customizing the logic flows.