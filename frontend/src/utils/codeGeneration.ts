import type { 
  ContractComponent, 
  Connection, 
  GeneratedContract, 
  ValidationError 
} from '../types/contractDesigner';
import { getComponentTemplate } from '../data/componentTemplates';

// Code generation context for template interpolation
interface CodeGenerationContext {
  components: ContractComponent[];
  connections: Connection[];
  variables: Map<string, string>;
  imports: Set<string>;
  dependencies: Map<string, ContractComponent[]>;
}

// Template processing utilities
class TemplateProcessor {
  private context: CodeGenerationContext;
  
  constructor(context: CodeGenerationContext) {
    this.context = context;
  }
  
  processTemplate(template: string, component: ContractComponent): string {
    let processed = template;
    
    // Replace property placeholders
    for (const [key, value] of Object.entries(component.properties)) {
      const placeholder = `{${key}}`;
      const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
      processed = processed.replace(regex, String(value));
    }
    
    // Replace connection-based placeholders
    const connectedInputs = this.getConnectedInputs(component.id);
    for (const [portId, sourceExpression] of connectedInputs) {
      const placeholder = `{${portId}}`;
      const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
      processed = processed.replace(regex, sourceExpression);
    }
    
    // Remove any remaining placeholders with defaults
    processed = this.fillDefaults(processed, component);
    
    return processed;
  }
  
  private getConnectedInputs(componentId: string): Map<string, string> {
    const inputs = new Map<string, string>();
    
    const incomingConnections = this.context.connections.filter(
      conn => conn.targetId === componentId
    );
    
    for (const connection of incomingConnections) {
      const sourceComponent = this.context.components.find(c => c.id === connection.sourceId);
      if (sourceComponent) {
        const sourceExpression = this.generateExpressionForComponent(sourceComponent, connection.sourcePort);
        inputs.set(connection.targetPort, sourceExpression);
      }
    }
    
    return inputs;
  }
  
  generateExpressionForComponent(component: ContractComponent, port: string): string {
    const template = getComponentTemplate(component.type);
    if (!template) return 'true';
    
    // Generate appropriate expression based on component type and port
    switch (component.type) {
      case 'input-box':
        if (port === 'value-output') return `INPUTS(${this.getBoxIndex(component.id)}).value`;
        if (port === 'box-output') return `INPUTS(${this.getBoxIndex(component.id)})`;
        break;
        
      case 'guard-condition':
        return this.processTemplate(template.ergoScriptTemplate, component);
        
      case 'signature-check':
        const pkVar = component.properties.publicKey || 'ownerPk';
        return pkVar;
        
      case 'token-operation':
        return 'tokenTransferValid';
        
      case 'height-check':
        return 'heightValid';
        
      case 'register-access':
        return 'registerData.get';
        
      case 'validation-rule':
        return 'validationResult';
        
      case 'custom-logic':
        return component.properties.code || 'true';
    }
    
    return 'true';
  }
  
  private fillDefaults(template: string, component: ContractComponent): string {
    const defaults = {
      'value': component.properties.value || '1000000',
      'operator': component.properties.operator || '==',
      'left-operand': 'true',
      'right-operand': 'true',
      'public-key': component.properties.publicKey || 'ownerPk',
      'token-amount': component.properties.amount || '1',
      'height-constraint': component.properties.minHeight || '0',
      'box-input': 'INPUTS(0)',
      'condition-1': 'true',
      'condition-2': 'true',
      'combineWith': component.properties.combineWith || '&&',
      'code': component.properties.code || 'true'
    };
    
    for (const [key, defaultValue] of Object.entries(defaults)) {
      const placeholder = `{${key}}`;
      const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
      template = template.replace(regex, String(defaultValue));
    }
    
    return template;
  }
  
  private getBoxIndex(componentId: string): number {
    const inputBoxes = this.context.components.filter(c => c.type === 'input-box');
    return inputBoxes.findIndex(c => c.id === componentId);
  }
}

