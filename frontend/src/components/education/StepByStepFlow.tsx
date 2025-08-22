import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  ChevronRight,
  ChevronLeft,
  Zap,
  CheckCircle,
  Circle,
  Lightbulb,
  BookOpen,
  Target,
  Sparkles,
  ArrowRight,
  Coins,
  Lock,
  Unlock,
  Send,
  RefreshCw,
  Shield,
  Clock,
  Users,
  Database
} from 'lucide-react';

/**
 * Represents a single step in the transaction flow
 */
export interface FlowStep {
  /** Unique identifier for the step */
  id: string;
  
  /** Title of the step */
  title: string;
  
  /** Simple explanation suitable for teenagers */
  simpleDescription: string;
  
  /** More detailed technical explanation */
  technicalDescription?: string;
  
  /** Visual metaphor to help understand the concept */
  visualMetaphor: string;
  
  /** Icon identifier for the step */
  icon: 'coins' | 'lock' | 'unlock' | 'send' | 'refresh' | 'shield' | 'clock' | 'users' | 'database' | 'check';
  
  /** Color theme for this step */
  color: string;
  
  /** Duration in milliseconds for step animation */
  duration?: number;
  
  /** Interactive elements or actions for this step */
  interactiveElements?: Array<{
    type: 'button' | 'progress' | 'counter';
    label: string;
    action?: () => void;
  }>;
  
  /** Code snippet or example related to this step */
  codeSnippet?: string;
  
  /** Tips or warnings for this step */
  tips?: string[];
}

/**
 * Props for the StepByStepFlow component
 */
export interface StepByStepFlowProps {
  /** Array of steps to display in the flow */
  steps: FlowStep[];
  
  /** Title for the entire flow */
  title: string;
  
  /** Description of what this flow demonstrates */
  description: string;
  
  /** Whether to show technical details by default */
  showTechnicalMode?: boolean;
  
  /** Whether to auto-play the flow */
  autoPlay?: boolean;
  
  /** Custom styling className */
  className?: string;
  
  /** Callback when a step is completed */
  onStepComplete?: (stepId: string, stepIndex: number) => void;
  
  /** Callback when the entire flow is completed */
  onFlowComplete?: () => void;
  
  /** Whether to loop the animation after completion */
  loop?: boolean;
}

/**
 * StepByStepFlow Component - Animated transaction process visualization for teenagers
 */
