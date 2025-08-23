// Optimized imports for better tree-shaking
import React, { useRef, useState, useCallback, memo, useMemo, useEffect } from 'react';
import { useContractDesigner } from '../../hooks/useContractDesigner';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import ComponentPalette from './ComponentPalette';
import DesignCanvas from './DesignCanvas';
import OptimizedPropertyPanel from './OptimizedPropertyPanel';
import CodePreview from './CodePreview';
import TestScenarioPanel from './TestScenarioPanel';
import ContractValidation from './ContractValidation';
import type { ComponentType, Position } from '../../types/contractDesigner';
import './ContractDesigner.css';

interface ContractDesignerProps {
  className?: string;
  onLoad?: () => void;
  enableAnimations?: boolean;
  enableAdvancedRendering?: boolean;
  lazyLoadImages?: boolean;
  performanceMode?: string;
}

// Memoized header stats component
interface HeaderStatsProps {
  componentCount: number;
  complexity: number;
  hasValidContract: boolean;
}

const HeaderStats = memo<HeaderStatsProps>(({ componentCount, complexity, hasValidContract }) => (
  <div className="contract-stats">
    <span className="stat">
      Components: {componentCount}
    </span>
    <span className="stat">
      Complexity: {complexity}
    </span>
    <span className={`stat ${hasValidContract ? 'valid' : 'invalid'}`}>
      {hasValidContract ? '✓ Valid' : '⚠ Issues'}
    </span>
  </div>
));

HeaderStats.displayName = 'HeaderStats';

// Memoized action buttons component
interface HeaderActionsProps {
  onClearCanvas: () => void;
  onTogglePalette: () => void;
  onGenerateCode: () => void;
  isPaletteExpanded: boolean;
  isGenerating: boolean;
}

const HeaderActions = memo<HeaderActionsProps>(({ 
  onClearCanvas, 
  onTogglePalette, 
  onGenerateCode, 
  isPaletteExpanded, 
  isGenerating 
}) => (
  <div className="header-actions">
    <button
      className="action-button secondary"
      onClick={onClearCanvas}
      title="Clear Canvas"
    >
      🗑️ Clear
    </button>
    
    <button
      className="action-button secondary"
      onClick={onTogglePalette}
      title="Toggle Component Palette"
    >
      {isPaletteExpanded ? '◀' : '▶'} Palette
    </button>

    <button
      className="action-button primary"
      onClick={onGenerateCode}
      disabled={isGenerating}
      title="Generate Contract Code"
    >
      {isGenerating ? '⏳' : '⚡'} Generate
    </button>
  </div>
));

HeaderActions.displayName = 'HeaderActions';

// Memoized canvas tools component
interface CanvasToolsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

const CanvasTools = memo<CanvasToolsProps>(({ 
  zoomLevel, 
  onZoomIn, 
  onZoomOut, 
  onResetView 
}) => (
  <div className="canvas-tools">
    <button
      className="tool-button"
      onClick={onZoomIn}
      title="Zoom In"
    >
      🔍+
    </button>
    
    <span className="zoom-level">
      {Math.round(zoomLevel * 100)}%
    </span>
    
    <button
      className="tool-button"
      onClick={onZoomOut}
      title="Zoom Out"
    >
      🔍-
    </button>

    <button
      className="tool-button"
      onClick={onResetView}
      title="Reset View"
    >
      🎯 Reset
    </button>
  </div>
));

CanvasTools.displayName = 'CanvasTools';

// Memoized panel tabs component
interface PanelTabsProps {
  activePanel: string;
  onTabChange: (panel: 'properties' | 'code' | 'tests' | 'validation') => void;
}

