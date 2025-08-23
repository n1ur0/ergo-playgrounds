import React, { useCallback, useMemo } from 'react';
import { 
  Play, 
  BookOpen, 
  Palette, 
  ArrowRight, 
  Zap, 
  Shield,
  Target,
  ChevronRight,
  Clock
} from 'lucide-react';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import './WelcomePage.css';

interface WelcomePageProps {
  onSelectExample: (example: string) => void;
  onToggleSidebar?: () => void;
  isMobile?: boolean;
}

const learningPaths = [
  {
    id: 'beginner',
    title: 'New to Smart Contracts',
    description: 'Start with basic concepts and simple examples',
    icon: BookOpen,
    color: 'var(--color-success-400)',
    examples: ['simpleSend', 'pinLockContract'],
    estimatedTime: '30 min',
    difficulty: 'Beginner'
  },
  {
    id: 'intermediate',
    title: 'Building DeFi Applications',
    description: 'Learn advanced patterns for financial applications',
    icon: Target,
    color: 'var(--color-warning-400)',
    examples: ['escrowDepositContract', 'tokenSalesService', 'headsOrTails'],
    estimatedTime: '45 min',
    difficulty: 'Intermediate'
  },
  {
    id: 'advanced',
    title: 'Expert Contract Development',
    description: 'Master complex patterns and cross-chain protocols',
    icon: Zap,
    color: 'var(--color-error-400)',
    examples: ['singleChainSwap', 'doubleChainSwap', 'stealthAddress'],
    estimatedTime: '60 min',
    difficulty: 'Advanced'
  }
];

const features = [
  {
    id: 'tester',
    title: 'Contract Tester',
    description: 'Run and test ErgoScript contracts in a simulated environment',
    icon: Play,
    gradient: 'linear-gradient(135deg, var(--color-primary-400), var(--color-primary-600))',
    action: 'Start Testing',
    exampleToSelect: 'simpleSend'
  },
  {
    id: 'designer',
    title: 'Visual Designer',
    description: 'Create contracts with drag-and-drop visual components',
    icon: Palette,
    gradient: 'linear-gradient(135deg, var(--color-secondary-400), var(--color-secondary-600))',
    action: 'Open Designer',
    exampleToSelect: 'contractDesigner'
  },
  {
    id: 'education',
    title: 'Learning Center',
    description: 'Comprehensive tutorials and documentation for ErgoScript',
    icon: BookOpen,
    gradient: 'linear-gradient(135deg, var(--color-concept), var(--color-achievement))',
    action: 'Learn More',
    exampleToSelect: 'pinLockContract'
  }
];

const quickStartExamples = [
  {
    id: 'simpleSend',
    title: 'Hello ErgoScript',
    description: 'Your first smart contract - simple token transfer',
    difficulty: 'Starter',
    time: '5 min',
    icon: Play
  },
  {
    id: 'pinLockContract',
    title: 'PIN Security',
    description: 'Secure funds with a PIN-protected contract',
    difficulty: 'Beginner',
    time: '10 min',
    icon: Shield
  },
  {
    id: 'contractDesigner',
    title: 'Visual Builder',
    description: 'Drag-and-drop smart contract designer',
    difficulty: 'Interactive',
    time: '15 min',
    icon: Palette
  }
];

