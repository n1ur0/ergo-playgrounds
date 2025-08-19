import React, { useState, useEffect } from 'react';
import { Book, Users, Lightbulb, Trophy, ChevronRight, ChevronLeft, CheckCircle, HelpCircle, Star, Zap } from 'lucide-react';
import { educationalContent, type ContractContent } from '../../data/educationalContent';
import './ContractEducation.css';

interface ContractEducationProps {
  selectedExample: string | null;
}

type EducationSection = 'overview' | 'concepts' | 'process' | 'quiz';

const ContractEducation: React.FC<ContractEducationProps> = ({ selectedExample }) => {
  const [activeSection, setActiveSection] = useState<EducationSection>('overview');
  const [currentProcessStep, setCurrentProcessStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [contractContent, setContractContent] = useState<ContractContent | null>(null);

  useEffect(() => {
    if (selectedExample) {
      const content = educationalContent.contracts.find(contract => contract.id === selectedExample);
      setContractContent(content || null);
      // Reset state when switching contracts
      setActiveSection('overview');
      setCurrentProcessStep(0);
      setQuizAnswers({});
      setShowQuizResults(false);
    } else {
      setContractContent(null);
    }
  }, [selectedExample]);

  const handleQuizAnswer = (questionIndex: number, answerIndex: number) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  };

  const submitQuiz = () => {
    setShowQuizResults(true);
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setShowQuizResults(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'starter': return '#4caf50';
      case 'beginner': return '#66bb6a';
      case 'intermediate': return '#ff9800';
      case 'advanced': return '#f44336';
      case 'expert': return '#9c27b0';
      default: return '#64b5f6';
    }
  };

  const getDifficultyStars = (difficulty: string) => {
    const levels = { 'starter': 1, 'beginner': 2, 'intermediate': 3, 'advanced': 4, 'expert': 5 };
    return levels[difficulty as keyof typeof levels] || 1;
  };

  if (!selectedExample || !contractContent) {
    return (
      <div className="contract-education-empty">
        <div className="empty-state">
          <Book size={48} />
          <h2>Ready to Learn Smart Contracts?</h2>
          <p>Pick a contract example from the sidebar to start your blockchain journey!</p>
          <div className="learning-path">
            <h3>Suggested Learning Path:</h3>
            <div className="path-steps">
              {educationalContent.progressionPath.map((contractId, index) => {
                const contract = educationalContent.contracts.find(c => c.id === contractId);
                return contract ? (
                  <div key={contractId} className="path-step">
                    <div className="step-number">{index + 1}</div>
                    <div className="step-info">
                      <div className="step-title">{contract.title}</div>
                      <div className="step-difficulty" style={{ color: getDifficultyColor(contract.difficulty) }}>
                        {contract.difficulty}
                      </div>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contract-education">
      <div className="education-header">
        <div className="header-info">
          <h2>{contractContent.title}</h2>
          <div className="contract-meta">
            <div className="difficulty-badge" style={{ backgroundColor: getDifficultyColor(contractContent.difficulty) }}>
              <div className="stars">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={12}
                    fill={i < getDifficultyStars(contractContent.difficulty) ? 'white' : 'none'}
                    color="white"
                  />
                ))}
              </div>
              {contractContent.difficulty}
            </div>
          </div>
        </div>
        <div className="simple-explanation">
          <Lightbulb className="explanation-icon" />
          <p>{contractContent.simpleExplanation}</p>
        </div>
      </div>

      <div className="education-tabs">
        <button
          className={`tab ${activeSection === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveSection('overview')}
        >
          <Book size={16} />
          Overview
        </button>
        <button
          className={`tab ${activeSection === 'concepts' ? 'active' : ''}`}
          onClick={() => setActiveSection('concepts')}
        >
          <HelpCircle size={16} />
          Key Concepts
        </button>
        <button
          className={`tab ${activeSection === 'process' ? 'active' : ''}`}
          onClick={() => setActiveSection('process')}
        >
          <Zap size={16} />
          How It Works
        </button>
        <button
          className={`tab ${activeSection === 'quiz' ? 'active' : ''}`}
          onClick={() => setActiveSection('quiz')}
        >
          <Trophy size={16} />
          Quiz Time
        </button>
      </div>

      <div className="education-content">
        {activeSection === 'overview' && (
          <div className="overview-section">
            <div className="analogy-card">
              <h3>Real World Analogy</h3>
              <p>{contractContent.realWorldAnalogy}</p>
            </div>

            <div className="players-rules-grid">
              <div className="players-card">
                <h3><Users size={20} /> Who's Involved?</h3>
                <ul>
                  {contractContent.players.map((player, index) => (
                    <li key={index}>{player}</li>
                  ))}
                </ul>
              </div>

              <div className="rules-card">
                <h3><CheckCircle size={20} /> The Rules</h3>
                <ul>
                  {contractContent.rules.map((rule, index) => (
                    <li key={index}>{rule}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="practical-section">
              <div className="practical-uses">
                <h3>What Can You Do With This?</h3>
                <div className="use-cases">
                  {contractContent.practicalUses.map((use, index) => (
                    <div key={index} className="use-case">{use}</div>
                  ))}
                </div>
              </div>

              <div className="fun-facts">
                <h3>Cool Facts</h3>
                <div className="facts-list">
                  {contractContent.funFacts.map((fact, index) => (
                    <div key={index} className="fun-fact">
                      <Star size={14} />
                      {fact}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="common-mistakes">
              <h3>Watch Out For These Mistakes!</h3>
              <div className="mistakes-list">
                {contractContent.commonMistakes.map((mistake, index) => (
                  <div key={index} className="mistake-item">
                    ⚠️ {mistake}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'concepts' && (
          <div className="concepts-section">
            <h3>Key Concepts to Understand</h3>
            <div className="concepts-grid">
              {contractContent.concepts.map((concept, index) => (
                <div key={index} className="concept-card">
                  <h4>{concept.term}</h4>
                  <p className="simple-def">{concept.simpleDefinition}</p>
                  <div className="analogy">
                    <Lightbulb size={16} />
                    <span>{concept.analogy}</span>
                  </div>
                  {concept.technicalNote && (
                    <div className="technical-note">
                      <strong>Tech Note:</strong> {concept.technicalNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'process' && (
          <div className="process-section">
            <div className="process-header">
              <h3>Step-by-Step Process</h3>
              <div className="step-navigation">
                <button
                  className="nav-button"
                  onClick={() => setCurrentProcessStep(Math.max(0, currentProcessStep - 1))}
                  disabled={currentProcessStep === 0}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <span className="step-counter">
                  Step {currentProcessStep + 1} of {contractContent.processSteps.length}
                </span>
                <button
                  className="nav-button"
                  onClick={() => setCurrentProcessStep(Math.min(contractContent.processSteps.length - 1, currentProcessStep + 1))}
                  disabled={currentProcessStep === contractContent.processSteps.length - 1}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="process-steps">
              {contractContent.processSteps.map((step, index) => (
                <div
                  key={index}
                  className={`process-step ${index === currentProcessStep ? 'active' : ''} ${index < currentProcessStep ? 'completed' : ''}`}
                >
                  <div className="step-indicator">
                    {index < currentProcessStep ? (
                      <CheckCircle size={20} />
                    ) : (
                      <div className="step-number">{step.step}</div>
                    )}
                  </div>
                  <div className="step-content">
                    <h4>{step.title}</h4>
                    <p className="step-description">{step.description}</p>
                    <div className="visual-metaphor">
                      <Lightbulb size={14} />
                      <span>{step.visualMetaphor}</span>
                    </div>
                    {step.codeSnippet && (
                      <pre className="code-snippet">
                        <code>{step.codeSnippet}</code>
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'quiz' && (
          <div className="quiz-section">
            <div className="quiz-header">
              <h3>Test Your Knowledge!</h3>
              <p>See how well you understand this smart contract</p>
            </div>

            <div className="quiz-questions">
              {contractContent.quiz.map((question, questionIndex) => (
                <div key={questionIndex} className="quiz-question">
                  <h4>Question {questionIndex + 1}</h4>
                  <p className="question-text">{question.question}</p>
                  
                  <div className="quiz-options">
                    {question.options.map((option, optionIndex) => {
                      const isSelected = quizAnswers[questionIndex] === optionIndex;
                      const isCorrect = optionIndex === question.correctAnswer;
                      const showResult = showQuizResults;
                      
                      return (
                        <button
                          key={optionIndex}
                          className={`quiz-option ${isSelected ? 'selected' : ''} ${
                            showResult
                              ? isCorrect
                                ? 'correct'
                                : isSelected && !isCorrect
                                ? 'incorrect'
                                : ''
                              : ''
                          }`}
                          onClick={() => !showQuizResults && handleQuizAnswer(questionIndex, optionIndex)}
                          disabled={showQuizResults}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  {showQuizResults && (
                    <div className="quiz-explanation">
                      <div className="explanation-header">
                        {quizAnswers[questionIndex] === question.correctAnswer ? (
                          <CheckCircle size={16} color="#4caf50" />
                        ) : (
                          <span className="incorrect-mark">❌</span>
                        )}
                        <strong>Explanation:</strong>
                      </div>
                      <p>{question.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="quiz-actions">
              {!showQuizResults ? (
                <button
                  className="quiz-submit-button"
                  onClick={submitQuiz}
                  disabled={Object.keys(quizAnswers).length < contractContent.quiz.length}
                >
                  <Trophy size={16} />
                  Submit Quiz
                </button>
              ) : (
                <div className="quiz-results">
                  <div className="score">
                    <Trophy size={20} />
                    Score: {contractContent.quiz.filter((q, i) => quizAnswers[i] === q.correctAnswer).length} / {contractContent.quiz.length}
                  </div>
                  <button className="quiz-reset-button" onClick={resetQuiz}>
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractEducation;