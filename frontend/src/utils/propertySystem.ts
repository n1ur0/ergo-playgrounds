import type { ContractComponent, ComponentType, ValidationError } from '../types/contractDesigner';
import { getComponentTemplate } from '../data/componentTemplates';

// Property definition types
export interface PropertyDefinition {
  key: string;
  label: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'tokenId' | 'publicKey' | 'register' | 'array';
  required?: boolean;
  defaultValue?: any;
  validation?: PropertyValidation;
  options?: SelectOption[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  rows?: number; // For textarea
  arrayItemType?: Omit<PropertyDefinition, 'key' | 'label'>; // For array properties
  conditional?: ConditionalProperty; // Show/hide based on other properties
}

export interface SelectOption {
  value: string | number | boolean;
  label: string;
  description?: string;
}

export interface PropertyValidation {
  pattern?: string; // Regex pattern
  minLength?: number;
  maxLength?: number;
  custom?: (value: any, component: ContractComponent) => ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export interface ConditionalProperty {
  dependsOn: string; // Property key
  condition: (value: any) => boolean;
}

// Component-specific property schemas
const componentPropertySchemas: Record<ComponentType, PropertyDefinition[]> = {
  'input-box': [
    {
      key: 'value',
      label: 'ERG Value',
      description: 'Value in nanoERG (1 ERG = 1,000,000,000 nanoERG)',
      type: 'number',
      required: true,
      defaultValue: 1000000,
      min: 0,
      step: 1000000,
      validation: {
        custom: (value) => ({
          isValid: value > 0,
          error: value <= 0 ? 'Value must be greater than 0' : undefined
        })
      }
    },
    {
      key: 'tokens',
      label: 'Tokens',
      description: 'Tokens contained in this box',
      type: 'array',
      defaultValue: [],
      arrayItemType: {
        type: 'string', // Will be expanded to complex object
        placeholder: 'Token ID'
      }
    },
    {
      key: 'registers',
      label: 'Registers',
      description: 'Custom register data (R4-R9)',
      type: 'array',
      defaultValue: [],
      arrayItemType: {
        type: 'string',
        placeholder: 'Register value'
      }
    }
  ],

  'output-box': [
    {
      key: 'value',
      label: 'ERG Value',
      description: 'Value in nanoERG',
      type: 'number',
      required: true,
      defaultValue: 1000000,
      min: 0,
      step: 1000000
    },
    {
      key: 'script',
      label: 'Protection Script',
      description: 'Script protecting this output box',
      type: 'select',
      defaultValue: 'sigmaProp(true)',
      options: [
        { value: 'sigmaProp(true)', label: 'Anyone can spend' },
        { value: 'ownerPk', label: 'Owner signature required' },
        { value: 'custom', label: 'Custom script' }
      ]
    },
    {
      key: 'customScript',
      label: 'Custom Script',
      description: 'Custom ErgoScript for box protection',
      type: 'textarea',
      rows: 4,
      placeholder: 'Enter ErgoScript...',
      conditional: {
        dependsOn: 'script',
        condition: (value) => value === 'custom'
      }
    },
    {
      key: 'tokens',
      label: 'Tokens',
      description: 'Tokens to include in output',
      type: 'array',
      defaultValue: []
    }
  ],

  'guard-condition': [
    {
      key: 'operator',
      label: 'Comparison Operator',
      description: 'Operator for the condition',
      type: 'select',
      required: true,
      defaultValue: '==',
      options: [
        { value: '==', label: 'Equal to (==)', description: 'Values must be equal' },
        { value: '!=', label: 'Not equal to (!=)', description: 'Values must not be equal' },
        { value: '>', label: 'Greater than (>)', description: 'Left > Right' },
        { value: '>=', label: 'Greater than or equal (>=)', description: 'Left >= Right' },
        { value: '<', label: 'Less than (<)', description: 'Left < Right' },
        { value: '<=', label: 'Less than or equal (<=)', description: 'Left <= Right' }
      ]
    },
    {
      key: 'leftOperand',
      label: 'Left Operand',
      description: 'Left side of the comparison',
      type: 'string',
      required: true,
      defaultValue: 'true',
      placeholder: 'Enter value or expression'
    },
    {
      key: 'rightOperand',
      label: 'Right Operand',
      description: 'Right side of the comparison',
      type: 'string',
      required: true,
      defaultValue: 'true',
      placeholder: 'Enter value or expression'
    }
  ],

  'signature-check': [
    {
      key: 'publicKey',
      label: 'Public Key',
      description: 'Public key for signature verification',
      type: 'publicKey',
      required: true,
      defaultValue: 'ownerPk',
      placeholder: 'Enter public key or variable name',
      validation: {
        pattern: '^[a-fA-F0-9]{66}$|^[a-zA-Z][a-zA-Z0-9_]*$',
        custom: (value) => {
          if (!value) return { isValid: false, error: 'Public key is required' };
          if (value.length === 66 && /^[a-fA-F0-9]+$/.test(value)) {
            return { isValid: true };
          }
          if (/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
            return { isValid: true };
          }
          return { 
            isValid: false, 
            error: 'Must be a 66-character hex string or valid variable name' 
          };
        }
      }
    },
    {
      key: 'message',
      label: 'Message',
      description: 'Optional message to verify signature against',
      type: 'string',
      defaultValue: 'default',
      placeholder: 'Message content'
    },
    {
      key: 'signatureType',
      label: 'Signature Type',
      description: 'Type of signature verification',
      type: 'select',
      defaultValue: 'standard',
      options: [
        { value: 'standard', label: 'Standard signature', description: 'Regular public key signature' },
        { value: 'threshold', label: 'Threshold signature', description: 'Multi-signature with threshold' },
        { value: 'ring', label: 'Ring signature', description: 'Anonymous ring signature' }
      ]
    },
    {
      key: 'threshold',
      label: 'Threshold',
      description: 'Minimum number of signatures required',
      type: 'number',
      defaultValue: 1,
      min: 1,
      max: 10,
      conditional: {
        dependsOn: 'signatureType',
        condition: (value) => value === 'threshold'
      }
    }
  ],

  'token-operation': [
    {
      key: 'tokenId',
      label: 'Token ID',
      description: 'Unique identifier for the token (64-character hex string)',
      type: 'tokenId',
      required: true,
      defaultValue: '',
      placeholder: 'Enter token ID',
      validation: {
        pattern: '^[a-fA-F0-9]{64}$',
        custom: (value) => ({
          isValid: !value || /^[a-fA-F0-9]{64}$/.test(value),
          error: value && !/^[a-fA-F0-9]{64}$/.test(value) ? 'Token ID must be a 64-character hex string' : undefined
        })
      }
    },
    {
      key: 'amount',
      label: 'Amount',
      description: 'Number of tokens',
      type: 'number',
      required: true,
      defaultValue: 1,
      min: 0,
      step: 1
    },
    {
      key: 'operation',
      label: 'Operation Type',
      description: 'Type of token operation',
      type: 'select',
      defaultValue: 'transfer',
      options: [
        { value: 'transfer', label: 'Transfer', description: 'Transfer tokens between boxes' },
        { value: 'mint', label: 'Mint', description: 'Create new tokens' },
        { value: 'burn', label: 'Burn', description: 'Destroy tokens' },
        { value: 'swap', label: 'Swap', description: 'Exchange tokens atomically' }
      ]
    },
    {
      key: 'decimals',
      label: 'Decimals',
      description: 'Number of decimal places for the token',
      type: 'number',
      defaultValue: 0,
      min: 0,
      max: 9,
      conditional: {
        dependsOn: 'operation',
        condition: (value) => value === 'mint'
      }
    }
  ],

  'height-check': [
    {
      key: 'operator',
      label: 'Height Operator',
      description: 'Comparison operator for height check',
      type: 'select',
      required: true,
      defaultValue: '>=',
      options: [
        { value: '>', label: 'Greater than (>)' },
        { value: '>=', label: 'Greater than or equal (>=)' },
        { value: '<', label: 'Less than (<)' },
        { value: '<=', label: 'Less than or equal (<=)' },
        { value: '==', label: 'Equal to (==)' }
      ]
    },
    {
      key: 'heightValue',
      label: 'Block Height',
      description: 'Blockchain height to compare against',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      step: 1
    },
    {
      key: 'relative',
      label: 'Relative to Current',
      description: 'Whether height is relative to current block',
      type: 'boolean',
      defaultValue: false
    },
    {
      key: 'offsetBlocks',
      label: 'Block Offset',
      description: 'Number of blocks relative to current height',
      type: 'number',
      defaultValue: 0,
      step: 1,
      conditional: {
        dependsOn: 'relative',
        condition: (value) => value === true
      }
    }
  ],

  'register-access': [
    {
      key: 'register',
      label: 'Register',
      description: 'Box register to read from (R4-R9)',
      type: 'register',
      required: true,
      defaultValue: 'R4',
      options: [
        { value: 'R4', label: 'R4', description: 'Register R4 (first custom register)' },
        { value: 'R5', label: 'R5', description: 'Register R5' },
        { value: 'R6', label: 'R6', description: 'Register R6' },
        { value: 'R7', label: 'R7', description: 'Register R7' },
        { value: 'R8', label: 'R8', description: 'Register R8' },
        { value: 'R9', label: 'R9', description: 'Register R9 (last custom register)' }
      ]
    },
    {
      key: 'dataType',
      label: 'Data Type',
      description: 'Expected data type in the register',
      type: 'select',
      required: true,
      defaultValue: 'Coll[Byte]',
      options: [
        { value: 'Coll[Byte]', label: 'Coll[Byte]', description: 'Byte collection (most common)' },
        { value: 'Long', label: 'Long', description: '64-bit signed integer' },
        { value: 'Int', label: 'Int', description: '32-bit signed integer' },
        { value: 'Boolean', label: 'Boolean', description: 'True/false value' },
        { value: 'SigmaProp', label: 'SigmaProp', description: 'Cryptographic proposition' },
        { value: 'GroupElement', label: 'GroupElement', description: 'Elliptic curve point' },
        { value: 'AvlTree', label: 'AvlTree', description: 'Authenticated data structure' }
      ]
    },
    {
      key: 'defaultValue',
      label: 'Default Value',
      description: 'Default value if register is empty',
      type: 'string',
      placeholder: 'Default value'
    },
    {
      key: 'encoding',
      label: 'Encoding',
      description: 'How to interpret the register data',
      type: 'select',
      defaultValue: 'raw',
      options: [
        { value: 'raw', label: 'Raw bytes' },
        { value: 'utf8', label: 'UTF-8 string' },
        { value: 'hex', label: 'Hex string' },
        { value: 'base64', label: 'Base64 encoded' }
      ],
      conditional: {
        dependsOn: 'dataType',
        condition: (value) => value === 'Coll[Byte]'
      }
    }
  ],

  'validation-rule': [
    {
      key: 'combineWith',
      label: 'Combine Operator',
      description: 'How to combine multiple conditions',
      type: 'select',
      defaultValue: 'AND',
      options: [
        { value: 'AND', label: 'AND (&&)', description: 'All conditions must be true' },
        { value: 'OR', label: 'OR (||)', description: 'At least one condition must be true' },
        { value: 'XOR', label: 'XOR', description: 'Exactly one condition must be true' }
      ]
    },
    {
      key: 'shortCircuit',
      label: 'Short Circuit',
      description: 'Stop evaluation on first false condition (AND) or first true condition (OR)',
      type: 'boolean',
      defaultValue: true
    },
    {
      key: 'customLogic',
      label: 'Custom Logic',
      description: 'Custom ErgoScript for complex validation',
      type: 'textarea',
      rows: 6,
      placeholder: 'Enter custom validation logic...'
    }
  ],

  'custom-logic': [
    {
      key: 'code',
      label: 'ErgoScript Code',
      description: 'Custom ErgoScript implementation',
      type: 'textarea',
      required: true,
      defaultValue: 'sigmaProp(true)',
      rows: 8,
      placeholder: 'Enter ErgoScript code...',
      validation: {
        minLength: 1,
        custom: (value) => ({
          isValid: value && value.trim().length > 0,
          error: !value || value.trim().length === 0 ? 'Code cannot be empty' : undefined
        })
      }
    },
    {
      key: 'description',
      label: 'Logic Description',
      description: 'Describe what this custom logic does',
      type: 'textarea',
      rows: 3,
      placeholder: 'Describe the purpose and behavior of this logic...'
    },
    {
      key: 'returnType',
      label: 'Return Type',
      description: 'Expected return type of the code',
      type: 'select',
      defaultValue: 'SigmaProp',
      options: [
        { value: 'SigmaProp', label: 'SigmaProp', description: 'Cryptographic proposition' },
        { value: 'Boolean', label: 'Boolean', description: 'True/false value' },
        { value: 'Long', label: 'Long', description: '64-bit integer' },
        { value: 'Coll[Byte]', label: 'Coll[Byte]', description: 'Byte collection' }
      ]
    },
    {
      key: 'inputs',
      label: 'Expected Inputs',
      description: 'Variables or values this code expects',
      type: 'array',
      defaultValue: [],
      arrayItemType: {
        type: 'string',
        placeholder: 'Variable name'
      }
    }
  ]
};

// Property system class
export class ComponentPropertySystem {
  getPropertySchema(componentType: ComponentType): PropertyDefinition[] {
    return componentPropertySchemas[componentType] || [];
  }