const PanelTabs = memo<PanelTabsProps>(({ activePanel, onTabChange }) => (
  <nav className="panel-tabs">
    <button
      className={`tab ${activePanel === 'properties' ? 'active' : ''}`}
      onClick={() => onTabChange('properties')}
    >
      ⚙️ Properties
    </button>
    <button
      className={`tab ${activePanel === 'code' ? 'active' : ''}`}
      onClick={() => onTabChange('code')}
    >
      💻 Code
    </button>
    <button
      className={`tab ${activePanel === 'tests' ? 'active' : ''}`}
      onClick={() => onTabChange('tests')}
    >
      🧪 Tests
    </button>
    <button
      className={`tab ${activePanel === 'validation' ? 'active' : ''}`}
      onClick={() => onTabChange('validation')}
    >
      ✅ Validation
    </button>
  </nav>
));

PanelTabs.displayName = 'PanelTabs';

// Memoized status bar component
interface StatusBarProps {
  componentCount: number;
  connectionCount: number;
  selectedComponentLabel?: string;
  isGenerating: boolean;
  isTestingContract: boolean;
  zoomLevel: number;
}

const StatusBar = memo<StatusBarProps>(({ 
  componentCount, 
  connectionCount, 
  selectedComponentLabel, 
  isGenerating, 
  isTestingContract, 
  zoomLevel 
}) => (
  <footer className="designer-status">
    <div className="status-left">
      <span className="status-item">
        {componentCount} components
      </span>
      <span className="status-item">
        {connectionCount} connections
      </span>
      {selectedComponentLabel && (
        <span className="status-item">
          Selected: {selectedComponentLabel}
        </span>
      )}
    </div>

    <div className="status-right">
      {isGenerating && (
        <span className="status-item">
          ⏳ Generating code...
        </span>
      )}
      {isTestingContract && (
        <span className="status-item">
          🧪 Running tests...
        </span>
      )}
      <span className="status-item">
        Zoom: {Math.round(zoomLevel * 100)}%
      </span>
    </div>
  </footer>
));

StatusBar.displayName = 'StatusBar';

