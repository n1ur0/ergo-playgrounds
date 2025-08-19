import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Coins, 
  Database, 
  Shield, 
  Sparkles, 
  Eye,
  EyeOff,
  Zap,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

interface BoxToken {
  id: string;
  amount: string | number;
  name?: string;
}

interface InteractiveBoxProps {
  /**
   * Unique identifier for the box
   */
  id: string;
  
  /**
   * ERG value in nanoERGs
   */
  value: string | number;
  
  /**
   * ErgoScript protecting the box
   */
  script?: string;
  
  /**
   * Register data (R0-R9)
   */
  registers?: Record<string, string | number | Uint8Array>;
  
  /**
   * Tokens held in the box
   */
  tokens?: BoxToken[];
  
  /**
   * Box type for visual styling
   */
  type?: 'user' | 'contract' | 'system';
  
  /**
   * Current state of the box
   */
  state?: 'unspent' | 'spending' | 'spent';
  
  /**
   * Owner/party name for context
   */
  owner?: string;
  
  /**
   * Simple description for beginners
   */
  description?: string;
  
  /**
   * Creation height on blockchain
   */
  creationHeight?: number;
  
  /**
   * Whether to show detailed technical info by default
   */
  showTechnical?: boolean;
  
  /**
   * Callback when box is interacted with
   */
  onInteraction?: (boxId: string, action: 'explore' | 'spend' | 'lock') => void;
  
  /**
   * Custom styling
   */
  className?: string;
}

