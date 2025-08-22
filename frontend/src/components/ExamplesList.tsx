import React from 'react';
import { FileText, Play } from 'lucide-react';
import './ExamplesList.css';

interface ExamplesListProps {
  selectedExample: string | null;
  onSelectExample: (example: string) => void;
}

const examples = [
  {
    id: 'contractDesigner',
    title: '🎨 Contract Designer',
    description: 'Create custom smart contracts with drag-and-drop interface',
    difficulty: 'Interactive',
    category: 'Designer',
    isSpecial: true
  },
  {
    id: 'simpleSend',
    title: 'Simple Send',
    description: 'Basic transaction between two parties',
    difficulty: 'Starter',
    category: 'Basic'
  },
  {
    id: 'pinLockContract',
    title: 'Pin Lock Contract',
    description: 'Lock funds with a PIN number',
    difficulty: 'Beginner',
    category: 'Security'
  },
  {
    id: 'escrowDepositContract',
    title: 'Escrow Deposit Contract',
    description: 'Secure escrow with deposit mechanism',
    difficulty: 'Intermediate',
    category: 'DeFi'
  },
  {
    id: 'tokenSalesService',
    title: 'Token Sales Service',
    description: 'Token sales with automated pricing',
    difficulty: 'Advanced',
    category: 'DeFi'
  },
  {
    id: 'headsOrTails',
    title: 'Heads or Tails Game',
    description: 'Simple gambling game contract',
    difficulty: 'Intermediate',
    category: 'Gaming'
  },
  {
    id: 'singleChainSwap',
    title: 'Single Chain Swap',
    description: 'Atomic swap on single chain',
    difficulty: 'Advanced',
    category: 'DeFi'
  },
  {
    id: 'doubleChainSwap',
    title: 'Double Chain Swap',
    description: 'Cross-chain atomic swap',
    difficulty: 'Expert',
    category: 'DeFi'
  },
  {
    id: 'stealthAddress',
    title: 'Stealth Address',
    description: 'Privacy-preserving address generation',
    difficulty: 'Expert',
    category: 'Privacy'
  }
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'Interactive': return '#2196f3';
    case 'Starter': return '#4caf50';
    case 'Beginner': return '#8bc34a';
    case 'Intermediate': return '#ff9800';
    case 'Advanced': return '#f44336';
    case 'Expert': return '#9c27b0';
    default: return '#757575';
  }
};

const ExamplesList: React.FC<ExamplesListProps> = ({ selectedExample, onSelectExample }) => {
  return (
    <div className="examples-list">
      <h2>
        <FileText size={20} />
        Smart Contract Examples
      </h2>
      
      <div className="examples-grid">
        {examples.map((example) => (
          <div
            key={example.id}
            className={`example-card ${selectedExample === example.id ? 'selected' : ''} ${(example as any).isSpecial ? 'special' : ''}`}
            onClick={() => onSelectExample(example.id)}
          >
            <div className="example-header">
              <h3>{example.title}</h3>
              <div className="example-badges">
                <span 
                  className="difficulty-badge"
                  style={{ backgroundColor: getDifficultyColor(example.difficulty) }}
                >
                  {example.difficulty}
                </span>
                <span className="category-badge">{example.category}</span>
              </div>
            </div>
            
            <p className="example-description">{example.description}</p>
            
            <div className="example-actions">
              <button className="run-button">
                <Play size={14} />
                Test Contract
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExamplesList;