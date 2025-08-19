# Ergo Smart Contract Mermaid Templates

This document provides comprehensive Mermaid diagram templates optimized for visualizing Ergo blockchain smart contracts and transactions.

## Core Pattern Templates

### 1. Multi-Party Transaction Flow

```mermaid
graph TD
    %% Party Setup
    A[ServiceOwner Wallet<br/>2 ERG<br/>2000 ServiceTokens<br/>1 ConfigNFT] --> B[Alice Wallet<br/>500 ERG]
    
    %% Contract Setup Phase
    B --> C{Service Setup Transaction}
    A --> C
    
    C --> D[ConfigBox<br/>Value: 0.1 ERG<br/>Token: 1 ConfigNFT<br/>R4: OwnerPubKey<br/>R5: PricePerToken<br/>Script: Owner Guard]
    
    C --> E[ServiceBox<br/>Value: 0.1 ERG<br/>Token: 2000 ServiceTokens<br/>R4: BoxId Link<br/>Script: Service Contract]
    
    %% Transaction Execution
    F[Alice Payment<br/>200 ERG] --> G{Buy Token Transaction<br/>DataInput: ConfigBox}
    E --> G
    
    G --> H[New ServiceBox<br/>Value: 0.1 ERG<br/>Token: 1900 ServiceTokens<br/>R4: Previous BoxId<br/>Script: Service Contract]
    
    G --> I[PayoutBox<br/>Value: 200 ERG<br/>Script: Owner PubKey]
    
    G --> J[Alice TokenBox<br/>Value: 299.9 ERG<br/>Token: 100 ServiceTokens<br/>Script: Alice PubKey]
    
    %% Styling
    classDef walletStyle fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef contractStyle fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef transactionStyle fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef boxStyle fill:#fff3e0,stroke:#e65100,stroke-width:2px
    
    class A,B walletStyle
    class D,E,H,I,J boxStyle
    class C,G transactionStyle
```

### 2. Box State Transition Pattern

```mermaid
stateDiagram-v2
    [*] --> Setup: Initial Funding
    
    Setup --> ConfigCreated: Create Config Box
    state ConfigCreated {
        [*] --> ConfigBox
        ConfigBox: Value: 0.1 ERG
        ConfigBox: Token: 1 ConfigNFT
        ConfigBox: R4: Owner PubKey
        ConfigBox: R5: Price Per Token
        ConfigBox: Script: Owner Guard
    }
    
    Setup --> ServiceCreated: Create Service Box
    state ServiceCreated {
        [*] --> ServiceBox_v1
        ServiceBox_v1: Value: 0.1 ERG
        ServiceBox_v1: Token: 2000 ServiceTokens
        ServiceBox_v1: Script: Service Contract
    }
    
    ServiceCreated --> TokenSale: Buy Transaction
    state TokenSale {
        ServiceBox_v1 --> ServiceBox_v2: Partial Consumption
        ServiceBox_v2: Value: 0.1 ERG
        ServiceBox_v2: Token: 1900 ServiceTokens
        ServiceBox_v2: R4: Previous BoxId
        ServiceBox_v2: Script: Service Contract
    }
    
    TokenSale --> [*]: Transaction Complete
```

### 3. DEX Order Matching Flow

```mermaid
sequenceDiagram
    participant Buyer
    participant BuyContract as Buy Order Contract
    participant SellContract as Sell Order Contract
    participant Seller
    participant DEX
    
    Note over Buyer, DEX: Order Creation Phase
    Buyer->>BuyContract: Create Buy Order (100 TKN @ 5 ERG each)
    Seller->>SellContract: Create Sell Order (100 TKN @ 5 ERG each)
    
    Note over Buyer, DEX: Partial Matching
    DEX->>BuyContract: Match 50 TKN
    DEX->>SellContract: Match 50 TKN
    BuyContract->>Buyer: Return 50 TKN + change box
    SellContract->>Seller: Return 250 ERG
    DEX->>DEX: Collect fees
    
    Note over Buyer, DEX: Complete Matching
    DEX->>BuyContract: Match remaining 50 TKN
    DEX->>SellContract: Match remaining 50 TKN
    BuyContract->>Buyer: Return 50 TKN
    SellContract->>Seller: Return 250 ERG
    DEX->>DEX: Collect final fees
```

### 4. Contract Logic Decision Tree