const InteractiveBox: React.FC<InteractiveBoxProps> = ({
  id,
  value,
  script,
  registers = {},
  tokens = [],
  type = 'user',
  state = 'unspent',
  owner,
  description,
  creationHeight,
  showTechnical = false,
  onInteraction,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showRegisters, setShowRegisters] = useState(false);
  const [technicalMode, setTechnicalMode] = useState(showTechnical);
  const [hoveredRegister, setHoveredRegister] = useState<string | null>(null);
  const [animationState, setAnimationState] = useState<'idle' | 'opening' | 'closing'>('idle');

  useEffect(() => {
    if (isOpen && animationState === 'idle') {
      setAnimationState('opening');
      const timer = setTimeout(() => setAnimationState('idle'), 600);
      return () => clearTimeout(timer);
    } else if (!isOpen && animationState === 'idle') {
      setAnimationState('closing');
      const timer = setTimeout(() => setAnimationState('idle'), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, animationState]);

  const formatValue = (val: string | number): string => {
    const numValue = typeof val === 'string' ? parseFloat(val.replace(/[^\d.]/g, '')) : val;
    if (isNaN(numValue)) return val.toString();
    return `${(numValue / 1000000000).toFixed(3)} ERG`;
  };

  const getBoxMetaphor = (boxType: string) => {
    const metaphors = {
      user: { icon: '🏦', name: 'Personal Safe', description: 'Like your personal bank safe box' },
      contract: { icon: '🏰', name: 'Smart Vault', description: 'Like a magical treasure chest with rules' },
      system: { icon: '🏛️', name: 'System Vault', description: 'Like the central bank vault' }
    };
    return metaphors[boxType as keyof typeof metaphors] || metaphors.user;
  };

  const getStateColor = (boxState: string) => {
    const colors = {
      unspent: '#4caf50',
      spending: '#ff9800', 
      spent: '#6b7280'
    };
    return colors[boxState as keyof typeof colors] || colors.unspent;
  };

  const getRegisterInfo = (registerKey: string) => {
    const registerInfo = {
      R0: { name: 'Script Hash', icon: '🔐', description: 'The lock code for this box', simple: 'The "password" protecting this box' },
      R1: { name: 'Tokens', icon: '🪙', description: 'Token data stored in box', simple: 'The treasure coins in this box' },
      R2: { name: 'Creation Height', icon: '📏', description: 'Block height when created', simple: 'When this box was created' },
      R3: { name: 'Creation Info', icon: '📋', description: 'Additional creation metadata', simple: 'Extra details about this box' },
      R4: { name: 'Custom Data 1', icon: '📦', description: 'First custom data slot', simple: 'Custom info slot #1' },
      R5: { name: 'Custom Data 2', icon: '📦', description: 'Second custom data slot', simple: 'Custom info slot #2' },
      R6: { name: 'Custom Data 3', icon: '📦', description: 'Third custom data slot', simple: 'Custom info slot #3' },
      R7: { name: 'Custom Data 4', icon: '📦', description: 'Fourth custom data slot', simple: 'Custom info slot #4' },
      R8: { name: 'Custom Data 5', icon: '📦', description: 'Fifth custom data slot', simple: 'Custom info slot #5' },
      R9: { name: 'Custom Data 6', icon: '📦', description: 'Sixth custom data slot', simple: 'Custom info slot #6' }
    };
    return registerInfo[registerKey as keyof typeof registerInfo] || {
      name: 'Unknown Register',
      icon: '❓',
      description: 'Unknown register data',
      simple: 'Mystery data'
    };
  };

  const handleBoxClick = () => {
    setIsOpen(!isOpen);
    onInteraction?.(id, 'explore');
  };

  const metaphor = getBoxMetaphor(type);
  const stateColor = getStateColor(state);

  return (
    <div className={`interactive-box-container ${className}`}>
      <div 
        className={`interactive-box ${type} ${state} ${isOpen ? 'opened' : ''} ${animationState}`}
        onClick={handleBoxClick}
        style={{ 
          borderColor: stateColor,
          boxShadow: isOpen ? `0 0 30px ${stateColor}30` : `0 8px 24px rgba(0,0,0,0.2)`
        }}
      >
        {/* Box Lid/Top */}
        <div className="box-lid" style={{ background: `linear-gradient(135deg, ${stateColor}20, ${stateColor}40)` }}>
          <div className="lid-decoration">
            <div className="metaphor-icon">{metaphor.icon}</div>
            <div className="box-info">
              <div className="box-type">{metaphor.name}</div>
              <div className="box-id-display">{id.replace(/Box$/, '')}</div>
            </div>
            <div className="state-indicator">
              <div 
                className="state-light" 
                style={{ backgroundColor: stateColor }}
                title={`Box is ${state}`}
              />
              <span className="state-text">{state.toUpperCase()}</span>
            </div>
          </div>
          
          <div className="lid-handle" style={{ background: stateColor }}>
            <div className="handle-sparkle">✨</div>
          </div>
        </div>

        {/* Box Body */}
        <div className="box-body">
          {/* Quick Info Bar */}
          <div className="quick-info">
            <div className="value-display">
              <Coins size={16} />
              <span className="value-amount">{formatValue(value)}</span>
            </div>
            
            {tokens.length > 0 && (
              <div className="token-count">
                <Sparkles size={14} />
                <span>{tokens.length} token{tokens.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            
            {Object.keys(registers).length > 0 && (
              <div className="register-count">
                <Database size={14} />
                <span>{Object.keys(registers).length} data slot{Object.keys(registers).length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Simple Explanation */}
          {!isOpen && (
            <div className="simple-explanation">
              <div className="explanation-header">
                <Info size={16} />
                <span>What's this?</span>
              </div>
              <p>{description || metaphor.description}</p>
              {owner && (
                <div className="owner-info">
                  <span>👤 Owned by: <strong>{owner}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Expanded Content */}
          {isOpen && (
            <div className="expanded-content">
              {/* Mode Toggle */}
              <div className="mode-toggle">
                <button 
                  className={`mode-button ${!technicalMode ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setTechnicalMode(false); }}
                >
                  <Eye size={14} />
                  Simple
                </button>
                <button 
                  className={`mode-button ${technicalMode ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setTechnicalMode(true); }}
                >
                  <EyeOff size={14} />
                  Technical
                </button>
              </div>

              {/* Content Tabs */}
              <div className="content-sections">
                {/* ERG Value Section */}
                <div className="content-section value-section">
                  <div className="section-header">
                    <div className="section-icon">💰</div>
                    <div className="section-info">
                      <h4>ERG Value</h4>
                      <p className="section-subtitle">
                        {technicalMode ? 'nanoERG precision value' : 'The money in this box'}
                      </p>
                    </div>
                  </div>
                  <div className="section-content">
                    <div className="value-breakdown">
                      <div className="main-value">{formatValue(value)}</div>
                      {technicalMode && (
                        <div className="technical-value">
                          {typeof value === 'number' ? value.toLocaleString() : value} nanoERG
                        </div>
                      )}
                    </div>
                    {!technicalMode && (
                      <div className="value-analogy">
                        <Sparkles size={14} />
                        <span>Think of it like coins in your piggy bank!</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tokens Section */}
                {tokens.length > 0 && (
                  <div className="content-section tokens-section">
                    <div className="section-header">
                      <div className="section-icon">🏆</div>
                      <div className="section-info">
                        <h4>Tokens</h4>
                        <p className="section-subtitle">
                          {technicalMode ? 'Token assets held in box' : 'Special treasures stored here'}
                        </p>
                      </div>
                    </div>
                    <div className="section-content">
                      <div className="tokens-grid">
                        {tokens.map((token, idx) => (
                          <div key={`${token.id}-${idx}`} className="token-item">
                            <div className="token-icon">🎗️</div>
                            <div className="token-details">
                              <div className="token-name">
                                {token.name || `Token ${idx + 1}`}
                              </div>
                              <div className="token-amount">
                                {typeof token.amount === 'number' 
                                  ? token.amount.toLocaleString() 
                                  : token.amount}
                              </div>
                              {technicalMode && (
                                <div className="token-id">
                                  ID: {token.id.slice(0, 8)}...
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Script Section */}
                {script && (
                  <div className="content-section script-section">
                    <div className="section-header">
                      <div className="section-icon">🔐</div>
                      <div className="section-info">
                        <h4>Protection Script</h4>
                        <p className="section-subtitle">
                          {technicalMode ? 'ErgoScript contract code' : 'The magic spell protecting this box'}
                        </p>
                      </div>
                    </div>
                    <div className="section-content">
                      {technicalMode ? (
                        <div className="script-code">
                          <code>{script}</code>
                        </div>
                      ) : (
                        <div className="script-analogy">
                          <Shield size={20} />
                          <div>
                            <p>This box has a magic spell that decides who can open it!</p>
                            <p>Only someone who can solve the puzzle can take the treasure.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Registers Section */}
                {Object.keys(registers).length > 0 && (
                  <div className="content-section registers-section">
                    <div className="section-header">
                      <div className="section-icon">📋</div>
                      <div className="section-info">
                        <h4>Data Compartments</h4>
                        <p className="section-subtitle">
                          {technicalMode ? 'Box register data' : 'Secret compartments with extra info'}
                        </p>
                      </div>
                      <button 
                        className="expand-button"
                        onClick={(e) => { e.stopPropagation(); setShowRegisters(!showRegisters); }}
                      >
                        {showRegisters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                    
                    {showRegisters && (
                      <div className="section-content">
                        <div className="registers-grid">
                          {Object.entries(registers).map(([regKey, regValue]) => {
                            const regInfo = getRegisterInfo(regKey);
                            return (
                              <div 
                                key={regKey}
                                className="register-item"
                                onMouseEnter={() => setHoveredRegister(regKey)}
                                onMouseLeave={() => setHoveredRegister(null)}
                              >
                                <div className="register-header">
                                  <div className="register-icon">{regInfo.icon}</div>
                                  <div className="register-name">
                                    {technicalMode ? regKey : regInfo.simple}
                                  </div>
                                </div>
                                <div className="register-value">
                                  {technicalMode 
                                    ? JSON.stringify(regValue, null, 2)
                                    : String(regValue).slice(0, 50) + (String(regValue).length > 50 ? '...' : '')
                                  }
                                </div>
                                {hoveredRegister === regKey && !technicalMode && (
                                  <div className="register-tooltip">
                                    <div className="tooltip-content">
                                      <strong>{regInfo.name}</strong>
                                      <p>{regInfo.description}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Additional Info */}
                <div className="content-section info-section">
                  <div className="section-header">
                    <div className="section-icon">ℹ️</div>
                    <div className="section-info">
                      <h4>Box Details</h4>
                      <p className="section-subtitle">Additional information about this box</p>
                    </div>
                  </div>
                  <div className="section-content">
                    <div className="info-grid">
                      {owner && (
                        <div className="info-item">
                          <span className="info-label">Owner:</span>
                          <span className="info-value">{owner}</span>
                        </div>
                      )}
                      {creationHeight && (
                        <div className="info-item">
                          <span className="info-label">
                            {technicalMode ? 'Creation Height:' : 'Born at Block:'}
                          </span>
                          <span className="info-value">{creationHeight.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="info-item">
                        <span className="info-label">Status:</span>
                        <span className="info-value" style={{ color: stateColor }}>
                          {state.charAt(0).toUpperCase() + state.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="box-actions">
                {state === 'unspent' && (
                  <>
                    <button 
                      className="action-button primary"
                      onClick={(e) => { e.stopPropagation(); onInteraction?.(id, 'spend'); }}
                    >
                      <Zap size={16} />
                      Use This Box
                    </button>
                    <button 
                      className="action-button secondary"
                      onClick={(e) => { e.stopPropagation(); onInteraction?.(id, 'lock'); }}
                    >
                      <Lock size={16} />
                      Add Protection
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Floating Decorations */}
        <div className="box-decorations">
          <div className="decoration sparkle-1">✨</div>
          <div className="decoration sparkle-2">⭐</div>
          <div className="decoration sparkle-3">💫</div>
        </div>

        {/* Click Hint */}
        {!isOpen && (
          <div className="click-hint">
            <div className="hint-text">Click to explore! 👆</div>
            <div className="hint-arrow">↗️</div>
          </div>
        )}
      </div>

    </div>
  );
};

export default InteractiveBox;