import type { UTXOBox, UTXOTransaction, VisualizationData } from './types';

export class ContractParser {
  private boxCounter = 0;
  private transactionCounter = 0;

  public parseContract(code: string): VisualizationData {
    const boxes: UTXOBox[] = [];
    const transactions: UTXOTransaction[] = [];
    const parties = new Set<string>();

    // Extract parties
    const partyMatches = code.matchAll(/(\w+Party)\s*=\s*blockchainSim\.newParty\("([^"]+)"\)/g);
    for (const match of partyMatches) {
      parties.add(match[2]);
    }

    // Extract box definitions
    const boxMatches = code.matchAll(/val\s+(\w+Box)\s*=\s*Box\s*\(([\s\S]*?)\)/g);
    for (const match of boxMatches) {
      const boxName = match[1];
      const boxContent = match[2];
      
      const box = this.parseBoxDefinition(boxName, boxContent, code);
      if (box) {
        boxes.push(box);
      }
    }

    // Extract transaction definitions
    const transactionMatches = code.matchAll(/val\s+(\w+Transaction(?:Signed)?)\s*=\s*Transaction\s*\(([\s\S]*?)\)/g);
    for (const match of transactionMatches) {
      const transactionName = match[1];
      const transactionContent = match[2];
      
      const transaction = this.parseTransactionDefinition(transactionName, transactionContent, code);
      if (transaction) {
        transactions.push(transaction);
      }
    }

    // Extract wallet.sign operations
    const signMatches = code.matchAll(/val\s+(\w+)\s*=\s*(\w+)\.wallet\.sign\(([^)]+)\)/g);
    for (const match of signMatches) {
      const signedTxName = match[1];
      const signerParty = match[2].replace('Party', '');
      const originalTx = match[3];
      
      // Update transaction with signer information
      const tx = transactions.find(t => t.id === originalTx);
      if (tx) {
        tx.signer = signerParty;
        tx.status = 'confirmed';
      }
    }

    // Extract blockchain send operations
    const sendMatches = code.matchAll(/blockchainSim\.send\(([^)]+)\)/g);
    for (const match of sendMatches) {
      const sentTxName = match[1];
      const tx = transactions.find(t => t.id === sentTxName);
      if (tx) {
        tx.status = 'confirmed';
      }
    }

    return {
      boxes,
      transactions,
      parties: Array.from(parties)
    };
  }

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
    const inputsMatch = content.match(/inputs\s*=\s*([^,\n]+(?:,\s*[^,\n]+)*)/);
    if (inputsMatch) {
      let inputsStr = inputsMatch[1].trim();
      
      // Handle List(...) format
      if (inputsStr.startsWith('List(')) {
        inputsStr = inputsStr.slice(5, -1);
      }
      
      // Handle various input patterns
      if (inputsStr.includes('selectUnspentBoxes')) {
        const partyMatch = inputsStr.match(/(\w+Party)\.selectUnspentBoxes/);
        return partyMatch ? [`${partyMatch[1]}_unspent_boxes`] : ['unspent_boxes'];
      }
      
      // Handle explicit box references like "depositTransactionSigned.outputs(0)"
      const explicitMatches = inputsStr.matchAll(/(\w+)\.outputs\(\d+\)/g);
      const inputs = [];
      for (const match of explicitMatches) {
        inputs.push(`${match[1]}_output`);
      }
      
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

export const contractParser = new ContractParser();