  getPropertyDefinition(componentType: ComponentType, propertyKey: string): PropertyDefinition | undefined {
    const schema = this.getPropertySchema(componentType);
    return schema.find(prop => prop.key === propertyKey);
  }

  validateProperty(
    componentType: ComponentType, 
    propertyKey: string, 
    value: any, 
    component: ContractComponent
  ): ValidationResult {
    const definition = this.getPropertyDefinition(componentType, propertyKey);
    if (!definition) {
      return { isValid: true };
    }

    // Check required
    if (definition.required && (value === undefined || value === null || value === '')) {
      return { isValid: false, error: `${definition.label} is required` };
    }

    // Skip validation if not required and empty
    if (!definition.required && (value === undefined || value === null || value === '')) {
      return { isValid: true };
    }

    // Type validation
    const typeValidation = this.validateType(definition, value);
    if (!typeValidation.isValid) {
      return typeValidation;
    }

    // Custom validation
    if (definition.validation) {
      if (definition.validation.pattern) {
        const regex = new RegExp(definition.validation.pattern);
        if (!regex.test(String(value))) {
          return { isValid: false, error: `Invalid format for ${definition.label}` };
        }
      }

      if (definition.validation.minLength && String(value).length < definition.validation.minLength) {
        return { isValid: false, error: `${definition.label} must be at least ${definition.validation.minLength} characters` };
      }

      if (definition.validation.maxLength && String(value).length > definition.validation.maxLength) {
        return { isValid: false, error: `${definition.label} must be no more than ${definition.validation.maxLength} characters` };
      }

      if (definition.validation.custom) {
        return definition.validation.custom(value, component);
      }
    }

    // Range validation for numbers
    if (definition.type === 'number') {
      const numValue = Number(value);
      if (definition.min !== undefined && numValue < definition.min) {
        return { isValid: false, error: `${definition.label} must be at least ${definition.min}` };
      }
      if (definition.max !== undefined && numValue > definition.max) {
        return { isValid: false, error: `${definition.label} must be no more than ${definition.max}` };
      }
    }

    return { isValid: true };
  }

