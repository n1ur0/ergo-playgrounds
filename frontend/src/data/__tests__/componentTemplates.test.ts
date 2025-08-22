import { describe, it, expect, vi } from 'vitest'
import { componentTemplates, getComponentsByCategory, getComponentTemplate, contractTemplates } from '../componentTemplates'
import type { ComponentType, ComponentCategory } from '../../types/contractDesigner'

describe('componentTemplates', () => {
  it('should be an array of component templates', () => {
    expect(Array.isArray(componentTemplates)).toBe(true)
    expect(componentTemplates.length).toBeGreaterThan(0)
  })

  it('should have valid structure for each template', () => {
    componentTemplates.forEach(template => {
      expect(template).toHaveProperty('type')
      expect(template).toHaveProperty('label')
      expect(template).toHaveProperty('description')
      expect(template).toHaveProperty('category')
      expect(template).toHaveProperty('icon')
      expect(template).toHaveProperty('complexity')
      expect(template).toHaveProperty('defaultProperties')
      expect(template).toHaveProperty('ports')
      expect(template).toHaveProperty('ergoScriptTemplate')

      expect(typeof template.type).toBe('string')
      expect(typeof template.label).toBe('string')
      expect(typeof template.description).toBe('string')
      expect(typeof template.category).toBe('string')
      expect(typeof template.icon).toBe('string')
      expect(['beginner', 'intermediate', 'advanced']).toContain(template.complexity)
      expect(typeof template.defaultProperties).toBe('object')
      expect(typeof template.ports).toBe('object')
      expect(typeof template.ergoScriptTemplate).toBe('string')
    })
  })

  it('should have valid port structures', () => {
    componentTemplates.forEach(template => {
      expect(template.ports).toHaveProperty('inputs')
      expect(template.ports).toHaveProperty('outputs')
      expect(Array.isArray(template.ports.inputs)).toBe(true)
      expect(Array.isArray(template.ports.outputs)).toBe(true)

      // Validate input ports
      template.ports.inputs.forEach(port => {
        expect(port).toHaveProperty('id')
        expect(port).toHaveProperty('label')
        expect(port).toHaveProperty('dataType')
        expect(port).toHaveProperty('required')
        expect(port).toHaveProperty('description')

        expect(typeof port.id).toBe('string')
        expect(typeof port.label).toBe('string')
        expect(typeof port.dataType).toBe('string')
        expect(typeof port.required).toBe('boolean')
        expect(typeof port.description).toBe('string')
      })

      // Validate output ports
      template.ports.outputs.forEach(port => {
        expect(port).toHaveProperty('id')
        expect(port).toHaveProperty('label')
        expect(port).toHaveProperty('dataType')
        expect(port).toHaveProperty('required')
        expect(port).toHaveProperty('description')

        expect(typeof port.id).toBe('string')
        expect(typeof port.label).toBe('string')
        expect(typeof port.dataType).toBe('string')
        expect(typeof port.required).toBe('boolean')
        expect(typeof port.description).toBe('string')
      })
    })
  })

  it('should have unique component types', () => {
    const types = componentTemplates.map(template => template.type)
    const uniqueTypes = new Set(types)
    expect(uniqueTypes.size).toBe(types.length)
  })

  it('should have non-empty ErgoScript templates', () => {
    componentTemplates.forEach(template => {
      expect(template.ergoScriptTemplate.trim()).not.toBe('')
    })
  })
})

describe('getComponentsByCategory', () => {
  it('should return components for valid categories', () => {
    const categories = ['input', 'output', 'logic', 'validation', 'token', 'advanced']
    
    categories.forEach(category => {
      const components = getComponentsByCategory(category as ComponentCategory)
      expect(Array.isArray(components)).toBe(true)
      components.forEach(component => {
        expect(component.category).toBe(category)
      })
    })
  })

  it('should return empty array for unknown category', () => {
    const unknownComponents = getComponentsByCategory('unknown' as ComponentCategory)
    expect(unknownComponents).toEqual([])
  })

  it('should not modify original templates array', () => {
    const originalLength = componentTemplates.length
    getComponentsByCategory('input')
    expect(componentTemplates.length).toBe(originalLength)
  })
})

describe('getComponentTemplate', () => {
  it('should return template for valid component type', () => {
    // Test with actual component types from the templates
    const firstTemplate = componentTemplates[0]
    if (firstTemplate) {
      const template = getComponentTemplate(firstTemplate.type)
      expect(template).toBeDefined()
      expect(template?.type).toBe(firstTemplate.type)
    }
  })

  it('should return undefined for unknown component type', () => {
    const unknownTemplate = getComponentTemplate('unknown-type' as ComponentType)
    expect(unknownTemplate).toBeUndefined()
  })

  it('should return different templates for different types', () => {
    if (componentTemplates.length >= 2) {
      const template1 = getComponentTemplate(componentTemplates[0].type)
      const template2 = getComponentTemplate(componentTemplates[1].type)
      
      expect(template1).not.toEqual(template2)
      expect(template1?.type).toBe(componentTemplates[0].type)
      expect(template2?.type).toBe(componentTemplates[1].type)
    }
  })
})

describe('Component template content validation', () => {
  it('should have appropriate complexity levels', () => {
    componentTemplates.forEach(template => {
      expect(['beginner', 'intermediate', 'advanced']).toContain(template.complexity)
    })
  })

  it('should have unique port IDs within each template', () => {
    componentTemplates.forEach(template => {
      const allPorts = [...template.ports.inputs, ...template.ports.outputs]
      const portIds = allPorts.map(port => port.id)
      const uniqueIds = new Set(portIds)
      expect(uniqueIds.size).toBe(portIds.length)
    })
  })

  it('should have meaningful icons', () => {
    componentTemplates.forEach(template => {
      expect(template.icon).toBeTruthy()
      expect(template.icon.length).toBeGreaterThan(0)
    })
  })
})

describe('contractTemplates', () => {
  it('should be defined and be an array', () => {
    expect(contractTemplates).toBeDefined()
    expect(Array.isArray(contractTemplates)).toBe(true)
  })

  it('should have valid structure if not empty', () => {
    if (contractTemplates.length > 0) {
      contractTemplates.forEach(template => {
        expect(template).toHaveProperty('id')
        expect(template).toHaveProperty('name')
        expect(template).toHaveProperty('description')
        expect(template).toHaveProperty('components')
        expect(Array.isArray(template.components)).toBe(true)
        
        // connections might be optional
        if (template.connections) {
          expect(Array.isArray(template.connections)).toBe(true)
        }
      })
    }
  })
})

describe('Data type validation', () => {
  it('should use consistent data types across templates', () => {
    const allDataTypes = new Set<string>()
    
    componentTemplates.forEach(template => {
      template.ports.inputs.forEach(port => allDataTypes.add(port.dataType))
      template.ports.outputs.forEach(port => allDataTypes.add(port.dataType))
    })

    // Should have some data types
    expect(allDataTypes.size).toBeGreaterThan(0)
  })

  it('should have required ports marked correctly', () => {
    componentTemplates.forEach(template => {
      template.ports.inputs.forEach(port => {
        if (port.required) {
          expect(port.id).toBeTruthy()
          expect(port.label).toBeTruthy()
          expect(port.description).toBeTruthy()
        }
      })

      template.ports.outputs.forEach(port => {
        if (port.required) {
          expect(port.id).toBeTruthy()
          expect(port.label).toBeTruthy() 
          expect(port.description).toBeTruthy()
        }
      })
    })
  })
})