import { useState } from 'react';
import ContractTester from './components/ContractTester';
import ExamplesList from './components/ExamplesList';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import './App.css';

function App() {
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const layout = useResponsiveLayout();

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>Ergo Smart Contract Playground</h1>
          <p>Learn and experiment with ErgoScript smart contracts</p>
        </div>
        
        {/* Header controls for larger screens */}
        {layout.isDesktop && (
          <div className="header-controls">
            <button 
              className="control-button"
              onClick={layout.toggleSidebar}
              aria-label={layout.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="control-icon">
                {layout.sidebarCollapsed ? '▶' : '◀'}
              </span>
            </button>
            
            <button 
              className="control-button"
              onClick={layout.toggleEducationPanel}
              aria-label={layout.showEducationPanel ? 'Hide education panel' : 'Show education panel'}
            >
              <span className="control-icon">
                {layout.showEducationPanel ? '📚' : '📖'}
              </span>
            </button>
          </div>
        )}
      </header>
      
      <main className="app-main">
        <div className={`layout layout--${layout.screenSize}`}>
          {/* Sidebar - adapts to screen size */}
          {!layout.sidebarCollapsed && (
            <aside className="sidebar">
              <div className="sidebar-header">
                <h2>Contract Examples</h2>
                {layout.isMobile && (
                  <button 
                    className="close-button"
                    onClick={layout.toggleSidebar}
                    aria-label="Close examples list"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <ExamplesList 
                selectedExample={selectedExample}
                onSelectExample={(example) => {
                  setSelectedExample(example);
                  // Auto-close sidebar on mobile after selection
                  if (layout.isMobile) {
                    layout.setSidebarCollapsed(true);
                  }
                }}
              />
            </aside>
          )}
          
          {/* Main content area */}
          <section className="content">
            <ContractTester 
              selectedExample={selectedExample}
              layout={layout}
            />
          </section>
        </div>
      </main>
      
      {/* Mobile floating action button for sidebar */}
      {layout.isMobile && layout.sidebarCollapsed && (
        <button 
          className="fab"
          onClick={layout.toggleSidebar}
          aria-label="Open examples list"
        >
          📋
        </button>
      )}
    </div>
  );
}

export default App