  private validateType(definition: PropertyDefinition, value: any): ValidationResult {
    switch (definition.type) {
      case 'string':
      case 'textarea':
      case 'tokenId':
      case 'publicKey':
      case 'register':
        if (typeof value !== 'string') {
          return { isValid: false, error: `${definition.label} must be a string` };
        }
        break;

      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          return { isValid: false, error: `${definition.label} must be a number` };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return { isValid: false, error: `${definition.label} must be true or false` };
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return { isValid: false, error: `${definition.label} must be an array` };
        }
        break;

      case 'select':
        if (definition.options) {
          const validValues = definition.options.map(opt => opt.value);
          if (!validValues.includes(value)) {
            return { isValid: false, error: `${definition.label} must be one of: ${validValues.join(', ')}` };
          }
        }
        break;
    }

    return { isValid: true };
  }

  validateComponent(component: ContractComponent): ValidationError[] {
    const errors: ValidationError[] = [];
    const schema = this.getPropertySchema(component.type);

    for (const definition of schema) {
      // Check if property should be visible based on conditionals
      if (definition.conditional) {
        const dependentValue = component.properties[definition.conditional.dependsOn];
        if (!definition.conditional.condition(dependentValue)) {
          continue; // Skip validation for hidden properties
        }
      }

      const validation = this.validateProperty(
        component.type,
        definition.key,
        component.properties[definition.key],
        component
      );

      if (!validation.isValid) {
        errors.push({
          id: `${component.id}-${definition.key}`,
          componentId: component.id,
          type: 'missing-requirement',
          severity: 'error',
          message: validation.error || `Invalid ${definition.label}`,
          suggestion: `Check the ${definition.label} property configuration`
        });
      } else if (validation.warning) {
        errors.push({
          id: `${component.id}-${definition.key}-warning`,
          componentId: component.id,
          type: 'logic',
          severity: 'warning',
          message: validation.warning,
          suggestion: `Consider reviewing the ${definition.label} property`
        });
      }
    }

    return errors;
  }

