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

// Component property type definitions - using specific interfaces instead of broad union types

/**
 * Base interface for all component properties
 */
export interface BaseComponentProperties {
  readonly id: string;
  readonly label?: string;
  readonly description?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
}

/**
 * Input box component properties
 */
export interface InputBoxProperties extends BaseComponentProperties {
  readonly minValue?: number;
  readonly maxValue?: number;
  readonly defaultValue?: number;
  readonly units?: string;
  readonly placeholder?: string;
}

/**
 * Output box component properties
 */
export interface OutputBoxProperties extends BaseComponentProperties {
  readonly address?: string;
  readonly minHeight?: number;
  readonly value?: number;
  readonly tokens?: readonly TokenAmount[];
  readonly registers?: Record<string, string>;
}

/**
 * Guard condition component properties
 */
export interface GuardConditionProperties extends BaseComponentProperties {
  readonly condition?: string;
  readonly operator?: 'AND' | 'OR' | 'NOT' | 'IMPLIES';
  readonly timeout?: number;
  readonly fallbackKey?: string;
}

/**
 * Validation rule component properties
 */
export interface ValidationRuleProperties extends BaseComponentProperties {
  readonly rule?: string;
  readonly errorMessage?: string;
  readonly severity?: 'error' | 'warning' | 'info';
  readonly customValidation?: string;
}

/**
 * Token operation component properties
 */
export interface TokenOperationProperties extends BaseComponentProperties {
  readonly operation?: 'mint' | 'burn' | 'transfer';
  readonly tokenId?: string;
  readonly amount?: number;
  readonly recipient?: string;
  readonly metadata?: Record<string, string>;
}

/**
 * Register access component properties
 */
export interface RegisterAccessProperties extends BaseComponentProperties {
  readonly register?: 'R4' | 'R5' | 'R6' | 'R7' | 'R8' | 'R9';
  readonly dataType?: 'Int' | 'Long' | 'BigInt' | 'SigmaProp' | 'Coll[Byte]' | 'Box';
  readonly accessMode?: 'read' | 'write';
  readonly defaultValue?: string;
}

/**
 * Signature check component properties
 */
export interface SignatureCheckProperties extends BaseComponentProperties {
  readonly publicKey?: string;
  readonly message?: string;
  readonly algorithm?: 'schnorr' | 'ecdsa';
  readonly required?: boolean;
}

/**
 * Height check component properties
 */
export interface HeightCheckProperties extends BaseComponentProperties {
  readonly minHeight?: number;
  readonly maxHeight?: number;
  readonly operator?: '<' | '<=' | '>' | '>=' | '==' | '!=';
  readonly currentHeight?: number;
}

/**
 * Custom logic component properties
 */
export interface CustomLogicProperties extends BaseComponentProperties {
  readonly code?: string;
  readonly language?: 'ergoscript' | 'scala';
  readonly parameters?: readonly Parameter[];
  readonly returnType?: string;
}

/**
 * Union type for all component properties - discriminated by component type
 * Includes index signature for backwards compatibility with string-based property access
 */
export type ComponentProperties = 
  | (InputBoxProperties & { [key: string]: any })
  | (OutputBoxProperties & { [key: string]: any })
  | (GuardConditionProperties & { [key: string]: any })
  | (ValidationRuleProperties & { [key: string]: any })
  | (TokenOperationProperties & { [key: string]: any })
  | (RegisterAccessProperties & { [key: string]: any })
  | (SignatureCheckProperties & { [key: string]: any })
  | (HeightCheckProperties & { [key: string]: any })
  | (CustomLogicProperties & { [key: string]: any });

/**
 * Helper interfaces
 */
export interface TokenAmount {
  readonly tokenId: string;
  readonly amount: number;
}

export interface Parameter {
  readonly name: string;
  readonly type: string;
  readonly defaultValue?: string;
  readonly description?: string;
}

/**
 * Type guards for ComponentProperties discriminated union
 */
export function isInputBoxProperties(props: ComponentProperties): props is InputBoxProperties {
  return 'minValue' in props || 'maxValue' in props || 'defaultValue' in props || 'units' in props || 'placeholder' in props;
}

export function isOutputBoxProperties(props: ComponentProperties): props is OutputBoxProperties {
  return 'address' in props || 'minHeight' in props || 'value' in props || 'tokens' in props || 'registers' in props;
}

export function isGuardConditionProperties(props: ComponentProperties): props is GuardConditionProperties {
  return 'condition' in props || 'operator' in props || 'timeout' in props || 'fallbackKey' in props;
}

export function isValidationRuleProperties(props: ComponentProperties): props is ValidationRuleProperties {
  return 'rule' in props || 'errorMessage' in props || 'severity' in props || 'customValidation' in props;
}

export function isTokenOperationProperties(props: ComponentProperties): props is TokenOperationProperties {
  return 'operation' in props || 'tokenId' in props || 'amount' in props || 'recipient' in props || 'metadata' in props;
}

export function isRegisterAccessProperties(props: ComponentProperties): props is RegisterAccessProperties {
  return 'register' in props || 'dataType' in props || 'accessMode' in props || 'defaultValue' in props;
}

export function isSignatureCheckProperties(props: ComponentProperties): props is SignatureCheckProperties {
  return 'publicKey' in props || 'message' in props || 'algorithm' in props;
}

export function isHeightCheckProperties(props: ComponentProperties): props is HeightCheckProperties {
  return 'minHeight' in props || 'maxHeight' in props || 'operator' in props || 'currentHeight' in props;
}

export function isCustomLogicProperties(props: ComponentProperties): props is CustomLogicProperties {
  return 'code' in props || 'language' in props || 'parameters' in props || 'returnType' in props;
}

/**
 * Utility functions for type-safe property access
 */
export function getPropertyValue<T extends ComponentProperties, K extends keyof T>(
  props: T,
  key: K
): T[K] | undefined {
  return props[key];
}

export function hasProperty<T extends ComponentProperties>(
  props: T,
  key: keyof T
): boolean {
  return key in props && props[key] !== undefined && props[key] !== null;
}

/**
 * Type-safe property accessor for ComponentProperties
 */
export function getComponentProperty(
  props: ComponentProperties, 
  key: string
): string | number | boolean | TokenAmount[] | Parameter[] | Record<string, string> | null | undefined {
  // Use type assertion since we know the property exists at runtime
  return (props as any)[key];
}

/**
 * Type-safe property setter for ComponentProperties
 */
export function setComponentProperty(
  props: ComponentProperties,
  key: string,
  value: string | number | boolean | TokenAmount[] | Parameter[] | Record<string, string> | null | undefined
): ComponentProperties {
  return { ...props, [key]: value } as ComponentProperties;
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