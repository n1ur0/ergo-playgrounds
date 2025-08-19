import React, { useState } from 'react';
import { 
  Lightbulb, 
  BookOpen, 
  RotateCcw, 
  Sparkles, 
  Zap, 
  Brain,
  Code,
  Lock,
  Coins,
  FileText,
  Layers
} from 'lucide-react';

interface ConceptCardProps {
  /**
   * The name/title of the concept
   */
  conceptName: string;
  
  /**
   * Simple, easy-to-understand definition for teenagers
   */
  simpleDefinition: string;
  
  /**
   * Real-world analogy to make the concept relatable
   */
  analogy: string;
  
  /**
   * More detailed technical definition for deeper understanding
   */
  technicalDefinition: string;
  
  /**
   * Emoji or icon identifier for visual appeal
   */
  icon?: string;
  
  /**
   * Category of the concept (blockchain, ergoscript, crypto, etc.)
   */
  category?: 'blockchain' | 'ergoscript' | 'crypto' | 'smart-contracts' | 'tokens' | 'general';
  
  /**
   * Optional additional examples or use cases
   */
  examples?: string[];
  
  /**
   * Difficulty level indicator
   */
  difficulty?: 'starter' | 'beginner' | 'intermediate' | 'advanced';
  
  /**
   * Custom styling className
   */
  className?: string;
  
  /**
   * Callback when card is interacted with
   */
  onInteraction?: (conceptName: string, isFlipped: boolean) => void;
}

const ConceptCard: React.FC<ConceptCardProps> = ({
  conceptName,
  simpleDefinition,
  analogy,
  technicalDefinition,
  icon,
  category = 'general',
  examples = [],
  difficulty = 'beginner',
  className = '',
  onInteraction
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleFlip = () => {
    const newFlippedState = !isFlipped;
    setIsFlipped(newFlippedState);
    onInteraction?.(conceptName, newFlippedState);
  };

  const getCategoryColor = (cat: string) => {
    const colors = {
      'blockchain': '#64b5f6',
      'ergoscript': '#4caf50',
      'crypto': '#ff9800',
      'smart-contracts': '#9c27b0',
      'tokens': '#ffc107',
      'general': '#42a5f5'
    };
    return colors[cat as keyof typeof colors] || colors.general;
  };

  const getCategoryIcon = (cat: string) => {
    const icons = {
      'blockchain': <Layers size={16} />,
      'ergoscript': <Code size={16} />,
      'crypto': <Lock size={16} />,
      'smart-contracts': <FileText size={16} />,
      'tokens': <Coins size={16} />,
      'general': <Brain size={16} />
    };
    return icons[cat as keyof typeof icons] || icons.general;
  };

  const getDifficultyStars = (diff: string) => {
    const levels = { 'starter': 1, 'beginner': 2, 'intermediate': 3, 'advanced': 4 };
    return levels[diff as keyof typeof levels] || 2;
  };

  return (
    <div 
      className={`concept-card-container ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`concept-card ${isFlipped ? 'flipped' : ''}`}>
        {/* Front of Card */}
        <div className="concept-card-front">
          <div className="card-header">
            <div className="concept-icon">
              {icon && <span className="emoji-icon">{icon}</span>}
              {!icon && getCategoryIcon(category)}
            </div>
            <div className="category-badge" style={{ backgroundColor: getCategoryColor(category) }}>
              {getCategoryIcon(category)}
              <span>{category.replace('-', ' ')}</span>
            </div>
          </div>

          <div className="card-content">
            <h3 className="concept-title">{conceptName}</h3>
            
            <div className="difficulty-indicator">
              {Array.from({ length: 4 }, (_, i) => (
                <div 
                  key={i} 
                  className={`difficulty-star ${i < getDifficultyStars(difficulty) ? 'filled' : ''}`}
                >
                  ★
                </div>
              ))}
              <span className="difficulty-label">{difficulty}</span>
            </div>

            <p className="simple-definition">{simpleDefinition}</p>

            <div className="analogy-section">
              <div className="analogy-header">
                <Lightbulb size={16} />
                <span>Think of it like...</span>
              </div>
              <p className="analogy-text">{analogy}</p>
            </div>
          </div>

          <div className="card-footer">
            <button className="flip-button" onClick={handleFlip}>
              <Sparkles size={16} />
              <span>Learn More</span>
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Animated background elements */}
          <div className="card-decoration">
            <div className="decoration-circle circle-1"></div>
            <div className="decoration-circle circle-2"></div>
            <div className="decoration-sparkle sparkle-1">✨</div>
            <div className="decoration-sparkle sparkle-2">⭐</div>
          </div>
        </div>

        {/* Back of Card */}
        <div className="concept-card-back">
          <div className="back-header">
            <button className="flip-back-button" onClick={handleFlip}>
              <RotateCcw size={16} />
              <span>Back to Simple</span>
            </button>
            <div className="tech-badge">
              <Zap size={14} />
              <span>Technical Details</span>
            </div>
          </div>

          <div className="back-content">
            <h3 className="tech-title">{conceptName}</h3>
            
            <div className="technical-section">
              <div className="section-header">
                <Brain size={16} />
                <span>Technical Definition</span>
              </div>
              <p className="technical-definition">{technicalDefinition}</p>
            </div>

            {examples.length > 0 && (
              <div className="examples-section">
                <div className="section-header">
                  <BookOpen size={16} />
                  <span>Examples & Use Cases</span>
                </div>
                <ul className="examples-list">
                  {examples.map((example, index) => (
                    <li key={index} className="example-item">
                      <div className="example-bullet">🎯</div>
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="key-takeaway">
              <div className="takeaway-icon">💡</div>
              <div className="takeaway-text">
                <strong>Key Takeaway:</strong> Understanding {conceptName.toLowerCase()} helps you build better smart contracts and navigate the blockchain world with confidence!
              </div>
            </div>
          </div>

          {/* Tech-themed background */}
          <div className="tech-decoration">
            <div className="tech-grid"></div>
            <div className="tech-dots">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className={`tech-dot dot-${i + 1}`}></div>
              ))}
            </div>
          </div>
        </div>

        {/* Hover glow effect */}
        {isHovered && (
          <div 
            className="card-glow" 
            style={{ 
              boxShadow: `0 0 30px ${getCategoryColor(category)}40` 
            }}
          ></div>
        )}
      </div>

    </div>
  );
};

export default ConceptCard;