// Main code generation functions
export class ErgoScriptGenerator {
  private context: CodeGenerationContext;
  private processor: TemplateProcessor;
  
  constructor(components: ContractComponent[], connections: Connection[]) {
    this.context = {
      components,
      connections,
      variables: new Map(),
      imports: new Set(),
      dependencies: this.buildDependencyGraph(components, connections)
    };
    this.processor = new TemplateProcessor(this.context);
  }
  
  async generateContract(): Promise<GeneratedContract> {
    try {
      const ergoScript = await this.generateErgoScript();
      const scalaCode = await this.generateScalaCode();
      const documentation = this.generateDocumentation();
      const testSuite = this.generateTestSuite();
      
      return {
        ergoScript,
        scalaCode,
        documentation,
        testSuite,
        complexity: this.calculateComplexity(),
        warnings: this.getWarnings(),
        optimizations: this.getOptimizations()
      };
    } catch (error) {
      throw new Error(`Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private async generateErgoScript(): Promise<string> {
    const inputBoxes = this.context.components.filter(c => c.type === 'input-box');
    const outputBoxes = this.context.components.filter(c => c.type === 'output-box');
    const logicComponents = this.context.components.filter(c => 
      !['input-box', 'output-box'].includes(c.type)
    );
    
    let script = '// Generated ErgoScript Contract\n';
    script += '// Auto-generated by Ergo Playgrounds Designer\n\n';
    
    // Generate variable declarations
    script += this.generateVariableDeclarations();
    
    // Generate input validations
    if (inputBoxes.length > 0) {
      script += '\n// Input box validations\n';
      for (const inputBox of inputBoxes) {
        const template = getComponentTemplate(inputBox.type);
        if (template) {
          script += this.processor.processTemplate(template.ergoScriptTemplate, inputBox);
          script += '\n';
        }
      }
    }
    
    // Generate logic components
    if (logicComponents.length > 0) {
      script += '\n// Contract logic\n';
      for (const component of logicComponents) {
        const template = getComponentTemplate(component.type);
        if (template) {
          script += this.processor.processTemplate(template.ergoScriptTemplate, component);
          script += '\n';
        }
      }
    }
    
    // Generate output validations
    if (outputBoxes.length > 0) {
      script += '\n// Output box validations\n';
      for (const outputBox of outputBoxes) {
        const template = getComponentTemplate(outputBox.type);
        if (template) {
          script += this.processor.processTemplate(template.ergoScriptTemplate, outputBox);
          script += '\n';
        }
      }
    }
    
    // Generate final sigmaProp
    script += '\n// Final contract condition\n';
    script += 'sigmaProp(\n  ';
    
    const conditions = this.generateFinalConditions();
    script += conditions.join(' &&\n  ');
    
    script += '\n)';
    
    return script;
  }
  
  private generateVariableDeclarations(): string {
    let declarations = '';
    
    // Add common variables
    declarations += '// Common variables\n';
    declarations += 'val ownerPk = CONTEXT.preHeader.minerPk // Replace with actual owner public key\n';
    
    // Add component-specific variables
    for (const component of this.context.components) {
      switch (component.type) {
        case 'signature-check':
          if (component.properties.publicKey && component.properties.publicKey !== 'ownerPk') {
            declarations += `val ${component.properties.publicKey} = fromBase16("...") // Replace with actual public key\n`;
          }
          break;
          
        case 'token-operation':
          if (component.properties.tokenId) {
            declarations += `val ${component.id}_tokenId = fromBase16("${component.properties.tokenId}")\n`;
          }
          break;
      }
    }
    
