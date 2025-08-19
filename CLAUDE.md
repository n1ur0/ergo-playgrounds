# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ergo Playgrounds is a multi-component educational platform for learning and experimenting with Ergo blockchain smart contracts (ErgoScript). The project consists of:

1. **Scala Playground Environment** - Core simulation framework for modeling and testing Ergo contracts
2. **ErgoScript Examples** - Educational documentation with runnable examples
3. **React Frontend** - Web interface for interactive contract testing and experimentation

## Architecture

### Core Components

- `playground-env/` - Base simulation environment library published as `ergo-playground-env`
- `playgrounds/` - Example implementations and test scenarios using the playground environment
- `ergoscript-by-example/` - Markdown documentation with smart contract examples (linked to Scastie)
- `frontend/` - React/TypeScript web application for interactive contract testing
- `eips/` - Ergo Improvement Proposals documentation

### Key Dependencies

- **Scala**: Uses Scala 2.12.10 with SBT build system
- **Ergo Libraries**: `ergo-scala-compiler`, `ergo-appkit` (both snapshot versions)
- **Frontend**: React 19, TypeScript, Vite build system

## Development Commands

### Scala/SBT Commands
```bash
# Compile all projects
sbt compile

# Run tests
sbt test

# Publish playground environment (CI only)
sbt publish

# Run specific playground example
sbt "project playgrounds" "runMain org.ergoplatform.playgrounds.examples.DEXPlayground"
```

### Frontend Commands
```bash
cd frontend

# Development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Type checking
npm run typecheck

# Preview production build
npm run preview
```

## Code Architecture Patterns

### Playground Framework Structure

The playground framework follows a domain-specific language (DSL) pattern for blockchain simulation:

1. **Simulation Setup**: `newBlockChainSimulationScenario(scenarioName)` creates isolated test environments
2. **Party Management**: `newParty(name)` creates blockchain participants with wallets and asset management
3. **Contract Definition**: Uses `contract { ... }` DSL for ErgoScript contract definitions
4. **Transaction Building**: Structured transaction creation with inputs, outputs, fees, and change handling

### Smart Contract Patterns

ErgoScript contracts in this codebase follow these patterns:

- **Guard Scripts**: Primary contract logic with fallback to owner public key (`ownerPk || contractLogic`)
- **Box Validation**: Contracts validate output boxes using `OUTPUTS` collection and register data (`R4`, `R5`, etc.)
- **Token Handling**: Token operations use tuples `(tokenId, amount)` and token collections
- **State Linking**: Contracts use box IDs in registers to link related transactions

### Frontend Architecture

React components are organized by feature:
- `ContractTester` - Main contract execution interface
- `ExamplesList` - Navigation between different contract examples  
- `CodeEditor` - ErgoScript code editing with syntax highlighting
- `SimulationResults` - Display contract execution results

## Testing Strategy

### Playground Tests
- Located in `playgrounds/src/test/scala/`
- Use ScalaTest framework with property-based testing (ScalaCheck)
- Each playground example has comprehensive test scenarios covering success and failure cases

### Contract Scenarios
Smart contract examples demonstrate:
- **Happy Path**: Successful contract execution (swaps, payments, etc.)
- **Refund Scenarios**: Contract cancellation and fund recovery
- **Partial Execution**: DEX-style partial order fulfillment
- **Edge Cases**: Fee handling, minimum values, token validation

## Development Guidelines

### Adding New Contract Examples

1. Create Scala playground in `playgrounds/src/main/scala/org/ergoplatform/playgrounds/examples/`
2. Follow naming convention: `ContractNamePlayground.scala`
3. Include multiple scenarios (success, refund, edge cases)
4. Add corresponding test file in test directory
5. Create documentation in `ergoscript-by-example/` following the template
6. Link to Scastie playground for interactive execution

### Frontend Component Development

- Use TypeScript strict mode
- Follow React functional component patterns with hooks
- Implement proper error boundaries for contract execution
- Maintain responsive design principles
- Use proper semantic HTML and accessibility features

### Build and CI

- SBT builds are configured for Sonatype publishing with dynamic versioning
- Frontend uses Vite for fast development and optimized production builds
- Parallel execution is disabled in SBT due to test dependencies
- Publishing requires proper credentials configuration

## Common Issues

- **Snapshot Dependencies**: Project uses snapshot versions of Ergo libraries which may cause build instability
- **Token Handling**: ErgoScript token operations require careful validation of token IDs and amounts
- **Box Linking**: Contract state linking via box IDs in registers is a common pattern that needs proper validation
- **Fee Calculations**: Transaction fees must be carefully calculated to avoid failed transactions

## Resources

- [ErgoScript Language Specification](https://github.com/ScorexFoundation/sigmastate-interpreter/blob/develop/docs/LangSpec.md)
- [Ergo Appkit Documentation](https://github.com/ergoplatform/ergo-appkit)
- [Scastie Scala Playground](https://scastie.scala-lang.org/)