import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  RotateCcw, 
  Zap,
  Star,
  TrendingUp,
  HelpCircle,
  Brain,
  Target,
  Award,
  Sparkles
} from 'lucide-react';

// TypeScript interfaces
export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestionProps {
  /**
   * The main question text to display
   */
  question: string;
  
  /**
   * Array of 2-4 multiple choice options
   */
  options: QuizOption[];
  
  /**
   * Detailed explanation for the correct answer
   */
  correctExplanation: string;
  
  /**
   * Explanation for why other answers are incorrect
   */
  incorrectExplanation?: string;
  
  /**
   * Optional hint to help struggling students
   */
  hint?: string;
  
  /**
   * Difficulty level affects styling and scoring
   */
  difficulty?: 'starter' | 'beginner' | 'intermediate' | 'advanced';
  
  /**
   * Points awarded for correct answer (varies by difficulty)
   */
  points?: number;
  
  /**
   * Category/topic of the question
   */
  category?: 'blockchain' | 'ergoscript' | 'crypto' | 'smart-contracts' | 'tokens' | 'general';
  
  /**
   * Optional emoji to represent the question topic
   */
  emoji?: string;
  
  /**
   * Whether to show encouraging messages
   */
  showEncouragement?: boolean;
  
  /**
   * Callback when question is answered
   */
  onAnswer?: (isCorrect: boolean, selectedOptionId: string, points: number) => void;
  
  /**
   * Callback when hint is requested
   */
  onHintRequested?: () => void;
  
  /**
   * Whether to auto-advance to next question
   */
  autoAdvance?: boolean;
  
  /**
   * Custom CSS class
   */
  className?: string;
}

// Encouraging messages for different scenarios
const ENCOURAGEMENT_MESSAGES = {
  correct: {
    starter: ["Amazing work! 🌟", "You're a natural! ⭐", "Perfect! Keep it up! 🎉"],
    beginner: ["Excellent choice! 🚀", "You're getting it! 💪", "Spot on! 🎯"],
    intermediate: ["Great thinking! 🧠", "Well done! 🔥", "Impressive! 💎"],
    advanced: ["Outstanding! 🏆", "Brilliant! 💫", "Master level! 👑"]
  },
  incorrect: {
    starter: ["No worries, keep learning! 💙", "Try again, you've got this! 💪", "Learning is a journey! 🌱"],
    beginner: ["Close! Let's review this together 🤝", "Good effort! Let's learn more 📚", "Almost there! 🌈"],
    intermediate: ["Tricky one! Let's break it down 🔍", "Good attempt! Time to level up 📈", "Learning from mistakes is key! 🗝️"],
    advanced: ["Complex topic! Great for learning 🎓", "Challenge accepted! Let's dive deeper 🌊", "Even experts learn daily! 🧪"]
  }
};

// Points based on difficulty
const DEFAULT_POINTS = {
  starter: 5,
  beginner: 10,
  intermediate: 15,
  advanced: 25
};

// Colors for different categories
const CATEGORY_COLORS = {
  'blockchain': '#64b5f6',
  'ergoscript': '#4caf50',
  'crypto': '#ff9800',
  'smart-contracts': '#9c27b0',
  'tokens': '#ffc107',
  'general': '#42a5f5'
};

