// Core types for the smart contract designer
export interface ContractDesignerProps {
  className?: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

// Visual component types for drag-and-drop builder
export type ComponentType = 
  | 'input-box'
  | 'output-box'
  | 'guard-condition'
  | 'validation-rule'
  | 'token-operation'
  | 'register-access'
  | 'signature-check'
  | 'height-check'
  | 'custom-logic';

export interface ContractComponent {
  id: string;
  type: ComponentType;
  position: Position;
  size: Size;
  properties: ComponentProperties;
  connections: Connection[];
  label: string;
  description: string;
  category: 'input' | 'output' | 'logic' | 'validation' | 'token' | 'advanced';
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePort: string;
  targetPort: string;
  type: 'data' | 'condition' | 'token-flow';
}

// Contract designer state
export interface ContractDesignState {
  components: ContractComponent[];
  connections: Connection[];
  selectedComponent: string | null;
  isDragging: boolean;
  draggedComponent: ContractComponent | null;
  canvasOffset: Position;
  zoomLevel: number;
  generatedCode: string;
  validationErrors: ValidationError[];
  isGenerating: boolean;
}

export interface ValidationError {
  id: string;
  componentId?: string;
  type: 'syntax' | 'logic' | 'connection' | 'missing-requirement';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  line?: number;
  column?: number;
}

// Component templates for the palette
export interface ComponentTemplate {
  type: ComponentType;
  label: string;
  description: string;
  category: ContractComponent['category'];
  icon: string;
  defaultProperties: ComponentProperties;
  ports: {
    inputs: Port[];
    outputs: Port[];
  };
  ergoScriptTemplate: string;
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

export interface Port {
  id: string;
  label: string;
  dataType: 'box' | 'token' | 'condition' | 'value' | 'signature';
  required: boolean;
  description: string;
}

// Test scenario types
export interface TestScenario {
  id: string;
  name: string;
  description: string;
  inputs: TestInput[];
  expectedOutputs: TestOutput[];
  context: TestContext;
  status: 'pending' | 'running' | 'passed' | 'failed';
  results?: TestResults;
}

export interface TestInput {
  componentId: string;
  value: TestValue;
  label: string;
  type: 'erg' | 'token' | 'data' | 'signature';
}

export interface TestOutput {
  componentId: string;
  expectedValue: TestValue;
  tolerance?: number;
  description: string;
}

export interface TestContext {
  blockHeight: number;
  networkType: 'mainnet' | 'testnet';
  parties: TestParty[];
  timeConstraints?: {
    minHeight: number;
    maxHeight: number;
  };
}

export interface TestParty {
  id: string;
  name: string;
  publicKey: string;
  initialBalance: number;
  tokens: Record<string, number>;
}

export interface TestResults {
  success: boolean;
  executionTime: number;
  gasUsed: number;
  outputs: TestOutput[];
  logs: string[];
  error?: string;
  stateChanges: StateChange[];
}

export interface StateChange {
  type: 'box-created' | 'box-spent' | 'balance-updated';
  before?: StateValue;
  after: StateValue;
  timestamp: number;
}

// Code generation types
export interface CodeGenerationContext {
  contractName: string;
  version: string;
  author: string;
  description: string;
  complexity: number;
  features: string[];
}

export interface GeneratedContract {
  ergoScript: string;
  scalaCode: string;
  documentation: string;
  testSuite: string;
  complexity: number;
  warnings: string[];
  optimizations: string[];
}

// Visualization integration types
export interface DiagramUpdate {
  type: 'component-added' | 'component-removed' | 'component-updated' | 'connection-changed';
  componentId?: string;
  connectionId?: string;
  timestamp: number;
}

export interface VisualizationConfig {
  showDataFlow: boolean;
  showTokenFlow: boolean;
  showValidationFlow: boolean;
  highlightCriticalPaths: boolean;
  animateTransactions: boolean;
  layoutAlgorithm: 'force-directed' | 'hierarchical' | 'circular';
}

// Additional type definitions to replace any types
export interface ComponentProperties {
  [key: string]: string | number | boolean | ComponentProperties | ComponentProperties[] | null | undefined;
}

export type TestValue = 
  | string
  | number
  | boolean
  | { type: 'erg'; amount: number }
  | { type: 'token'; tokenId: string; amount: number }
  | { type: 'data'; value: string; encoding?: 'hex' | 'base64' | 'utf8' }
  | { type: 'signature'; publicKey: string; message: string }
  | TestValue[];

export type StateValue =
  | string
  | number
  | boolean
  | {
      boxId?: string;
      address?: string;
      value?: number;
      tokens?: Array<{ tokenId: string; amount: number }>;
      registers?: Record<string, string>;
    }
  | StateValue[];