```mermaid
graph TD
    Start([Contract Execution Start]) --> ValidateInput{Validate DataInput<br/>ConfigBox NFT}
    
    ValidateInput -->|Invalid| Reject[❌ Reject Transaction]
    ValidateInput -->|Valid| CheckOutputs{Check OUTPUTS<br/>Structure}
    
    CheckOutputs -->|No R4 Register| OwnerFallback[Owner Fallback Path<br/>✅ Allow Owner Spend]
    CheckOutputs -->|Has R4 Register| ServiceLogic[Service Logic Path]
    
    ServiceLogic --> ValidateTokens{Validate Token<br/>Conservation}
    ValidateTokens -->|Invalid| Reject
    ValidateTokens -->|Valid| ValidatePrice{Validate Price<br/>Calculation}
    
    ValidatePrice -->|Invalid| Reject
    ValidatePrice -->|Valid| ValidateOwner{Validate Payout<br/>to Owner}
    
    ValidateOwner -->|Invalid| Reject
    ValidateOwner -->|Valid| Success[✅ Accept Transaction]
    
    %% Styling
    classDef startEnd fill:#e8f5e8,stroke:#2e7d32,stroke-width:3px
    classDef decision fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef success fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef reject fill:#ffebee,stroke:#d32f2f,stroke-width:2px
    
    class Start,OwnerFallback,Success startEnd
    class ValidateInput,CheckOutputs,ValidateTokens,ValidatePrice,ValidateOwner decision
    class Success success
    class Reject reject
```

### 5. Token Flow Visualization

```mermaid
sankey-beta
    Initial Wallet,Service Contract,2000
    Service Contract,Buyer 1,100
    Service Contract,Buyer 2,150
    Service Contract,Remaining,1750
    Buyer 1,Buyer 1 Wallet,100
    Buyer 2,Buyer 2 Wallet,150
```

### 6. Ergo Box Anatomy

```mermaid
classDiagram
    class ErgoBox {
        +BoxId id
        +Long value "ERG amount in nanoERGs"
        +ErgoTree propositionBytes "Contract script"
        +List~Token~ additionalTokens
        +Map~RegisterId, Value~ additionalRegisters
        +CreationInfo creationInfo
        
        +validateContract() Boolean
        +spendableBy(pubKey) Boolean
        +hasToken(tokenId) Boolean
    }
    
    class Token {
        +TokenId _1 "Token identifier"
        +Long _2 "Token amount"
    }
    
    class Register {
        +RegisterId id "R4, R5, R6, etc."
        +Value value "Any type: Long, Coll[Byte], SigmaProp"
    }
    
    ErgoBox "1" *-- "0..*" Token : contains
    ErgoBox "1" *-- "0..*" Register : contains
    
    note for ErgoBox "Core box structure\nfor all Ergo transactions"
    note for Token "Each box can hold\nmultiple token types"
    note for Register "Registers R4-R9\nstore contract data"
```

## Template Usage Guide

### For Multi-Party Contracts:
1. Copy the Multi-Party Transaction Flow template
2. Replace party names (ServiceOwner, Alice) with actual participants
3. Update box values, tokens, and register contents
4. Modify contract logic descriptions

### For State Machines:
1. Use the Box State Transition Pattern
2. Define all possible states
3. Add transition conditions
4. Include register and token changes

### For DEX-style Applications:
1. Start with DEX Order Matching Flow
2. Customize participant roles
3. Add specific token/price information
4. Include fee calculations

### For Contract Logic:
1. Use Contract Logic Decision Tree
2. Map out all validation paths
3. Add specific ErgoScript conditions
4. Include success/failure outcomes

## Styling Guidelines

### Color Scheme:
- **Wallets/Parties**: Light blue (`#e1f5fe`, `#01579b`)
- **Contracts/Boxes**: Light purple (`#f3e5f5`, `#4a148c`)
- **Transactions**: Light green (`#e8f5e8`, `#1b5e20`)
- **Success States**: Green (`#e8f5e8`, `#388e3c`)
- **Error States**: Red (`#ffebee`, `#d32f2f`)
- **Decisions**: Orange (`#fff3e0`, `#f57c00`)

### Best Practices:
1. Keep diagrams focused on single concepts
2. Use consistent naming conventions
3. Include actual values when possible
4. Add clear labels for all components
5. Use subgraphs for complex structures
6. Include both happy path and error scenarios

## Integration with Documentation

These templates can be embedded in:
- Smart contract documentation
- Tutorial materials
- Code examples in ergoscript-by-example/
- API documentation
- Architecture design documents

Each template is designed to be:
- **Modular**: Combine multiple templates
- **Extensible**: Add project-specific elements
- **Interactive**: Clickable elements where supported
- **Educational**: Clear for learning ErgoScript patterns