    return declarations;
  }
  
  private generateFinalConditions(): string[] {
    const conditions: string[] = [];
    
    // Find output components (these represent final conditions)
    const outputComponents = this.context.connections
      .filter(conn => !this.context.connections.some(c => c.sourceId === conn.targetId))
      .map(conn => this.context.components.find(c => c.id === conn.targetId))
      .filter(Boolean) as ContractComponent[];
    
    if (outputComponents.length === 0) {
      // If no connections, use all logic components
      const logicComponents = this.context.components.filter(c => 
        ['guard-condition', 'signature-check', 'validation-rule', 'custom-logic'].includes(c.type)
      );
      
      for (const component of logicComponents) {
        conditions.push(this.processor.generateExpressionForComponent(component, 'output'));
      }
    } else {
      for (const component of outputComponents) {
        conditions.push(this.processor.generateExpressionForComponent(component, 'output'));
      }
    }
    
    if (conditions.length === 0) {
      conditions.push('true // No conditions specified');
    }
    
    return conditions;
  }
  
  private async generateScalaCode(): Promise<string> {
    let scalaCode = '// Generated Scala Code for Contract Testing\n';
    scalaCode += 'import org.ergoplatform.playgrounds._\n';
    scalaCode += 'import org.ergoplatform.ErgoBox.TokenId\n\n';
    
    scalaCode += 'object GeneratedContractPlayground {\n';
    scalaCode += '  def main(args: Array[String]): Unit = {\n';
    scalaCode += '    newBlockChainSimulationScenario("Generated Contract Test") {\n\n';
    
    // Generate party setup
    scalaCode += '      val alice = newParty("Alice")\n';
    scalaCode += '      val bob = newParty("Bob")\n\n';
    
    // Generate contract setup based on components
    scalaCode += '      val contract = contract {\n';
    scalaCode += '        // Contract logic will be generated here\n';
    scalaCode += '        alice.anyPk\n';
    scalaCode += '      }\n\n';
    
    // Generate test scenarios
    scalaCode += '      alice.generateUnspentBoxes(toSpend = 10.ergs)\n';
    scalaCode += '      alice.spendBoxes(alice.selectUnspentBoxes(toSpend = 1.ergs))\n';
    scalaCode += '        .withRedeemer(alice)\n';
    scalaCode += '        .payToContract(contract, 1.ergs)\n';
    scalaCode += '        .send()\n\n';
    
    scalaCode += '    }\n';
    scalaCode += '  }\n';
    scalaCode += '}\n';
    
    return scalaCode;
  }
  
  private generateDocumentation(): string {
    let docs = '# Generated Contract Documentation\n\n';
    docs += `Generated on: ${new Date().toISOString()}\n\n`;
    
    docs += '## Contract Overview\n\n';
    docs += `This contract contains ${this.context.components.length} components and ${this.context.connections.length} connections.\n\n`;
    
    docs += '## Components\n\n';
    for (const component of this.context.components) {
      docs += `### ${component.label} (${component.type})\n`;
      docs += `${component.description}\n\n`;
      
      if (Object.keys(component.properties).length > 0) {
        docs += '**Properties:**\n';
        for (const [key, value] of Object.entries(component.properties)) {
          docs += `- ${key}: ${value}\n`;
        }
        docs += '\n';
      }
    }
    
    docs += '## Data Flow\n\n';
    for (const connection of this.context.connections) {
      const source = this.context.components.find(c => c.id === connection.sourceId);
      const target = this.context.components.find(c => c.id === connection.targetId);
      
      if (source && target) {
        docs += `- ${source.label} → ${target.label} (${connection.type})\n`;
      }
    }
    
    return docs;
  }
  
  private generateTestSuite(): string {
    let tests = '// Generated Test Suite\n';
    tests += 'import org.scalatest.flatspec.AnyFlatSpec\n';
    tests += 'import org.scalatest.matchers.should.Matchers\n\n';
    
    tests += 'class GeneratedContractSpec extends AnyFlatSpec with Matchers {\n\n';
    
    tests += '  "Generated Contract" should "execute successfully with valid inputs" in {\n';
    tests += '    // Test implementation\n';
    tests += '  }\n\n';
    
    tests += '  it should "reject invalid transactions" in {\n';
    tests += '    // Test implementation\n';
    tests += '  }\n\n';
    
    tests += '}\n';
    
    return tests;
  }
  
  private calculateComplexity(): number {
    let complexity = 0;
    
    for (const component of this.context.components) {
      const weights = {
        'input-box': 1,
        'output-box': 1,
        'guard-condition': 2,
        'signature-check': 3,
        'token-operation': 4,
        'height-check': 2,
        'register-access': 3,
        'validation-rule': 3,
        'custom-logic': 5
      };
      
      complexity += weights[component.type] || 1;
    }
    
    complexity += this.context.connections.length * 0.5;
    
    return Math.round(complexity);
  }
  
  private getWarnings(): string[] {
    const warnings: string[] = [];
    
    // Check for disconnected components
    const connectedIds = new Set([
      ...this.context.connections.map(c => c.sourceId),
      ...this.context.connections.map(c => c.targetId)
    ]);
    
    for (const component of this.context.components) {
      if (!connectedIds.has(component.id) && this.context.components.length > 1) {
        warnings.push(`Component "${component.label}" is not connected to other components`);
      }
    }
    
    // Check for missing properties
    for (const component of this.context.components) {
      switch (component.type) {
        case 'signature-check':
          if (!component.properties.publicKey) {
            warnings.push(`Signature check "${component.label}" is missing public key`);
          }
          break;
          
        case 'token-operation':
          if (!component.properties.tokenId) {
            warnings.push(`Token operation "${component.label}" is missing token ID`);
          }
          break;
      }
    }
    
    return warnings;
  }
  
  private getOptimizations(): string[] {
    const optimizations: string[] = [];
    
    // Suggest combining conditions
    const guardConditions = this.context.components.filter(c => c.type === 'guard-condition');
    if (guardConditions.length > 3) {
      optimizations.push('Consider combining multiple guard conditions for better performance');
    }
    
    // Suggest box validation optimization
    const inputBoxes = this.context.components.filter(c => c.type === 'input-box');
    if (inputBoxes.length > 2) {
      optimizations.push('Multiple input boxes detected - consider batch validation');
    }
    
    return optimizations;
  }
  
  private buildDependencyGraph(
    components: ContractComponent[], 
    connections: Connection[]
  ): Map<string, ContractComponent[]> {
    const graph = new Map<string, ContractComponent[]>();
    
    for (const component of components) {
      const dependencies = connections
        .filter(conn => conn.targetId === component.id)
        .map(conn => components.find(c => c.id === conn.sourceId))
        .filter(Boolean) as ContractComponent[];
      
      graph.set(component.id, dependencies);
    }
    
    return graph;
  }
}

