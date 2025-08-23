import type { ComponentTemplate } from '../types/contractDesigner';

export const componentTemplates: ComponentTemplate[] = [
  // Input/Output Components
  {
    type: 'input-box',
    label: 'Input Box',
    description: 'UTXO box that serves as input to the contract',
    category: 'input',
    icon: '📥',
    complexity: 'beginner',
    defaultProperties: {
      id: 'output-box',
      value: 1000000, // 0.001 ERG in nanoERG
      registers: {},
      tokens: []
    },
    ports: {
      inputs: [],
      outputs: [
        {
          id: 'box-output',
          label: 'Box Data',
          dataType: 'box',
          required: true,
          description: 'Box data for use in contract logic'
        },
        {
          id: 'value-output',
          label: 'ERG Value',
          dataType: 'value',
          required: false,
          description: 'ERG value contained in the box'
        }
      ]
    },
    ergoScriptTemplate: `
// Input box validation
val inputBox = INPUTS(0)
val inputValue = inputBox.value
`
  },

  {
    type: 'output-box',
    label: 'Output Box',
    description: 'UTXO box created as output by the contract',
    category: 'output',
    icon: '📤',
    complexity: 'beginner',
    defaultProperties: {
      id: 'output-box',
      value: 1000000,
      registers: {},
      tokens: []
    },
    ports: {
      inputs: [
        {
          id: 'value-input',
          label: 'ERG Value',
          dataType: 'value',
          required: true,
          description: 'ERG value for the output box'
        },
        {
          id: 'condition-input',
          label: 'Script Condition',
          dataType: 'condition',
          required: false,
          description: 'Optional condition for the output box script'
        }
      ],
      outputs: []
    },
    ergoScriptTemplate: `
// Output box creation
val outputBox = OUTPUTS(0)
outputBox.value >= {value} &&
outputBox.propositionBytes == {script}.bytes
`
  },

  // Logic Components
  {
    type: 'guard-condition',
    label: 'Guard Condition',
    description: 'Boolean condition that must be satisfied for contract execution',
    category: 'logic',
    icon: '🛡️',
    complexity: 'beginner',
    defaultProperties: {
      id: 'guard-condition',
      condition: 'true',
      operator: 'AND'
    },
    ports: {
      inputs: [
        {
          id: 'left-operand',
          label: 'Left Value',
          dataType: 'value',
          required: true,
          description: 'Left side of the comparison'
        },
        {
          id: 'right-operand',
          label: 'Right Value',
          dataType: 'value',
          required: true,
          description: 'Right side of the comparison'
        }
      ],
      outputs: [
        {
          id: 'condition-result',
          label: 'Boolean Result',
          dataType: 'condition',
          required: true,
          description: 'Result of the boolean condition'
        }
      ]
    },
    ergoScriptTemplate: `
// Guard condition
val guardCondition = ({left-operand} {operator} {right-operand})
`
  },

  {
    type: 'signature-check',
    label: 'Signature Verification',
    description: 'Verify cryptographic signature from a specific public key',
    category: 'validation',
    icon: '✍️',
    complexity: 'intermediate',
    defaultProperties: {
      id: 'signature-check',
      publicKey: '',
      message: 'default'
    },
    ports: {
      inputs: [
        {
          id: 'public-key',
          label: 'Public Key',
          dataType: 'signature',
          required: true,
          description: 'Public key for signature verification'
        },
        {
          id: 'message',
          label: 'Message',
          dataType: 'value',
          required: false,
          description: 'Message to verify signature against'
        }
      ],
      outputs: [
        {
          id: 'signature-valid',
          label: 'Signature Valid',
          dataType: 'condition',
          required: true,
          description: 'Boolean result of signature verification'
        }
      ]
    },
    ergoScriptTemplate: `
// Signature verification
val publicKey = {publicKey}
val isValidSignature = publicKey
`
  },

  // Token Operations
  {
    type: 'token-operation',
    label: 'Token Transfer',
    description: 'Transfer tokens between boxes with validation',
    category: 'token',
    icon: '🪙',
    complexity: 'intermediate',
    defaultProperties: {
      id: 'token-operation',
      tokenId: '',
      amount: 1,
      operation: 'transfer'
    },
    ports: {
      inputs: [
        {
          id: 'source-box',
          label: 'Source Box',
          dataType: 'box',
          required: true,
          description: 'Box containing the tokens to transfer'
        },
        {
          id: 'token-amount',
          label: 'Token Amount',
          dataType: 'value',
          required: true,
          description: 'Amount of tokens to transfer'
        }
      ],
      outputs: [
        {
          id: 'transfer-valid',
          label: 'Transfer Valid',
          dataType: 'condition',
          required: true,
          description: 'Boolean indicating if transfer is valid'
        }
      ]
    },
    ergoScriptTemplate: `
// Token transfer validation
val tokenId = fromBase16("{tokenId}")
val transferAmount = {amount}L
val inputTokens = INPUTS.flatMap(_.tokens).filter(_._1 == tokenId).map(_._2).sum
val outputTokens = OUTPUTS.flatMap(_.tokens).filter(_._1 == tokenId).map(_._2).sum
val tokenTransferValid = (inputTokens == outputTokens)
`
  },

  // Advanced Components
  {
    type: 'height-check',
    label: 'Block Height Check',
    description: 'Validate current blockchain height against constraints',
    category: 'validation',
    icon: '📏',
    complexity: 'intermediate',
    defaultProperties: {
      id: 'height-check',
      minHeight: 0,
      maxHeight: 1000000,
      operator: '>='
    },
    ports: {
      inputs: [
        {
          id: 'height-constraint',
          label: 'Height Constraint',
          dataType: 'value',
          required: true,
          description: 'Height value to compare against'
        }
      ],
      outputs: [
        {
          id: 'height-valid',
          label: 'Height Valid',
          dataType: 'condition',
          required: true,
          description: 'Boolean result of height validation'
        }
      ]
    },
    ergoScriptTemplate: `
// Block height validation
val currentHeight = HEIGHT
val heightConstraint = {height-constraint}
val heightValid = (currentHeight {operator} heightConstraint)
`
  },

  {
    type: 'register-access',
    label: 'Register Reader',
    description: 'Read data from UTXO box registers (R4-R9)',
    category: 'advanced',
    icon: '🗂️',
    complexity: 'intermediate',
    defaultProperties: {
      id: 'register-access',
      register: 'R4',
      dataType: 'Coll[Byte]',
      defaultValue: ''
    },
    ports: {
      inputs: [
        {
          id: 'box-input',
          label: 'Source Box',
          dataType: 'box',
          required: true,
          description: 'Box to read register data from'
        }
      ],
      outputs: [
        {
          id: 'register-data',
          label: 'Register Data',
          dataType: 'value',
          required: true,
          description: 'Data stored in the specified register'
        }
      ]
    },
    ergoScriptTemplate: `
// Register data access
val sourceBox = {box-input}
val registerData = sourceBox.{register}[{dataType}]
val hasValidRegister = registerData.isDefined
`
  },

  {
    type: 'validation-rule',
    label: 'Validation Logic',
    description: 'Custom validation rule with multiple conditions',
    category: 'validation',
    icon: '✅',
    complexity: 'intermediate',
    defaultProperties: {
      id: 'validation-rule',
      rule: '',
      errorMessage: 'Validation failed',
      severity: 'error'
    },
    ports: {
      inputs: [
        {
          id: 'condition-1',
          label: 'Condition 1',
          dataType: 'condition',
          required: true,
          description: 'First validation condition'
        },
        {
          id: 'condition-2',
          label: 'Condition 2',
          dataType: 'condition',
          required: false,
          description: 'Optional second condition'
        }
      ],
      outputs: [
        {
          id: 'validation-result',
          label: 'Valid',
          dataType: 'condition',
          required: true,
          description: 'Combined validation result'
        }
      ]
    },
    ergoScriptTemplate: `
// Validation rule combination
val condition1 = {condition-1}
val condition2 = {condition-2}
val validationResult = condition1 {combineWith} condition2
`
  },

  {
    type: 'custom-logic',
    label: 'Custom ErgoScript',
    description: 'Write custom ErgoScript code directly',
    category: 'advanced',
    icon: '⚙️',
    complexity: 'advanced',
    defaultProperties: {
      id: 'custom-logic',
      code: 'sigmaProp(true)',
      language: 'ergoscript',
      parameters: []
    },
    ports: {
      inputs: [
        {
          id: 'input-1',
          label: 'Input 1',
          dataType: 'value',
          required: false,
          description: 'Optional input value'
        },
        {
          id: 'input-2',
          label: 'Input 2',
          dataType: 'condition',
          required: false,
          description: 'Optional input condition'
        }
      ],
      outputs: [
        {
          id: 'output-1',
          label: 'Output',
          dataType: 'condition',
          required: true,
          description: 'Custom logic output'
        }
      ]
    },
    ergoScriptTemplate: `
// Custom ErgoScript logic
{code}
`
  }
];