const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  options,
  correctExplanation,
  incorrectExplanation,
  hint,
  difficulty = 'beginner',
  points,
  category = 'general',
  emoji,
  showEncouragement = true,
  onAnswer,
  onHintRequested,
  autoAdvance = false,
  className = ''
}) => {
  // State management
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [encouragementMessage, setEncouragementMessage] = useState<string>('');
  const [currentScore, setCurrentScore] = useState(0);

  // Get colors and points
  const categoryColor = CATEGORY_COLORS[category];
  const questionPoints = points || DEFAULT_POINTS[difficulty];

  // Animation variants
  const questionVariants = {
    initial: { opacity: 0, y: 30, scale: 0.95 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" }
    },
    exit: { opacity: 0, y: -30, scale: 0.95 }
  };

  const optionVariants = {
    initial: { opacity: 0, x: -20 },
    animate: (index: number) => ({ 
      opacity: 1, 
      x: 0,
      transition: { 
        duration: 0.4, 
        delay: index * 0.1,
        ease: "easeOut" 
      }
    }),
    hover: { 
      scale: 1.02, 
      transition: { duration: 0.2 }
    },
    tap: { scale: 0.98 },
    correct: {
      backgroundColor: 'rgba(76, 175, 80, 0.2)',
      borderColor: '#4caf50',
      scale: 1.05,
      transition: { duration: 0.3 }
    },
    incorrect: {
      backgroundColor: 'rgba(244, 67, 54, 0.2)',
      borderColor: '#f44336',
      scale: 0.98,
      transition: { duration: 0.3 }
    }
  };

  const successAnimationVariants = {
    initial: { scale: 0, rotate: -180 },
    animate: { 
      scale: [0, 1.2, 1], 
      rotate: 0,
      transition: { 
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const sparkleVariants = {
    animate: {
      scale: [1, 1.5, 1],
      rotate: [0, 180, 360],
      opacity: [0.3, 1, 0.3],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  // Handle option selection
  const handleOptionClick = (optionId: string) => {
    if (isAnswered) return;

    setSelectedOption(optionId);
    setIsAnswered(true);
    
    const selectedOptionData = options.find(opt => opt.id === optionId);
    const isCorrect = selectedOptionData?.isCorrect || false;
    
    // Calculate score
    const earnedPoints = isCorrect ? questionPoints : 0;
    setCurrentScore(earnedPoints);
    
    // Show encouragement message
    if (showEncouragement) {
      const messages = isCorrect 
        ? ENCOURAGEMENT_MESSAGES.correct[difficulty]
        : ENCOURAGEMENT_MESSAGES.incorrect[difficulty];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      setEncouragementMessage(randomMessage);
    }
    
    // Show explanation after a brief delay
    setTimeout(() => {
      setShowExplanation(true);
    }, 1000);
    
    // Call callback
    onAnswer?.(isCorrect, optionId, earnedPoints);
    
    // Auto-advance if enabled
    if (autoAdvance) {
      setTimeout(() => {
        resetQuestion();
      }, 3000);
    }
  };

  // Handle hint request
  const handleHintClick = () => {
    setShowHint(true);
    onHintRequested?.();
  };

  // Reset question state
  const resetQuestion = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    setShowHint(false);
    setShowExplanation(false);
    setEncouragementMessage('');
    setCurrentScore(0);
  };

  // Get difficulty stars
  const getDifficultyStars = () => {
    const levels = { 'starter': 1, 'beginner': 2, 'intermediate': 3, 'advanced': 4 };
    return levels[difficulty];
  };

  // Get option status for styling
  const getOptionStatus = (option: QuizOption) => {
    if (!isAnswered) return 'default';
    if (option.id === selectedOption) {
      return option.isCorrect ? 'correct' : 'incorrect';
    }
    if (option.isCorrect) return 'correct';
    return 'default';
  };

  return (
    <motion.div 
      className={`quiz-question-container ${className}`}
      variants={questionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="quiz-question-card">
        {/* Header with category and difficulty */}
        <div className="quiz-header">
          <div className="question-meta">
            <div className="category-badge" style={{ backgroundColor: categoryColor }}>
              <span>{emoji || '🎯'}</span>
              <span>{category.replace('-', ' ')}</span>
            </div>
            <div className="difficulty-indicator">
              {Array.from({ length: 4 }, (_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={`difficulty-star ${i < getDifficultyStars() ? 'filled' : ''}`}
                  fill={i < getDifficultyStars() ? '#ffc107' : 'none'}
                />
              ))}
              <span className="difficulty-label">{difficulty}</span>
            </div>
          </div>
          
          <div className="points-badge">
            <Award size={16} />
            <span>{questionPoints} pts</span>
          </div>
        </div>

        {/* Question Text */}
        <div className="question-content">
          <h3 className="question-text">
            <Brain size={20} className="question-icon" />
            {question}
          </h3>
          
          {/* Hint Section */}
          {hint && (
            <div className="hint-section">
              <motion.button
                className="hint-button"
                onClick={handleHintClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={showHint}
              >
                <Lightbulb size={16} />
                <span>{showHint ? 'Hint Revealed!' : 'Need a Hint?'}</span>
              </motion.button>
              
              <AnimatePresence>
                {showHint && (
                  <motion.div
                    className="hint-content"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="hint-text">
                      <Lightbulb size={16} className="hint-icon" />
                      <span>{hint}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="quiz-options">
          {options.map((option, index) => {
            const status = getOptionStatus(option);
            const isSelected = selectedOption === option.id;
            
            return (
              <motion.button
                key={option.id}
                className={`quiz-option ${status} ${isSelected ? 'selected' : ''}`}
                variants={optionVariants}
                initial="initial"
                animate={isAnswered ? status : "animate"}
                whileHover={!isAnswered ? "hover" : undefined}
                whileTap={!isAnswered ? "tap" : undefined}
                custom={index}
                onClick={() => handleOptionClick(option.id)}
                disabled={isAnswered}
                style={{
                  borderColor: isAnswered && isSelected 
                    ? (option.isCorrect ? '#4caf50' : '#f44336')
                    : undefined
                }}
              >
                <div className="option-content">
                  <span className="option-letter">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="option-text">{option.text}</span>
                  
                  {/* Success/Failure Icons */}
                  <AnimatePresence>
                    {isAnswered && isSelected && (
                      <motion.div
                        className="option-result-icon"
                        variants={successAnimationVariants}
                        initial="initial"
                        animate="animate"
                      >
                        {option.isCorrect ? (
                          <CheckCircle2 size={20} className="success-icon" />
                        ) : (
                          <XCircle size={20} className="error-icon" />
                        )}
                      </motion.div>
                    )}
                    
                    {isAnswered && option.isCorrect && !isSelected && (
                      <motion.div
                        className="correct-indicator"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        <CheckCircle2 size={16} className="correct-icon" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Sparkle Effects for Correct Answer */}
                {isAnswered && status === 'correct' && (
                  <>
                    <motion.div
                      className="sparkle sparkle-1"
                      variants={sparkleVariants}
                      animate="animate"
                    >
                      ✨
                    </motion.div>
                    <motion.div
                      className="sparkle sparkle-2"
                      variants={sparkleVariants}
                      animate="animate"
                      style={{ animationDelay: '0.5s' }}
                    >
                      ⭐
                    </motion.div>
                  </>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Results and Encouragement */}
        <AnimatePresence>
          {isAnswered && (
            <motion.div
              className="quiz-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {/* Encouragement Message */}
              {showEncouragement && encouragementMessage && (
                <div className="encouragement-message">
                  <div className="encouragement-content">
                    {selectedOption && options.find(opt => opt.id === selectedOption)?.isCorrect ? (
                      <div className="success-celebration">
                        <Sparkles className="celebration-icon" />
                        <span>{encouragementMessage}</span>
                        <TrendingUp className="trending-icon" />
                      </div>
                    ) : (
                      <div className="learning-motivation">
                        <Target className="target-icon" />
                        <span>{encouragementMessage}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="score-display">
                    <Zap size={16} />
                    <span>+{currentScore} points</span>
                  </div>
                </div>
              )}

              {/* Explanation */}
              <AnimatePresence>
                {showExplanation && (
                  <motion.div
                    className="explanation-section"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    <div className="explanation-content">
                      <div className="explanation-header">
                        <HelpCircle size={18} />
                        <span>
                          {selectedOption && options.find(opt => opt.id === selectedOption)?.isCorrect
                            ? 'Why this is correct:'
                            : 'Let\'s learn together:'
                          }
                        </span>
                      </div>
                      
                      <div className="explanation-text">
                        {selectedOption && options.find(opt => opt.id === selectedOption)?.isCorrect
                          ? correctExplanation
                          : incorrectExplanation || correctExplanation
                        }
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reset Button */}
              <div className="quiz-actions">
                <motion.button
                  className="reset-button"
                  onClick={resetQuestion}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <RotateCcw size={16} />
                  <span>Try Another Question</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Styles */}
      <style jsx>{`
        .quiz-question-container {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }

        .quiz-question-card {
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.08) 0%, 
            rgba(255, 255, 255, 0.03) 100%);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          padding: 2rem;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          position: relative;
          overflow: hidden;
        }

        .quiz-question-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, ${categoryColor}, ${categoryColor}aa);
        }

        .quiz-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .question-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .category-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          color: white;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .difficulty-indicator {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .difficulty-star {
          color: #ffc107;
          opacity: 0.3;
          transition: all 0.3s ease;
        }

        .difficulty-star.filled {
          opacity: 1;
          filter: drop-shadow(0 0 4px #ffc10780);
        }

        .difficulty-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          margin-left: 0.5rem;
          text-transform: capitalize;
        }

        .points-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #ffc107, #ff9800);
          border-radius: 20px;
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
          box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
        }

        .question-content {
          margin-bottom: 2rem;
        }

        .question-text {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          font-size: 1.3rem;
          font-weight: 600;
          line-height: 1.5;
          margin: 0 0 1rem 0;
          color: rgba(255, 255, 255, 0.95);
        }

        .question-icon {
          color: ${categoryColor};
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        .hint-section {
          margin-top: 1rem;
        }

        .hint-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(255, 193, 7, 0.1);
          border: 1px solid rgba(255, 193, 7, 0.3);
          border-radius: 12px;
          color: #ffc107;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
          font-size: 0.9rem;
        }

        .hint-button:hover:not(:disabled) {
          background: rgba(255, 193, 7, 0.2);
          transform: translateY(-2px);
        }

        .hint-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .hint-content {
          margin-top: 1rem;
          overflow: hidden;
        }

        .hint-text {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(255, 193, 7, 0.1);
          border-radius: 12px;
          border-left: 4px solid #ffc107;
          font-style: italic;
          color: rgba(255, 255, 255, 0.9);
        }

        .hint-icon {
          color: #ffc107;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        .quiz-options {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .quiz-option {
          position: relative;
          width: 100%;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .quiz-option:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(${categoryColor.replace('#', '')}, 0.5);
          transform: translateY(-2px);
        }

        .quiz-option.selected {
          background: rgba(100, 181, 246, 0.1);
          border-color: #64b5f6;
        }

        .quiz-option.correct {
          background: rgba(76, 175, 80, 0.2);
          border-color: #4caf50;
          box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
        }

        .quiz-option.incorrect {
          background: rgba(244, 67, 54, 0.2);
          border-color: #f44336;
        }

        .quiz-option:disabled {
          cursor: not-allowed;
        }

        .option-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
        }

        .option-letter {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, ${categoryColor}, ${categoryColor}aa);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          flex-shrink: 0;
        }

        .option-text {
          flex: 1;
          text-align: left;
          font-size: 1.1rem;
          line-height: 1.4;
          color: rgba(255, 255, 255, 0.95);
        }

        .option-result-icon {
          position: absolute;
          right: 0;
        }

        .success-icon {
          color: #4caf50;
        }

        .error-icon {
          color: #f44336;
        }

        .correct-indicator {
          position: absolute;
          right: 0;
        }

        .correct-icon {
          color: #4caf50;
        }

        .sparkle {
          position: absolute;
          font-size: 1.2rem;
          pointer-events: none;
        }

        .sparkle-1 {
          top: 10px;
          right: 10px;
        }

        .sparkle-2 {
          bottom: 10px;
          right: 40px;
        }

        .quiz-results {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 2rem;
        }

        .encouragement-message {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, 
            rgba(100, 181, 246, 0.1), 
            rgba(76, 175, 80, 0.1));
          border-radius: 16px;
          border: 1px solid rgba(100, 181, 246, 0.3);
        }

        .encouragement-content {
          flex: 1;
        }

        .success-celebration {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #4caf50;
          font-weight: 600;
          font-size: 1.1rem;
        }

        .celebration-icon {
          color: #ffc107;
        }

        .trending-icon {
          color: #4caf50;
        }

        .learning-motivation {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #64b5f6;
          font-weight: 600;
          font-size: 1.1rem;
        }

        .target-icon {
          color: #ff9800;
        }

        .score-display {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(255, 193, 7, 0.2);
          border-radius: 12px;
          color: #ffc107;
          font-weight: 600;
        }

        .explanation-section {
          overflow: hidden;
          margin-bottom: 1.5rem;
        }

        .explanation-content {
          padding: 1.5rem;
          background: rgba(100, 181, 246, 0.1);
          border-radius: 16px;
          border-left: 4px solid #64b5f6;
        }

        .explanation-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #64b5f6;
          font-weight: 600;
          margin-bottom: 1rem;
          font-size: 1rem;
        }

        .explanation-text {
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          font-size: 1rem;
        }

        .quiz-actions {
          text-align: center;
        }

        .reset-button {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, ${categoryColor}, ${categoryColor}aa);
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 1rem;
        }

        .reset-button:hover {
          background: linear-gradient(135deg, ${categoryColor}ee, ${categoryColor});
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(100, 181, 246, 0.4);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .quiz-question-card {
            padding: 1.5rem;
          }

          .quiz-header {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .question-meta {
            justify-content: space-between;
          }

          .question-text {
            font-size: 1.2rem;
          }

          .quiz-option {
            padding: 1.25rem;
          }

          .option-text {
            font-size: 1rem;
          }

          .encouragement-message {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .encouragement-content {
            text-align: center;
          }

          .score-display {
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .quiz-question-card {
            padding: 1rem;
          }

          .question-text {
            flex-direction: column;
            gap: 0.75rem;
            font-size: 1.1rem;
          }

          .option-content {
            gap: 0.75rem;
          }

          .option-letter {
            width: 35px;
            height: 35px;
            font-size: 0.8rem;
          }

          .option-text {
            font-size: 0.95rem;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default QuizQuestion;