// Validation functions
export function validateContractDesign(
  components: ContractComponent[], 
  connections: Connection[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Basic validation
  if (components.length === 0) {
    errors.push({
      id: 'no-components',
      type: 'missing-requirement',
      severity: 'error',
      message: 'Contract must have at least one component'
    });
    return errors;
  }
  
  // Check for cycles in connections
  const cycleCheck = checkForCycles(components, connections);
  if (cycleCheck.hasCycle) {
    errors.push({
      id: 'circular-dependency',
      type: 'logic',
      severity: 'error',
      message: 'Circular dependency detected in component connections',
      suggestion: 'Remove cyclic connections between components'
    });
  }
  
  // Validate component properties
  for (const component of components) {
    const componentErrors = validateComponent(component);
    errors.push(...componentErrors);
  }
  
  // Validate connections
  for (const connection of connections) {
    const connectionErrors = validateConnection(connection, components);
    errors.push(...connectionErrors);
  }
  
  return errors;
}

function checkForCycles(components: ContractComponent[], connections: Connection[]): { hasCycle: boolean } {
  const graph = new Map<string, string[]>();
  
  // Build adjacency list
  for (const component of components) {
    graph.set(component.id, []);
  }
  
  for (const connection of connections) {
    const neighbors = graph.get(connection.sourceId) || [];
    neighbors.push(connection.targetId);
    graph.set(connection.sourceId, neighbors);
  }
  
  // DFS cycle detection
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }
    
    recursionStack.delete(nodeId);
    return false;
  }
  
  for (const componentId of graph.keys()) {
    if (!visited.has(componentId)) {
      if (dfs(componentId)) {
        return { hasCycle: true };
      }
    }
  }
  
  return { hasCycle: false };
}