const WelcomePage: React.FC<WelcomePageProps> = ({ 
  onSelectExample, 
  onToggleSidebar,
  isMobile: isMobileProp 
}) => {
  const layout = useResponsiveLayout();
  const isMobile = isMobileProp ?? layout.isMobile;
  
  const handleGetStarted = useCallback(() => {
    if (isMobile && onToggleSidebar) {
      onToggleSidebar();
    } else {
      onSelectExample('simpleSend');
    }
  }, [isMobile, onToggleSidebar, onSelectExample]);

  const handleFeatureSelect = useCallback((exampleId: string) => {
    onSelectExample(exampleId);
  }, [onSelectExample]);

  const handlePathSelect = useCallback((pathExamples: string[]) => {
    onSelectExample(pathExamples[0]);
  }, [onSelectExample]);
  
  const handleKeyDown = useCallback((event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }, []);

  const memoizedStats = useMemo(() => ([
    { number: '15+', label: 'Contract Examples' },
    { number: '3', label: 'Learning Paths' },
    { number: '100%', label: 'Interactive' }
  ]), []);
  
  return (
    <div className="welcome-page" role="main" aria-label="Ergo Playgrounds Welcome">
      {/* Hero Section */}
      <section className="hero-section" aria-labelledby="hero-title" data-testid="welcome-hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1 id="hero-title" className="hero-title">
              Welcome to <span className="highlight">Ergo Playgrounds</span>
            </h1>
            <p className="hero-description">
              Master ErgoScript development through interactive examples, visual design tools, 
              and hands-on experimentation in a safe sandbox environment.
            </p>
            <div className="hero-stats" role="region" aria-label="Platform statistics">
              {memoizedStats.map((stat, index) => (
                <div key={index} className="stat-item">
                  <span className="stat-number" aria-label={`${stat.number} ${stat.label}`}>{stat.number}</span>
                  <span className="stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-actions">
            <button 
              className="primary-button"
              onClick={handleGetStarted}
              onKeyDown={(e) => handleKeyDown(e, handleGetStarted)}
              aria-label="Start with first smart contract example"
            >
              <Play size={20} aria-hidden="true" />
              Get Started
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button 
              className="secondary-button"
              onClick={() => onSelectExample('contractDesigner')}
              onKeyDown={(e) => handleKeyDown(e, () => onSelectExample('contractDesigner'))}
              aria-label="Open visual contract designer"
            >
              <Palette size={20} aria-hidden="true" />
              Try Designer
            </button>
          </div>
        </div>
      </section>

      {/* Learning Paths Section */}
      <section className="learning-paths" aria-labelledby="learning-paths-title" data-testid="learning-paths">
        <div className="section-header">
          <h2 id="learning-paths-title">Choose Your Learning Path</h2>
          <p>Structured paths to guide your ErgoScript journey from beginner to expert</p>
        </div>
        
        <div className="paths-grid" role="region" aria-label="Learning paths grid">
          {learningPaths.map((path) => {
            const IconComponent = path.icon;
            return (
              <div 
                key={path.id} 
                className="path-card glass-panel interactive-element"
                onClick={() => handlePathSelect(path.examples)}
                onKeyDown={(e) => handleKeyDown(e, () => handlePathSelect(path.examples))}
                role="button"
                tabIndex={0}
                aria-label={`Start ${path.title} learning path with ${path.examples.length} examples, estimated ${path.estimatedTime}`}
              >
                <div className="path-header">
                  <div 
                    className="path-icon" 
                    style={{ backgroundColor: path.color }}
                    aria-hidden="true"
                  >
                    <IconComponent size={24} />
                  </div>
                  <div className="path-meta">
                    <span className="path-difficulty">{path.difficulty}</span>
                    <span className="path-time">
                      <Clock size={14} aria-hidden="true" />
                      <span className="sr-only">Estimated time: </span>{path.estimatedTime}
                    </span>
                  </div>
                </div>
                
                <h3 className="path-title">{path.title}</h3>
                <p className="path-description">{path.description}</p>
                
                <div className="path-examples">
                  <span className="examples-count">{path.examples.length} Examples</span>
                  <ChevronRight size={16} className="path-arrow" aria-hidden="true" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature Showcase */}
      <section className="feature-showcase" aria-labelledby="features-title" data-testid="feature-showcase">
        <div className="section-header">
          <h2 id="features-title">Explore Platform Features</h2>
          <p>Powerful tools designed for every stage of your smart contract development</p>
        </div>
        
        <div className="features-grid" role="region" aria-label="Features grid">
          {features.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <div 
                key={feature.id} 
                className="feature-card interactive-element"
                onClick={() => handleFeatureSelect(feature.exampleToSelect)}
                onKeyDown={(e) => handleKeyDown(e, () => handleFeatureSelect(feature.exampleToSelect))}
                role="button"
                tabIndex={0}
                aria-label={`${feature.title}: ${feature.description}`}
              >
                <div 
                  className="feature-background"
                  style={{ background: feature.gradient }}
                />
                <div className="feature-content">
                  <div className="feature-icon" aria-hidden="true">
                    <IconComponent size={32} />
                  </div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-description">{feature.description}</p>
                  <button className="feature-button" aria-hidden="true" tabIndex={-1}>
                    {feature.action}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Start Section */}
      <section className="quick-start" aria-labelledby="quickstart-title" data-testid="quick-start">
        <div className="section-header">
          <h2 id="quickstart-title">Quick Start Examples</h2>
          <p>Jump right in with these beginner-friendly examples</p>
        </div>
        
        <div className="quick-start-grid" role="region" aria-label="Quick start examples grid">
          {quickStartExamples.map((example) => {
            const IconComponent = example.icon;
            return (
              <div 
                key={example.id} 
                className="quick-start-card glass-panel interactive-element"
                onClick={() => onSelectExample(example.id)}
                onKeyDown={(e) => handleKeyDown(e, () => onSelectExample(example.id))}
                role="button"
                tabIndex={0}
                aria-label={`${example.title}: ${example.description}. Difficulty: ${example.difficulty}, Time: ${example.time}`}
              >
                <div className="card-header">
                  <div className="card-title-section">
                    <div className="card-icon" aria-hidden="true">
                      <IconComponent size={20} />
                    </div>
                    <h4 className="card-title">{example.title}</h4>
                  </div>
                  <div className="card-badges">
                    <span className="difficulty-badge">{example.difficulty}</span>
                    <span className="time-badge">
                      <Clock size={12} aria-hidden="true" />
                      <span className="sr-only">Estimated time: </span>{example.time}
                    </span>
                  </div>
                </div>
                
                <p className="card-description">{example.description}</p>
                
                <div className="card-footer">
                  <button className="card-button" aria-hidden="true" tabIndex={-1}>
                    <Play size={14} />
                    Try Now
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Call to Action Footer */}
      <section className="cta-footer" aria-labelledby="cta-title" data-testid="cta-footer">
        <div className="cta-content">
          <div className="cta-text">
            <h3 id="cta-title">Ready to Build on Ergo?</h3>
            <p>Join thousands of developers creating the future of decentralized finance</p>
          </div>
          <div className="cta-actions">
            <button 
              className="cta-primary"
              onClick={() => onSelectExample('simpleSend')}
              onKeyDown={(e) => handleKeyDown(e, () => onSelectExample('simpleSend'))}
              aria-label="Start your first smart contract with Simple Send example"
            >
              Start Your First Contract
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WelcomePage;