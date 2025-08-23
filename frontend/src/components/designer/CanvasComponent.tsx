import React, { useState, useCallback, useMemo } from 'react';
import type { ContractComponent, Position, ComponentTemplate } from '../../types/contractDesigner';
import { 
  isInputBoxProperties,
  isOutputBoxProperties,
  isSignatureCheckProperties,
  isTokenOperationProperties,
  isCustomLogicProperties,
  isHeightCheckProperties
} from '../../types/contractDesigner';
import { getComponentTemplate } from '../../data/componentTemplates';
import './CanvasComponent.css';

interface CanvasComponentProps {
  component: ContractComponent;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<ContractComponent>) => void;
  onRemove: () => void;
  onConnectionStart: (componentId: string, portId: string, portType: 'input' | 'output', position: Position) => void;
  onConnectionEnd: (componentId: string, portId: string, portType: 'input' | 'output') => void;
}

interface PortProps {
  port: any;
  componentId: string;
  type: 'input' | 'output';
  onConnectionStart: (componentId: string, portId: string, portType: 'input' | 'output', position: Position) => void;
  onConnectionEnd: (componentId: string, portId: string, portType: 'input' | 'output') => void;
}

function ComponentPort({ port, componentId, type, onConnectionStart, onConnectionEnd }: PortProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    onConnectionStart(componentId, port.id, type, position);
  }, [componentId, port.id, type, onConnectionStart]);
  
  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onConnectionEnd(componentId, port.id, type);
  }, [componentId, port.id, type, onConnectionEnd]);

  const portColorMap: Record<string, string> = {
    box: 'var(--color-primary-400)',
    token: 'var(--color-secondary-400)',
    condition: 'var(--color-success-400)',
    value: 'var(--color-warning-400)',
    signature: 'var(--color-error-400)'
  };
  const portColor = portColorMap[port.dataType] || 'var(--color-outline)';

  return (
    <div
      className={`component-port ${type} ${port.dataType} ${isHovered ? 'hovered' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`${port.label} ${type} port. Data type: ${port.dataType}${port.required ? ' (Required)' : ''}. ${port.description}`}
      aria-describedby={`port-desc-${componentId}-${port.id}`}
      title={`${port.label} (${port.dataType})${port.required ? ' *' : ''}\n${port.description}`}
      style={{ 
        borderColor: portColor,
        backgroundColor: isHovered ? portColor : 'transparent'
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const position = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          };
          onConnectionStart(componentId, port.id, type, position);
        }
      }}
    >
      <div className="port-indicator" style={{ backgroundColor: portColor }} />
      {isHovered && (
        <div className="port-tooltip" role="tooltip" aria-hidden="true">
          <div className="port-name">{port.label}</div>
          <div className="port-type">{port.dataType}</div>
          {port.required && <div className="port-required">Required</div>}
        </div>
      )}
      <div id={`port-desc-${componentId}-${port.id}`} className="sr-only">
        {port.description}
      </div>
    </div>
  );
}

interface ValidationIndicatorsProps {
  component: ContractComponent;
  template: ComponentTemplate | undefined;
  isSelected: boolean;
}

function ValidationIndicators({ component, template, isSelected }: ValidationIndicatorsProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Component validation logic
  const validationResults = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const info: string[] = [];

    // Basic validation
    if (!component.label.trim()) {
      errors.push('Component label is required');
    }

    if (!component.description.trim()) {
      warnings.push('Component description is recommended');
    }

    // Type-specific validation
    switch (component.type) {
      case 'input-box':
        if (isInputBoxProperties(component.properties)) {
          if (!component.properties.defaultValue || component.properties.defaultValue <= 0) {
            errors.push('Default value must be greater than 0');
          }
          if (component.properties.defaultValue && component.properties.defaultValue < 1000000) {
            warnings.push('Default value is very small (less than 0.001 ERG)');
          }
        }
        break;

      case 'output-box':
        if (isOutputBoxProperties(component.properties)) {
          if (!component.properties.value || component.properties.value <= 0) {
            errors.push('ERG value must be greater than 0');
          }
          if (component.properties.value && component.properties.value < 1000000) {
            warnings.push('ERG value is very small (less than 0.001 ERG)');
          }
        }
        break;

      case 'signature-check':
        if (isSignatureCheckProperties(component.properties)) {
          if (!component.properties.publicKey?.trim()) {
            errors.push('Public key is required for signature verification');
          }
        }
        break;

      case 'token-operation':
        if (isTokenOperationProperties(component.properties)) {
          if (!component.properties.tokenId?.trim()) {
            errors.push('Token ID is required');
          }
          if (!component.properties.amount || component.properties.amount <= 0) {
            errors.push('Token amount must be greater than 0');
          }
        }
        break;

      case 'custom-logic':
        if (isCustomLogicProperties(component.properties)) {
          if (!component.properties.code?.trim() || component.properties.code === 'sigmaProp(true)') {
            warnings.push('Custom logic should implement specific contract logic');
          }
        }
        break;

      case 'height-check':
        if (isHeightCheckProperties(component.properties)) {
          if (component.properties.minHeight === undefined || component.properties.minHeight < 0) {
            errors.push('Block height must be specified and non-negative');
          }
        }
        break;
    }

    // Position validation
    if (component.position.x < 0 || component.position.y < 0) {
      warnings.push('Component position should be positive');
    }

    // Size validation
    if (component.size.width < 100 || component.size.height < 60) {
      warnings.push('Component size may be too small for proper display');
    }

    // Complexity information
    if (template?.complexity === 'advanced') {
      info.push('Advanced component - ensure proper configuration');
    }

    return { errors, warnings, info };
  }, [component, template]);

  const hasIssues = validationResults.errors.length > 0 || validationResults.warnings.length > 0;
  const severityLevel = validationResults.errors.length > 0 ? 'error' : 
                       validationResults.warnings.length > 0 ? 'warning' : 'success';

  if (!hasIssues && validationResults.info.length === 0) {
    return null;
  }

  return (
    <div className="validation-indicators">
      <div 
        className={`validation-badge ${severityLevel}`}
        onClick={() => setShowDetails(!showDetails)}
        role="button"
        tabIndex={0}
        aria-label={`Validation status: ${severityLevel}. ${validationResults.errors.length} errors, ${validationResults.warnings.length} warnings. Click for details.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowDetails(!showDetails);
          }
        }}
      >
        {severityLevel === 'error' && '❌'}
        {severityLevel === 'warning' && '⚠️'}
        {severityLevel === 'success' && '✅'}
        <span className="validation-count">
          {validationResults.errors.length + validationResults.warnings.length + validationResults.info.length}
        </span>
      </div>

      {(showDetails || isSelected) && (
        <div className="validation-details" role="region" aria-label="Validation details">
          {validationResults.errors.map((error, index) => (
            <div key={`error-${index}`} className="validation-item error">
              <span className="validation-icon">❌</span>
              <span className="validation-message">{error}</span>
            </div>
          ))}
          
          {validationResults.warnings.map((warning, index) => (
            <div key={`warning-${index}`} className="validation-item warning">
              <span className="validation-icon">⚠️</span>
              <span className="validation-message">{warning}</span>
            </div>
          ))}
          
          {validationResults.info.map((infoMsg, index) => (
            <div key={`info-${index}`} className="validation-item info">
              <span className="validation-icon">ℹ️</span>
              <span className="validation-message">{infoMsg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CanvasComponent({
  component,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
  onConnectionStart,
  onConnectionEnd
}: CanvasComponentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editedLabel, setEditedLabel] = useState(component.label);

  const template = useMemo(() => getComponentTemplate(component.type), [component.type]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.target instanceof HTMLInputElement) return; // Don't drag when editing
    
    event.stopPropagation();
    onSelect();
    
    setIsDragging(true);
    const rect = event.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
  }, [onSelect]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging) {
      const newPosition = {
        x: event.clientX - dragOffset.x,
        y: event.clientY - dragOffset.y
      };
      onUpdate({ position: newPosition });
    }
  }, [isDragging, dragOffset, onUpdate]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setIsEditing(true);
    setEditedLabel(component.label);
  }, [component.label]);

  const handleLabelSubmit = useCallback(() => {
    setIsEditing(false);
    if (editedLabel.trim() !== component.label) {
      onUpdate({ label: editedLabel.trim() });
    }
  }, [editedLabel, component.label, onUpdate]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleLabelSubmit();
    } else if (event.key === 'Escape') {
      setIsEditing(false);
      setEditedLabel(component.label);
    }
  }, [handleLabelSubmit, component.label]);

  const categoryColor = {
    input: 'var(--color-success-400)',
    output: 'var(--color-primary-400)',
    logic: 'var(--color-warning-400)',
    validation: 'var(--color-info-400)',
    token: 'var(--color-secondary-400)',
    advanced: 'var(--color-error-400)'
  }[component.category];

  const complexityLevel = template?.complexity || 'beginner';

  return (
    <div
      className={`canvas-component ${component.category} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        left: component.position.x,
        top: component.position.y,
        width: component.size.width,
        minHeight: component.size.height,
        borderColor: isSelected ? 'var(--color-primary-400)' : categoryColor
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      role="button"
      tabIndex={0}
      aria-label={`${component.label} component. ${component.description}. ${isSelected ? 'Selected' : 'Click to select'}`}
      aria-selected={isSelected}
      aria-describedby={`component-desc-${component.id}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        } else if (e.key === 'Delete' && isSelected) {
          e.preventDefault();
          onRemove();
        } else if (e.key === 'F2' && isSelected) {
          e.preventDefault();
          setIsEditing(true);
        }
      }}
    >
      {/* Component Header */}
      <div className="component-header" style={{ backgroundColor: categoryColor }}>
        <div className="component-icon">
          {template?.icon || '⚙️'}
        </div>
        
        <div className="component-title">
          {isEditing ? (
            <input
              type="text"
              className="component-label-edit"
              value={editedLabel}
              onChange={(e) => setEditedLabel(e.target.value)}
              onBlur={handleLabelSubmit}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : (
            <span className="component-label">{component.label}</span>
          )}
        </div>

        <div className="component-actions">
          <button
            className="component-action"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            title="Edit label"
          >
            ✏️
          </button>
          <button
            className="component-action danger"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Remove component"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Component Body */}
      <div className="component-body">
        {/* Input Ports */}
        {template?.ports.inputs && template.ports.inputs.length > 0 && (
          <div className="component-inputs">
            {template.ports.inputs.map(port => (
              <div key={port.id} className="port-container input">
                <ComponentPort
                  port={port}
                  componentId={component.id}
                  type="input"
                  onConnectionStart={onConnectionStart}
                  onConnectionEnd={onConnectionEnd}
                />
                <span className="port-label">{port.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Component Content */}
        <div className="component-content">
          <div className="component-description">
            {component.description}
          </div>

          {/* Property Preview */}
          {Object.keys(component.properties).length > 0 && (
            <div className="component-properties">
              {Object.entries(component.properties).slice(0, 3).map(([key, value]) => (
                <div key={key} className="property-preview">
                  <span className="property-key">{key}:</span>
                  <span className="property-value">
                    {typeof value === 'object' ? JSON.stringify(value).slice(0, 20) + '...' : String(value).slice(0, 20)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Output Ports */}
        {template?.ports.outputs && template.ports.outputs.length > 0 && (
          <div className="component-outputs">
            {template.ports.outputs.map(port => (
              <div key={port.id} className="port-container output">
                <span className="port-label">{port.label}</span>
                <ComponentPort
                  port={port}
                  componentId={component.id}
                  type="output"
                  onConnectionStart={onConnectionStart}
                  onConnectionEnd={onConnectionEnd}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Component Footer */}
      <div className="component-footer">
        <div className="component-meta">
          <span className="component-type">{component.type}</span>
          <span className={`complexity-indicator ${complexityLevel}`}>
            {complexityLevel}
          </span>
        </div>
        
        {isSelected && (
          <div className="selection-indicator">
            <div className="selection-handles">
              <div className="selection-handle top-left" />
              <div className="selection-handle top-right" />
              <div className="selection-handle bottom-left" />
              <div className="selection-handle bottom-right" />
            </div>
          </div>
        )}
      </div>

      {/* Validation Indicators */}
      <ValidationIndicators 
        component={component} 
        template={template}
        isSelected={isSelected}
      />

      {/* Hidden description for screen readers */}
      <div id={`component-desc-${component.id}`} className="sr-only">
        Component type: {component.type}. Category: {component.category}. 
        Complexity: {complexityLevel}. 
        {template?.ports.inputs.length ? `${template.ports.inputs.length} input ports. ` : ''}
        {template?.ports.outputs.length ? `${template.ports.outputs.length} output ports. ` : ''}
        Position: {component.position.x}, {component.position.y}. 
        Size: {component.size.width} by {component.size.height}.
      </div>
    </div>
  );
}