// Main optimized ContractDesigner component
const OptimizedContractDesigner = memo<ContractDesignerProps>(({ 
  className = '', 
  onLoad, 
  enableAnimations = true,
  enableAdvancedRendering = true,
  lazyLoadImages = true,
  performanceMode = 'balanced'
}) => {
  const designer = useContractDesigner();
  const layout = useResponsiveLayout();
  const [activePanel, setActivePanel] = useState<'properties' | 'code' | 'tests' | 'validation'>('properties');
  const [isPaletteExpanded, setIsPaletteExpanded] = useState(!layout.isMobile);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Memoized selected component for property panel
  const selectedComponent = useMemo(() => {
    return designer.selectedComponent ? 
      designer.components.find(c => c.id === designer.selectedComponent) || null : 
      null;
  }, [designer.components, designer.selectedComponent]);

  // Memoized selected component label for status bar
  const selectedComponentLabel = useMemo(() => {
    return selectedComponent?.label;
  }, [selectedComponent?.label]);

  // Memoized handlers for better performance
  const handleComponentDrop = useCallback((componentType: ComponentType, position: Position) => {
    designer.addComponent(componentType, position);
  }, [designer.addComponent]);

  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // If clicking on empty canvas, deselect components
    if (event.target === canvasRef.current) {
      designer.selectComponent(null);
    }
  }, [designer.selectComponent]);

  const handleTogglePalette = useCallback(() => {
    setIsPaletteExpanded(prev => !prev);
  }, []);

  const handleTabChange = useCallback((panel: 'properties' | 'code' | 'tests' | 'validation') => {
    setActivePanel(panel);
  }, []);

  // Memoized zoom handlers
  const zoomHandlers = useMemo(() => ({
    onZoomIn: () => designer.updateCanvas({ 
      zoom: Math.min(designer.zoomLevel * 1.2, 3) 
    }),
    onZoomOut: () => designer.updateCanvas({ 
      zoom: Math.max(designer.zoomLevel / 1.2, 0.3) 
    }),
    onResetView: () => designer.updateCanvas({ 
      zoom: 1, 
      offset: { x: 0, y: 0 } 
    })
  }), [designer.updateCanvas, designer.zoomLevel]);

  // Keyboard shortcut handler with memoization
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Delete' && designer.selectedComponent) {
      designer.removeComponent(designer.selectedComponent);
    } else if (event.key === 'Escape') {
      designer.selectComponent(null);
    } else if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'z':
          event.preventDefault();
          if (event.shiftKey) {
            designer.redo();
          } else {
            designer.undo();
          }
          break;
        case 'y':
          event.preventDefault();
          designer.redo();
          break;
        case 's':
          event.preventDefault();
          designer.saveContract();
          break;
      }
    }
  }, [designer.selectedComponent, designer.removeComponent, designer.selectComponent, designer.undo, designer.redo, designer.saveContract]);

  // Setup keyboard listeners with proper cleanup
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Call onLoad callback when component mounts
  React.useEffect(() => {
    if (onLoad) {
      onLoad();
    }
  }, [onLoad]);

  // Memoized panel content renderer
  const renderPanelContent = useMemo(() => {
    switch (activePanel) {
      case 'properties':
        return (
          <OptimizedPropertyPanel
            selectedComponent={selectedComponent}
            onComponentUpdate={designer.updateComponent}
          />
        );

      case 'code':
        return (
          <CodePreview
            generatedCode={designer.generatedCode}
            isGenerating={designer.isGenerating}
            validationErrors={designer.validationErrors}
            onRegenerate={designer.generateCode}
          />
        );

      case 'tests':
        return (
          <TestScenarioPanel
            testScenarios={designer.testScenarios}
            isTestingContract={designer.isTestingContract}
            contractValid={designer.hasValidContract}
            onAddScenario={designer.addTestScenario}
            onRemoveScenario={designer.removeTestScenario}
            onRunScenario={designer.runTestScenario}
          />
        );

      case 'validation':
        return (
          <ContractValidation
            validationErrors={designer.validationErrors}
            components={designer.components}
            connections={designer.connections}
            contractComplexity={designer.contractComplexity}
            hasValidContract={designer.hasValidContract}
          />
        );

      default:
        return null;
    }
  }, [
    activePanel,
    selectedComponent,
    designer.updateComponent,
    designer.generatedCode,
    designer.isGenerating,
    designer.validationErrors,
    designer.generateCode,
    designer.testScenarios,
    designer.isTestingContract,
    designer.hasValidContract,
    designer.addTestScenario,
    designer.removeTestScenario,
    designer.runTestScenario,
    designer.components,
    designer.connections,
    designer.contractComplexity
  ]);

  return (
    <div className={`contract-designer ${className}`}>
      {/* Header */}
      <header className="designer-header">
        <div className="header-left">
          <h2>Smart Contract Designer</h2>
          <HeaderStats
            componentCount={designer.components.length}
            complexity={designer.contractComplexity}
            hasValidContract={designer.hasValidContract}
          />
        </div>

        <HeaderActions
          onClearCanvas={designer.clearCanvas}
          onTogglePalette={handleTogglePalette}
          onGenerateCode={designer.generateCode}
          isPaletteExpanded={isPaletteExpanded}
          isGenerating={designer.isGenerating}
        />
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
            <CanvasTools
              zoomLevel={designer.zoomLevel}
              {...zoomHandlers}
            />
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
          <PanelTabs activePanel={activePanel} onTabChange={handleTabChange} />
          <div className="panel-content">
            {renderPanelContent}
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
      <StatusBar
        componentCount={designer.components.length}
        connectionCount={designer.connections.length}
        selectedComponentLabel={selectedComponentLabel}
        isGenerating={designer.isGenerating}
        isTestingContract={designer.isTestingContract}
        zoomLevel={designer.zoomLevel}
      />
    </div>
  );
});

OptimizedContractDesigner.displayName = 'OptimizedContractDesigner';

export default OptimizedContractDesigner;
