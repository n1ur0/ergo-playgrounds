import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QuizQuestion, { type QuizOption } from './QuizQuestion';
import './QuizQuestionDemo.css';
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
  const handleAnswer = (isCorrect: boolean, _selectedOptionId: string, points: number) => {
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

    </div>
  );
};

export default QuizQuestionDemo;