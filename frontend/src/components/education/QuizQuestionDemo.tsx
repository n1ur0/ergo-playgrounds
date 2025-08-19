import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QuizQuestion, { QuizOption } from './QuizQuestion';
import { 
  Trophy, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft,
  Star,
  Target,
  Brain
} from 'lucide-react';

// Sample quiz questions for demo
const SAMPLE_QUESTIONS = [
  {
    id: 'utxo-basics',
    question: "What does UTXO stand for in blockchain technology?",
    options: [
      { id: 'a', text: "Universal Transaction eXchange Object", isCorrect: false },
      { id: 'b', text: "Unspent Transaction Output", isCorrect: true },
      { id: 'c', text: "User Transaction eXecution Order", isCorrect: false },
      { id: 'd', text: "Unified Transaction eXtended Operation", isCorrect: false }
    ] as QuizOption[],
    correctExplanation: "UTXO stands for 'Unspent Transaction Output'. In the UTXO model, coins are stored as individual outputs that can be spent in future transactions. Each UTXO represents a specific amount of cryptocurrency that belongs to a particular address and hasn't been spent yet.",
    incorrectExplanation: "Good try! UTXO actually stands for 'Unspent Transaction Output'. This is a fundamental concept in blockchain where each coin is tracked as a separate output that can be spent in transactions.",
    hint: "Think about what happens to coins after a transaction - they become 'outputs' that are available to be spent later.",
    difficulty: 'beginner' as const,
    category: 'blockchain' as const,
    emoji: '📦',
    points: 10
  },
  {
    id: 'ergoscript-guards',
    question: "In ErgoScript, what is the purpose of using '||' (OR) operators in guard scripts?",
    options: [
      { id: 'a', text: "To create multiple spending conditions where any one can unlock the box", isCorrect: true },
      { id: 'b', text: "To combine two addresses into one", isCorrect: false },
      { id: 'c', text: "To double the security of the contract", isCorrect: false }
    ] as QuizOption[],
    correctExplanation: "The '||' operator creates alternative spending paths in ErgoScript. This allows a box to be unlocked if ANY of the conditions are met - for example, either the owner's signature OR the contract's specific conditions. This provides flexibility and fallback mechanisms.",
    incorrectExplanation: "Not quite! The '||' operator actually creates alternative spending conditions. It's like saying 'either this condition OR that condition can unlock the funds', providing multiple valid ways to spend a UTXO.",
    hint: "Think about how 'OR' logic works - if either condition A OR condition B is true, the whole statement is true.",
    difficulty: 'intermediate' as const,
    category: 'ergoscript' as const,
    emoji: '🔐',
    points: 15
  },
  {
    id: 'smart-contracts',
    question: "What makes Ergo's smart contracts different from Ethereum's?",
    options: [
      { id: 'a', text: "Ergo uses the UTXO model while Ethereum uses the account model", isCorrect: true },
      { id: 'b', text: "Ergo contracts are slower to execute", isCorrect: false },
      { id: 'c', text: "Ergo doesn't support complex logic", isCorrect: false },
      { id: 'd', text: "Ergo contracts cost more gas", isCorrect: false }
    ] as QuizOption[],
    correctExplanation: "Ergo's smart contracts operate on the UTXO (Unspent Transaction Output) model, similar to Bitcoin, while Ethereum uses an account-based model. This gives Ergo contracts better privacy, parallelizability, and makes them stateless by design. Each box in Ergo can contain its own contract logic!",
    incorrectExplanation: "Close! The key difference is in the underlying models - Ergo uses UTXO while Ethereum uses accounts. This architectural difference affects privacy, scalability, and how contracts store and access state.",
    hint: "Consider the fundamental data models - one tracks individual 'boxes' of coins, the other tracks account balances.",
    difficulty: 'advanced' as const,
    category: 'smart-contracts' as const,
    emoji: '⚡',
    points: 25
  },
  {
    id: 'tokens-basics',
    question: "What's special about tokens on the Ergo blockchain?",
    options: [
      { id: 'a', text: "They're stored as data within UTXOs, not in separate contracts", isCorrect: true },
      { id: 'b', text: "They require special mining equipment", isCorrect: false },
      { id: 'c', text: "They can only be created by the foundation", isCorrect: false }
    ] as QuizOption[],
    correctExplanation: "In Ergo, tokens are first-class citizens stored directly within UTXOs alongside ERG. Unlike Ethereum where tokens are managed by smart contracts, Ergo tokens are native to the protocol. This makes them more efficient and secure, with built-in protection against common token vulnerabilities.",
    incorrectExplanation: "Good attempt! Ergo tokens are actually stored directly in UTXOs as native assets, not managed by separate smart contracts. This makes them more efficient and secure than many other token implementations.",
    hint: "Think about where the token data lives - is it in a separate contract or part of the box itself?",
    difficulty: 'starter' as const,
    category: 'tokens' as const,
    emoji: '🪙',
    points: 5
  }
];

