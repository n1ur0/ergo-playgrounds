import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import ComponentPalette from '../ComponentPalette'
import type { ComponentType, Position } from '../../../types/contractDesigner'

// Mock the component templates
vi.mock('../../../data/componentTemplates', () => {
  const mockTemplates = [
    {
      type: 'input-box',
      label: 'Input Box',
      description: 'Input UTXO box',
      category: 'input',
      complexity: 'beginner',
      icon: '📥',
      ports: {
        inputs: [],
        outputs: [
          { id: 'value-output', label: 'Value', dataType: 'Long', required: false },
          { id: 'box-output', label: 'Box', dataType: 'Box', required: false }
        ]
      }
    },
    {
      type: 'signature-check',
      label: 'Signature Check',
      description: 'Verify cryptographic signature',
      category: 'validation',
      complexity: 'intermediate',
      icon: '✍️',
      ports: {
        inputs: [
          { id: 'message-input', label: 'Message', dataType: 'String', required: true }
        ],
        outputs: [
          { id: 'valid-output', label: 'Valid', dataType: 'Boolean', required: false }
        ]
      }
    },
    {
      type: 'custom-logic',
      label: 'Custom Logic',
      description: 'Custom ErgoScript code',
      category: 'advanced',
      complexity: 'advanced',
      icon: '⚡',
      ports: {
        inputs: [
          { id: 'input', label: 'Input', dataType: 'Any', required: false }
        ],
        outputs: [
          { id: 'output', label: 'Output', dataType: 'Any', required: false }
        ]
      }
    }
  ]
  
  return {
    componentTemplates: mockTemplates,
    getComponentsByCategory: vi.fn((category: string) => {
      return mockTemplates.filter(t => t.category === category)
    }),
    contractTemplates: []
  }
}))

describe('ComponentPalette', () => {
  const mockOnComponentDrop = vi.fn()

  beforeEach(() => {
    mockOnComponentDrop.mockClear()
  })

  it('should render component palette', () => {
    render(
      <ComponentPalette 
        onComponentDrop={mockOnComponentDrop}
        isExpanded={true}
      />
    )

    expect(screen.getByText('Input Box')).toBeInTheDocument()
    expect(screen.getByText('Signature Check')).toBeInTheDocument()
    expect(screen.getByText('Custom Logic')).toBeInTheDocument()
  })

  it('should group components by category', () => {
    render(
      <ComponentPalette 
        onComponentDrop={mockOnComponentDrop}
        isExpanded={true}
      />
    )

    expect(screen.getByText('Input/Output')).toBeInTheDocument()
    expect(screen.getByText('Validation')).toBeInTheDocument()
    expect(screen.getByText('Advanced')).toBeInTheDocument()
  })

  it('should show component count per category', () => {
    render(
      <ComponentPalette 
        onComponentDrop={mockOnComponentDrop}
        isExpanded={true}
      />
    )

    // Each category should show count in parentheses
    expect(screen.getByText('(1)')).toBeInTheDocument() // Input/Output has 1 component
    expect(screen.getByText('(1)')).toBeInTheDocument() // Validation has 1 component
    expect(screen.getByText('(1)')).toBeInTheDocument() // Advanced has 1 component
  })

  it('should allow expanding and collapsing categories', async () => {
    const user = userEvent.setup()
    render(
      <ComponentPalette 
        onComponentDrop={mockOnComponentDrop}
        isExpanded={true}
      />
    )

    // Click to collapse Input/Output category
    const inputOutputHeader = screen.getByRole('button', { name: /Input\/Output/ })
    await user.click(inputOutputHeader)

    // Input Box should no longer be visible
    await waitFor(() => {
      expect(screen.queryByText('Input Box')).not.toBeInTheDocument()
    })

    // Click to expand again
    await user.click(inputOutputHeader)

    // Input Box should be visible again
    await waitFor(() => {
      expect(screen.getByText('Input Box')).toBeInTheDocument()
    })
  })

  it('should filter components by search term', async () => {
    const user = userEvent.setup()
    render(
      <ComponentPalette 
        onComponentDrop={mockOnComponentDrop}
        isExpanded={true}
      />
    )

    // Find and type in search input
    const searchInput = screen.getByRole('textbox')
    await user.type(searchInput, 'signature')

    // Only Signature Check should be visible
    await waitFor(() => {
      expect(screen.getByText('Signature Check')).toBeInTheDocument()
      expect(screen.queryByText('Input Box')).not.toBeInTheDocument()
      expect(screen.queryByText('Custom Logic')).not.toBeInTheDocument()
    })
  })

  it('should filter components by complexity level', async () => {
    const user = userEvent.setup()
    render(
      <ComponentPalette 
        onComponentDrop={mockOnComponentDrop}
        isExpanded={true}
      />
    )

    // Find complexity filter and select beginner
    const complexityFilter = screen.getByRole('combobox')
    await user.selectOptions(complexityFilter, 'beginner')

    // Only beginner components should be visible
    await waitFor(() => {
      expect(screen.getByText('Input Box')).toBeInTheDocument()
      expect(screen.queryByText('Signature Check')).not.toBeInTheDocument()
      expect(screen.queryByText('Custom Logic')).not.toBeInTheDocument()
    })
  })

  it('should show complexity badges', () => {
    render(
      <ComponentPalette 
        onComponentDrop={mockOnComponentDrop}
        isExpanded={true}
      />
    )

    expect(screen.getByText('beginner')).toBeInTheDocument()
    expect(screen.getByText('intermediate')).toBeInTheDocument()
    expect(screen.getByText('advanced')).toBeInTheDocument()
  })

  it('should show port information', () => {
    render(
      <ComponentPalette 
        onComponentDrop={mockOnComponentDrop}
        isExpanded={true}
      />
    )

    // Input Box: 0 inputs, 2 outputs
    expect(screen.getByText('0→2')).toBeInTheDocument()
    
    // Signature Check: 1 input, 1 output
    expect(screen.getByText('1→1')).toBeInTheDocument()
  })

  it('should show required indicator for components with required inputs', () => {
    render(
      <ComponentPalette 
        onComponentDrop={mockOnComponentDrop}
        isExpanded={true}
      />
    )

    // Signature Check has required input
    const signatureComponent = screen.getByText('Signature Check').parentElement
    expect(signatureComponent).toContainHTML('*')
  })

  it('should handle drag and drop', () => {
    render(
      <ComponentPalette 
        onComponentDrop={mockOnComponentDrop}
        isExpanded={true}
      />
    )

    const inputBoxComponent = screen.getByText('Input Box').closest('.component-item')
    expect(inputBoxComponent).toHaveAttribute('draggable', 'true')
  })

  it('should set drag data correctly', () => {
    render(
      <ComponentPalette 
        onComponentDrop={mockOnComponentDrop}
        isExpanded={true}
      />
    )

    const inputBoxComponent = screen.getByText('Input Box').closest('.component-item')
    
    const mockDataTransfer = {
      setData: vi.fn(),
      effectAllowed: '',
      setDragImage: vi.fn()
    }

    const dragEvent = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true
    })
    
    Object.defineProperty(dragEvent, 'dataTransfer', {
      value: mockDataTransfer
    })

    fireEvent(inputBoxComponent!, dragEvent)

    expect(mockDataTransfer.setData).toHaveBeenCalledWith('component-type', 'input-box')
    expect(mockDataTransfer.effectAllowed).toBe('copy')
  })

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup()
    render(
      <ComponentPalette 
        onComponentDrop={mockOnComponentDrop}
        isExpanded={true}
      />
    )

    const inputBoxComponent = screen.getByLabelText(/Add Input Box component/)
    
    // Component should be focusable
    await user.tab()
    expect(inputBoxComponent).toHaveFocus()

    // Should handle keyboard activation
    await user.keyboard('{Enter}')
    // This would trigger drag in a real scenario
  })

  it('should show component tooltips with detailed information', () => {
    render(
      <ComponentPalette 
        onComponentDrop={mockOnComponentDrop}
        isExpanded={true}
      />
    )

    const inputBoxComponent = screen.getByText('Input Box').closest('.component-item')
    
    expect(inputBoxComponent).toHaveAttribute('title')
    const title = inputBoxComponent!.getAttribute('title')
    expect(title).toContain('Input UTXO box')
    expect(title).toContain('Complexity: beginner')
    expect(title).toContain('Ports: 0 inputs, 2 outputs')
  })

  it('should show port type indicators', () => {
    render(
      <ComponentPalette 
        onComponentDrop={mockOnComponentDrop}
        isExpanded={true}
      />
    )

    // Should show port dots for different data types
    const portDots = screen.getAllByTitle(/Long|Box|Boolean|String|Any/)
    expect(portDots.length).toBeGreaterThan(0)
  })

  it('should handle tabs between components and templates', async () => {
    const user = userEvent.setup()
    render(
      <ComponentPalette 
        onComponentDrop={mockOnComponentDrop}
        isExpanded={true}
      />
    )

    // Should show components tab as active by default
    const componentsTab = screen.getByRole('tab', { name: /components/i })
    expect(componentsTab).toHaveAttribute('aria-selected', 'true')

    // Click templates tab
    const templatesTab = screen.getByRole('tab', { name: /templates/i })
    await user.click(templatesTab)

    expect(templatesTab).toHaveAttribute('aria-selected', 'true')
    expect(componentsTab).toHaveAttribute('aria-selected', 'false')
  })

  it('should clear search when filter changes', async () => {
    const user = userEvent.setup()
    render(
      <ComponentPalette 
        onComponentDrop={mockOnComponentDrop}
        isExpanded={true}
      />
    )

    // Type in search
    const searchInput = screen.getByRole('textbox')
    await user.type(searchInput, 'signature')

    // Change complexity filter
    const complexityFilter = screen.getByRole('combobox')
    await user.selectOptions(complexityFilter, 'beginner')

    // Search should still work with new filter
    expect(searchInput).toHaveValue('signature')
  })

  it('should show empty state when no components match filter', async () => {
    const user = userEvent.setup()
    render(
      <ComponentPalette 
        onComponentDrop={mockOnComponentDrop}
        isExpanded={true}
      />
    )

    // Search for something that doesn't exist
    const searchInput = screen.getByRole('textbox')
    await user.type(searchInput, 'nonexistent')

    await waitFor(() => {
      expect(screen.queryByText('Input Box')).not.toBeInTheDocument()
      expect(screen.queryByText('Signature Check')).not.toBeInTheDocument()
      expect(screen.queryByText('Custom Logic')).not.toBeInTheDocument()
    })
  })

  it('should maintain category expansion state across filter changes', async () => {
    const user = userEvent.setup()
    render(
      <ComponentPalette 
        onComponentDrop={mockOnComponentDrop}
        isExpanded={true}
      />
    )

    // Collapse a category
    const advancedHeader = screen.getByRole('button', { name: /Advanced/ })
    await user.click(advancedHeader)

    // Apply a filter
    const searchInput = screen.getByRole('textbox')
    await user.type(searchInput, 'logic')

    // Clear the filter
    await user.clear(searchInput)

    // Category should still be collapsed
    await waitFor(() => {
      expect(screen.queryByText('Custom Logic')).not.toBeInTheDocument()
    })
  })
})