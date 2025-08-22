import type { Connection, ContractComponent } from '../../types/contractDesigner';

interface ConnectionLineProps {
  connection: Connection;
  sourceComponent: ContractComponent;
  targetComponent: ContractComponent;
  isSelected: boolean;
  onRemove: () => void;
}

export default function ConnectionLine({
  connection,
  sourceComponent,
  targetComponent,
  isSelected,
  onRemove
}: ConnectionLineProps) {
  // Calculate connection points
  const sourceX = sourceComponent.position.x + sourceComponent.size.width;
  const sourceY = sourceComponent.position.y + sourceComponent.size.height / 2;
  const targetX = targetComponent.position.x;
  const targetY = targetComponent.position.y + targetComponent.size.height / 2;

  // Calculate control points for curved line
  const controlOffset = Math.abs(targetX - sourceX) * 0.5;
  const controlX1 = sourceX + controlOffset;
  const controlX2 = targetX - controlOffset;

  const pathData = `M ${sourceX} ${sourceY} C ${controlX1} ${sourceY} ${controlX2} ${targetY} ${targetX} ${targetY}`;

  const connectionColor = {
    'data': 'var(--color-primary-400)',
    'condition': 'var(--color-success-400)',
    'token-flow': 'var(--color-secondary-400)'
  }[connection.type] || 'var(--color-outline)';

  return (
    <g>
      {/* Connection path */}
      <path
        d={pathData}
        stroke={connectionColor}
        strokeWidth={isSelected ? "3" : "2"}
        fill="none"
        strokeDasharray={connection.type === 'condition' ? "5,3" : "none"}
        className="connection-line"
        style={{ cursor: 'pointer' }}
        onClick={onRemove}
      />
      
      {/* Arrow marker */}
      <defs>
        <marker
          id={`arrow-${connection.id}`}
          viewBox="0 0 10 10"
          refX="5"
          refY="3"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path
            d="M0,0 L0,6 L9,3 z"
            fill={connectionColor}
          />
        </marker>
      </defs>
      
      <path
        d={pathData}
        stroke={connectionColor}
        strokeWidth="2"
        fill="none"
        markerEnd={`url(#arrow-${connection.id})`}
        pointerEvents="none"
      />
      
      {/* Selection indicator */}
      {isSelected && (
        <path
          d={pathData}
          stroke="var(--color-primary-400)"
          strokeWidth="6"
          fill="none"
          opacity="0.3"
          pointerEvents="none"
        />
      )}
    </g>
  );
}