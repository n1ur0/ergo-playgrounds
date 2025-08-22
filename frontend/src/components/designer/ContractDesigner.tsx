import React, { useRef, useState, useCallback } from 'react';
import { useContractDesigner } from '../../hooks/useContractDesigner';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import ComponentPalette from './ComponentPalette';
import DesignCanvas from './DesignCanvas';
import PropertyPanel from './PropertyPanel';
import CodePreview from './CodePreview';
import TestScenarioPanel from './TestScenarioPanel';
import ContractValidation from './ContractValidation';
import type { ComponentType, Position } from '../../types/contractDesigner';
import './ContractDesigner.css';

interface ContractDesignerProps {
  className?: string;
}

export default function ContractDesigner({ className = '' }: ContractDesignerProps) {
  const designer = useContractDesigner();
  const layout = useResponsiveLayout();
  const [activePanel, setActivePanel] = useState<'properties' | 'code' | 'tests' | 'validation'>('properties');
  const [isPaletteExpanded, setIsPaletteExpanded] = useState(!layout.isMobile);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Handle component drop from palette
  const handleComponentDrop = useCallback((componentType: ComponentType, position: Position) => {
    designer.addComponent(componentType, position);
  }, [designer]);

  // Handle canvas interaction
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // const clickPosition = {
    //   x: (event.clientX - rect.left) / designer.zoomLevel - designer.canvasOffset.x,
    //   y: (event.clientY - rect.top) / designer.zoomLevel - designer.canvasOffset.y
    // };

    // If clicking on empty canvas, deselect components
    if (event.target === canvasRef.current) {
      designer.selectComponent(null);
    }
  }, [designer]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Delete' && designer.selectedComponent) {
      designer.removeComponent(designer.selectedComponent);
    } else if (event.key === 'Escape') {
      designer.selectComponent(null);
    } else if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'z':
          event.preventDefault();
          // TODO: Implement undo
          break;
        case 'y':
          event.preventDefault();
          // TODO: Implement redo
          break;
        case 's':
          event.preventDefault();
          // TODO: Implement save
          break;
      }
    }
  }, [designer]);

  // Setup keyboard listeners
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className={`contract-designer ${className}`}>
      {/* Header */}
      <header className="designer-header">
        <div className="header-left">
          <h2>Smart Contract Designer</h2>
          <div className="contract-stats">
            <span className="stat">
              Components: {designer.components.length}
            </span>
            <span className="stat">
              Complexity: {designer.contractComplexity}
            </span>
            <span className={`stat ${designer.hasValidContract ? 'valid' : 'invalid'}`}>
              {designer.hasValidContract ? '✓ Valid' : '⚠ Issues'}
            </span>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="action-button secondary"
            onClick={designer.clearCanvas}
            title="Clear Canvas"
          >
            🗑️ Clear
          </button>
          
          <button
            className="action-button secondary"
            onClick={() => setIsPaletteExpanded(!isPaletteExpanded)}
            title="Toggle Component Palette"
          >
            {isPaletteExpanded ? '◀' : '▶'} Palette
          </button>

          <button
            className="action-button primary"
            onClick={designer.generateCode}
            disabled={designer.isGenerating}
            title="Generate Contract Code"
          >
            {designer.isGenerating ? '⏳' : '⚡'} Generate
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="designer-content">
        {/* Component Palette */}
        {isPaletteExpanded && (
          <aside className="component-palette-container">
            <ComponentPalette
              onComponentDrop={handleComponentDrop}
              isExpanded={isPaletteExpanded}
            />
          </aside>
        )}

        {/* Design Canvas */}
        <main className="canvas-container">
          <div className="canvas-header">
            <div className="canvas-tools">
              <button
                className="tool-button"
                onClick={() => designer.updateCanvas({ 
                  zoom: Math.min(designer.zoomLevel * 1.2, 3) 
                })}
                title="Zoom In"
              >
                🔍+
              </button>
              
              <span className="zoom-level">
                {Math.round(designer.zoomLevel * 100)}%
              </span>
              
              <button
                className="tool-button"
                onClick={() => designer.updateCanvas({ 
                  zoom: Math.max(designer.zoomLevel / 1.2, 0.3) 
                })}
                title="Zoom Out"
              >
                🔍-
              </button>

              <button
                className="tool-button"
                onClick={() => designer.updateCanvas({ 
                  zoom: 1, 
                  offset: { x: 0, y: 0 } 
                })}
                title="Reset View"
              >
                🎯 Reset
              </button>
            </div>
          </div>

          <DesignCanvas
            ref={canvasRef}
            components={designer.components}
            connections={designer.connections}
            selectedComponent={designer.selectedComponent}
            zoomLevel={designer.zoomLevel}
            canvasOffset={designer.canvasOffset}
            isDragging={designer.isDragging}
            onComponentSelect={designer.selectComponent}
            onComponentUpdate={designer.updateComponent}
            onComponentRemove={designer.removeComponent}
            onConnectionAdd={designer.addConnection}
            onConnectionRemove={designer.removeConnection}
            onCanvasUpdate={designer.updateCanvas}
            onClick={handleCanvasClick}
          />
        </main>

        {/* Side Panel */}
        <aside className="side-panel">
          <nav className="panel-tabs">
            <button
              className={`tab ${activePanel === 'properties' ? 'active' : ''}`}
              onClick={() => setActivePanel('properties')}
            >
              ⚙️ Properties
            </button>
            <button
              className={`tab ${activePanel === 'code' ? 'active' : ''}`}
              onClick={() => setActivePanel('code')}
            >
              💻 Code
            </button>
            <button
              className={`tab ${activePanel === 'tests' ? 'active' : ''}`}
              onClick={() => setActivePanel('tests')}
            >
              🧪 Tests
            </button>
            <button
              className={`tab ${activePanel === 'validation' ? 'active' : ''}`}
              onClick={() => setActivePanel('validation')}
            >
              ✅ Validation
            </button>
          </nav>

          <div className="panel-content">
            {activePanel === 'properties' && (
              <PropertyPanel
                selectedComponent={designer.selectedComponent ? 
                  designer.components.find(c => c.id === designer.selectedComponent) || null : 
                  null
                }
                onComponentUpdate={designer.updateComponent}
              />
            )}

            {activePanel === 'code' && (
              <CodePreview
                generatedCode={designer.generatedCode}
                isGenerating={designer.isGenerating}
                validationErrors={designer.validationErrors}
                onRegenerate={designer.generateCode}
              />
            )}

            {activePanel === 'tests' && (
              <TestScenarioPanel
                testScenarios={designer.testScenarios}
                isTestingContract={designer.isTestingContract}
                contractValid={designer.hasValidContract}
                onAddScenario={designer.addTestScenario}
                onRemoveScenario={designer.removeTestScenario}
                onRunScenario={designer.runTestScenario}
              />
            )}

            {activePanel === 'validation' && (
              <ContractValidation
                validationErrors={designer.validationErrors}
                components={designer.components}
                connections={designer.connections}
                contractComplexity={designer.contractComplexity}
                hasValidContract={designer.hasValidContract}
              />
            )}
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Panel */}
      {layout.isMobile && (
        <div className="mobile-bottom-panel">
          <button
            className="mobile-tab"
            onClick={() => setActivePanel('properties')}
          >
            ⚙️
          </button>
          <button
            className="mobile-tab"
            onClick={() => setActivePanel('code')}
          >
            💻
          </button>
          <button
            className="mobile-tab"
            onClick={() => setActivePanel('tests')}
          >
            🧪
          </button>
          <button
            className="mobile-tab"
            onClick={() => setActivePanel('validation')}
          >
            ✅
          </button>
        </div>
      )}

      {/* Status Bar */}
      <footer className="designer-status">
        <div className="status-left">
          <span className="status-item">
            {designer.components.length} components
          </span>
          <span className="status-item">
            {designer.connections.length} connections
          </span>
          {designer.selectedComponent && (
            <span className="status-item">
              Selected: {designer.components.find(c => c.id === designer.selectedComponent)?.label}
            </span>
          )}
        </div>

        <div className="status-right">
          {designer.isGenerating && (
            <span className="status-item">
              ⏳ Generating code...
            </span>
          )}
          {designer.isTestingContract && (
            <span className="status-item">
              🧪 Running tests...
            </span>
          )}
          <span className="status-item">
            Zoom: {Math.round(designer.zoomLevel * 100)}%
          </span>
        </div>
      </footer>
    </div>
  );
}