import React, { forwardRef, useCallback, useState, useRef } from 'react';
import type { ContractComponent, Connection, Position } from '../../types/contractDesigner';
import CanvasComponent from './CanvasComponent';
import ConnectionLine from './ConnectionLine';
import './DesignCanvas.css';

interface DesignCanvasProps {
  components: ContractComponent[];
  connections: Connection[];
  selectedComponent: string | null;
  zoomLevel: number;
  canvasOffset: Position;
  isDragging: boolean;
  onComponentSelect: (componentId: string | null) => void;
  onComponentUpdate: (id: string, updates: Partial<ContractComponent>) => void;
  onComponentRemove: (componentId: string) => void;
  onConnectionAdd: (connection: Omit<Connection, 'id'>) => void;
  onConnectionRemove: (connectionId: string) => void;
  onCanvasUpdate: (updates: { offset?: Position; zoom?: number }) => void;
  onClick: (event: React.MouseEvent) => void;
}

const DesignCanvas = forwardRef<HTMLDivElement, DesignCanvasProps>(({
  components,
  connections,
  selectedComponent,
  zoomLevel,
  canvasOffset,
  isDragging,
  onComponentSelect,
  onComponentUpdate,
  onComponentRemove,
  onConnectionAdd,
  onConnectionRemove,
  onCanvasUpdate,
  onClick
}, ref) => {
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{
    componentId: string;
    portId: string;
    portType: 'input' | 'output';
    position: Position;
  } | null>(null);
  const [connectionPreview, setConnectionPreview] = useState<Position | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [snapPoints, setSnapPoints] = useState<Position[]>([]);
  const [nearestSnapPoint, setNearestSnapPoint] = useState<Position | null>(null);
  const [lastTouchTime, setLastTouchTime] = useState(0);
  const [touchStartDistance, setTouchStartDistance] = useState(0);
  const [initialPinchZoom, setInitialPinchZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Generate snap points for better alignment
  const generateSnapPoints = useCallback(() => {
    const gridSize = 20;
    const points: Position[] = [];
    
    // Add grid points
    for (let x = 0; x < 2000; x += gridSize) {
      for (let y = 0; y < 2000; y += gridSize) {
        points.push({ x, y });
      }
    }
    
    // Add component alignment points
    components.forEach(component => {
      points.push(
        { x: component.position.x, y: component.position.y },
        { x: component.position.x + component.size.width, y: component.position.y },
        { x: component.position.x, y: component.position.y + component.size.height },
        { x: component.position.x + component.size.width, y: component.position.y + component.size.height }
      );
    });
    
    setSnapPoints(points);
  }, [components]);

  React.useEffect(() => {
    generateSnapPoints();
  }, [generateSnapPoints]);

  // Handle drag and drop from palette
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    // Only set drag over to false if we're actually leaving the canvas
    if (!canvasRef.current?.contains(event.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const componentType = event.dataTransfer.getData('component-type') as any;
    
    if (componentType && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      let dropPosition = {
        x: (event.clientX - rect.left) / zoomLevel - canvasOffset.x,
        y: (event.clientY - rect.top) / zoomLevel - canvasOffset.y
      };
      
      // Snap to grid
      const gridSize = 20;
      dropPosition = {
        x: Math.round(dropPosition.x / gridSize) * gridSize,
        y: Math.round(dropPosition.y / gridSize) * gridSize
      };
      
      // TODO: Call the actual add component function (needs to be passed as prop)
      console.log('Would add component:', componentType, 'at position:', dropPosition);
    }
  }, [zoomLevel, canvasOffset]);

  // Handle canvas panning
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button === 1 || (event.button === 0 && event.ctrlKey)) {
      // Middle mouse button or Ctrl+click for panning
      event.preventDefault();
      setIsPanning(true);
      setPanStart({ x: event.clientX, y: event.clientY });
    } else if (event.target === canvasRef.current) {
      // Click on empty canvas
      onComponentSelect(null);
    }
  }, [onComponentSelect]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = event.clientX - panStart.x;
      const deltaY = event.clientY - panStart.y;
      
      onCanvasUpdate({
        offset: {
          x: canvasOffset.x + deltaX / zoomLevel,
          y: canvasOffset.y + deltaY / zoomLevel
        }
      });
      
      setPanStart({ x: event.clientX, y: event.clientY });
    } else if (isConnecting && canvasRef.current) {
      // Update connection preview
      const rect = canvasRef.current.getBoundingClientRect();
      setConnectionPreview({
        x: (event.clientX - rect.left) / zoomLevel - canvasOffset.x,
        y: (event.clientY - rect.top) / zoomLevel - canvasOffset.y
      });
    }
  }, [isPanning, isConnecting, panStart, canvasOffset, zoomLevel, onCanvasUpdate]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    if (isConnecting) {
      setIsConnecting(false);
      setConnectionStart(null);
      setConnectionPreview(null);
    }
  }, [isConnecting]);

  // Handle wheel zoom
  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoomLevel * zoomFactor, 0.2), 3);
    
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (event.clientX - rect.left) / zoomLevel - canvasOffset.x;
      const mouseY = (event.clientY - rect.top) / zoomLevel - canvasOffset.y;
      
      const newOffset = {
        x: mouseX - (mouseX * newZoom / zoomLevel),
        y: mouseY - (mouseY * newZoom / zoomLevel)
      };
      
      onCanvasUpdate({
        zoom: newZoom,
        offset: {
          x: canvasOffset.x + newOffset.x,
          y: canvasOffset.y + newOffset.y
        }
      });
    }
  }, [zoomLevel, canvasOffset, onCanvasUpdate]);

  // Handle connection creation
  const handleConnectionStart = useCallback((
    componentId: string,
    portId: string,
    portType: 'input' | 'output',
    position: Position
  ) => {
    setIsConnecting(true);
    setConnectionStart({ componentId, portId, portType, position });
    setConnectionPreview(position);
  }, []);

  const handleConnectionEnd = useCallback((
    componentId: string,
    portId: string,
    portType: 'input' | 'output'
  ) => {
    if (connectionStart && connectionStart.portType !== portType) {
      // Valid connection (output to input or input to output)
      const connection: Omit<Connection, 'id'> = {
        sourceId: connectionStart.portType === 'output' ? connectionStart.componentId : componentId,
        targetId: connectionStart.portType === 'output' ? componentId : connectionStart.componentId,
        sourcePort: connectionStart.portType === 'output' ? connectionStart.portId : portId,
        targetPort: connectionStart.portType === 'output' ? portId : connectionStart.portId,
        type: 'data' // Default connection type
      };
      
      onConnectionAdd(connection);
    }
    
    setIsConnecting(false);
    setConnectionStart(null);
    setConnectionPreview(null);
  }, [connectionStart, onConnectionAdd]);

  // Touch gesture handlers for mobile
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    const now = Date.now();
    const touches = event.touches;

    if (touches.length === 1) {
      // Single touch - check for double tap
      if (now - lastTouchTime < 300) {
        // Double tap detected - zoom in
        event.preventDefault();
        const newZoom = Math.min(zoomLevel * 1.5, 3);
        onCanvasUpdate({ zoom: newZoom });
      }
      setLastTouchTime(now);
    } else if (touches.length === 2) {
      // Pinch gesture start
      event.preventDefault();
      const distance = getTouchDistance(touches);
      setTouchStartDistance(distance);
      setInitialPinchZoom(zoomLevel);
      setIsPanning(true);
    }
  }, [lastTouchTime, zoomLevel, onCanvasUpdate]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    const touches = event.touches;

    if (touches.length === 2 && touchStartDistance > 0) {
      // Pinch zoom
      const currentDistance = getTouchDistance(touches);
      const scale = currentDistance / touchStartDistance;
      const newZoom = Math.min(Math.max(initialPinchZoom * scale, 0.2), 3);
      
      onCanvasUpdate({ zoom: newZoom });
    } else if (touches.length === 1 && isPanning) {
      // Single finger pan
      const touch = touches[0];
      const deltaX = touch.clientX - panStart.x;
      const deltaY = touch.clientY - panStart.y;
      
      onCanvasUpdate({
        offset: {
          x: canvasOffset.x + deltaX / zoomLevel,
          y: canvasOffset.y + deltaY / zoomLevel
        }
      });
      
      setPanStart({ x: touch.clientX, y: touch.clientY });
    }
  }, [touchStartDistance, initialPinchZoom, isPanning, panStart, canvasOffset, zoomLevel, onCanvasUpdate]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
    setTouchStartDistance(0);
    setInitialPinchZoom(1);
  }, []);

  // Grid pattern for canvas background
  const gridSize = 20 * zoomLevel;
  const gridOffsetX = (canvasOffset.x * zoomLevel) % gridSize;
  const gridOffsetY = (canvasOffset.y * zoomLevel) % gridSize;

  return (
    <div
      ref={(el) => {
        canvasRef.current = el;
        if (ref) {
          if (typeof ref === 'function') {
            ref(el);
          } else {
            ref.current = el;
          }
        }
      }}
      className={`design-canvas ${isPanning ? 'panning' : ''} ${isConnecting ? 'connecting' : ''} ${isDragOver ? 'drag-over' : ''} ${isDragging ? 'dragging-component' : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="application"
      aria-label="Contract design canvas"
      tabIndex={0}
      style={{
        touchAction: 'none' // Prevent default touch behaviors
      }}
    >
      {/* Grid Background */}
      <div
        className="canvas-grid"
        style={{
          transform: `translate(${gridOffsetX}px, ${gridOffsetY}px)`,
          backgroundSize: `${gridSize}px ${gridSize}px`
        }}
      />

      {/* Canvas Content Container */}
      <div
        className="canvas-content"
        style={{
          transform: `scale(${zoomLevel}) translate(${canvasOffset.x}px, ${canvasOffset.y}px)`
        }}
      >
        {/* Connection Lines */}
        <svg className="connections-layer" style={{ overflow: 'visible' }}>
          {connections.map(connection => {
            const sourceComponent = components.find(c => c.id === connection.sourceId);
            const targetComponent = components.find(c => c.id === connection.targetId);
            
            if (!sourceComponent || !targetComponent) return null;
            
            return (
              <ConnectionLine
                key={connection.id}
                connection={connection}
                sourceComponent={sourceComponent}
                targetComponent={targetComponent}
                isSelected={false} // TODO: Implement connection selection
                onRemove={() => onConnectionRemove(connection.id)}
              />
            );
          })}
          
          {/* Connection Preview */}
          {isConnecting && connectionStart && connectionPreview && (
            <line
              x1={connectionStart.position.x}
              y1={connectionStart.position.y}
              x2={connectionPreview.x}
              y2={connectionPreview.y}
              stroke="var(--color-primary-400)"
              strokeWidth="2"
              strokeDasharray="5,5"
              className="connection-preview"
            />
          )}
        </svg>

        {/* Components */}
        <div className="components-layer">
          {components.map(component => (
            <CanvasComponent
              key={component.id}
              component={component}
              isSelected={selectedComponent === component.id}
              onSelect={() => onComponentSelect(component.id)}
              onUpdate={(updates) => onComponentUpdate(component.id, updates)}
              onRemove={() => onComponentRemove(component.id)}
              onConnectionStart={handleConnectionStart}
              onConnectionEnd={handleConnectionEnd}
            />
          ))}
        </div>

        {/* Selection Box (for future multi-select) */}
        {/* Snap Point Indicators */}
        {isDragging && nearestSnapPoint && (
          <div
            className="snap-indicator active"
            style={{
              left: nearestSnapPoint.x,
              top: nearestSnapPoint.y
            }}
          />
        )}

        {/* TODO: Implement selection box for multi-select */}
      </div>

      {/* Drop Zone Indicators */}
      {isDragOver && (
        <div
          className="drop-zone-indicator"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        />
      )}

      {/* Canvas Instructions */}
      {components.length === 0 && (
        <div className="canvas-instructions">
          <div className="instruction-content">
            <h3>🎨 Start Designing Your Contract</h3>
            <div className="instruction-steps">
              <div className="instruction-step">
                <span className="step-number">1</span>
                <span>Drag components from the palette</span>
              </div>
              <div className="instruction-step">
                <span className="step-number">2</span>
                <span>Connect outputs to inputs</span>
              </div>
              <div className="instruction-step">
                <span className="step-number">3</span>
                <span>Configure component properties</span>
              </div>
              <div className="instruction-step">
                <span className="step-number">4</span>
                <span>Generate and test your contract</span>
              </div>
            </div>
            <div className="canvas-shortcuts">
              <h4>⌨️ Controls</h4>
              <ul className="desktop-shortcuts">
                <li><kbd>Ctrl</kbd> + <kbd>Click</kbd> - Pan canvas</li>
                <li><kbd>Wheel</kbd> - Zoom in/out</li>
                <li><kbd>Del</kbd> - Delete selected</li>
                <li><kbd>Esc</kbd> - Deselect all</li>
              </ul>
              <ul className="mobile-shortcuts">
                <li>👆 Double tap - Zoom in</li>
                <li>🤏 Pinch - Zoom in/out</li>
                <li>👋 Drag - Pan canvas</li>
                <li>✋ Long press - Context menu</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Status */}
      <div className="canvas-status">
        <div className="status-indicators">
          {isPanning && <span className="status-badge">📐 Panning</span>}
          {isConnecting && <span className="status-badge">🔗 Connecting</span>}
          {isDragging && <span className="status-badge">👆 Dragging</span>}
        </div>
      </div>
    </div>
  );
});

DesignCanvas.displayName = 'DesignCanvas';

export default DesignCanvas;