function validateComponent(component: ContractComponent): ValidationError[] {
  const errors: ValidationError[] = [];
  
  switch (component.type) {
    case 'signature-check':
      if (!component.properties.publicKey || component.properties.publicKey.trim() === '') {
        errors.push({
          id: `${component.id}-missing-pk`,
          componentId: component.id,
          type: 'missing-requirement',
          severity: 'error',
          message: 'Signature check component requires a public key',
          suggestion: 'Add a public key in the component properties'
        });
      }
      break;
      
    case 'token-operation':
      if (!component.properties.tokenId || component.properties.tokenId.trim() === '') {
        errors.push({
          id: `${component.id}-missing-token`,
          componentId: component.id,
          type: 'missing-requirement',
          severity: 'warning',
          message: 'Token operation is missing token ID',
          suggestion: 'Specify the token ID for this operation'
        });
      }
      break;
      
    case 'input-box':
    case 'output-box':
      if (!component.properties.value || component.properties.value <= 0) {
        errors.push({
          id: `${component.id}-invalid-value`,
          componentId: component.id,
          type: 'logic',
          severity: 'warning',
          message: 'Box value should be greater than 0',
          suggestion: 'Set a positive value for the box'
        });
      }
      break;
  }
  
  return errors;
}

function validateConnection(connection: Connection, components: ContractComponent[]): ValidationError[] {
  const errors: ValidationError[] = [];
  
  const sourceComponent = components.find(c => c.id === connection.sourceId);
  const targetComponent = components.find(c => c.id === connection.targetId);
  
  if (!sourceComponent) {
    errors.push({
      id: `${connection.id}-missing-source`,
      type: 'connection',
      severity: 'error',
      message: `Connection source component not found: ${connection.sourceId}`
    });
  }
  
  if (!targetComponent) {
    errors.push({
      id: `${connection.id}-missing-target`,
      type: 'connection',
      severity: 'error',
      message: `Connection target component not found: ${connection.targetId}`
    });
  }
  
  // Validate port compatibility if both components exist
  if (sourceComponent && targetComponent) {
    const sourceTemplate = getComponentTemplate(sourceComponent.type);
    const targetTemplate = getComponentTemplate(targetComponent.type);
    
    if (sourceTemplate && targetTemplate) {
      const sourcePort = sourceTemplate.ports.outputs.find(p => p.id === connection.sourcePort);
      const targetPort = targetTemplate.ports.inputs.find(p => p.id === connection.targetPort);
      
      if (!sourcePort) {
        errors.push({
          id: `${connection.id}-invalid-source-port`,
          type: 'connection',
          severity: 'error',
          message: `Invalid source port: ${connection.sourcePort}`
        });
      }
      
      if (!targetPort) {
        errors.push({
          id: `${connection.id}-invalid-target-port`,
          type: 'connection',
          severity: 'error',
          message: `Invalid target port: ${connection.targetPort}`
        });
      }
      
      // Check data type compatibility
      if (sourcePort && targetPort && sourcePort.dataType !== targetPort.dataType) {
        errors.push({
          id: `${connection.id}-type-mismatch`,
          type: 'connection',
          severity: 'warning',
          message: `Data type mismatch: ${sourcePort.dataType} -> ${targetPort.dataType}`,
          suggestion: 'Ensure connected ports have compatible data types'
        });
      }
    }
  }
  
  return errors;
}

// Export the main generation function for use in the hook
export async function generateErgoScript(components: ContractComponent[], connections: Connection[]): Promise<GeneratedContract> {
  const generator = new ErgoScriptGenerator(components, connections);
  return await generator.generateContract();
}