  getDefaultProperties(componentType: ComponentType): Record<string, any> {
    const schema = this.getPropertySchema(componentType);
    const defaults: Record<string, any> = {};

    for (const definition of schema) {
      if (definition.defaultValue !== undefined) {
        defaults[definition.key] = definition.defaultValue;
      }
    }

    return defaults;
  }

  isPropertyVisible(
    componentType: ComponentType, 
    propertyKey: string, 
    componentProperties: Record<string, any>
  ): boolean {
    const definition = this.getPropertyDefinition(componentType, propertyKey);
    if (!definition || !definition.conditional) {
      return true;
    }

    const dependentValue = componentProperties[definition.conditional.dependsOn];
    return definition.conditional.condition(dependentValue);
  }

  getPropertyOptions(componentType: ComponentType, propertyKey: string): SelectOption[] {
    const definition = this.getPropertyDefinition(componentType, propertyKey);
    return definition?.options || [];
  }
}

// Export singleton instance
export const propertySystem = new ComponentPropertySystem();

// Helper functions for common property operations
export function validateAllComponents(components: ContractComponent[]): ValidationError[] {
  const allErrors: ValidationError[] = [];
  
  for (const component of components) {
    const componentErrors = propertySystem.validateComponent(component);
    allErrors.push(...componentErrors);
  }
  
  return allErrors;
}

export function getComponentDefaults(componentType: ComponentType): Record<string, any> {
  return propertySystem.getDefaultProperties(componentType);
}

export function isPropertyRequired(componentType: ComponentType, propertyKey: string): boolean {
  const definition = propertySystem.getPropertyDefinition(componentType, propertyKey);
  return definition?.required || false;
}

export function getPropertyType(componentType: ComponentType, propertyKey: string): string {
  const definition = propertySystem.getPropertyDefinition(componentType, propertyKey);
  return definition?.type || 'string';
}