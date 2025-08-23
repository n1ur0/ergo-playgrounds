import React, { useState, useMemo, useCallback, memo } from 'react';
import type { ContractComponent } from '../../types/contractDesigner';
import { getComponentProperty } from '../../types/contractDesigner';
import { getComponentTemplate } from '../../data/componentTemplates';
import { propertySystem, type PropertyDefinition } from '../../utils/propertySystem';
import './PropertyPanel.css';

interface PropertyPanelProps {
  selectedComponent: ContractComponent | null;
  onComponentUpdate: (id: string, updates: Partial<ContractComponent>) => void;
}

interface PropertyFieldProps {
  label: string;
  description?: string;
  required?: boolean;
  error?: string;
  warning?: string;
  children: React.ReactNode;
}

// Memoized PropertyField component to prevent unnecessary re-renders
const PropertyField = memo<PropertyFieldProps>(({ 
  label, 
  description, 
  required, 
  error, 
  warning, 
  children 
}) => {
  return (
    <div className={`property-field ${error ? 'has-error' : ''} ${warning ? 'has-warning' : ''}`}>
      <label className="property-label">
        {label}
        {required && <span className="required-indicator">*</span>}
      </label>
      {description && (
        <div className="property-description">{description}</div>
      )}
      <div className="property-input">
        {children}
      </div>
      {error && <div className="property-error">{error}</div>}
      {warning && <div className="property-warning">{warning}</div>}
    </div>
  );
});

PropertyField.displayName = 'PropertyField';

interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

// Memoized CollapsibleSection to prevent unnecessary re-renders
const CollapsibleSection = memo<CollapsibleSectionProps>(({ 
  title, 
  icon, 
  defaultExpanded = true, 
  children 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <div className="property-section">
      <button
        className="section-header"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
      >
        {icon && <span className="section-icon">{icon}</span>}
        <span className="section-title">{title}</span>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </button>
      {isExpanded && (
        <div className="section-content">
          {children}
        </div>
      )}
    </div>
  );
});

CollapsibleSection.displayName = 'CollapsibleSection';

// Memoized property input components for better performance
interface PropertyInputProps {
  property: PropertyDefinition;
  value: any;
  onChange: (value: any) => void;
}

const StringInput = memo<PropertyInputProps>(({ property, value, onChange }) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <input
      type="text"
      className="property-input-field"
      value={value || ''}
      placeholder={property.placeholder}
      onChange={handleChange}
    />
  );
});

StringInput.displayName = 'StringInput';

const NumberInput = memo<PropertyInputProps>(({ property, value, onChange }) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = parseFloat(e.target.value) || 0;
    onChange(numValue);
  }, [onChange]);

  return (
    <input
      type="number"
      className="property-input-field"
      value={value || ''}
      placeholder={property.placeholder}
      min={property.min}
      max={property.max}
      step={property.step}
      onChange={handleChange}
    />
  );
});

NumberInput.displayName = 'NumberInput';

const BooleanInput = memo<PropertyInputProps>(({ value, onChange }) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  }, [onChange]);

  return (
    <label className="checkbox-container">
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={handleChange}
      />
      <span className="checkmark"></span>
    </label>
  );
});

BooleanInput.displayName = 'BooleanInput';

const SelectInput = memo<PropertyInputProps>(({ property, value, onChange }) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <select
      className="property-select"
      value={value || ''}
      onChange={handleChange}
    >
      {property.options?.map(option => (
        <option 
          key={String(option.value)} 
          value={String(option.value)} 
          title={option.description}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
});

SelectInput.displayName = 'SelectInput';

const TextareaInput = memo<PropertyInputProps>(({ property, value, onChange }) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <textarea
      className={`property-textarea ${property.key === 'code' ? 'code' : ''}`}
      value={value || ''}
      onChange={handleChange}
      rows={property.rows || 4}
      placeholder={property.placeholder}
    />
  );
});

TextareaInput.displayName = 'TextareaInput';

