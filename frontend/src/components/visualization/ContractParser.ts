import type { 
  UTXOBox, 
  UTXOTransaction, 
  VisualizationData,
  EnhancedUTXOBox,
  EnhancedUTXOTransaction,
  EnhancedVisualizationData,
  BoxRelationship,
  ErgoBoxType,
  ErgoTransactionType,
  SpendingCondition,
  BoxLifecycleState,
  TransactionStatus,
  BoxRelationshipType
} from './types';

// ============================================================================
// ENHANCED CONTRACT ANALYSIS TYPES
// ============================================================================

interface ContractAnalysis {
  spendingConditions: SpendingCondition[];
  hasOwnerFallback: boolean;
  contractType: 'dex_order' | 'atomic_exchange' | 'multisig' | 'time_locked' | 'escrow' | 'generic';
  registerValidations: RegisterValidation[];
  tokenValidations: TokenValidation[];
  outputFilters: OutputFilter[];
  scenarioBranches?: ScenarioBranch[];
  temporalConstraints?: TemporalConstraint[];
  multiPartyRequirements?: MultiPartyRequirement[];
}

interface SpendingConditionDetail {
  type: SpendingCondition;
  code: string;
  conditions: string[];
}

interface RegisterValidation {
  register: 'R4' | 'R5' | 'R6' | 'R7' | 'R8' | 'R9';
  validationType: 'box_id_linkage' | 'value_check' | 'presence_check' | 'data_validation';
  expectedValue?: any;
  validationLogic: string;
}

interface TokenValidation {
  tokenIdCheck: boolean;
  amountCheck: boolean;
  conservationCheck: boolean;
  validationLogic: string;
}

interface OutputFilter {
  filterType: 'return_box' | 'new_order_box' | 'settlement_box' | 'fee_box';
  filterLogic: string;
  expectedProperties: Record<string, any>;
}

interface DEXPattern {
  patternType: 'order_placement' | 'partial_matching' | 'full_matching' | 'order_cancellation';
  orderType: 'buy' | 'sell';
  priceData?: number;
  tokenPair?: [string, string];
  partialFillLogic?: string;
}

interface AtomicExchangePattern {
  patternType: 'bid_placement' | 'ask_placement' | 'settlement' | 'refund';
  assetExchange: {
    offered: { type: 'ERG' | 'TOKEN'; amount: string | number; tokenId?: string };
    requested: { type: 'ERG' | 'TOKEN'; amount: string | number; tokenId?: string };
  };
  conditions: string[];
}

interface RefundPattern {
  triggerCondition: string;
  refundTarget: 'owner' | 'specific_party';
  refundAssets: Array<{ type: 'ERG' | 'TOKEN'; amount: string; tokenId?: string }>;
}

interface TransactionFlow {
  txId: string;
  stage: number;
  dependencies: string[];
  outputs: BoxStateTransition[];
  scenario?: string;
  conditionalLogic?: string;
}

interface ScenarioBranch {
  scenarioId: string;
  name: string;
  condition: string;
  description: string;
  requiredSignatures: string[];
  outputPattern: string;
  registerUpdates: Record<string, any>;
}

interface TemporalConstraint {
  type: 'height' | 'timestamp' | 'relative';
  value: number | string;
  operator: '>' | '<' | '>=' | '<=' | '==';
  description: string;
}

interface MultiPartyRequirement {
  scenario: string;
  requiredParties: string[];
  signatureType: 'all' | 'any' | 'threshold';
  threshold?: number;
  description: string;
}

interface BoxStateTransition {
  fromBoxId?: string;
  toBoxId: string;
  transitionType: 'creation' | 'consumption' | 'state_change' | 'partial_consumption';
  stateChange?: {
    from: BoxLifecycleState;
    to: BoxLifecycleState;
  };
}

interface RegisterAssignment {
  register: 'R4' | 'R5' | 'R6' | 'R7' | 'R8' | 'R9';
  assignmentType: 'box_id_reference' | 'constant_value' | 'expression';
  value: any;
  sourceBox?: string;
}

// ============================================================================
// ENHANCED CONTRACT PARSER
// ============================================================================

class EnhancedContractParser {
  private boxCounter = 0;
  private transactionCounter = 0;
  private relationshipCounter = 0;

  public parseContract(code: string): EnhancedVisualizationData {
    const boxes: EnhancedUTXOBox[] = [];
    const transactions: EnhancedUTXOTransaction[] = [];
    const relationships: BoxRelationship[] = [];
    const parties = new Map<string, any>();
    const tokens = new Map<string, any>();
    const contracts = new Map<string, any>();

    // Extract parties with enhanced metadata
    this.extractParties(code, parties);
    
    // Extract token definitions
    this.extractTokenDefinitions(code, tokens);
    
    // Extract contract definitions and analyze ErgoScript
    this.extractAndAnalyzeContracts(code, contracts);

    // Extract box definitions with enhanced analysis
    this.extractEnhancedBoxes(code, boxes, contracts, parties);

    // Extract transaction definitions with comprehensive analysis
    this.extractEnhancedTransactions(code, transactions, boxes);

    // Analyze transaction flows and box relationships
    this.analyzeTransactionFlows(code, transactions, boxes, relationships);

    // Extract wallet.sign operations with enhanced metadata
    this.extractSigningOperations(code, transactions, parties);

    // Extract blockchain send operations
    this.extractSendOperations(code, transactions);

    // Analyze box state transitions and register linkages
    this.analyzeBoxStateTransitions(code, boxes, relationships);

    // Identify DEX and atomic exchange patterns
    this.identifyProtocolPatterns(code, boxes, transactions);

    return {
      boxes,
      transactions,
      relationships,
      parties: Array.from(parties.values()),
      tokens: Array.from(tokens.values()),
      contracts: Array.from(contracts.values()),
      tokenFlows: this.analyzeTokenFlows(boxes, transactions),
      ergFlows: this.analyzeErgFlows(boxes, transactions, parties),
      protocolContext: this.extractProtocolContext(code),
      layoutHints: {
        algorithm: 'force',
        grouping: 'type'
      }
    };
  }

  // ============================================================================
  // PARTY AND TOKEN EXTRACTION
  // ============================================================================

  private extractParties(code: string, parties: Map<string, any>): void {
    const partyMatches = code.matchAll(/(\w+Party)\s*=\s*blockchainSim\.newParty\("([^"]+)"\)/g);
    for (const match of partyMatches) {
      const partyVar = match[1];
      const partyName = match[2];
      
      parties.set(partyName, {
        id: partyName,
        name: partyName,
        role: this.inferEnhancedPartyRole(partyName, code),
        publicKey: this.extractPartyPublicKey(partyVar, code),
        metadata: {
          variableName: partyVar,
          walletOperations: this.extractWalletOperations(partyVar, code),
          scenarioParticipation: this.extractScenarioParticipation(partyVar, code)
        }
      });
    }
  }

  private extractTokenDefinitions(code: string, tokens: Map<string, any>): void {
    const tokenMatches = code.matchAll(/(?:val\s+)?(\w+)\s*=\s*TokenInfo\s*\(\s*"([^"]+)"\s*,\s*([^,\)]+)\s*(?:,\s*([^,\)]+))?\s*\)/g);
    for (const match of tokenMatches) {
      const tokenVar = match[1];
      const tokenId = match[2];
      const totalSupply = match[3];
      const decimals = match[4] || '0';

      tokens.set(tokenId, {
        id: tokenId,
        name: tokenVar,
        decimals: parseInt(decimals),
        totalSupply: totalSupply,
        metadata: {
          variableName: tokenVar,
          definedInCode: true
        }
      });
    }
  }

  // ============================================================================
  // CONTRACT ANALYSIS
  // ============================================================================

  private extractAndAnalyzeContracts(code: string, contracts: Map<string, any>): void {
    // Extract contract definitions
    const contractMatches = code.matchAll(/val\s+(\w+Contract)\s*=\s*contract\s*\{([\s\S]*?)\}/g);
    for (const match of contractMatches) {
      const contractName = match[1];
      const contractCode = match[2];
      
      const analysis = this.analyzeErgoScript(contractCode);
      const ergoTreeHash = this.generateErgoTreeHash(contractCode);
      
      contracts.set(contractName, {
        ergoTreeHash,
        name: contractName,
        type: analysis.contractType,
        description: this.generateContractDescription(contractName, analysis),
        sourceCode: contractCode,
        analysis
      });
    }

    // Extract function-based contracts
    const funcContractMatches = code.matchAll(/def\s+(\w+Contract)\s*\([^)]*\)\s*=\s*\{[\s\S]*?val\s+\w+Script\s*=\s*s?"""([\s\S]*?)"""/g);
    for (const match of funcContractMatches) {
      const contractName = match[1];
      const contractCode = match[2];
      
      const analysis = this.analyzeErgoScript(contractCode);
      const ergoTreeHash = this.generateErgoTreeHash(contractCode);
      
      contracts.set(contractName, {
        ergoTreeHash,
        name: contractName,
        type: analysis.contractType,
        description: this.generateContractDescription(contractName, analysis),
        sourceCode: contractCode,
        analysis
      });
    }
  }

  private analyzeErgoScript(script: string): ContractAnalysis {
    const spendingConditions = this.extractSpendingConditions(script);
    const registerValidations = this.parseRegisterValidation(script);
    const tokenValidations = this.parseTokenValidation(script);
    const outputFilters = this.parseOutputFilters(script);
    const scenarioBranches = this.parseScenarioBranches(script);
    const temporalConstraints = this.parseTemporalConstraints(script);
    const multiPartyRequirements = this.parseMultiPartyRequirements(script);
    
    return {
      spendingConditions: spendingConditions.map(sc => sc.type),
      hasOwnerFallback: this.hasOwnerFallback(script),
      contractType: this.inferEnhancedContractType(script),
      registerValidations,
      tokenValidations,
      outputFilters,
      scenarioBranches,
      temporalConstraints,
      multiPartyRequirements
    };
  }

  private extractSpendingConditions(script: string): SpendingConditionDetail[] {
    const conditions: SpendingConditionDetail[] = [];
    
    // Check for owner fallback pattern
    if (script.includes('||') && (script.includes('Pk') || script.includes('pubKey'))) {
      conditions.push({
        type: 'owner_or_contract',
        code: script.split('||')[0].trim(),
        conditions: ['Owner public key verification']
      });
    }
    
    // Check for pure contract logic
    if (!script.includes('||') || script.indexOf('||') > script.indexOf('{')) {
      conditions.push({
        type: 'contract_only',
        code: script,
        conditions: this.extractLogicalConditions(script)
      });
    }
    
    // Check for time locks
    if (script.includes('HEIGHT') || script.includes('timestamp')) {
      conditions.push({
        type: 'time_locked',
        code: this.extractTimeConditions(script),
        conditions: ['Height or timestamp validation']
      });
    }
    
    // Check for multi-signature patterns
    if (script.includes('atLeast') || script.includes('threshold')) {
      conditions.push({
        type: 'threshold_signature',
        code: this.extractMultiSigLogic(script),
        conditions: ['Multiple signature verification']
      });
    }
    
    return conditions;
  }

