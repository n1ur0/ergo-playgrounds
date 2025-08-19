import React, { useState } from 'react';
import ContractTester from './components/ContractTester';
import ExamplesList from './components/ExamplesList';
import './App.css';

function App() {
  const [selectedExample, setSelectedExample] = useState<string | null>(null);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Ergo Smart Contract Playground</h1>
        <p>Test and interact with ErgoScript smart contracts</p>
      </header>
      
      <main className="app-main">
        <div className="layout">
          <aside className="sidebar">
            <ExamplesList 
              selectedExample={selectedExample}
              onSelectExample={setSelectedExample}
            />
          </aside>
          
          <section className="content">
            <ContractTester 
              selectedExample={selectedExample}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

export default App
