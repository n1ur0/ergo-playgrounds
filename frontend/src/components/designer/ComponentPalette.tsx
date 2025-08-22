import React, { useState, useMemo } from 'react';
import { componentTemplates, getComponentsByCategory, contractTemplates } from '../../data/componentTemplates';
import type { ComponentType, Position } from '../../types/contractDesigner';
import './ComponentPalette.css';

interface ComponentPaletteProps {
  onComponentDrop: (componentType: ComponentType, position: Position) => void;
  isExpanded: boolean;
}

interface DraggableComponentProps {
  template: typeof componentTemplates[0];
  onDragStart: (componentType: ComponentType) => void;
}

function DraggableComponent({ template, onDragStart }: DraggableComponentProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('component-type', template.type);
    event.dataTransfer.effectAllowed = 'copy';
    
    // Create custom drag image
    const dragImage = event.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.transform = 'rotate(3deg)';
    dragImage.style.opacity = '0.8';
    document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, 50, 25);
    setTimeout(() => document.body.removeChild(dragImage), 0);
    
    onDragStart(template.type);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      // Trigger drag operation programmatically for keyboard users
      const dragEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
      event.currentTarget.dispatchEvent(dragEvent);
    }
  };

  const complexityColor = {
    beginner: 'var(--color-success-400)',
    intermediate: 'var(--color-warning-400)', 
    advanced: 'var(--color-error-400)'
  }[template.complexity];

  const portTypes = [...new Set([
    ...template.ports.inputs.map(p => p.dataType),
    ...template.ports.outputs.map(p => p.dataType)
  ])];

  return (
    <div
      className={`component-item component-${template.category} ${isDragOver ? 'drag-over' : ''} ${isFocused ? 'focused' : ''}`}
      draggable
      tabIndex={0}
      role="button"
      aria-label={`Add ${template.label} component. ${template.description}`}
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDragOver(false)}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      title={`${template.description}\n\nComplexity: ${template.complexity}\nPorts: ${template.ports.inputs.length} inputs, ${template.ports.outputs.length} outputs\nData types: ${portTypes.join(', ')}`}
    >
      <div className="component-icon">
        {template.icon}
      </div>
      
      <div className="component-details">
        <div className="component-name">
          {template.label}
          {template.ports.inputs.some(p => p.required) && (
            <span className="required-indicator" title="Has required inputs">*</span>
          )}
        </div>
        <div className="component-description">
          {template.description}
        </div>
        <div className="component-meta">
          <span 
            className="complexity-badge"
            style={{ backgroundColor: complexityColor }}
            title={`Complexity level: ${template.complexity}`}
          >
            {template.complexity}
          </span>
          <span className="port-count" title={`${template.ports.inputs.length} inputs, ${template.ports.outputs.length} outputs`}>
            {template.ports.inputs.length}→{template.ports.outputs.length}
          </span>
        </div>
      </div>
      
      <div className="component-preview" aria-hidden="true">
        <div className="port-preview">
          {portTypes.slice(0, 3).map(type => (
            <div key={type} className={`port-dot ${type}`} title={type} />
          ))}
          {portTypes.length > 3 && (
            <div className="port-dot more" title={`+${portTypes.length - 3} more types`}>…</div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CategorySectionProps {
  title: string;
  icon: string;
  components: typeof componentTemplates;
  isExpanded: boolean;
  onToggle: () => void;
  onDragStart: (componentType: ComponentType) => void;
}

function CategorySection({ title, icon, components, isExpanded, onToggle, onDragStart }: CategorySectionProps) {
  return (
    <div className="category-section">
      <button className="category-header" onClick={onToggle}>
        <span className="category-icon">{icon}</span>
        <span className="category-title">{title}</span>
        <span className="component-count">({components.length})</span>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </button>
      
      {isExpanded && (
        <div className="category-content">
          {components.map(template => (
            <DraggableComponent
              key={template.type}
              template={template}
              onDragStart={onDragStart}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ComponentPalette({ isExpanded }: ComponentPaletteProps) {
  const [activeTab, setActiveTab] = useState<'components' | 'templates'>('components');
  const [searchTerm, setSearchTerm] = useState('');
  const [complexityFilter, setComplexityFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['input', 'output', 'logic'])
  );

  // Filter components based on search and complexity
  const filteredComponents = useMemo(() => {
    let filtered = componentTemplates;

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (complexityFilter !== 'all') {
      filtered = filtered.filter(template => template.complexity === complexityFilter);
    }

    return filtered;
  }, [searchTerm, complexityFilter]);

  // Group components by category
  const componentsByCategory = useMemo(() => {
    const categories = {
      input: { title: 'Input/Output', icon: '📥', components: getComponentsByCategory('input').concat(getComponentsByCategory('output')) },
      logic: { title: 'Logic & Control', icon: '🧠', components: getComponentsByCategory('logic') },
      validation: { title: 'Validation', icon: '✅', components: getComponentsByCategory('validation') },
      token: { title: 'Token Operations', icon: '🪙', components: getComponentsByCategory('token') },
      advanced: { title: 'Advanced', icon: '⚡', components: getComponentsByCategory('advanced') }
    };

    // Apply filters to each category
    Object.keys(categories).forEach(key => {
      const category = categories[key as keyof typeof categories];
      category.components = category.components.filter(template =>
        filteredComponents.includes(template)
      );
    });

    return categories;
  }, [filteredComponents]);

  const handleCategoryToggle = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDragStart = () => {
    // Visual feedback for drag start
    document.body.classList.add('dragging-component');
  };

  const handleContractTemplateClick = (templateId: string) => {
    // TODO: Load contract template
    console.log('Loading contract template:', templateId);
  };

  // Cleanup drag class on component unmount
  React.useEffect(() => {
    return () => {
      document.body.classList.remove('dragging-component');
    };
  }, []);

  if (!isExpanded) {
    return (
      <div className="component-palette collapsed">
        <div className="palette-hint">
          Component Palette Collapsed
        </div>
      </div>
    );
  }

  return (
    <div className="component-palette">
      <header className="palette-header">
        <div className="palette-tabs">
          <button
            className={`tab ${activeTab === 'components' ? 'active' : ''}`}
            onClick={() => setActiveTab('components')}
          >
            🔧 Components
          </button>
          <button
            className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            📋 Templates
          </button>
        </div>
      </header>

      <div className="palette-content">
        {activeTab === 'components' && (
          <>
            {/* Search and Filters */}
            <div className="palette-filters">
              <div className="search-container">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search components..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <span className="search-icon">🔍</span>
              </div>

              <select
                className="complexity-filter"
                value={complexityFilter}
                onChange={(e) => setComplexityFilter(e.target.value as 'all' | 'beginner' | 'intermediate' | 'advanced')}
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Component Categories */}
            <div className="component-categories">
              {Object.entries(componentsByCategory).map(([categoryKey, category]) => (
                category.components.length > 0 && (
                  <CategorySection
                    key={categoryKey}
                    title={category.title}
                    icon={category.icon}
                    components={category.components}
                    isExpanded={expandedCategories.has(categoryKey)}
                    onToggle={() => handleCategoryToggle(categoryKey)}
                    onDragStart={handleDragStart}
                  />
                )
              ))}
            </div>

            {/* Help Section */}
            <div className="palette-help">
              <h4>💡 Quick Start</h4>
              <ul>
                <li>Drag components to the canvas</li>
                <li>Connect outputs to inputs</li>
                <li>Configure properties</li>
                <li>Generate and test code</li>
              </ul>
            </div>
          </>
        )}

        {activeTab === 'templates' && (
          <div className="contract-templates">
            <div className="templates-header">
              <h3>📋 Contract Templates</h3>
              <p>Quick start with pre-built contracts</p>
            </div>

            <div className="template-list">
              {contractTemplates.map(template => (
                <div
                  key={template.id}
                  className={`template-item template-${template.complexity}`}
                  onClick={() => handleContractTemplateClick(template.id)}
                >
                  <div className="template-header">
                    <h4>{template.name}</h4>
                    <span className="template-complexity">
                      {template.complexity}
                    </span>
                  </div>
                  <p className="template-description">
                    {template.description}
                  </p>
                  <div className="template-stats">
                    <span>{template.components.length} components</span>
                    {template.connections && (
                      <span>{template.connections.length} connections</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drop Zone Instructions */}
      <div className="drop-instructions">
        <div className="instruction-item">
          <span className="instruction-icon">👆</span>
          <span>Drag components to canvas</span>
        </div>
        <div className="instruction-item">
          <span className="instruction-icon">🔗</span>
          <span>Connect ports to link logic</span>
        </div>
      </div>
    </div>
  );
}