  private parseRegisterValidation(script: string): RegisterValidation[] {
    const validations: RegisterValidation[] = [];
    
    // R4 linkage patterns
    const r4Matches = script.matchAll(/R4\[Coll\[Byte\]\]\.(?:isDefined|get)\s*==\s*SELF\.id/g);
    for (const match of r4Matches) {
      validations.push({
        register: 'R4',
        validationType: 'box_id_linkage',
        validationLogic: match[0]
      });
    }
    
    // General register validations
    const registerMatches = script.matchAll(/(R[4-9])\[([^\]]+)\]\.(?:isDefined|get|map|fold)/g);
    for (const match of registerMatches) {
      const register = match[1] as 'R4' | 'R5' | 'R6' | 'R7' | 'R8' | 'R9';
      validations.push({
        register,
        validationType: 'presence_check',
        validationLogic: match[0]
      });
    }
    
    return validations;
  }

  private parseTokenValidation(script: string): TokenValidation[] {
    const validations: TokenValidation[] = [];
    
    // Token ID validations
    const tokenIdCheck = script.includes('tokenId') && script.includes('==');
    const amountCheck = script.includes('tokens') && (script.includes('>=') || script.includes('=='));
    const conservationCheck = script.includes('INPUTS') && script.includes('OUTPUTS') && script.includes('tokens');
    
    validations.push({
      tokenIdCheck,
      amountCheck,
      conservationCheck,
      validationLogic: this.extractTokenValidationLogic(script)
    });
    
    return validations;
  }

  private parseOutputFilters(script: string): OutputFilter[] {
    const filters: OutputFilter[] = [];
    
    // Return box filters
    const returnBoxMatches = script.matchAll(/OUTPUTS\.filter\s*\{\s*\(([^}]+)\)\s*=>\s*([^}]+)\}/g);
    for (const match of returnBoxMatches) {
      const filterLogic = match[2];
      
      if (filterLogic.includes('R4') && filterLogic.includes('SELF.id')) {
        filters.push({
          filterType: 'return_box',
          filterLogic,
          expectedProperties: this.extractFilterProperties(filterLogic)
        });
      } else if (filterLogic.includes('propositionBytes') && filterLogic.includes('SELF.propositionBytes')) {
        filters.push({
          filterType: 'new_order_box',
          filterLogic,
          expectedProperties: this.extractFilterProperties(filterLogic)
        });
      }
    }
    
    return filters;
  }

  // ============================================================================
  // ENHANCED BOX EXTRACTION
  // ============================================================================

  private extractEnhancedBoxes(
    code: string, 
    boxes: EnhancedUTXOBox[], 
    contracts: Map<string, any>,
    parties: Map<string, any>
  ): void {
    // Direct Box(...) definitions
    const boxMatches = code.matchAll(/val\s+(\w+Box)\s*=\s*Box\s*\(([\s\S]*?)\)/g);
    for (const match of boxMatches) {
      const boxName = match[1];
      const boxContent = match[2];
      
      const box = this.parseEnhancedBoxDefinition(boxName, boxContent, code, contracts, parties);
      if (box) {
        boxes.push(box);
      }
    }

    // Transaction output boxes (transaction.outputs(0))
    const outputMatches = code.matchAll(/(\w+)\.outputs\((\d+)\)/g);
    for (const match of outputMatches) {
      const txName = match[1];
      const outputIndex = parseInt(match[2]);
      
      const box = this.createOutputBox(txName, outputIndex, code, contracts, parties);
      if (box) {
        boxes.push(box);
      }
    }
  }

  private parseEnhancedBoxDefinition(
    boxName: string, 
    content: string, 
    fullCode: string,
    contracts: Map<string, any>,
    parties: Map<string, any>
  ): EnhancedUTXOBox | null {
    try {
      const value = this.extractValue(content);
      const tokens = this.extractTokens(content);
      const script = this.extractScript(content);
      const registers = this.extractRegisters(content);
      
      // Determine box type from name and content
      const boxType = this.inferEnhancedBoxType(boxName, content, script);
      
      // Determine spending condition
      const spendingCondition = this.inferSpendingCondition(script, contracts);
      
      // Extract party information
      const owner = this.extractBoxOwner(content, fullCode, parties);
      
      // Create enhanced box
      const box: EnhancedUTXOBox = {
        id: boxName,
        creationTxId: `${boxName}_creation`,
        creationIndex: 0,
        value,
        tokens,
        ergoTree: this.generateErgoTree(script),
        ergoTreeHash: this.generateErgoTreeHash(script),
        script,
        spendingCondition,
        registers: this.parseEnhancedRegisters(registers),
        state: 'unspent',
        boxType,
        creationHeight: 1,
        owner,
        parties: owner ? [owner] : [],
        childBoxIds: [],
        relatedBoxIds: [],
        description: this.generateEnhancedBoxDescription(boxName, boxType, value, tokens)
      };

      // Add DEX-specific data
      if (this.isDEXBox(boxType)) {
        box.dexOrder = this.extractDEXOrderData(boxName, content, fullCode);
      }

      // Add atomic exchange data
      if (this.isAtomicExchangeBox(boxType)) {
        box.atomicExchange = this.extractAtomicExchangeData(boxName, content, fullCode);
      }

      // Add temporal constraints
      box.temporalConstraints = this.extractTemporalConstraints(content, fullCode);

      return box;
    } catch (error) {
      console.warn('Error parsing enhanced box definition:', boxName, error);
      return null;
    }
  }

  private createOutputBox(
    txName: string, 
    outputIndex: number, 
    code: string,
    contracts: Map<string, any>,
    parties: Map<string, any>
  ): EnhancedUTXOBox | null {
    const boxId = `${txName}_output_${outputIndex}`;
    
    // Try to find the transaction definition to extract output details
    const txMatch = code.match(new RegExp(`val\\s+${txName}\\s*=\\s*Transaction\\s*\\(([\\s\\S]*?)\\)`));
    if (!txMatch) return null;
    
    const txContent = txMatch[1];
    const outputs = this.extractOutputs(txContent);
    
    if (outputIndex >= outputs.length) return null;
    
    const outputRef = outputs[outputIndex];
    
    return {
      id: boxId,
      creationTxId: txName,
      creationIndex: outputIndex,
      value: 0, // Will be determined from transaction analysis
      tokens: [],
      ergoTree: '',
      ergoTreeHash: '',
      spendingCondition: 'public_key',
      registers: {},
      state: 'unspent',
      boxType: 'unknown',
      creationHeight: 1,
      parties: [],
      childBoxIds: [],
      relatedBoxIds: [],
      description: `Output ${outputIndex} from ${txName}`
    };
  }

  // ============================================================================
  // ENHANCED TRANSACTION EXTRACTION
  // ============================================================================

  private extractEnhancedTransactions(
    code: string, 
    transactions: EnhancedUTXOTransaction[], 
    boxes: EnhancedUTXOBox[]
  ): void {
    // Find transaction definitions with balanced parentheses
    const transactionRegex = /val\s+(\w+Transaction(?:Signed)?)\s*=\s*Transaction\s*\(/g;
    let match;
    
    while ((match = transactionRegex.exec(code)) !== null) {
      const transactionName = match[1];
      const startIndex = match.index + match[0].length - 1; // Position of opening parenthesis
      
      // Find the matching closing parenthesis
      let openParens = 1;
      let endIndex = startIndex + 1;
      
      while (endIndex < code.length && openParens > 0) {
        const char = code[endIndex];
        if (char === '(') {
          openParens++;
        } else if (char === ')') {
          openParens--;
        }
        endIndex++;
      }
      
      if (openParens === 0) {
        // Extract content between balanced parentheses (excluding the parentheses themselves)
        const transactionContent = code.substring(startIndex + 1, endIndex - 1);
        console.log(`=== EXTRACTED TRANSACTION: ${transactionName} ===`);
        console.log('Full content:', transactionContent);
        
        const transaction = this.parseEnhancedTransactionDefinition(transactionName, transactionContent, code, boxes);
        if (transaction) {
          // Add scenario detection
          transaction.scenario = this.detectTransactionScenario(transactionName, code);
          transactions.push(transaction);
        }
      }
    }

    // Extract function-based transactions
    const funcTxMatches = code.matchAll(/def\s+(\w+)\s*\([^)]*\)\s*=\s*\{[\s\S]*?Transaction\s*\(([\s\S]*?)\)/g);
    for (const match of funcTxMatches) {
      const funcName = match[1];
      const transactionContent = match[2];
      
      const transaction = this.parseEnhancedTransactionDefinition(funcName, transactionContent, code, boxes);
      if (transaction) {
        transaction.scenario = this.detectTransactionScenario(funcName, code);
        transactions.push(transaction);
      }
    }

    // Extract multi-scenario transactions (alternative resolution paths)
    this.extractScenarioTransactions(code, transactions, boxes);
  }

  private parseEnhancedTransactionDefinition(
    txName: string, 
    content: string, 
    fullCode: string,
    boxes: EnhancedUTXOBox[]
  ): EnhancedUTXOTransaction | null {
    try {
      const inputs = this.extractInputs(content);
      const outputs = this.extractOutputs(content);
      const dataInputs = this.extractDataInputs(content);
      const fee = this.extractFee(content);
      
      // Determine transaction type
      const type = this.inferEnhancedTransactionType(txName, content, fullCode);
      
      // Calculate values
      const inputValue = this.calculateInputValue(inputs, boxes);
      const outputValue = this.calculateOutputValue(outputs, boxes);
      
      const transaction: EnhancedUTXOTransaction = {
        id: txName,
        type,
        inputs,
        outputs,
        dataInputs,
        fee,
        inputValue,
        outputValue,
        status: 'building',
        validation: this.validateTransaction(inputs, outputs, fee, boxes),
        signer: '',
        parties: [],
        requiredSignatures: [],
        signatures: [],
        confirmations: 0,
        description: this.generateEnhancedTransactionDescription(txName, type, content)
      };

      // Add DEX-specific data
      if (type.includes('dex_')) {
        transaction.dexOperation = this.extractDEXOperationData(txName, content, fullCode);
      }

      // Add atomic exchange data
      if (type.includes('atomic_')) {
        transaction.atomicExchange = this.extractAtomicExchangeTransactionData(txName, content, fullCode);
      }

      // Add protocol stage data
      transaction.protocolStage = this.extractProtocolStageData(txName, fullCode);

      return transaction;
    } catch (error) {
      console.warn('Error parsing enhanced transaction definition:', txName, error);
      return null;
    }
  }

  // ============================================================================
  // PATTERN RECOGNITION
  // ============================================================================

  private identifyDEXPatterns(code: string): DEXPattern[] {
    const patterns: DEXPattern[] = [];
    
    // Order placement patterns
    const buyerContractMatches = code.matchAll(/def\s+buyerContract[\s\S]*?val\s+tokenPrice\s*=\s*(\d+)/g);
    for (const match of buyerContractMatches) {
      patterns.push({
        patternType: 'order_placement',
        orderType: 'buy',
        priceData: parseInt(match[1])
      });
    }
    
    const sellerContractMatches = code.matchAll(/def\s+sellerOrderContract[\s\S]*?val\s+tokenPrice\s*=\s*(\d+)/g);
    for (const match of sellerContractMatches) {
      patterns.push({
        patternType: 'order_placement',
        orderType: 'sell',
        priceData: parseInt(match[1])
      });
    }
    
    // Partial matching patterns
    if (code.includes('foundNewOrderBoxes') && code.includes('soldTokenAmount')) {
      patterns.push({
        patternType: 'partial_matching',
        orderType: 'sell',
        partialFillLogic: 'newOrderTokenAmount = selfTokenAmount - soldTokenAmount'
      });
    }
    
    return patterns;
  }

  private identifyAtomicExchangePatterns(code: string): AtomicExchangePattern[] {
    const patterns: AtomicExchangePattern[] = [];
    
    // Buyer bid patterns
    const buyerOrderMatches = code.matchAll(/def\s+buyerOrder\s*\([\s\S]*?ergAmount:\s*Long[\s\S]*?\)/g);
    for (const match of buyerOrderMatches) {
      patterns.push({
        patternType: 'bid_placement',
        assetExchange: {
          offered: { type: 'ERG', amount: 'ergAmount' },
          requested: { type: 'TOKEN', amount: 'tokenAmount', tokenId: 'token.tokenId' }
        },
        conditions: ['Token data validation', 'Output box ownership', 'Box ID linkage']
      });
    }
    
    // Seller ask patterns
    const sellerOrderMatches = code.matchAll(/def\s+sellerOrder\s*\([\s\S]*?tokenAmount:\s*Long[\s\S]*?\)/g);
    for (const match of sellerOrderMatches) {
      patterns.push({
        patternType: 'ask_placement',
        assetExchange: {
          offered: { type: 'TOKEN', amount: 'tokenAmount', tokenId: 'token.tokenId' },
          requested: { type: 'ERG', amount: 'ergAmount' }
        },
        conditions: ['ERG value validation', 'Output box ownership', 'Box ID linkage']
      });
    }
    
    return patterns;
  }

  private identifyRefundPatterns(code: string): RefundPattern[] {
    const patterns: RefundPattern[] = [];
    
    // Owner fallback patterns (most common refund mechanism)
    const ownerFallbackMatches = code.matchAll(/(buyerPk|sellerPk|ownerPk)\s*\|\|/g);
    for (const match of ownerFallbackMatches) {
      patterns.push({
        triggerCondition: `${match[1]} signature`,
        refundTarget: 'owner',
        refundAssets: [{ type: 'ERG', amount: 'box.value' }]
      });
    }
    
    return patterns;
  }

  // ============================================================================
  // TRANSACTION FLOW ANALYSIS
  // ============================================================================

  private analyzeTransactionFlows(
    code: string, 
    transactions: EnhancedUTXOTransaction[], 
    boxes: EnhancedUTXOBox[],
    relationships: BoxRelationship[]
  ): void {
    console.log('=== DEBUGGING TRANSACTION FLOWS ===');
    console.log('Transactions:', transactions.map(tx => ({ id: tx.id, inputs: tx.inputs, outputs: tx.outputs })));
    console.log('Boxes:', boxes.map(box => ({ id: box.id, owner: box.owner })));
    
    // Create explicit input-output connections for each transaction
    for (const tx of transactions) {
      console.log(`Processing transaction: ${tx.id}`);
      console.log(`Transaction inputs: ${JSON.stringify(tx.inputs)}`);
      
      // Connect input boxes TO transaction
      for (const inputRef of tx.inputs) {
        console.log(`Looking for input box: ${inputRef}`);
        const inputBox = this.findBoxByReference(inputRef, boxes, code);
        console.log(`Found input box:`, inputBox);
        if (inputBox) {
          // Mark input box as spent
          inputBox.state = 'spent';
          
          // Create input relationship
          relationships.push({
            id: `rel_${this.relationshipCounter++}`,
            type: 'input_output',
            fromBoxId: inputBox.id,
            toBoxId: tx.id,
            viaTxId: tx.id,
            strength: 'strong',
            metadata: {
              description: `Input consumed by ${tx.id}`,
              direction: 'input'
            }
          });
        }
      }
      
      // Connect transaction TO output boxes
      for (let i = 0; i < tx.outputs.length; i++) {
        const outputRef = tx.outputs[i];
        const outputBox = this.findOrCreateOutputBox(outputRef, tx.id, i, boxes, code);
        if (outputBox) {
          // Ensure output box exists in boxes array
          if (!boxes.find(b => b.id === outputBox.id)) {
            boxes.push(outputBox);
          }
          
          // Update output box creation info
          outputBox.creationTxId = tx.id;
          outputBox.creationIndex = i;
          outputBox.state = 'unspent';
          
          // Create output relationship
          relationships.push({
            id: `rel_${this.relationshipCounter++}`,
            type: 'input_output',
            fromBoxId: tx.id,
            toBoxId: outputBox.id,
            viaTxId: tx.id,
            strength: 'strong',
            metadata: {
              description: `Output created by ${tx.id}`,
              direction: 'output'
            }
          });
        }
      }
    }
    
    // Analyze change outputs and sendChangeTo patterns
    this.analyzeChangeOutputs(code, transactions, boxes, relationships);
  }

  private findBoxByReference(inputRef: string, boxes: EnhancedUTXOBox[], code: string): EnhancedUTXOBox | null {
    // Direct box reference
    const directBox = boxes.find(box => box.id === inputRef || inputRef.includes(box.id));
    if (directBox) return directBox;
    
    // Handle party unspent box pattern (converted from selectUnspentBoxes)
    if (inputRef.includes('_unspent_boxes')) {
      const partyMatch = inputRef.match(/(\w+)Party_unspent_boxes/);
      if (partyMatch) {
        const partyName = partyMatch[1].toLowerCase();
        // Find the party's initial funding box
        const partyBox = boxes.find(box => 
          box.owner === partyName || 
          box.parties.includes(partyName) ||
          box.id.toLowerCase().includes(partyName)
        );
        return partyBox || null;
      }
    }
    
    // Handle legacy selectUnspentBoxes pattern (for backward compatibility)
    if (inputRef.includes('selectUnspentBoxes')) {
      const partyMatch = inputRef.match(/(\w+)Party\.selectUnspentBoxes/);
      if (partyMatch) {
        const partyName = partyMatch[1].toLowerCase();
        // Find the party's initial funding box
        const partyBox = boxes.find(box => 
          box.owner === partyName || 
          box.parties.includes(partyName) ||
          box.id.toLowerCase().includes(partyName)
        );
        return partyBox || null;
      }
    }
    
    // Handle transaction output references with index (e.g., "depositTransactionSigned_output_0")
    const outputWithIndexMatch = inputRef.match(/(\w+)_output_(\d+)/);
    if (outputWithIndexMatch) {
      const txName = outputWithIndexMatch[1];
      const outputIndex = parseInt(outputWithIndexMatch[2]);
      const outputBoxId = `${txName}_output_${outputIndex}`;
      return boxes.find(box => box.id === outputBoxId) || null;
    }
    
    // Handle transaction output references without index (e.g., "depositTransactionSigned_output")
    const outputMatch = inputRef.match(/(\w+)_output$/);
    if (outputMatch) {
      const txName = outputMatch[1];
      // Try to find output with index 0 first, then any output
      let outputBoxId = `${txName}_output_0`;
      let outputBox = boxes.find(box => box.id === outputBoxId);
      if (!outputBox) {
        // Look for any output box from this transaction
        outputBox = boxes.find(box => box.id.startsWith(`${txName}_output_`));
      }
      return outputBox || null;
    }
    
    // Handle direct transaction output references like "depositTransactionSigned.outputs(0)"
    const directOutputMatch = inputRef.match(/(\w+)\.outputs\((\d+)\)/);
    if (directOutputMatch) {
      const txName = directOutputMatch[1];
      const outputIndex = parseInt(directOutputMatch[2]);
      const outputBoxId = `${txName}_output_${outputIndex}`;
      return boxes.find(box => box.id === outputBoxId) || null;
    }
    
    return null;
  }

  private findOrCreateOutputBox(
    outputRef: string, 
    txId: string, 
    outputIndex: number, 
    boxes: EnhancedUTXOBox[], 
    code: string
  ): EnhancedUTXOBox | null {
    // Check if it's a reference to an existing box definition
    const existingBox = boxes.find(box => box.id === outputRef || outputRef.includes(box.id));
    if (existingBox) return existingBox;
    
    // Handle sendChangeTo pattern - create change box
    if (outputRef.includes('sendChangeTo')) {
      const partyMatch = outputRef.match(/(\w+)Party\.wallet\.getAddress/);
      const changeBoxId = `${txId}_change`;
      
      return {
        id: changeBoxId,
        creationTxId: txId,
        creationIndex: outputIndex,
        value: 0, // Will be calculated during transaction processing
        tokens: [],
        ergoTree: '',
        ergoTreeHash: '',
        script: partyMatch ? `P2PK(${partyMatch[1]}Party.pubKey)` : 'P2PK',
        spendingCondition: 'public_key',
        registers: {},
        state: 'unspent',
        boxType: 'change',
        creationHeight: 1,
        owner: partyMatch ? partyMatch[1].toLowerCase() : undefined,
        parties: partyMatch ? [partyMatch[1].toLowerCase()] : [],
        parentBoxId: undefined,
        childBoxIds: [],
        relatedBoxIds: [],
        description: `Change output from ${txId}`
      };
    }
    
    // For other output references, try to find by name or create placeholder
    const outputBoxId = `${txId}_output_${outputIndex}`;
    return {
      id: outputBoxId,
      creationTxId: txId,
      creationIndex: outputIndex,
      value: 0,
      tokens: [],
      ergoTree: '',
      ergoTreeHash: '',
      script: '',
      spendingCondition: 'public_key',
      registers: {},
      state: 'unspent',
      boxType: 'unknown',
      creationHeight: 1,
      parties: [],
      parentBoxId: undefined,
      childBoxIds: [],
      relatedBoxIds: [],
      description: `Output ${outputIndex} from ${txId}`
    };
  }

  private analyzeChangeOutputs(
    code: string,
    transactions: EnhancedUTXOTransaction[],
    boxes: EnhancedUTXOBox[],
    relationships: BoxRelationship[]
  ): void {
    // Find sendChangeTo patterns and create proper change box connections
    const changeMatches = code.matchAll(/sendChangeTo\s*=\s*(\w+Party)\.wallet\.getAddress/g);
    
    for (const match of changeMatches) {
      const partyVar = match[1];
      const partyName = partyVar.replace('Party', '').toLowerCase();
      
      // Find the transaction containing this sendChangeTo
      const containingTx = transactions.find(tx => {
        const txDef = code.match(new RegExp(`val\\s+${tx.id}\\s*=\\s*Transaction\\s*\\([\\s\\S]*?sendChangeTo\\s*=\\s*${partyVar}\\.wallet\\.getAddress[\\s\\S]*?\\)`));
        return !!txDef;
      });
      
      if (containingTx) {
        // Ensure change box exists
        const changeBoxId = `${containingTx.id}_change`;
        let changeBox = boxes.find(box => box.id === changeBoxId);
        
        if (!changeBox) {
          changeBox = {
            id: changeBoxId,
            creationTxId: containingTx.id,
            creationIndex: 1, // Usually change is second output
            value: 0,
            tokens: [],
            ergoTree: '',
            ergoTreeHash: '',
            script: `P2PK(${partyName}Party.pubKey)`,
            spendingCondition: 'public_key',
            registers: {},
            state: 'unspent',
            boxType: 'change',
            creationHeight: 1,
            owner: partyName,
            parties: [partyName],
            parentBoxId: undefined,
            childBoxIds: [],
            relatedBoxIds: [],
            description: `Change returned to ${partyName}`
          };
          boxes.push(changeBox);
        }
        
        // Add to transaction outputs if not already there
        if (!containingTx.outputs.find(out => out.includes(changeBoxId))) {
          containingTx.outputs.push(changeBoxId);
        }
      }
    }
  }

  private analyzeBoxStateTransitions(
    code: string, 
    boxes: EnhancedUTXOBox[], 
    relationships: BoxRelationship[]
  ): void {
    // Analyze R4 register linkages
    for (const box of boxes) {
      if (box.registers.R4?.type === 'parent_box_id') {
        const parentBoxId = box.registers.R4.boxId;
        relationships.push({
          id: `rel_${this.relationshipCounter++}`,
          type: 'parent_child',
          fromBoxId: parentBoxId,
          toBoxId: box.id,
          strength: 'strong',
          metadata: {
            description: 'R4 register linkage',
            registerUsed: 'R4'
          }
        });
      }
    }
    
    // Analyze transaction input-output relationships
    const outputReferences = code.matchAll(/(\w+)\.outputs\((\d+)\)/g);
    for (const match of outputReferences) {
      const txName = match[1];
      const outputIndex = parseInt(match[2]);
      const outputBoxId = `${txName}_output_${outputIndex}`;
      
      // Find boxes that reference this output
      const referencingBoxes = boxes.filter(box => 
        box.registers.R4?.boxId === outputBoxId ||
        box.parentBoxId === outputBoxId
      );
      
      for (const refBox of referencingBoxes) {
        relationships.push({
          id: `rel_${this.relationshipCounter++}`,
          type: 'input_output',
          fromBoxId: outputBoxId,
          toBoxId: refBox.id,
          strength: 'medium',
          metadata: {
            description: 'Transaction output reference'
          }
        });
      }
    }
  }

  private identifyProtocolPatterns(
    code: string,
    boxes: EnhancedUTXOBox[],
    transactions: EnhancedUTXOTransaction[]
  ): void {
    const dexPatterns = this.identifyDEXPatterns(code);
    const atomicPatterns = this.identifyAtomicExchangePatterns(code);
    
    // Apply DEX patterns to enhance box and transaction data
    for (const pattern of dexPatterns) {
      const relevantBoxes = boxes.filter(box => 
        box.boxType.includes('order') || box.boxType.includes('settlement')
      );
      
      for (const box of relevantBoxes) {
        if (!box.dexOrder && pattern.orderType) {
          box.dexOrder = {
            orderType: pattern.orderType,
            tokenPair: ['ERG', 'TOKEN'] as [string, string],
            price: pattern.priceData || 0,
            originalAmount: '0',
            remainingAmount: '0',
            filled: 0,
            partialFills: []
          };
        }
      }
    }
    
    // Apply atomic exchange patterns
    for (const pattern of atomicPatterns) {
      const relevantBoxes = boxes.filter(box => 
        box.boxType.includes('atomic')
      );
      
      for (const box of relevantBoxes) {
        if (!box.atomicExchange) {
          box.atomicExchange = {
            exchangeType: pattern.patternType === 'bid_placement' ? 'bid' : 'ask',
            desiredToken: pattern.assetExchange.requested.tokenId || 'ERG',
            offeredAsset: pattern.assetExchange.offered,
            requestedAsset: pattern.assetExchange.requested
          };
        }
      }
    }
  }

  // ============================================================================
  // UTILITY METHODS FOR ENHANCED ANALYSIS
  // ============================================================================

  private inferEnhancedPartyRole(partyName: string, code: string): string {
    const name = partyName.toLowerCase();
    if (name.includes('buyer')) return 'buyer';
    if (name.includes('seller')) return 'seller';
    if (name.includes('arbiter') || name.includes('arbitrator')) return 'arbiter';
    if (name.includes('mediator') || name.includes('judge')) return 'mediator';
    if (name.includes('escrow')) return 'escrow_agent';
    if (name.includes('dex')) return 'dex';
    if (name.includes('oracle')) return 'oracle';
    if (name.includes('miner')) return 'miner';
    if (name.includes('admin') || name.includes('owner')) return 'admin';
    return 'user';
  }

  private extractPartyPublicKey(partyVar: string, code: string): string {
    const pkMatch = code.match(new RegExp(`${partyVar}\\.wallet\\.getAddress\\.pubKey`));
    return pkMatch ? `${partyVar}_pubkey` : '';
  }

  private extractWalletOperations(partyVar: string, code: string): string[] {
    const operations = [];
    if (code.includes(`${partyVar}.selectUnspentBoxes`)) operations.push('selectUnspentBoxes');
    if (code.includes(`${partyVar}.wallet.sign`)) operations.push('sign');
    if (code.includes(`${partyVar}.wallet.getAddress`)) operations.push('getAddress');
    return operations;
  }

  private hasOwnerFallback(script: string): boolean {
    return script.includes('||') && (script.includes('Pk') || script.includes('pubKey'));
  }

  private inferEnhancedContractType(script: string): 'dex_order' | 'atomic_exchange' | 'multisig' | 'time_locked' | 'escrow' | 'generic' {
    // Multi-scenario escrow patterns
    if (this.isEscrowContract(script)) return 'escrow';
    
    // Atomic swap patterns - hash-locked contracts
    if (script.includes('secretReveal') && script.includes('blake2b256') && script.includes('timeout')) {
      return 'atomic_exchange';
    }
    if (script.includes('secretHash') && script.includes('counterparty') && script.includes('HEIGHT')) {
      return 'atomic_exchange';
    }
    
    // Existing patterns
    if (script.includes('tokenPrice') && script.includes('OUTPUTS.filter')) return 'dex_order';
    if (script.includes('OUTPUTS(0).tokens') && script.includes('tokenDataCorrect')) return 'atomic_exchange';
    if (script.includes('atLeast') || script.includes('threshold')) return 'multisig';
    if (script.includes('HEIGHT') || script.includes('timestamp')) return 'time_locked';
    
    return 'generic';
  }

  private isEscrowContract(script: string): boolean {
    // Check for multiple OR conditions (scenario branches)
    const orCount = (script.match(/\|\|/g) || []).length;
    
    // Check for multiple party signatures
    const partySignatures = (script.match(/\w+Pk\s*&&/g) || []).length;
    
    // Check for timeout/height conditions
    const hasTimeout = script.includes('HEIGHT') && script.includes('timeout');
    
    // Check for dispute resolution patterns
    const hasDispute = script.includes('arbiter') || script.includes('dispute');
    
    // Check for register-based state management
    const hasStateRegisters = script.includes('R5') || script.includes('R6') || script.includes('R7');
    
    return orCount >= 2 && (partySignatures > 1 || hasTimeout || hasDispute || hasStateRegisters);
  }

  private extractLogicalConditions(script: string): string[] {
    const conditions = [];
    if (script.includes('allOf')) conditions.push('All conditions must be true');
    if (script.includes('anyOf')) conditions.push('Any condition must be true');
    if (script.includes('tokenIdIsCorrect')) conditions.push('Token ID validation');
    if (script.includes('coinsSecured')) conditions.push('Value conservation');
    if (script.includes('returnTokenAmount')) conditions.push('Token amount validation');
    return conditions;
  }

  private extractTimeConditions(script: string): string {
    const heightMatch = script.match(/HEIGHT\s*[><=]+\s*\d+/);
    const timestampMatch = script.match(/timestamp\s*[><=]+\s*\d+/);
    return heightMatch?.[0] || timestampMatch?.[0] || '';
  }

  private extractMultiSigLogic(script: string): string {
    const atLeastMatch = script.match(/atLeast\([^)]+\)/);
    const thresholdMatch = script.match(/threshold\([^)]+\)/);
    return atLeastMatch?.[0] || thresholdMatch?.[0] || '';
  }

  private extractTokenValidationLogic(script: string): string {
    const tokenValidations = [];
    if (script.includes('tokenId ==')) tokenValidations.push('Token ID check');
    if (script.includes('tokens(0)._2 >=')) tokenValidations.push('Token amount check');
    if (script.includes('INPUTS') && script.includes('OUTPUTS')) tokenValidations.push('Conservation check');
    return tokenValidations.join(', ');
  }

  private extractFilterProperties(filterLogic: string): Record<string, any> {
    const properties: Record<string, any> = {};
    if (filterLogic.includes('R4')) properties.R4_required = true;
    if (filterLogic.includes('propositionBytes')) properties.script_match = true;
    if (filterLogic.includes('SELF.id')) properties.box_linkage = true;
    return properties;
  }

  private generateContractDescription(contractName: string, analysis: ContractAnalysis): string {
    const type = analysis.contractType.replace('_', ' ');
    const fallback = analysis.hasOwnerFallback ? ' with owner fallback' : '';
    return `${type} contract${fallback}`;
  }

  private generateErgoTreeHash(script: string): string {
    // Simple hash generation for demo purposes
    let hash = 0;
    for (let i = 0; i < script.length; i++) {
      const char = script.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private generateErgoTree(script: string): string {
    return `0e${this.generateErgoTreeHash(script)}`;
  }

  private extractTokens(content: string): any[] {
    const tokens = [];
    // Handle format: token = (tokenId -> amount)
    const singleTokenMatch = content.match(/token\s*=\s*\(([^,)]+)\s*(?:->|,)\s*([^)]+)\)/);
    if (singleTokenMatch) {
      tokens.push({
        id: singleTokenMatch[1].trim(),
        amount: singleTokenMatch[2].trim(),
        metadata: { type: 'STANDARD' }
      });
    }
    
    // Handle format: tokens = List(...)
    const tokenListMatch = content.match(/tokens?\s*=\s*List\s*\(([^)]+)\)/);
    if (tokenListMatch) {
      const tokenMatches = tokenListMatch[1].matchAll(/\(([^,)]+)(?:\s*(?:->|,)\s*)([^)]+)\)/g);
      for (const match of tokenMatches) {
        tokens.push({
          id: match[1].trim(),
          amount: match[2].trim(),
          metadata: { type: 'STANDARD' }
        });
      }
    }
    
    return tokens;
  }

  private extractScript(content: string): string {
    const scriptMatch = content.match(/script\s*=\s*([^,\n]+)/);
    return scriptMatch ? scriptMatch[1].trim() : '';
  }

  private extractRegisters(content: string): Record<string, any> {
    const registers: Record<string, any> = {};
    
    // Handle single register format
    const singleRegisterMatch = content.match(/register\s*=\s*\(([^)]+)\)/);
    if (singleRegisterMatch) {
      const [register, value] = singleRegisterMatch[1].split(/\s*(?:->|,)\s*/);
      registers[register.trim()] = value.trim();
    }
    
    // Handle multiple registers format
    const registersMatch = content.match(/registers\s*=\s*(?:Map\s*\()?([^)]+)\)?/);
    if (registersMatch) {
      const registerPairs = registersMatch[1].matchAll(/(?:(R\d+)|\(R(\d+))(?:\s*(?:->|,)\s*)([^,)]+)/g);
      for (const match of registerPairs) {
        const regNum = match[1] || match[2];
        const regValue = match[3].trim();
        registers[`R${regNum}`] = regValue;
      }
    }
    
    return registers;
  }

  private inferEnhancedBoxType(boxName: string, content: string, script: string): ErgoBoxType {
    const name = boxName.toLowerCase();
    
    // Atomic swap patterns - hash-locked boxes
    if (name.includes('erglock') || (name.includes('lock') && content.includes('ERG_LOCK'))) {
      return 'atomic_bid'; // ERG deposit for swap
    }
    if (name.includes('tokenlock') || (name.includes('lock') && content.includes('TOKEN_LOCK'))) {
      return 'atomic_ask'; // Token deposit for swap
    }
    if (name.includes('claim') && content.includes('secret')) {
      return 'atomic_settlement'; // Claiming with secret reveal
    }
    if (name.includes('refund') && content.includes('timeout')) {
      return 'refund'; // Timeout refund
    }
    
    // Escrow patterns
    if (name.includes('deposit') && (name.includes('escrow') || this.isEscrowContext(content, script))) {
      return 'escrow_deposit';
    }
    if (name.includes('normal') && name.includes('completion')) return 'escrow_completion';
    if (name.includes('dispute') && name.includes('resolution')) return 'escrow_dispute';
    if (name.includes('timeout') && name.includes('refund')) return 'escrow_timeout';
    if (name.includes('arbiter') && name.includes('fee')) return 'arbiter_fee';
    if (name.includes('escrow')) return 'escrow_deposit'; // Default escrow type
    
    // DEX patterns
    if (name.includes('buy') && name.includes('order')) return 'buy_order';
    if (name.includes('sell') && name.includes('order')) return 'sell_order';
    if (name.includes('bid') && !name.includes('atomic')) return 'atomic_bid';
    if (name.includes('ask') && !name.includes('atomic')) return 'atomic_ask';
    if (name.includes('settlement')) return 'settlement';
    
    // Contract patterns
    if (script && script.includes('Contract')) return 'contract_state';
    if (name.includes('refund')) return 'refund';
    if (name.includes('fee')) return 'fee_collection';
    if (name.includes('change')) return 'change';
    
    // Default to wallet box
    return 'wallet';
  }

  private isEscrowContext(content: string, script: string): boolean {
    // Check for escrow-specific patterns in content or script
    const escrowPatterns = [
      'arbiterPk', 'buyerPk.*sellerPk', 'timeout', 'dispute', 
      'R5.*R6.*R7', 'HEIGHT.*SELF.creationInfo'
    ];
    
    const combinedContent = `${content} ${script}`;
    return escrowPatterns.some(pattern => 
      new RegExp(pattern, 'i').test(combinedContent)
    );
  }

  private inferSpendingCondition(script: string, contracts: Map<string, any>): SpendingCondition {
    if (!script) return 'public_key';
    
    if (script.includes('||') && script.includes('Pk')) return 'owner_or_contract';
    if (script.includes('HEIGHT') || script.includes('timestamp')) return 'time_locked';
    if (script.includes('atLeast') || script.includes('threshold')) return 'threshold_signature';
    if (script.includes('Contract')) return 'contract_only';
    
    return 'public_key';
  }

  private extractBoxOwner(content: string, fullCode: string, parties: Map<string, any>): string | undefined {
    // Look for party references in the script
    const scriptMatch = content.match(/script\s*=\s*([^,\n]+)/);
    if (scriptMatch) {
      const script = scriptMatch[1];
      for (const [partyName] of parties) {
        if (script.includes(partyName)) {
          return partyName;
        }
      }
    }
    
    return undefined;
  }

  private parseEnhancedRegisters(registers: Record<string, any>): any {
    const enhanced: any = {};
    
    for (const [register, value] of Object.entries(registers)) {
      if (register === 'R4' && typeof value === 'string') {
        // Check if it's a box ID reference pattern
        if (value.includes('.id') || value.includes('Box')) {
          enhanced.R4 = {
            type: 'parent_box_id' as const,
            boxId: value.replace(/\.(id|outputs\(\d+\))/, ''),
            context: 'Box linkage via R4 register'
          };
        } else {
          enhanced.R4 = {
            type: 'constant_value' as const,
            value
          };
        }
      } else {
        enhanced[register] = {
          type: 'constant_value' as const,
          value
        };
      }
    }
    
    return enhanced;
  }

  private generateEnhancedBoxDescription(boxName: string, boxType: ErgoBoxType, value: any, tokens: any[]): string {
    const type = boxType.replace(/_/g, ' ');
    const tokenInfo = tokens.length > 0 ? ` with ${tokens.length} token(s)` : '';
    
    // Add scenario-specific descriptions
    if (boxName.toLowerCase().includes('escrow')) {
      return `Escrow ${type}: ${value} nanoERG held in trust${tokenInfo}`;
    }
    if (boxName.toLowerCase().includes('dispute')) {
      return `Dispute resolution ${type}: ${value} nanoERG${tokenInfo}`;
    }
    if (boxName.toLowerCase().includes('timeout')) {
      return `Timeout refund ${type}: ${value} nanoERG${tokenInfo}`;
    }
    if (boxName.toLowerCase().includes('arbiter')) {
      return `Arbiter fee ${type}: ${value} nanoERG${tokenInfo}`;
    }
    
    return `${type} box: ${value} nanoERG${tokenInfo}`;
  }

  private extractDEXOrderData(boxName: string, content: string, fullCode: string): any {
    // Extract DEX order information from the surrounding code
    const priceMatch = fullCode.match(/val\s+tokenPrice\s*=\s*(\d+)/);
    const amountMatch = content.match(/tokens?\s*=\s*[^(]*\([^,)]*,\s*([^)]+)\)/);
    
    return {
      orderType: boxName.toLowerCase().includes('buy') ? 'buy' : 'sell',
      tokenPair: ['ERG', 'TOKEN'] as [string, string],
      price: priceMatch ? parseInt(priceMatch[1]) : 0,
      originalAmount: amountMatch ? amountMatch[1].trim() : '0',
      remainingAmount: amountMatch ? amountMatch[1].trim() : '0',
      filled: 0,
      partialFills: []
    };
  }

  private extractAtomicExchangeData(boxName: string, content: string, fullCode: string): any {
    const ergAmountMatch = fullCode.match(/ergAmount[^=]*=\s*([^,\s]+)/);
    const tokenAmountMatch = fullCode.match(/tokenAmount[^=]*=\s*([^,\s]+)/);
    
    return {
      exchangeType: boxName.toLowerCase().includes('bid') ? 'bid' : 'ask',
      desiredToken: 'TOKEN_ID',
      offeredAsset: {
        type: boxName.toLowerCase().includes('bid') ? 'ERG' : 'TOKEN',
        amount: ergAmountMatch ? ergAmountMatch[1] : tokenAmountMatch?.[1] || '0'
      },
      requestedAsset: {
        type: boxName.toLowerCase().includes('bid') ? 'TOKEN' : 'ERG',
        amount: tokenAmountMatch ? tokenAmountMatch[1] : ergAmountMatch?.[1] || '0'
      }
    };
  }

  private extractTemporalConstraints(content: string, fullCode: string): any {
    const constraints: any = {};
    
    const deadlineMatch = fullCode.match(/deadline[^=]*=\s*(\d+)/);
    if (deadlineMatch) {
      constraints.deadline = parseInt(deadlineMatch[1]);
    }
    
    const heightMatch = fullCode.match(/HEIGHT\s*[><=]+\s*(\d+)/);
    if (heightMatch) {
      constraints.lockHeight = parseInt(heightMatch[1]);
    }
    
    return Object.keys(constraints).length > 0 ? constraints : undefined;
  }

  private extractDataInputs(content: string): string[] {
    const dataInputsMatch = content.match(/dataInputs\s*=\s*([^,\n]+)/);
    if (dataInputsMatch) {
      const inputsStr = dataInputsMatch[1].trim();
      if (inputsStr.startsWith('List(')) {
        return inputsStr.slice(5, -1).split(',').map(s => s.trim());
      }
      return [inputsStr];
    }
    return [];
  }

  private inferEnhancedTransactionType(txName: string, content: string, fullCode: string): ErgoTransactionType {
    const name = txName.toLowerCase();
    
    // Atomic swap patterns - hash-locked exchanges
    if (name.includes('ergdeposit') || (name.includes('deposit') && content.includes('ERG_LOCK'))) {
      return 'atomic_bid_placement'; // ERG deposit for atomic swap
    }
    if (name.includes('tokendeposit') || (name.includes('deposit') && content.includes('TOKEN_LOCK'))) {
      return 'atomic_ask_placement'; // Token deposit for atomic swap
    }
    if (name.includes('claim') && content.includes('secret')) {
      return 'atomic_settlement'; // Claiming with secret reveal
    }
    if (name.includes('refund') && (content.includes('timeout') || fullCode.includes('timeout'))) {
      return 'atomic_refund'; // Timeout refund
    }
    
    // Escrow patterns
    if (name.includes('deposit') && fullCode.includes('escrow')) return 'escrow_deposit';
    if (name.includes('normal') && name.includes('completion')) return 'escrow_normal_completion';
    if (name.includes('dispute') && name.includes('resolution')) return 'escrow_dispute_resolution';
    if (name.includes('timeout') && name.includes('refund')) return 'escrow_timeout_refund';
    if (name.includes('escrow')) return 'escrow_interaction';
    
    // DEX patterns
    if (name.includes('buy') && name.includes('order')) return 'dex_order_placement';
    if (name.includes('sell') && name.includes('order')) return 'dex_order_placement';
    if (name.includes('match')) return 'dex_partial_match';
    if (name.includes('cancel')) return 'dex_order_cancel';
    
    // Atomic exchange patterns (legacy)
    if (name.includes('bid') && !content.includes('ERG_LOCK')) return 'atomic_bid_placement';
    if (name.includes('ask') && !content.includes('TOKEN_LOCK')) return 'atomic_ask_placement';
    if (name.includes('settlement') && !content.includes('secret')) return 'atomic_settlement';
    if (name.includes('refund') && !content.includes('timeout')) return 'atomic_refund';
    
    // Contract patterns
    if (name.includes('deploy')) return 'contract_deployment';
    if (name.includes('interaction')) return 'contract_interaction';
    
    // Basic patterns
    if (name.includes('transfer')) return 'simple_transfer';
    if (name.includes('consolidat')) return 'consolidation';
    
    return 'unknown';
  }

  private calculateInputValue(inputs: string[], boxes: EnhancedUTXOBox[]): any {
    // Calculate total input value from referenced boxes
    let total = 0;
    for (const input of inputs) {
      const box = boxes.find(b => b.id === input || input.includes(b.id));
      if (box && typeof box.value === 'number') {
        total += box.value;
      }
    }
    return total;
  }

  private calculateOutputValue(outputs: string[], boxes: EnhancedUTXOBox[]): any {
    // Calculate total output value from referenced boxes
    let total = 0;
    for (const output of outputs) {
      const box = boxes.find(b => b.id === output || output.includes(b.id));
      if (box && typeof box.value === 'number') {
        total += box.value;
      }
    }
    return total;
  }

  private validateTransaction(inputs: string[], outputs: string[], fee: any, boxes: EnhancedUTXOBox[]): any {
    const inputValue = this.calculateInputValue(inputs, boxes);
    const outputValue = this.calculateOutputValue(outputs, boxes);
    const feeValue = typeof fee === 'number' ? fee : parseInt(fee.toString()) || 0;
    
    const isConserved = inputValue === outputValue + feeValue;
    
    return {
      isValid: isConserved,
      errors: isConserved ? [] : ['ERG conservation violated'],
      warnings: [],
      ergConservation: {
        input: inputValue,
        output: outputValue,
        fee: feeValue,
        isConserved
      },
      tokenConservation: [] // TODO: Implement token conservation checks
    };
  }

  private generateEnhancedTransactionDescription(txName: string, type: ErgoTransactionType, content: string): string {
    const typeDesc = type.replace(/_/g, ' ');
    return `${typeDesc} transaction: ${txName}`;
  }

  private extractDEXOperationData(txName: string, content: string, fullCode: string): any {
    const priceMatch = fullCode.match(/tokenPrice\s*=\s*(\d+)/);
    const feeMatch = fullCode.match(/dexFeePerToken\s*=\s*(\d+)/);
    
    return {
      operationType: txName.toLowerCase().includes('cancel') ? 'cancellation' : 'order_placement',
      tradingPair: ['ERG', 'TOKEN'] as [string, string],
      priceExecuted: priceMatch ? parseInt(priceMatch[1]) : undefined,
      fees: {
        dexFee: feeMatch ? parseInt(feeMatch[1]) : 0,
        networkFee: 1000000, // Default min fee
        totalFee: (feeMatch ? parseInt(feeMatch[1]) : 0) + 1000000
      }
    };
  }

  private extractAtomicExchangeTransactionData(txName: string, content: string, fullCode: string): any {
    const ergAmountMatch = fullCode.match(/ergAmount[^=]*=\s*([^,\s]+)/);
    const tokenAmountMatch = fullCode.match(/tokenAmount[^=]*=\s*([^,\s]+)/);
    
    return {
      exchangeType: txName.toLowerCase().includes('refund') ? 'refund' : 'initiation',
      participants: ['buyer_pubkey', 'seller_pubkey'] as [string, string],
      assets: {
        offered: {
          type: 'ERG' as const,
          amount: ergAmountMatch ? ergAmountMatch[1] : '0'
        },
        requested: {
          type: 'TOKEN' as const,
          amount: tokenAmountMatch ? tokenAmountMatch[1] : '0'
        }
      },
      conditions: {}
    };
  }

  private extractProtocolStageData(txName: string, fullCode: string): any {
    // Determine if this transaction is part of a multi-stage protocol
    if (fullCode.includes('buyerOrder') && fullCode.includes('sellerOrder')) {
      return {
        protocol: 'atomic_swap' as const,
        currentStage: txName.toLowerCase().includes('buyer') ? 1 : 2,
        totalStages: 3,
        previousStages: []
      };
    }
    
    if (fullCode.includes('buyerContract') && fullCode.includes('sellerOrderContract')) {
      return {
        protocol: 'dex_matching' as const,
        currentStage: 1,
        totalStages: 2,
        previousStages: []
      };
    }
    
    return undefined;
  }

  private extractTransactionFlows(code: string): TransactionFlow[] {
    const flows: TransactionFlow[] = [];
    
    // Find transaction signing patterns
    const signMatches = code.matchAll(/val\s+(\w+)\s*=\s*(\w+)\.wallet\.sign\(([^)]+)\)/g);
    for (const match of signMatches) {
      const signedTxName = match[1];
      const originalTx = match[3];
      
      flows.push({
        txId: signedTxName,
        stage: 1,
        dependencies: [originalTx],
        outputs: [{
          toBoxId: `${signedTxName}_output_0`,
          transitionType: 'creation'
        }]
      });
    }
    
    return flows;
  }

  private mapTransitionToRelationshipType(transitionType: string): BoxRelationshipType {
    switch (transitionType) {
      case 'creation': return 'input_output';
      case 'consumption': return 'input_output';
      case 'state_change': return 'state_transition';
      case 'partial_consumption': return 'partial_consumption';
      default: return 'input_output';
    }
  }

  private extractSigningOperations(code: string, transactions: EnhancedUTXOTransaction[], parties: Map<string, any>): void {
    const signMatches = code.matchAll(/val\s+(\w+)\s*=\s*(\w+Party)\.wallet\.sign\(([^)]+)\)/g);
    for (const match of signMatches) {
      const signedTxName = match[1];
      const signerPartyVar = match[2];
      const originalTx = match[3];
      
      // Find the signer party
      const signerParty = Array.from(parties.values()).find(p => p.metadata?.variableName === signerPartyVar);
      
      // Update transaction with signer information
      const tx = transactions.find(t => t.id === originalTx || t.id === signedTxName);
      if (tx && signerParty) {
        tx.signer = signerParty.publicKey || signerParty.name;
        tx.parties = [signerParty.name];
        tx.status = 'signed';
        tx.signatures = [{
          publicKey: signerParty.publicKey || signerParty.name,
          signature: 'signature_placeholder',
          timestamp: Date.now()
        }];
      }
    }
  }

  private extractSendOperations(code: string, transactions: EnhancedUTXOTransaction[]): void {
    const sendMatches = code.matchAll(/blockchainSim\.send\(([^)]+)\)/g);
    for (const match of sendMatches) {
      const sentTxName = match[1];
      const tx = transactions.find(t => t.id === sentTxName);
      if (tx) {
        tx.status = 'confirmed';
        tx.confirmations = 6; // Assume confirmed with 6 confirmations
        tx.inclusionHeight = 100; // Placeholder height
      }
    }
  }

  private analyzeTokenFlows(boxes: EnhancedUTXOBox[], transactions: EnhancedUTXOTransaction[]): any[] {
    const flows: any[] = [];
    
    // Analyze token conservation across transactions
    const tokenIds = new Set<string>();
    for (const box of boxes) {
      for (const token of box.tokens) {
        tokenIds.add(token.id);
      }
    }
    
    for (const tokenId of tokenIds) {
      flows.push({
        tokenId,
        inputAmount: '0', // TODO: Calculate from inputs
        outputAmount: '0', // TODO: Calculate from outputs
        isConserved: true, // TODO: Implement conservation check
        fees: '0'
      });
    }
    
    return flows;
  }

  private analyzeErgFlows(boxes: EnhancedUTXOBox[], transactions: EnhancedUTXOTransaction[], parties: Map<string, any>): any[] {
    const flows: any[] = [];
    
    // Analyze ERG flows between parties
    for (const tx of transactions) {
      if (tx.inputValue && tx.outputValue) {
        flows.push({
          fromParty: tx.parties[0] || 'unknown',
          toParty: tx.parties[1] || 'system',
          amount: (typeof tx.inputValue === 'number' ? tx.inputValue : 0) - (typeof tx.outputValue === 'number' ? tx.outputValue : 0),
          purpose: 'payment' as const
        });
      }
    }
    
    return flows;
  }

  private extractProtocolContext(code: string): any {
    return {
      protocolName: this.detectProtocol(code),
      protocolVersion: '1.0',
      networkType: 'testnet' as const,
      heightRange: [1, 100] as [number, number]
    };
  }

  private detectProtocol(code: string): string {
    if (code.includes('DEXPlayground')) return 'DEX';
    if (code.includes('AtomicExchange')) return 'Atomic Exchange';
    if (code.includes('singleChainSwap') || this.hasAtomicSwapPattern(code)) return 'Single Chain Atomic Swap';
    if (code.includes('doubleChainSwap') || code.includes('cross_chain')) return 'Cross Chain Atomic Swap';
    if (code.includes('EscrowPlayground') || this.hasEscrowPattern(code)) return 'Escrow';
    if (code.includes('Auction')) return 'Auction';
    return 'Generic';
  }

  private hasEscrowPattern(code: string): boolean {
    const hasThreeParties = (code.match(/\w+Party\s*=\s*blockchainSim\.newParty/g) || []).length >= 3;
    const hasArbiter = code.includes('arbiter') || code.includes('mediator');
    const hasMultipleScenarios = code.includes('Scenario') || (code.match(/Transaction\s*\(/g) || []).length >= 3;
    const hasTimeoutLogic = code.includes('timeout') && code.includes('HEIGHT');
    
    return hasThreeParties && (hasArbiter || hasMultipleScenarios || hasTimeoutLogic);
  }

  private hasAtomicSwapPattern(code: string): boolean {
    // Check for hash-lock atomic swap indicators
    const hasHashLock = code.includes('secretHash') || code.includes('blake2b256') || code.includes('secretReveal');
    const hasTwoParties = (code.match(/\w+Party\s*=\s*blockchainSim\.newParty/g) || []).length === 2;
    const hasAssetExchange = (code.includes('tokenAmount') && code.includes('swapAmount')) || 
                           (code.includes('ERG') && code.includes('tokens'));
    const hasTimeout = code.includes('timeout') && code.includes('HEIGHT');
    const hasClaimMechanism = code.includes('Claim') || code.includes('reveal');
    
    return hasHashLock && hasTwoParties && hasAssetExchange && (hasTimeout || hasClaimMechanism);
  }

  private isDEXBox(boxType: ErgoBoxType): boolean {
    return boxType.includes('order') || boxType.includes('settlement') || boxType === 'buy_order' || boxType === 'sell_order';
  }

  private isAtomicExchangeBox(boxType: ErgoBoxType): boolean {
    return boxType.includes('atomic') || boxType === 'atomic_bid' || boxType === 'atomic_ask';
  }

  // ============================================================================
  // NEW MULTI-SCENARIO DETECTION METHODS
  // ============================================================================

  private parseScenarioBranches(script: string): ScenarioBranch[] {
    const branches: ScenarioBranch[] = [];
    
    // Pattern 1: Explicit scenario comments (// Scenario A:, // Scenario B:, etc.)
    const scenarioComments = script.matchAll(/\/\/\s*Scenario\s+([A-Z]):\s*([^\n]+)/g);
    for (const match of scenarioComments) {
      const scenarioId = match[1];
      const description = match[2].trim();
      
      branches.push({
        scenarioId: `scenario_${scenarioId}`,
        name: `Scenario ${scenarioId}`,
        condition: this.extractScenarioCondition(script, scenarioId),
        description,
        requiredSignatures: this.extractRequiredSignatures(script, scenarioId),
        outputPattern: this.extractOutputPattern(script, scenarioId),
        registerUpdates: this.extractRegisterUpdates(script, scenarioId)
      });
    }
    
    // Pattern 2: Multiple OR conditions in ErgoScript
    const orConditions = script.split('||').map((condition, index) => {
      if (index === 0) return null; // Skip the first part before first ||
      return {
        scenarioId: `branch_${index}`,
        name: `Branch ${index}`,
        condition: condition.trim().split('{')[0].trim() || condition.trim().split('&&')[0].trim(),
        description: this.inferConditionDescription(condition.trim()),
        requiredSignatures: this.extractSignaturesFromCondition(condition.trim()),
        outputPattern: 'output_based_on_condition',
        registerUpdates: {}
      };
    }).filter(Boolean) as ScenarioBranch[];
    
    branches.push(...orConditions);
    
    return branches;
  }

  private parseTemporalConstraints(script: string): TemporalConstraint[] {
    const constraints: TemporalConstraint[] = [];
    
    // Height-based constraints
    const heightMatches = script.matchAll(/HEIGHT\s*([><=!]+)\s*(\w+|\d+)/g);
    for (const match of heightMatches) {
      const operator = match[1] as '>' | '<' | '>=' | '<=' | '==';
      const value = match[2];
      
      constraints.push({
        type: 'height',
        operator,
        value: isNaN(Number(value)) ? value : Number(value),
        description: `Block height ${operator} ${value}`
      });
    }
    
    // Timeout constraints
    const timeoutMatches = script.matchAll(/timeout(Height)?\s*([><=!]+)\s*(\w+|\d+)/g);
    for (const match of timeoutMatches) {
      const operator = match[2] as '>' | '<' | '>=' | '<=' | '==';
      const value = match[3];
      
      constraints.push({
        type: 'height',
        operator,
        value: isNaN(Number(value)) ? value : Number(value),
        description: `Timeout ${operator} ${value} blocks`
      });
    }
    
    // Relative time constraints
    const relativeMatches = script.matchAll(/(SELF\.creationInfo\._1)\s*\+\s*(\w+)/g);
    for (const match of relativeMatches) {
      const offset = match[2];
      constraints.push({
        type: 'relative',
        operator: '+',
        value: offset,
        description: `${offset} blocks after box creation`
      });
    }
    
    return constraints;
  }

  private parseMultiPartyRequirements(script: string): MultiPartyRequirement[] {
    const requirements: MultiPartyRequirement[] = [];
    
    // Pattern: (partyA && partyB) - All parties must sign
    const allPartiesMatches = script.matchAll(/\((\w+Pk)\s*&&\s*(\w+Pk)(?:\s*&&\s*(\w+Pk))?\)/g);
    for (const match of allPartiesMatches) {
      const parties = [match[1], match[2], match[3]].filter(Boolean);
      requirements.push({
        scenario: 'multi_party_agreement',
        requiredParties: parties,
        signatureType: 'all',
        description: `All parties must sign: ${parties.join(', ')}`
      });
    }
    
    // Pattern: Single party requirements in OR conditions
    const singlePartyMatches = script.matchAll(/\((\w+Pk)\s*&&\s*HEIGHT\s*[><=!]+/g);
    for (const match of singlePartyMatches) {
      const party = match[1];
      requirements.push({
        scenario: 'conditional_single_party',
        requiredParties: [party],
        signatureType: 'any',
        description: `${party} can sign under certain conditions`
      });
    }
    
    // Pattern: Arbiter/mediator requirements
    const arbiterMatches = script.matchAll(/\((arbiter|mediator|judge)(Pk)\)/g);
    for (const match of arbiterMatches) {
      const arbiterType = match[1];
      requirements.push({
        scenario: 'dispute_resolution',
        requiredParties: [`${arbiterType}Pk`],
        signatureType: 'any',
        description: `${arbiterType} can resolve disputes`
      });
    }
    
    return requirements;
  }

  private extractScenarioParticipation(partyVar: string, code: string): string[] {
    const scenarios: string[] = [];
    
    // Check which scenarios mention this party
    const scenarioBlocks = code.matchAll(/\/\/\s*Scenario\s+([A-Z]):[\s\S]*?(?=\/\/\s*Scenario|$)/g);
    for (const match of scenarioBlocks) {
      const scenarioId = match[1];
      const scenarioContent = match[0];
      
      if (scenarioContent.includes(partyVar)) {
        scenarios.push(`scenario_${scenarioId}`);
      }
    }
    
    // Check transaction names that mention this party
    const txMatches = code.matchAll(new RegExp(`(\\w*${partyVar.replace('Party', '')}\\w*Transaction)`, 'gi'));
    for (const match of txMatches) {
      scenarios.push(match[1]);
    }
    
    return scenarios;
  }

  private extractScenarioTransactions(code: string, transactions: EnhancedUTXOTransaction[], boxes: EnhancedUTXOBox[]): void {
    // Look for multiple transaction variants for the same scenario
    const scenarioGroups = new Map<string, string[]>();
    
    // Group transactions by scenario type
    const scenarioKeywords = ['normal', 'dispute', 'timeout', 'completion', 'resolution', 'refund'];
    
    for (const keyword of scenarioKeywords) {
      const scenarioTxMatches = code.matchAll(new RegExp(`val\\s+(\\w*${keyword}\\w*Transaction)`, 'gi'));
      const txNames = Array.from(scenarioTxMatches).map(match => match[1]);
      
      if (txNames.length > 0) {
        scenarioGroups.set(keyword, txNames);
      }
    }
    
    // Create scenario-specific transaction variants
    for (const [scenario, txNames] of scenarioGroups) {
      for (const txName of txNames) {
        // Look for the full transaction definition
        const txDefMatch = code.match(new RegExp(`val\\s+${txName}\\s*=\\s*Transaction\\s*\\(([\\s\\S]*?)\\n\\s*val\\s+\\w+|val\\s+${txName}\\s*=\\s*Transaction\\s*\\(([\\s\\S]*?)$`));
        if (txDefMatch) {
          const content = txDefMatch[1] || txDefMatch[2];
          if (content) {
            const transaction = this.parseEnhancedTransactionDefinition(txName, content, code, boxes);
            if (transaction) {
              transaction.scenario = scenario;
              transaction.description = `${scenario} resolution: ${transaction.description}`;
              transactions.push(transaction);
            }
          }
        }
      }
    }
  }

  private detectTransactionScenario(txName: string, code: string): string | undefined {
    const name = txName.toLowerCase();
    
    // Escrow scenario detection
    if (name.includes('deposit') || name.includes('initial')) return 'deposit';
    if (name.includes('normal') && name.includes('completion')) return 'normal_completion';
    if (name.includes('dispute') && name.includes('resolution')) return 'dispute_resolution';
    if (name.includes('timeout') && name.includes('refund')) return 'timeout_refund';
    
    // Check context around transaction definition
    const txContext = this.extractTransactionContext(txName, code);
    if (txContext.includes('Scenario A')) return 'scenario_a';
    if (txContext.includes('Scenario B')) return 'scenario_b';
    if (txContext.includes('Scenario C')) return 'scenario_c';
    
    return undefined;
  }

  private extractTransactionContext(txName: string, code: string): string {
    const txIndex = code.indexOf(txName);
    if (txIndex === -1) return '';
    
    // Get 500 characters before and after the transaction name
    const start = Math.max(0, txIndex - 500);
    const end = Math.min(code.length, txIndex + 500);
    
    return code.substring(start, end);
  }

  private extractScenarioCondition(script: string, scenarioId: string): string {
    // Look for the condition associated with this scenario
    const scenarioRegex = new RegExp(`\/\/\\s*Scenario\\s+${scenarioId}:[\\s\\S]*?(?=\\(|\\||$)`);
    const match = script.match(scenarioRegex);
    
    if (match) {
      // Extract the condition that follows the scenario comment
      const afterComment = script.substring(match.index! + match[0].length);
      const conditionMatch = afterComment.match(/^\s*\(([^)]+)\)/);
      return conditionMatch ? conditionMatch[1] : 'complex_condition';
    }
    
    return 'unknown_condition';
  }

  private extractRequiredSignatures(script: string, scenarioId: string): string[] {
    const signatures: string[] = [];
    
    // Look for public key requirements in the scenario section
    const pkMatches = script.matchAll(/(\w+Pk)/g);
    for (const match of pkMatches) {
      if (!signatures.includes(match[1])) {
        signatures.push(match[1]);
      }
    }
    
    return signatures;
  }

  private extractOutputPattern(script: string, scenarioId: string): string {
    // Look for OUTPUTS patterns in the script
    if (script.includes('OUTPUTS.exists')) return 'conditional_output_validation';
    if (script.includes('OUTPUTS(0)') || script.includes('OUTPUTS(1)')) return 'indexed_output_access';
    if (script.includes('OUTPUTS.filter')) return 'filtered_output_selection';
    
    return 'basic_output_pattern';
  }

  private extractRegisterUpdates(script: string, scenarioId: string): Record<string, any> {
    const updates: Record<string, any> = {};
    
    // Look for register assignments (R4, R5, R6, R7)
    const registerMatches = script.matchAll(/(R[4-9])\s*\[\w+\]\s*(?:\.(?:get|isDefined))?\s*==?\s*([^\s&|)]+)/g);
    for (const match of registerMatches) {
      const register = match[1];
      const value = match[2];
      
      updates[register] = {
        expectedValue: value,
        validation: 'equality_check'
      };
    }
    
    return updates;
  }

  private inferConditionDescription(condition: string): string {
    if (condition.includes('HEIGHT')) return 'Time-based condition';
    if (condition.includes('&&')) return 'Multiple requirements';
    if (condition.includes('Pk')) return 'Signature requirement';
    if (condition.includes('OUTPUTS')) return 'Output validation';
    
    return 'Complex contract logic';
  }

  private extractSignaturesFromCondition(condition: string): string[] {
    const signatures = [];
    const pkMatches = condition.matchAll(/(\w+Pk)/g);
    for (const match of pkMatches) {
      signatures.push(match[1]);
    }
    return signatures;
  }

  // ============================================================================
  // LEGACY METHODS FOR BACKWARDS COMPATIBILITY
  // ============================================================================

  private parseBoxDefinition(boxName: string, content: string, fullCode: string): UTXOBox | null {
    try {
      const box: UTXOBox = {
        id: boxName,
        value: this.extractValue(content),
        state: 'unspent',
        type: 'user',
        description: this.generateBoxDescription(boxName, content)
      };

      // Extract script information
      const scriptMatch = content.match(/script\s*=\s*([^,\n]+)/);
      if (scriptMatch) {
        const scriptRef = scriptMatch[1].trim();
        if (scriptRef.includes('contract(') && scriptRef.includes('pubKey')) {
          box.type = 'user';
          box.script = 'P2PK (Pay-to-Public-Key)';
          
          // Extract party from pubKey reference
          const pubKeyMatch = scriptRef.match(/(\w+)Party\.wallet\.getAddress\.pubKey/);
          if (pubKeyMatch) {
            box.party = pubKeyMatch[1];
          }
        } else {
          box.type = 'contract';
          box.script = scriptRef.replace(/Contract$/, '');
        }
      }

      // Extract token information
      const tokenMatch = content.match(/tokens?\s*=\s*List\s*\(([^)]+)\)/);
      if (tokenMatch) {
        box.tokens = this.parseTokens(tokenMatch[1]);
      }

      // Extract register information
      const registerMatch = content.match(/registers?\s*=\s*(?:Map\s*\()?([^)]+)\)?/);
      if (!registerMatch) {
        const singleRegisterMatch = content.match(/register\s*=\s*\(([^)]+)\)/);
        if (singleRegisterMatch) {
          box.registers = this.parseRegisters(singleRegisterMatch[1]);
        }
      } else {
        box.registers = this.parseRegisters(registerMatch[1]);
      }

      return box;
    } catch (error) {
      console.warn('Error parsing box definition:', boxName, error);
      return null;
    }
  }

  private parseTransactionDefinition(txName: string, content: string, fullCode: string): UTXOTransaction | null {
    try {
      const transaction: UTXOTransaction = {
        id: txName,
        type: this.inferTransactionType(txName, content),
        inputs: this.extractInputs(content),
        outputs: this.extractOutputs(content),
        fee: this.extractFee(content),
        status: 'pending',
        description: this.generateTransactionDescription(txName, content)
      };

      return transaction;
    } catch (error) {
      console.warn('Error parsing transaction definition:', txName, error);
      return null;
    }
  }

  private extractValue(content: string): string | number {
    const valueMatch = content.match(/value\s*=\s*([^,\n]+)/);
    if (valueMatch) {
      const value = valueMatch[1].trim();
      // Handle expressions like "userFunds/2", "50000000L"
      if (value.includes('/')) {
        return value; // Keep as string for display
      }
      const numValue = value.replace(/L$/, '').replace(/_/g, '');
      return isNaN(Number(numValue)) ? value : Number(numValue);
    }
    return 0;
  }

  private extractInputs(content: string): string[] {
    console.log('=== EXTRACTING INPUTS DEBUG ===');
    console.log('Content:', content);
    
    // Find the start of inputs assignment
    const inputsStartMatch = content.match(/inputs\s*=\s*/);
    if (!inputsStartMatch) return [];
    
    const startIndex = inputsStartMatch.index! + inputsStartMatch[0].length;
    
    // Use balanced parentheses parsing to extract the complete inputs value
    let inputsStr = '';
    let depth = 0;
    let i = startIndex;
    
    while (i < content.length) {
      const char = content[i];
      
      if (char === '(' || char === '[') {
        depth++;
        inputsStr += char;
      } else if (char === ')' || char === ']') {
        depth--;
        inputsStr += char;
        if (depth === 0 && inputsStr.trim()) {
          // Check if we're at the end of a complete expression
          const nextChar = content[i + 1];
          if (!nextChar || nextChar.match(/[\s,\n]/)) {
            break;
          }
        }
      } else if (depth === 0 && char === ',' && content.substring(i).match(/^\s*,\s*(outputs|fee)/)) {
        // Stop at comma followed by outputs or fee at depth 0
        break;
      } else if (depth === 0 && char === '\n') {
        // Stop at newline at depth 0
        break;
      } else {
        inputsStr += char;
      }
      i++;
    }
    
    console.log('Extracted inputs string with balanced parsing:', inputsStr);
    
    if (inputsStr.trim()) {
      inputsStr = inputsStr.trim();
      console.log('Processing inputsStr:', inputsStr);
      
      // Handle List(...) format
      if (inputsStr.startsWith('List(')) {
        inputsStr = inputsStr.slice(5, -1);
        console.log('After List() removal:', inputsStr);
      }
      
      // Handle various input patterns
      if (inputsStr.includes('selectUnspentBoxes')) {
        console.log('Found selectUnspentBoxes pattern');
        const partyMatch = inputsStr.match(/(\w+Party)\.selectUnspentBoxes/);
        console.log('Party match:', partyMatch);
        return partyMatch ? [`${partyMatch[1]}_unspent_boxes`] : ['unspent_boxes'];
      }
      
      // Handle explicit box references like "depositTransactionSigned.outputs(0)"
      console.log('Checking for explicit box references');
      const explicitMatches = inputsStr.matchAll(/(\w+)\.outputs\((\d+)\)/g);
      const inputs = [];
      for (const match of explicitMatches) {
        console.log('Found explicit match:', match);
        inputs.push(`${match[1]}_output_${match[2]}`);
      }
      
      console.log('Final extracted inputs:', inputs.length > 0 ? inputs : [inputsStr]);
      return inputs.length > 0 ? inputs : [inputsStr];
    }
    return [];
  }

  private extractOutputs(content: string): string[] {
    const outputsMatch = content.match(/outputs\s*=\s*List\s*\(([^)]+)\)/);
    if (outputsMatch) {
      const outputsList = outputsMatch[1].trim();
      // Split by commas but handle nested parentheses
      const outputs = outputsList.split(/,(?![^()]*\))/).map(s => s.trim());
      return outputs;
    }
    return [];
  }

  private extractFee(content: string): string | number {
    const feeMatch = content.match(/fee\s*=\s*([^,\n]+)/);
    if (feeMatch) {
      const fee = feeMatch[1].trim();
      return fee === 'MinTxFee' ? 1000000 : fee;
    }
    return 1000000; // Default minimum fee
  }

  private parseTokens(tokenContent: string): Array<{ id: string; amount: string | number }> {
    const tokens = [];
    // Handle format: (token -> amount) or (token, amount)
    const tokenMatches = tokenContent.matchAll(/\(([^,)]+)(?:\s*(?:->|,)\s*)([^)]+)\)/g);
    for (const match of tokenMatches) {
      tokens.push({
        id: match[1].trim(),
        amount: match[2].trim()
      });
    }
    return tokens;
  }

  private parseRegisters(registerContent: string): Record<string, any> {
    const registers: Record<string, any> = {};
    
    // Handle different register formats
    const registerMatches = registerContent.matchAll(/(?:Map\s*\()?(?:(R\d+)|\(R(\d+))(?:\s*(?:->|,)\s*)([^,)]+)/g);
    for (const match of registerMatches) {
      const regNum = match[1] || match[2];
      const regValue = match[3].trim();
      registers[`R${regNum}`] = regValue;
    }
    
    return registers;
  }

  private inferTransactionType(txName: string, content: string): UTXOTransaction['type'] {
    const name = txName.toLowerCase();
    if (name.includes('deposit')) return 'deposit';
    if (name.includes('withdraw')) return 'withdraw';
    if (name.includes('swap')) return 'swap';
    if (name.includes('setup') || name.includes('deploy')) return 'setup';
    return 'transfer';
  }

  private generateBoxDescription(boxName: string, content: string): string {
    const name = boxName.replace(/Box$/, '');
    const valueMatch = content.match(/value\s*=\s*([^,\n]+)/);
    const value = valueMatch ? valueMatch[1] : 'unknown';
    
    if (name.toLowerCase().includes('lock')) {
      return `Locked funds: ${value}`;
    } else if (name.toLowerCase().includes('escrow')) {
      return `Escrowed funds: ${value}`;
    } else if (name.toLowerCase().includes('withdraw')) {
      return `Withdrawal: ${value}`;
    } else if (name.toLowerCase().includes('contract')) {
      return `Contract box: ${value}`;
    }
    
    return `${name}: ${value}`;
  }

  private generateTransactionDescription(txName: string, content: string): string {
    const name = txName.replace(/Transaction(?:Signed)?$/, '');
    const type = this.inferTransactionType(txName, content);
    
    switch (type) {
      case 'deposit':
        return `Deposit funds into ${name.toLowerCase()}`;
      case 'withdraw':
        return `Withdraw funds from ${name.toLowerCase()}`;
      case 'swap':
        return `Execute ${name.toLowerCase()} swap`;
      case 'setup':
        return `Setup ${name.toLowerCase()} contract`;
      default:
        return `Execute ${name.toLowerCase()}`;
    }
  }
}

// Export enhanced parser as default
export const enhancedContractParser = new EnhancedContractParser();

// Export class for direct instantiation
export { EnhancedContractParser };

// Export types for external use
export type {
  ScenarioBranch,
  TemporalConstraint,
  MultiPartyRequirement
};