interface QuizState {
  currentQuestionIndex: number;
  totalScore: number;
  answeredQuestions: Set<string>;
  correctAnswers: number;
  showResults: boolean;
}

const QuizQuestionDemo: React.FC = () => {
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    totalScore: 0,
    answeredQuestions: new Set(),
    correctAnswers: 0,
    showResults: false
  });

  const [showDemo, setShowDemo] = useState(false);

  const currentQuestion = SAMPLE_QUESTIONS[quizState.currentQuestionIndex];
  const isQuestionAnswered = quizState.answeredQuestions.has(currentQuestion.id);

  // Handle answer submission
  const handleAnswer = (isCorrect: boolean, selectedOptionId: string, points: number) => {
    if (quizState.answeredQuestions.has(currentQuestion.id)) return;

    setQuizState(prev => ({
      ...prev,
      totalScore: prev.totalScore + points,
      answeredQuestions: new Set([...prev.answeredQuestions, currentQuestion.id]),
      correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0)
    }));
  };

  // Navigate to next question
  const nextQuestion = () => {
    if (quizState.currentQuestionIndex < SAMPLE_QUESTIONS.length - 1) {
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1
      }));
    } else {
      setQuizState(prev => ({
        ...prev,
        showResults: true
      }));
    }
  };

  // Navigate to previous question
  const previousQuestion = () => {
    if (quizState.currentQuestionIndex > 0) {
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1
      }));
    }
  };

  // Reset entire quiz
  const resetQuiz = () => {
    setQuizState({
      currentQuestionIndex: 0,
      totalScore: 0,
      answeredQuestions: new Set(),
      correctAnswers: 0,
      showResults: false
    });
  };

  // Calculate percentage
  const getPercentage = () => {
    return Math.round((quizState.correctAnswers / SAMPLE_QUESTIONS.length) * 100);
  };

  // Get performance message
  const getPerformanceMessage = () => {
    const percentage = getPercentage();
    if (percentage >= 90) return { message: "Outstanding! You're a blockchain master! 🏆", color: "#4caf50" };
    if (percentage >= 80) return { message: "Excellent work! You really know your stuff! 🌟", color: "#66bb6a" };
    if (percentage >= 70) return { message: "Great job! You're well on your way! 🎯", color: "#ffc107" };
    if (percentage >= 60) return { message: "Good progress! Keep learning! 📚", color: "#ff9800" };
    return { message: "Nice try! Every expert was once a beginner! 💪", color: "#64b5f6" };
  };

  if (!showDemo) {
    return (
      <div className="demo-introduction">
        <div className="intro-card">
          <div className="intro-header">
            <Brain size={32} className="intro-icon" />
            <h2>Interactive Quiz Component Demo</h2>
          </div>
          
          <div className="intro-content">
            <p>Experience the QuizQuestion component with sample blockchain and ErgoScript questions!</p>
            
            <div className="demo-features">
              <div className="feature-grid">
                <div className="feature-item">
                  <Target className="feature-icon" />
                  <div>
                    <strong>Multiple Difficulty Levels</strong>
                    <p>From starter to advanced questions</p>
                  </div>
                </div>
                <div className="feature-item">
                  <Star className="feature-icon" />
                  <div>
                    <strong>Engaging Animations</strong>
                    <p>Success effects and smooth transitions</p>
                  </div>
                </div>
                <div className="feature-item">
                  <Trophy className="feature-icon" />
                  <div>
                    <strong>Progress Tracking</strong>
                    <p>Score tracking and performance feedback</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            className="start-demo-button"
            onClick={() => setShowDemo(true)}
          >
            <Brain size={18} />
            Start Learning Quiz
            <ChevronRight size={18} />
          </button>
        </div>

        <style jsx>{`
          .demo-introduction {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 70vh;
            padding: 2rem;
          }

          .intro-card {
            background: linear-gradient(135deg, 
              rgba(255, 255, 255, 0.08) 0%, 
              rgba(255, 255, 255, 0.03) 100%);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            padding: 3rem;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            text-align: center;
            max-width: 600px;
            width: 100%;
          }

          .intro-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            margin-bottom: 2rem;
          }

          .intro-icon {
            color: #64b5f6;
          }

          .intro-header h2 {
            margin: 0;
            font-size: 2rem;
            font-weight: 700;
            background: linear-gradient(135deg, #64b5f6, #42a5f5);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .intro-content p {
            font-size: 1.1rem;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.8);
            margin: 0 0 2rem 0;
          }

          .demo-features {
            margin-bottom: 2rem;
          }

          .feature-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .feature-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            text-align: left;
          }

          .feature-icon {
            color: #64b5f6;
            flex-shrink: 0;
          }

          .feature-item strong {
            color: rgba(255, 255, 255, 0.95);
            font-size: 0.95rem;
            display: block;
            margin-bottom: 0.25rem;
          }

          .feature-item p {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.85rem;
            margin: 0;
            line-height: 1.4;
          }

          .start-demo-button {
            display: inline-flex;
            align-items: center;
            gap: 1rem;
            padding: 1.25rem 2rem;
            background: linear-gradient(135deg, #4caf50, #66bb6a);
            border: none;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            font-size: 1.1rem;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .start-demo-button:hover {
            background: linear-gradient(135deg, #388e3c, #4caf50);
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(76, 175, 80, 0.3);
          }

          @media (max-width: 768px) {
            .intro-card {
              padding: 2rem;
            }

            .intro-header h2 {
              font-size: 1.6rem;
            }

            .start-demo-button {
              padding: 1rem 1.5rem;
              font-size: 1rem;
            }
          }
        `}</style>
      </div>
    );
  }

  if (quizState.showResults) {
    const performance = getPerformanceMessage();
    
    return (
      <motion.div
        className="quiz-results-screen"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="results-card">
          <div className="results-header">
            <Trophy size={48} style={{ color: performance.color }} />
            <h2>Quiz Complete!</h2>
            <p style={{ color: performance.color }}>{performance.message}</p>
          </div>

          <div className="results-stats">
            <div className="stat-item">
              <div className="stat-value">{quizState.correctAnswers}/{SAMPLE_QUESTIONS.length}</div>
              <div className="stat-label">Correct Answers</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{getPercentage()}%</div>
              <div className="stat-label">Score</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{quizState.totalScore}</div>
              <div className="stat-label">Points Earned</div>
            </div>
          </div>

          <div className="results-actions">
            <button className="restart-button" onClick={resetQuiz}>
              <RotateCcw size={18} />
              Try Again
            </button>
            <button 
              className="exit-button" 
              onClick={() => setShowDemo(false)}
            >
              Back to Intro
            </button>
          </div>
        </div>

        <style jsx>{`
          .quiz-results-screen {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 70vh;
            padding: 2rem;
          }

          .results-card {
            background: linear-gradient(135deg, 
              rgba(255, 255, 255, 0.08) 0%, 
              rgba(255, 255, 255, 0.03) 100%);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            padding: 3rem;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            text-align: center;
            max-width: 500px;
            width: 100%;
          }

          .results-header {
            margin-bottom: 2rem;
          }

          .results-header h2 {
            font-size: 2rem;
            font-weight: 700;
            margin: 1rem 0 0.5rem 0;
            color: rgba(255, 255, 255, 0.95);
          }

          .results-header p {
            font-size: 1.1rem;
            font-weight: 600;
            margin: 0;
          }

          .results-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
            margin-bottom: 2rem;
          }

          .stat-item {
            text-align: center;
          }

          .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: #64b5f6;
            margin-bottom: 0.5rem;
          }

          .stat-label {
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.7);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .results-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
          }

          .restart-button, .exit-button {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem 1.5rem;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .restart-button {
            background: linear-gradient(135deg, #4caf50, #66bb6a);
            color: white;
          }

          .restart-button:hover {
            background: linear-gradient(135deg, #388e3c, #4caf50);
            transform: translateY(-2px);
          }

          .exit-button {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .exit-button:hover {
            background: rgba(255, 255, 255, 0.2);
            color: white;
          }

          @media (max-width: 768px) {
            .results-card {
              padding: 2rem;
            }

            .results-stats {
              grid-template-columns: 1fr;
              gap: 1rem;
            }

            .results-actions {
              flex-direction: column;
              align-items: stretch;
            }
          }
        `}</style>
      </motion.div>
    );
  }

  return (
    <div className="quiz-demo-container">
      {/* Progress Header */}
      <div className="quiz-progress-header">
        <div className="progress-info">
          <h2>Learning Quiz</h2>
          <div className="progress-stats">
            <span>Question {quizState.currentQuestionIndex + 1} of {SAMPLE_QUESTIONS.length}</span>
            <span>•</span>
            <span>Score: {quizState.totalScore} points</span>
          </div>
        </div>
        
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${((quizState.currentQuestionIndex + 1) / SAMPLE_QUESTIONS.length) * 100}%` 
            }}
          />
        </div>
      </div>

      {/* Quiz Question */}
      <AnimatePresence mode="wait">
        <QuizQuestion
          key={currentQuestion.id}
          question={currentQuestion.question}
          options={currentQuestion.options}
          correctExplanation={currentQuestion.correctExplanation}
          incorrectExplanation={currentQuestion.incorrectExplanation}
          hint={currentQuestion.hint}
          difficulty={currentQuestion.difficulty}
          category={currentQuestion.category}
          emoji={currentQuestion.emoji}
          points={currentQuestion.points}
          onAnswer={handleAnswer}
          showEncouragement={true}
        />
      </AnimatePresence>

      {/* Navigation */}
      <div className="quiz-navigation">
        <button
          className="nav-button prev-button"
          onClick={previousQuestion}
          disabled={quizState.currentQuestionIndex === 0}
        >
          <ChevronLeft size={16} />
          Previous
        </button>

        <div className="question-dots">
          {SAMPLE_QUESTIONS.map((_, index) => (
            <div
              key={index}
              className={`question-dot ${
                index === quizState.currentQuestionIndex ? 'current' :
                quizState.answeredQuestions.has(SAMPLE_QUESTIONS[index].id) ? 'answered' : ''
              }`}
            />
          ))}
        </div>

        {isQuestionAnswered && (
          <motion.button
            className="nav-button next-button"
            onClick={nextQuestion}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 1.5 }}
          >
            {quizState.currentQuestionIndex === SAMPLE_QUESTIONS.length - 1 ? 'View Results' : 'Next'}
            <ChevronRight size={16} />
          </motion.button>
        )}
      </div>

      <style jsx>{`
        .quiz-demo-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .quiz-progress-header {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .progress-info h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
        }

        .progress-stats {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.95rem;
        }

        .progress-bar {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #64b5f6, #4caf50);
          transition: width 0.5s ease;
        }

        .quiz-navigation {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 0;
        }

        .nav-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: rgba(100, 181, 246, 0.2);
          border: 1px solid rgba(100, 181, 246, 0.3);
          border-radius: 12px;
          color: #64b5f6;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .nav-button:hover:not(:disabled) {
          background: rgba(100, 181, 246, 0.3);
          transform: translateY(-2px);
        }

        .nav-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .next-button {
          background: linear-gradient(135deg, #4caf50, #66bb6a);
          border-color: #4caf50;
          color: white;
        }

        .next-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #388e3c, #4caf50);
        }

        .question-dots {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .question-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transition: all 0.3s ease;
        }

        .question-dot.current {
          background: #64b5f6;
          transform: scale(1.3);
        }

        .question-dot.answered {
          background: #4caf50;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .quiz-demo-container {
            padding: 1rem;
          }

          .progress-info {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
          }

          .quiz-navigation {
            flex-wrap: wrap;
            gap: 1rem;
          }

          .nav-button {
            flex: 1;
            justify-content: center;
            min-width: 120px;
          }

          .question-dots {
            order: -1;
            justify-content: center;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default QuizQuestionDemo;