const StepByStepFlow: React.FC<StepByStepFlowProps> = ({
  steps,
  title,
  description,
  showTechnicalMode = false,
  autoPlay = false,
  className = '',
  onStepComplete,
  onFlowComplete,
  loop = false
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showTechnical, setShowTechnical] = useState(showTechnicalMode);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentStep = steps[currentStepIndex];

  // Icon mapping for visual consistency
  const getIcon = (iconType: FlowStep['icon']) => {
    const iconMap = {
      'coins': <Coins size={24} />,
      'lock': <Lock size={24} />,
      'unlock': <Unlock size={24} />,
      'send': <Send size={24} />,
      'refresh': <RefreshCw size={24} />,
      'shield': <Shield size={24} />,
      'clock': <Clock size={24} />,
      'users': <Users size={24} />,
      'database': <Database size={24} />,
      'check': <CheckCircle size={24} />
    };
    return iconMap[iconType] || <Circle size={24} />;
  };

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && !isAnimating) {
      intervalRef.current = setInterval(() => {
        setCurrentStepIndex(prevIndex => {
          const nextIndex = prevIndex + 1;
          if (nextIndex >= steps.length) {
            if (loop) {
              setCompletedSteps(new Set());
              return 0;
            } else {
              setIsPlaying(false);
              onFlowComplete?.();
              return prevIndex;
            }
          }
          return nextIndex;
        });
      }, currentStep?.duration || 3000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, isAnimating, currentStep?.duration, steps.length, loop, onFlowComplete]);

  // Handle step completion
  useEffect(() => {
    if (currentStepIndex > 0 || completedSteps.has(0)) {
      const prevStepIndex = currentStepIndex === 0 ? steps.length - 1 : currentStepIndex - 1;
      if (!completedSteps.has(prevStepIndex)) {
        setCompletedSteps(prev => new Set([...prev, prevStepIndex]));
        onStepComplete?.(steps[prevStepIndex].id, prevStepIndex);
      }
    }
  }, [currentStepIndex, steps, completedSteps, onStepComplete]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else if (loop) {
      setCurrentStepIndex(0);
      setCompletedSteps(new Set());
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleStepClick = (index: number) => {
    setCurrentStepIndex(index);
    setIsPlaying(false);
  };

  const handlePlayStepAnimation = async () => {
    setIsAnimating(true);
    // Simulate step animation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsAnimating(false);
  };

  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className={`step-by-step-flow ${className}`}>
      {/* Header */}
      <div className="flow-header">
        <div className="flow-title-section">
          <div className="title-with-icon">
            <div className="flow-icon">
              <Zap size={32} />
            </div>
            <div>
              <h2 className="flow-title">{title}</h2>
              <p className="flow-description">{description}</p>
            </div>
          </div>
          
          <div className="flow-controls">
            <div className="mode-toggle">
              <button 
                className={`mode-button ${!showTechnical ? 'active' : ''}`}
                onClick={() => setShowTechnical(false)}
              >
                <Lightbulb size={16} />
                Simple
              </button>
              <button 
                className={`mode-button ${showTechnical ? 'active' : ''}`}
                onClick={() => setShowTechnical(true)}
              >
                <BookOpen size={16} />
                Technical
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-section">
          <div className="progress-info">
            <span className="step-counter">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            <div className="playback-controls">
              <button 
                className="control-button" 
                onClick={handlePrevious}
                disabled={currentStepIndex === 0 && !loop}
              >
                <SkipBack size={16} />
              </button>
              <button 
                className="control-button play-pause" 
                onClick={handlePlayPause}
                disabled={isAnimating}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button 
                className="control-button" 
                onClick={handleNext}
                disabled={currentStepIndex === steps.length - 1 && !loop}
              >
                <SkipForward size={16} />
              </button>
            </div>
          </div>
          <div className="progress-bar">
            <motion.div 
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>

      <div className="flow-content">
        {/* Step Timeline */}
        <div className="step-timeline">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.has(index);
            const isCurrent = index === currentStepIndex;
            const isUpcoming = index > currentStepIndex;

            return (
              <div key={step.id} className="timeline-container">
                <motion.div
                  className={`timeline-step ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''} ${isUpcoming ? 'upcoming' : ''}`}
                  onClick={() => handleStepClick(index)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="step-indicator">
                    <div className="step-icon" style={{ color: step.color }}>
                      {isCompleted ? <CheckCircle size={20} /> : getIcon(step.icon)}
                    </div>
                    <div className="step-number">{index + 1}</div>
                  </div>
                  
                  <div className="step-info">
                    <h4 className="step-title">{step.title}</h4>
                    <div className="step-status">
                      {isCompleted && <span className="status-badge completed">✓ Done</span>}
                      {isCurrent && <span className="status-badge current">▶ Active</span>}
                      {isUpcoming && <span className="status-badge upcoming">⏳ Pending</span>}
                    </div>
                  </div>
                </motion.div>

                {index < steps.length - 1 && (
                  <div className="timeline-connector">
                    <motion.div 
                      className="connector-line"
                      initial={{ scaleX: 0 }}
                      animate={{ 
                        scaleX: isCompleted ? 1 : 0,
                        backgroundColor: step.color 
                      }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    />
                    <div className="connector-arrow">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Current Step Detail */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            className="current-step-detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div className="step-header">
              <div className="step-main-icon" style={{ backgroundColor: `${currentStep.color}20`, border: `2px solid ${currentStep.color}` }}>
                {getIcon(currentStep.icon)}
              </div>
              <div className="step-header-text">
                <h3 className="step-main-title">{currentStep.title}</h3>
                <div className="step-animation-control">
                  <button 
                    className="animate-button"
                    onClick={handlePlayStepAnimation}
                    disabled={isAnimating}
                  >
                    <Play size={16} />
                    {isAnimating ? 'Playing Animation...' : 'Play Animation'}
                  </button>
                </div>
              </div>
            </div>

            <div className="step-content">
              {/* Visual Metaphor */}
              <div className="visual-metaphor">
                <div className="metaphor-header">
                  <Target size={16} />
                  <span>Think of it like...</span>
                </div>
                <p className="metaphor-text">{currentStep.visualMetaphor}</p>
              </div>

              {/* Description */}
              <div className="step-description">
                <p className="main-description">
                  {showTechnical ? currentStep.technicalDescription || currentStep.simpleDescription : currentStep.simpleDescription}
                </p>
              </div>

              {/* Interactive Animation Area */}
              <div className="animation-area">
                <motion.div 
                  className="animation-container"
                  style={{ borderColor: currentStep.color }}
                >
                  <div className="animation-stage">
                    {isAnimating && (
                      <motion.div
                        className="animation-element"
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 100, opacity: [0, 1, 1, 0] }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                        style={{ color: currentStep.color }}
                      >
                        {getIcon(currentStep.icon)}
                      </motion.div>
                    )}
                    
                    <div className="animation-placeholder" style={{ color: currentStep.color }}>
                      {getIcon(currentStep.icon)}
                      <span>Click "Play Animation" to see this step in action!</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Code Snippet (if available) */}
              {currentStep.codeSnippet && showTechnical && (
                <div className="code-section">
                  <div className="code-header">
                    <span>Code Example</span>
                  </div>
                  <pre className="code-snippet">
                    <code>{currentStep.codeSnippet}</code>
                  </pre>
                </div>
              )}

              {/* Tips and Warnings */}
              {currentStep.tips && currentStep.tips.length > 0 && (
                <div className="tips-section">
                  <div className="tips-header">
                    <Sparkles size={16} />
                    <span>Pro Tips</span>
                  </div>
                  <ul className="tips-list">
                    {currentStep.tips.map((tip, index) => (
                      <li key={index} className="tip-item">
                        <span className="tip-bullet">💡</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Interactive Elements */}
              {currentStep.interactiveElements && currentStep.interactiveElements.length > 0 && (
                <div className="interactive-section">
                  <div className="interactive-header">
                    <span>Try It Yourself</span>
                  </div>
                  <div className="interactive-controls">
                    {currentStep.interactiveElements.map((element, index) => (
                      <button 
                        key={index}
                        className="interactive-button"
                        onClick={element.action}
                        style={{ borderColor: currentStep.color, color: currentStep.color }}
                      >
                        {element.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="step-navigation">
              <button 
                className="nav-button prev" 
                onClick={handlePrevious}
                disabled={currentStepIndex === 0 && !loop}
              >
                <ChevronLeft size={16} />
                Previous Step
              </button>
              
              <div className="nav-info">
                <span>{currentStepIndex + 1} / {steps.length}</span>
              </div>
              
              <button 
                className="nav-button next" 
                onClick={handleNext}
                disabled={currentStepIndex === steps.length - 1 && !loop}
                style={{ backgroundColor: currentStep.color }}
              >
                Next Step
                <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <style>{`
        .step-by-step-flow {
          background: linear-gradient(135deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.1));
          border-radius: 20px;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .step-by-step-flow::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 20% 80%, rgba(100, 181, 246, 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(76, 175, 80, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        /* Header Styles */
        .flow-header {
          margin-bottom: 2rem;
          position: relative;
          z-index: 2;
        }

        .flow-title-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .title-with-icon {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .flow-icon {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #64b5f6, #42a5f5);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 16px rgba(100, 181, 246, 0.3);
        }

        .flow-title {
          font-size: 2rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          background: linear-gradient(135deg, #64b5f6, #42a5f5);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .flow-description {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
          line-height: 1.5;
        }

        .flow-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .mode-toggle {
          display: flex;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 0.25rem;
        }

        .mode-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.2s ease;
          border-radius: 6px;
          font-weight: 500;
        }

        .mode-button.active {
          background: linear-gradient(135deg, #64b5f6, #42a5f5);
          color: white;
          box-shadow: 0 2px 8px rgba(100, 181, 246, 0.3);
        }

        .mode-button:hover:not(.active) {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        /* Progress Section */
        .progress-section {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .step-counter {
          font-weight: 600;
          color: #64b5f6;
          font-size: 1rem;
        }

        .playback-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .control-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: rgba(100, 181, 246, 0.2);
          border: 1px solid rgba(100, 181, 246, 0.3);
          border-radius: 8px;
          color: #64b5f6;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .control-button:hover:not(:disabled) {
          background: rgba(100, 181, 246, 0.3);
          transform: translateY(-1px);
        }

        .control-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .control-button.play-pause {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #4caf50, #66bb6a);
          border-color: #4caf50;
          color: white;
        }

        .control-button.play-pause:hover:not(:disabled) {
          background: linear-gradient(135deg, #388e3c, #4caf50);
        }

        .progress-bar {
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #64b5f6, #42a5f5, #1e88e5);
          border-radius: 3px;
          box-shadow: 0 0 10px rgba(100, 181, 246, 0.5);
        }

        /* Content Area */
        .flow-content {
          position: relative;
          z-index: 2;
        }

        /* Timeline Styles */
        .step-timeline {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 2rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .timeline-container {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .timeline-step {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          min-width: 120px;
        }

        .timeline-step.current {
          background: rgba(100, 181, 246, 0.15);
          border-color: #64b5f6;
          box-shadow: 0 4px 16px rgba(100, 181, 246, 0.3);
        }

        .timeline-step.completed {
          background: rgba(76, 175, 80, 0.15);
          border-color: #4caf50;
        }

        .timeline-step.upcoming {
          opacity: 0.6;
        }

        .timeline-step:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.1);
        }

        .step-indicator {
          position: relative;
          flex-shrink: 0;
        }

        .step-icon {
          margin-bottom: 0.25rem;
        }

        .step-number {
          position: absolute;
          bottom: -8px;
          right: -8px;
          width: 20px;
          height: 20px;
          background: #64b5f6;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .timeline-step.completed .step-number {
          background: #4caf50;
        }

        .step-info {
          flex: 1;
        }

        .step-title {
          font-size: 0.9rem;
          font-weight: 600;
          margin: 0 0 0.25rem 0;
          color: white;
        }

        .step-status {
          font-size: 0.75rem;
        }

        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-badge.completed {
          background: rgba(76, 175, 80, 0.2);
          color: #4caf50;
        }

        .status-badge.current {
          background: rgba(100, 181, 246, 0.2);
          color: #64b5f6;
        }

        .status-badge.upcoming {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
        }

        .timeline-connector {
          display: flex;
          align-items: center;
          margin: 0 0.5rem;
          position: relative;
        }

        .connector-line {
          width: 30px;
          height: 2px;
          background: rgba(255, 255, 255, 0.2);
          transform-origin: left;
        }

        .connector-arrow {
          position: absolute;
          right: -8px;
          color: rgba(255, 255, 255, 0.4);
        }

        /* Current Step Detail */
        .current-step-detail {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .step-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .step-main-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .step-header-text {
          flex: 1;
        }

        .step-main-title {
          font-size: 1.8rem;
          font-weight: 700;
          margin: 0 0 1rem 0;
          color: white;
        }

        .step-animation-control {
          display: flex;
          gap: 0.75rem;
        }

        .animate-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #ff9800, #f57c00);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .animate-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #f57c00, #ef6c00);
          transform: translateY(-2px);
        }

        .animate-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Step Content */
        .step-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .visual-metaphor {
          background: linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 193, 7, 0.05));
          border-radius: 12px;
          padding: 1rem;
          border-left: 4px solid #ffc107;
        }

        .metaphor-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #ffc107;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .metaphor-text {
          color: rgba(255, 255, 255, 0.9);
          font-style: italic;
          margin: 0;
          line-height: 1.5;
          font-size: 1.1rem;
        }

        .step-description {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .main-description {
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          margin: 0;
          font-size: 1.1rem;
        }

        /* Animation Area */
        .animation-area {
          margin: 1rem 0;
        }

        .animation-container {
          background: rgba(0, 0, 0, 0.3);
          border: 2px dashed rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 2rem;
          position: relative;
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .animation-stage {
          width: 100%;
          height: 60px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .animation-element {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          backdrop-filter: blur(10px);
        }

        .animation-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.4);
          text-align: center;
        }

        .animation-placeholder span {
          font-size: 0.9rem;
          font-style: italic;
        }

        /* Code Section */
        .code-section {
          background: rgba(0, 0, 0, 0.4);
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .code-header {
          background: rgba(100, 181, 246, 0.2);
          padding: 0.75rem 1rem;
          border-bottom: 1px solid rgba(100, 181, 246, 0.3);
          color: #64b5f6;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .code-snippet {
          padding: 1rem;
          margin: 0;
          background: none;
          color: rgba(255, 255, 255, 0.9);
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.9rem;
          line-height: 1.4;
          overflow-x: auto;
        }

        /* Tips Section */
        .tips-section {
          background: rgba(156, 39, 176, 0.1);
          border-radius: 12px;
          padding: 1rem;
          border-left: 4px solid #9c27b0;
        }

        .tips-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #9c27b0;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .tips-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .tip-item {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.5;
        }

        .tip-bullet {
          flex-shrink: 0;
        }

        /* Interactive Section */
        .interactive-section {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .interactive-header {
          font-weight: 600;
          color: #64b5f6;
          margin-bottom: 0.75rem;
        }

        .interactive-controls {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .interactive-button {
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .interactive-button:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        /* Step Navigation */
        .step-navigation {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          margin-top: 1rem;
        }

        .nav-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .nav-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
          color: white;
        }

        .nav-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }

        .nav-button.next {
          background: #64b5f6;
          border-color: #64b5f6;
          color: white;
        }

        .nav-button.next:hover:not(:disabled) {
          background: #42a5f5;
        }

        .nav-info {
          font-weight: 600;
          color: #64b5f6;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .step-timeline {
            overflow-x: auto;
            padding-bottom: 1rem;
            scrollbar-width: thin;
          }
          
          .timeline-container {
            flex-shrink: 0;
          }
          
          .timeline-step {
            min-width: 100px;
          }
        }

        @media (max-width: 768px) {
          .step-by-step-flow {
            padding: 1rem;
          }
          
          .flow-title-section {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .flow-title {
            font-size: 1.5rem;
          }
          
          .step-header {
            flex-direction: column;
            text-align: center;
          }
          
          .step-main-icon {
            width: 60px;
            height: 60px;
          }
          
          .step-main-title {
            font-size: 1.4rem;
          }
          
          .current-step-detail {
            padding: 1rem;
          }
          
          .step-navigation {
            flex-direction: column;
            gap: 1rem;
          }
          
          .nav-button {
            width: 100%;
            justify-content: center;
          }
          
          .timeline-step {
            flex-direction: column;
            text-align: center;
            min-width: 80px;
            padding: 0.5rem;
          }
          
          .step-info {
            margin-top: 0.5rem;
          }
          
          .step-title {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
};

export default StepByStepFlow;