// Helper function to get component template by type
export function getComponentTemplate(type: ComponentTemplate['type']): ComponentTemplate | undefined {
  return componentTemplates.find(template => template.type === type);
}

// Helper function to get components by category
export function getComponentsByCategory(category: ComponentTemplate['category']): ComponentTemplate[] {
  return componentTemplates.filter(template => template.category === category);
}

// Helper function to get components by complexity
export function getComponentsByComplexity(complexity: ComponentTemplate['complexity']): ComponentTemplate[] {
  return componentTemplates.filter(template => template.complexity === complexity);
}

// Pre-defined contract templates for quick start
export const contractTemplates = [
  {
    id: 'simple-send',
    name: 'Simple Send',
    description: 'Basic contract for sending ERG from one party to another',
    complexity: 'beginner',
    components: [
      {
        type: 'input-box' as const,
        position: { x: 50, y: 100 },
        properties: { value: 10000000 } // 0.01 ERG
      },
      {
        type: 'signature-check' as const,
        position: { x: 300, y: 100 },
        properties: { publicKey: 'ownerPk' }
      },
      {
        type: 'output-box' as const,
        position: { x: 550, y: 100 },
        properties: { value: 9000000 } // 0.009 ERG (minus fees)
      }
    ],
    connections: [
      { source: 'input-box', target: 'signature-check', type: 'data' },
      { source: 'signature-check', target: 'output-box', type: 'condition' }
    ]
  },
  {
    id: 'token-swap',
    name: 'Token Swap',
    description: 'Atomic swap of tokens between two parties',
    complexity: 'intermediate',
    components: [
      {
        type: 'input-box' as const,
        position: { x: 50, y: 80 },
        properties: { tokens: [{ id: 'tokenA', amount: 100 }] }
      },
      {
        type: 'input-box' as const,
        position: { x: 50, y: 200 },
        properties: { tokens: [{ id: 'tokenB', amount: 50 }] }
      },
      {
        type: 'token-operation' as const,
        position: { x: 300, y: 140 },
        properties: { operation: 'swap' }
      },
      {
        type: 'output-box' as const,
        position: { x: 550, y: 80 },
        properties: { tokens: [{ id: 'tokenB', amount: 50 }] }
      },
      {
        type: 'output-box' as const,
        position: { x: 550, y: 200 },
        properties: { tokens: [{ id: 'tokenA', amount: 100 }] }
      }
    ]
  },
  {
    id: 'escrow',
    name: 'Escrow Contract',
    description: 'Three-party escrow with arbiter resolution',
    complexity: 'advanced',
    components: [
      {
        type: 'input-box' as const,
        position: { x: 50, y: 100 }
      },
      {
        type: 'signature-check' as const,
        position: { x: 200, y: 50 },
        properties: { publicKey: 'buyerPk' }
      },
      {
        type: 'signature-check' as const,
        position: { x: 200, y: 100 },
        properties: { publicKey: 'sellerPk' }
      },
      {
        type: 'signature-check' as const,
        position: { x: 200, y: 150 },
        properties: { publicKey: 'arbiterPk' }
      },
      {
        type: 'validation-rule' as const,
        position: { x: 400, y: 100 },
        properties: { combineWith: 'OR' }
      },
      {
        type: 'output-box' as const,
        position: { x: 600, y: 100 }
      }
    ]
  }
];

export function getContractTemplate(id: string) {
  return contractTemplates.find(template => template.id === id);
}