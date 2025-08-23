import React, { useState, useMemo, useCallback } from 'react';
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

function PropertyField({ label, description, required, error, warning, children }: PropertyFieldProps) {
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
}

interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, defaultExpanded = true, children }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="property-section">
      <button
        className="section-header"
        onClick={() => setIsExpanded(!isExpanded)}
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
}

export default function PropertyPanel({ selectedComponent, onComponentUpdate }: PropertyPanelProps) {
  // All hooks must be at the top before any early returns
  const [activeTab, setActiveTab] = useState<'properties' | 'connections' | 'validation'>('properties');
  const [propertyErrors, setPropertyErrors] = useState<Map<string, string>>(new Map());
  const [propertyWarnings, setPropertyWarnings] = useState<Map<string, string>>(new Map());

  const template = useMemo(
    () => selectedComponent ? getComponentTemplate(selectedComponent.type) : null,
    [selectedComponent]
  );

  const handlePropertyUpdate = useCallback((key: string, value: unknown) => {
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
    setPropertyErrors(prev => {
      const newErrors = new Map(prev);
      if (!validation.isValid && validation.error) {
        newErrors.set(key, validation.error);
      } else {
        newErrors.delete(key);
      }
      return newErrors;
    });

    setPropertyWarnings(prev => {
      const newWarnings = new Map(prev);
      if (validation.warning) {
        newWarnings.set(key, validation.warning);
      } else {
        newWarnings.delete(key);
      }
      return newWarnings;
    });
  }, [selectedComponent, onComponentUpdate]);

  // Dynamic property renderer based on property system
  // Render appropriate input component based on property definition
  const renderPropertyInput = useCallback((property: PropertyDefinition, value: unknown) => {
    const commonProps = {
      value: value ?? '',
      onChange: (newValue: unknown) => handlePropertyUpdate(property.key, newValue)
    };

    switch (property.type) {
      case 'string':
        return (
          <input
            type="text"
            {...commonProps}
            className="property-input-text"
            placeholder={property.placeholder}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            {...commonProps}
            className="property-input-number"
            min={property.min}
            max={property.max}
            step={property.step}
          />
        );

      case 'boolean':
        return (
          <label className="property-input-checkbox">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => commonProps.onChange(e.target.checked)}
            />
            <span className="checkmark"></span>
          </label>
        );

      case 'select':
        return (
          <select
            {...commonProps}
            className="property-input-select"
          >
            {property.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'array':
        return renderArrayProperty(property, Array.isArray(value) ? value : []);

      default:
        return (
          <input
            type="text"
            {...commonProps}
            className="property-input-text"
          />
        );
    }
  }, [handlePropertyUpdate]);

  // Render array property with add/remove functionality
  const renderArrayProperty = useCallback((property: PropertyDefinition, value: unknown[]) => {
    const addItem = () => {
      const newValue = [...value, ''];
      handlePropertyUpdate(property.key, newValue);
    };

    const removeItem = (index: number) => {
      const newValue = value.filter((_, i) => i !== index);
      handlePropertyUpdate(property.key, newValue);
    };

    const updateItem = (index: number, itemValue: unknown) => {
      const newValue = [...value];
      newValue[index] = itemValue;
      handlePropertyUpdate(property.key, newValue);
    };

    return (
      <div className="array-property">
        {value.map((item, index) => (
          <div key={index} className="array-item">
            <input
              type="text"
              value={String(item)}
              onChange={(e) => updateItem(index, e.target.value)}
              className="array-item-input"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="array-item-remove"
              title="Remove item"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="array-add-button"
        >
          + Add Item
        </button>
      </div>
    );
  }, [handlePropertyUpdate]);

  const renderDynamicProperties = useCallback(() => {
    if (!selectedComponent) return null;

    const schema = propertySystem.getPropertySchema(selectedComponent.type);
    
    return (
      <>
        {schema.map(property => {
          // Check if property should be visible
          if (!propertySystem.isPropertyVisible(
            selectedComponent.type,
            property.key,
            selectedComponent.properties
          )) {
            return null;
          }

          return (
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
          );
        })}
      </>
    );
  }, [selectedComponent, propertyErrors, propertyWarnings, renderPropertyInput]);

  // Early return after all hooks are defined
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

  // Render the property panel content
  return (
    const commonProps = {
      value: value ?? '',
      onChange: (newValue: any) => handlePropertyUpdate(property.key, newValue)
    };

    switch (property.type) {
      case 'string':
      case 'tokenId':
      case 'publicKey':
        return (
          <input
            type="text"
            className="property-input-field"
            {...commonProps}
            placeholder={property.placeholder}
            onChange={(e) => handlePropertyUpdate(property.key, e.target.value)}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            className="property-input-field"
            {...commonProps}
            placeholder={property.placeholder}
            min={property.min}
            max={property.max}
            step={property.step}
            onChange={(e) => handlePropertyUpdate(property.key, parseFloat(e.target.value) || 0)}
          />
        );

      case 'boolean':
        return (
          <label className="checkbox-container">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handlePropertyUpdate(property.key, e.target.checked)}
            />
            <span className="checkmark"></span>
          </label>
        );

      case 'select':
      case 'register':
        return (
          <select
            className="property-select"
            value={value || ''}
            onChange={(e) => handlePropertyUpdate(property.key, e.target.value)}
          >
            {property.options?.map(option => (
              <option key={String(option.value)} value={String(option.value)} title={option.description}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            className={`property-textarea ${property.key === 'code' ? 'code' : ''}`}
            value={value || ''}
            onChange={(e) => handlePropertyUpdate(property.key, e.target.value)}
            rows={property.rows || 4}
            placeholder={property.placeholder}
          />
        );

      case 'array':
        return renderArrayProperty(property, value || []);

      default:
        return (
          <input
            type="text"
            className="property-input-field"
            {...commonProps}
            onChange={(e) => handlePropertyUpdate(property.key, e.target.value)}
          />
        );
    }
  }, [handlePropertyUpdate]);

  // Render array property with add/remove functionality
  const renderArrayProperty = useCallback((property: PropertyDefinition, value: any[]) => {
    const addItem = () => {
      const newValue = [...value, ''];
      handlePropertyUpdate(property.key, newValue);
    };

    const removeItem = (index: number) => {
      const newValue = value.filter((_, i) => i !== index);
      handlePropertyUpdate(property.key, newValue);
    };

    const updateItem = (index: number, itemValue: any) => {
      const newValue = [...value];
      newValue[index] = itemValue;
      handlePropertyUpdate(property.key, newValue);
    };

    return (
      <div className="array-property">
        {value.map((item, index) => (
          <div key={index} className="array-item">
            <input
              type="text"
              className="property-input-field"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={property.arrayItemType?.placeholder || 'Enter value'}
            />
            <button
              type="button"
              className="remove-item-btn"
              onClick={() => removeItem(index)}
              title="Remove item"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="add-item-btn"
          onClick={addItem}
        >
          + Add {property.label.slice(0, -1)}
        </button>
      </div>
    );
  }, [handlePropertyUpdate]);

  const renderSpecificProperties = () => {
    // Legacy property rendering - now replaced by dynamic system
    return renderDynamicProperties();

    /* Legacy switch statement - keeping for reference but now handled dynamically
    if (!template) return null;

    switch (selectedComponent.type) {
      case 'input-box':
      case 'output-box':
        return (
          <>
            <PropertyField label="ERG Value" description="Value in nanoERG (1 ERG = 1,000,000,000 nanoERG)" required>
              <input
                type="number"
                className="property-input-field"
                value={selectedComponent.properties.value || 1000000}
                onChange={(e) => handlePropertyUpdate('value', parseInt(e.target.value) || 0)}
                min="0"
                step="1000000"
              />
            </PropertyField>
            <PropertyField label="Tokens" description="Token transfers associated with this box">
              <div className="token-list">
                <button className="add-token-btn">+ Add Token</button>
              </div>
            </PropertyField>
          </>
        );

      case 'guard-condition':
        return (
          <>
            <PropertyField label="Condition Type" required>
              <select
                className="property-select"
                value={selectedComponent.properties.operator || '=='}
                onChange={(e) => handlePropertyUpdate('operator', e.target.value)}
              >
                <option value="==">Equal to</option>
                <option value="!=">Not equal to</option>
                <option value=">">Greater than</option>
                <option value=">=">Greater than or equal</option>
                <option value="<">Less than</option>
                <option value="<=">Less than or equal</option>
              </select>
            </PropertyField>
            <PropertyField label="Comparison Value" required>
              <input
                type="text"
                className="property-input-field"
                value={selectedComponent.properties.value || '1'}
                onChange={(e) => handlePropertyUpdate('value', e.target.value)}
                placeholder="Enter comparison value"
              />
            </PropertyField>
          </>
        );

      case 'signature-check':
        return (
          <>
            <PropertyField label="Public Key" description="Public key for signature verification" required>
              <input
                type="text"
                className="property-input-field"
                value={selectedComponent.properties.publicKey || ''}
                onChange={(e) => handlePropertyUpdate('publicKey', e.target.value)}
                placeholder="Enter public key or variable name"
              />
            </PropertyField>
            <PropertyField label="Message" description="Optional message to verify against">
              <input
                type="text"
                className="property-input-field"
                value={selectedComponent.properties.message || 'default'}
                onChange={(e) => handlePropertyUpdate('message', e.target.value)}
                placeholder="Message content"
              />
            </PropertyField>
          </>
        );

      case 'token-operation':
        return (
          <>
            <PropertyField label="Token ID" description="Unique identifier for the token" required>
              <input
                type="text"
                className="property-input-field"
                value={selectedComponent.properties.tokenId || ''}
                onChange={(e) => handlePropertyUpdate('tokenId', e.target.value)}
                placeholder="Token ID (hex string)"
              />
            </PropertyField>
            <PropertyField label="Amount" description="Number of tokens to transfer" required>
              <input
                type="number"
                className="property-input-field"
                value={selectedComponent.properties.amount || 1}
                onChange={(e) => handlePropertyUpdate('amount', parseInt(e.target.value) || 0)}
                min="0"
              />
            </PropertyField>
            <PropertyField label="Operation Type">
              <select
                className="property-select"
                value={selectedComponent.properties.operation || 'transfer'}
                onChange={(e) => handlePropertyUpdate('operation', e.target.value)}
              >
                <option value="transfer">Transfer</option>
                <option value="mint">Mint</option>
                <option value="burn">Burn</option>
                <option value="swap">Swap</option>
              </select>
            </PropertyField>
          </>
        );

      case 'height-check':
        return (
          <>
            <PropertyField label="Height Operator" required>
              <select
                className="property-select"
                value={selectedComponent.properties.operator || '>='}
                onChange={(e) => handlePropertyUpdate('operator', e.target.value)}
              >
                <option value=">">Greater than</option>
                <option value=">=">Greater than or equal</option>
                <option value="<">Less than</option>
                <option value="<=">Less than or equal</option>
                <option value="==">Equal to</option>
              </select>
            </PropertyField>
            <PropertyField label="Block Height" description="Blockchain height constraint" required>
              <input
                type="number"
                className="property-input-field"
                value={selectedComponent.properties.minHeight || 0}
                onChange={(e) => handlePropertyUpdate('minHeight', parseInt(e.target.value) || 0)}
                min="0"
              />
            </PropertyField>
          </>
        );

      case 'register-access':
        return (
          <>
            <PropertyField label="Register" description="Box register to read from (R4-R9)" required>
              <select
                className="property-select"
                value={selectedComponent.properties.register || 'R4'}
                onChange={(e) => handlePropertyUpdate('register', e.target.value)}
              >
                <option value="R4">R4</option>
                <option value="R5">R5</option>
                <option value="R6">R6</option>
                <option value="R7">R7</option>
                <option value="R8">R8</option>
                <option value="R9">R9</option>
              </select>
            </PropertyField>
            <PropertyField label="Data Type" description="Expected data type in the register" required>
              <select
                className="property-select"
                value={selectedComponent.properties.dataType || 'Coll[Byte]'}
                onChange={(e) => handlePropertyUpdate('dataType', e.target.value)}
              >
                <option value="Coll[Byte]">Coll[Byte]</option>
                <option value="Long">Long</option>
                <option value="Int">Int</option>
                <option value="Boolean">Boolean</option>
                <option value="SigmaProp">SigmaProp</option>
              </select>
            </PropertyField>
          </>
        );

      case 'custom-logic':
        return (
          <>
            <PropertyField label="ErgoScript Code" description="Custom ErgoScript implementation" required>
              <textarea
                className="property-textarea code"
                value={selectedComponent.properties.code || 'sigmaProp(true)'}
                onChange={(e) => handlePropertyUpdate('code', e.target.value)}
                rows={8}
                placeholder="Enter ErgoScript code..."
              />
            </PropertyField>
          </>
        );

      default:
        return (
          <div className="property-placeholder">
            <p>No specific configuration available for this component type.</p>
          </div>
        );
    }
    */
  };

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
          onClick={() => setActiveTab('properties')}
        >
          ⚙️ Properties
        </button>
        <button
          className={`tab ${activeTab === 'connections' ? 'active' : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          🔗 Connections
        </button>
        <button
          className={`tab ${activeTab === 'validation' ? 'active' : ''}`}
          onClick={() => setActiveTab('validation')}
        >
          ✅ Validation
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'properties' && (
          <div className="property-sections">
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

            <CollapsibleSection title="Configuration" icon="⚙️" defaultExpanded={true}>
              {renderSpecificProperties()}
            </CollapsibleSection>

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
          </div>
        )}

        {activeTab === 'connections' && (
          <div className="connections-info">
            <h4>Port Information</h4>
            {template && (
              <>
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
              </>
            )}
          </div>
        )}

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
}