interface ArrayInputProps extends PropertyInputProps {
  onItemUpdate: (index: number, itemValue: any) => void;
  onItemRemove: (index: number) => void;
  onItemAdd: () => void;
}

const ArrayInput = memo<ArrayInputProps>(({ 
  property, 
  value = [], 
  onItemUpdate, 
  onItemRemove, 
  onItemAdd 
}) => {
  const memoizedItems = useMemo(() => {
    return value.map((item: any, index: number) => (
      <div key={index} className="array-item">
        <input
          type="text"
          className="property-input-field"
          value={item}
          onChange={(e) => onItemUpdate(index, e.target.value)}
          placeholder={property.arrayItemType?.placeholder || 'Enter value'}
        />
        <button
          type="button"
          className="remove-item-btn"
          onClick={() => onItemRemove(index)}
          title="Remove item"
        >
          ✕
        </button>
      </div>
    ));
  }, [value, onItemUpdate, onItemRemove, property.arrayItemType?.placeholder]);

  return (
    <div className="array-property">
      {memoizedItems}
      <button
        type="button"
        className="add-item-btn"
        onClick={onItemAdd}
      >
        + Add {property.label.slice(0, -1)}
      </button>
    </div>
  );
});

ArrayInput.displayName = 'ArrayInput';

// Main PropertyPanel component with optimizations
const OptimizedPropertyPanel = memo<PropertyPanelProps>(({ 
  selectedComponent, 
  onComponentUpdate 
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'connections' | 'validation'>('properties');
  const [propertyErrors, setPropertyErrors] = useState<Map<string, string>>(new Map());
  const [propertyWarnings, setPropertyWarnings] = useState<Map<string, string>>(new Map());

  // Memoize the template lookup
  const template = useMemo(
    () => selectedComponent ? getComponentTemplate(selectedComponent.type) : null,
    [selectedComponent?.type]
  );

  // Memoize the property schema
  const propertySchema = useMemo(
    () => selectedComponent ? propertySystem.getPropertySchema(selectedComponent.type) : [],
    [selectedComponent?.type]
  );

  // Memoized property update handler with validation
  const handlePropertyUpdate = useCallback((key: string, value: any) => {
    if (!selectedComponent) return;

    // Update the component property
    onComponentUpdate(selectedComponent.id, {
      properties: { ...selectedComponent.properties, [key]: value }
    });

    // Validate the property
    const validation = propertySystem.validateProperty(
      selectedComponent.type,
      key,
      value,
      selectedComponent
    );

    // Update errors and warnings
    setPropertyErrors(prevErrors => {
      const newErrors = new Map(prevErrors);
      if (!validation.isValid && validation.error) {
        newErrors.set(key, validation.error);
      } else {
        newErrors.delete(key);
      }
      return newErrors;
    });

    setPropertyWarnings(prevWarnings => {
      const newWarnings = new Map(prevWarnings);
      if (validation.warning) {
        newWarnings.set(key, validation.warning);
      } else {
        newWarnings.delete(key);
      }
      return newWarnings;
    });
  }, [selectedComponent, onComponentUpdate]);

  // Memoized array handlers
  const createArrayHandlers = useCallback((propertyKey: string) => {
    return {
      onItemAdd: () => {
        if (!selectedComponent) return;
        const currentValue = getComponentProperty(selectedComponent.properties, propertyKey);
        const arrayValue = Array.isArray(currentValue) ? currentValue : [];
        handlePropertyUpdate(propertyKey, [...arrayValue, '']);
      },
      onItemRemove: (index: number) => {
        if (!selectedComponent) return;
        const currentValue = getComponentProperty(selectedComponent.properties, propertyKey);
        const arrayValue = Array.isArray(currentValue) ? currentValue : [];
        const newValue = arrayValue.filter((_: any, i: number) => i !== index);
        handlePropertyUpdate(propertyKey, newValue);
      },
      onItemUpdate: (index: number, itemValue: any) => {
        if (!selectedComponent) return;
        const currentValue = getComponentProperty(selectedComponent.properties, propertyKey);
        const arrayValue = Array.isArray(currentValue) ? [...currentValue] : [];
        arrayValue[index] = itemValue;
        handlePropertyUpdate(propertyKey, arrayValue);
      }
    };
  }, [selectedComponent, handlePropertyUpdate]);

  // Memoized property input renderer
  const renderPropertyInput = useCallback((property: PropertyDefinition, value: any) => {
    const commonProps = {
      property,
      value,
      onChange: (newValue: any) => handlePropertyUpdate(property.key, newValue)
    };

    switch (property.type) {
      case 'string':
      case 'tokenId':
      case 'publicKey':
        return <StringInput {...commonProps} />;

      case 'number':
        return <NumberInput {...commonProps} />;

      case 'boolean':
        return <BooleanInput {...commonProps} />;

      case 'select':
      case 'register':
        return <SelectInput {...commonProps} />;

      case 'textarea':
        return <TextareaInput {...commonProps} />;

      case 'array':
        const arrayHandlers = createArrayHandlers(property.key);
        return (
          <ArrayInput 
            {...commonProps} 
            {...arrayHandlers}
          />
        );

      default:
        return <StringInput {...commonProps} />;
    }
  }, [handlePropertyUpdate, createArrayHandlers]);

  // Memoized dynamic properties renderer
  const dynamicProperties = useMemo(() => {
    if (!selectedComponent) return null;

    return propertySchema
      .filter(property => propertySystem.isPropertyVisible(
        selectedComponent.type,
        property.key,
        selectedComponent.properties
      ))
      .map(property => (
        <PropertyField
          key={property.key}
          label={property.label}
          description={property.description}
          required={property.required}
          error={propertyErrors.get(property.key)}
          warning={propertyWarnings.get(property.key)}
        >
          {renderPropertyInput(property, getComponentProperty(selectedComponent.properties, property.key) ?? property.defaultValue)}
        </PropertyField>
      ));
  }, [selectedComponent, propertySchema, propertyErrors, propertyWarnings, renderPropertyInput]);

  // Memoized basic info section
  const basicInfoSection = useMemo(() => {
    if (!selectedComponent) return null;

    return (
      <CollapsibleSection title="Basic Information" icon="📝" defaultExpanded={true}>
        <PropertyField label="Label" description="Display name for this component" required>
          <input
            type="text"
            className="property-input-field"
            value={selectedComponent.label}
            onChange={(e) => onComponentUpdate(selectedComponent.id, { label: e.target.value })}
            placeholder="Component label"
          />
        </PropertyField>
        <PropertyField label="Description" description="Brief description of component purpose">
          <textarea
            className="property-textarea"
            value={selectedComponent.description}
            onChange={(e) => onComponentUpdate(selectedComponent.id, { description: e.target.value })}
            rows={3}
            placeholder="Component description"
          />
        </PropertyField>
      </CollapsibleSection>
    );
  }, [selectedComponent, onComponentUpdate]);

  // Memoized layout section
  const layoutSection = useMemo(() => {
    if (!selectedComponent) return null;

    return (
      <CollapsibleSection title="Layout & Position" icon="📐" defaultExpanded={false}>
        <div className="property-grid">
          <PropertyField label="X Position">
            <input
              type="number"
              className="property-input-field"
              value={selectedComponent.position.x}
              onChange={(e) => onComponentUpdate(selectedComponent.id, {
                position: { ...selectedComponent.position, x: parseInt(e.target.value) || 0 }
              })}
            />
          </PropertyField>
          <PropertyField label="Y Position">
            <input
              type="number"
              className="property-input-field"
              value={selectedComponent.position.y}
              onChange={(e) => onComponentUpdate(selectedComponent.id, {
                position: { ...selectedComponent.position, y: parseInt(e.target.value) || 0 }
              })}
            />
          </PropertyField>
        </div>
        <div className="property-grid">
          <PropertyField label="Width">
            <input
              type="number"
              className="property-input-field"
              value={selectedComponent.size.width}
              onChange={(e) => onComponentUpdate(selectedComponent.id, {
                size: { ...selectedComponent.size, width: parseInt(e.target.value) || 200 }
              })}
              min="100"
            />
          </PropertyField>
          <PropertyField label="Height">
            <input
              type="number"
              className="property-input-field"
              value={selectedComponent.size.height}
              onChange={(e) => onComponentUpdate(selectedComponent.id, {
                size: { ...selectedComponent.size, height: parseInt(e.target.value) || 100 }
              })}
              min="60"
            />
          </PropertyField>
        </div>
      </CollapsibleSection>
    );
  }, [selectedComponent, onComponentUpdate]);

  // Memoized port information
  const portInformation = useMemo(() => {
    if (!template) return null;

    return (
      <div className="connections-info">
        <h4>Port Information</h4>
        {template.ports.inputs.length > 0 && (
          <div className="port-section">
            <h5>Input Ports</h5>
            {template.ports.inputs.map(port => (
              <div key={port.id} className="port-info">
                <div className={`port-indicator ${port.dataType}`}></div>
                <div className="port-details">
                  <div className="port-name">{port.label}</div>
                  <div className="port-type">{port.dataType}</div>
                  <div className="port-description">{port.description}</div>
                </div>
                {port.required && <span className="required-badge">Required</span>}
              </div>
            ))}
          </div>
        )}
        
        {template.ports.outputs.length > 0 && (
          <div className="port-section">
            <h5>Output Ports</h5>
            {template.ports.outputs.map(port => (
              <div key={port.id} className="port-info">
                <div className={`port-indicator ${port.dataType}`}></div>
                <div className="port-details">
                  <div className="port-name">{port.label}</div>
                  <div className="port-type">{port.dataType}</div>
                  <div className="port-description">{port.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [template]);

  // Memoized tab handlers
  const handleTabChange = useCallback((tab: 'properties' | 'connections' | 'validation') => {
    setActiveTab(tab);
  }, []);

  if (!selectedComponent) {
    return (
      <div className="property-panel-empty">
        <div className="empty-state">
          <div className="empty-icon">⚙️</div>
          <h3>No Component Selected</h3>
          <p>Select a component on the canvas to edit its properties.</p>
          <div className="empty-tips">
            <h4>💡 Quick Tips</h4>
            <ul>
              <li>Click any component to select it</li>
              <li>Double-click to rename components</li>
              <li>Use keyboard shortcuts for faster editing</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="property-panel">
      <div className="panel-header">
        <div className="component-info">
          <div className="component-icon">{template?.icon || '⚙️'}</div>
          <div className="component-details">
            <h3>Component Properties</h3>
            <span className="component-type-badge">{selectedComponent.type}</span>
          </div>
        </div>
      </div>

      <div className="panel-tabs">
        <button
          className={`tab ${activeTab === 'properties' ? 'active' : ''}`}
          onClick={() => handleTabChange('properties')}
        >
          ⚙️ Properties
        </button>
        <button
          className={`tab ${activeTab === 'connections' ? 'active' : ''}`}
          onClick={() => handleTabChange('connections')}
        >
          🔗 Connections
        </button>
        <button
          className={`tab ${activeTab === 'validation' ? 'active' : ''}`}
          onClick={() => handleTabChange('validation')}
        >
          ✅ Validation
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'properties' && (
          <div className="property-sections">
            {basicInfoSection}
            
            <CollapsibleSection title="Configuration" icon="⚙️" defaultExpanded={true}>
              {dynamicProperties}
            </CollapsibleSection>

            {layoutSection}
          </div>
        )}

        {activeTab === 'connections' && portInformation}

        {activeTab === 'validation' && (
          <div className="validation-info">
            <h4>Validation Status</h4>
            <div className="validation-placeholder">
              <p>Component validation information will be displayed here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

OptimizedPropertyPanel.displayName = 'OptimizedPropertyPanel';

export default OptimizedPropertyPanel;