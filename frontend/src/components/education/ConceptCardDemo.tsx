import React, { useState } from 'react';
import ConceptCard from './ConceptCard';

const ConceptCardDemo: React.FC = () => {
  const [interactionLog, setInteractionLog] = useState<string[]>([]);

  const handleInteraction = (conceptName: string, isFlipped: boolean) => {
    const action = isFlipped ? 'flipped to technical view' : 'flipped to simple view';
    setInteractionLog(prev => [...prev.slice(-4), `${conceptName}: ${action}`]);
  };

  const sampleConcepts = [
    {
      conceptName: "Smart Contract",
      simpleDefinition: "A smart contract is like a vending machine for the digital world. You put something in, and if you follow the rules, you get something out automatically!",
      analogy: "It's like having a super honest robot that never breaks promises and always follows the exact instructions you gave it.",
      technicalDefinition: "A smart contract is a self-executing contract with terms directly written into code. It runs on blockchain networks and automatically executes when predetermined conditions are met, without requiring intermediaries or central authorities.",
      icon: "🤖",
      category: "smart-contracts" as const,
      difficulty: "beginner" as const,
      examples: [
        "Automatic payments when a task is completed",
        "Digital collectibles (NFTs) that prove ownership",
        "Voting systems that count votes transparently",
        "Insurance that pays out automatically based on data"
      ]
    },
    {
      conceptName: "Blockchain",
      simpleDefinition: "Imagine a super special notebook that can never be erased or faked, and everyone has an exact copy. That's basically what a blockchain is!",
      analogy: "Think of it like a chain of transparent safes where everyone can see what's inside, but only the owner has the key to add new stuff.",
      technicalDefinition: "A blockchain is a distributed, immutable ledger that maintains a continuously growing list of records (blocks) linked using cryptographic hashes. Each block contains transaction data, timestamp, and the hash of the previous block.",
      icon: "⛓️",
      category: "blockchain" as const,
      difficulty: "starter" as const,
      examples: [
        "Bitcoin's transaction history",
        "Ethereum's smart contract platform",
        "Supply chain tracking systems",
        "Digital identity verification"
      ]
    },
    {
      conceptName: "ErgoScript",
      simpleDefinition: "ErgoScript is the special language that tells Ergo blockchain what to do. It's like writing instructions for a very smart, very honest computer.",
      analogy: "It's like writing a recipe that a robot chef follows perfectly every single time - no mistakes, no shortcuts, just exactly what you wrote.",
      technicalDefinition: "ErgoScript is Ergo's smart contract language based on Σ-protocols and UTXO model. It provides powerful cryptographic operations while maintaining predictable execution costs and enhanced privacy features through zero-knowledge proofs.",
      icon: "📝",
      category: "ergoscript" as const,
      difficulty: "intermediate" as const,
      examples: [
        "Token creation and management contracts",
        "Decentralized exchange (DEX) protocols",
        "Multi-signature wallet security",
        "Privacy-preserving payment systems"
      ]
    },
    {
      conceptName: "Cryptocurrency",
      simpleDefinition: "Crypto is digital money that exists only on computers, but it's super secure because of special math that makes it impossible to fake or steal.",
      analogy: "It's like having magical coins that can teleport instantly anywhere in the world, and everyone can verify they're real without touching them.",
      technicalDefinition: "Cryptocurrency is a digital asset secured by cryptographic algorithms, operating on decentralized networks. It uses consensus mechanisms to validate transactions and maintain network security without central banks or governments.",
      icon: "💰",
      category: "crypto" as const,
      difficulty: "beginner" as const,
      examples: [
        "Bitcoin (BTC) - the first cryptocurrency",
        "Ethereum (ETH) - programmable money",
        "Ergo (ERG) - privacy-focused digital currency",
        "Stablecoins - crypto tied to real currency"
      ]
    },
    {
      conceptName: "Hash Function",
      simpleDefinition: "A hash is like a fingerprint for digital information. No matter how big the information is, it always creates a unique short code that identifies it.",
      analogy: "It's like having a super-fast artist who can look at anything and instantly draw a unique sketch that always looks the same for that thing.",
      technicalDefinition: "A cryptographic hash function is a mathematical algorithm that maps input data of arbitrary size to a fixed-size string of characters. It's deterministic, avalanche-effect sensitive, and computationally infeasible to reverse.",
      icon: "🔐",
      category: "crypto" as const,
      difficulty: "intermediate" as const,
      examples: [
        "SHA-256 used in Bitcoin mining",
        "File integrity verification",
        "Password storage security",
        "Blockchain block linking"
      ]
    },
    {
      conceptName: "UTXO Model",
      simpleDefinition: "UTXO is like having digital coins in your pocket. Each coin knows exactly how much it's worth, and when you spend it, you get new coins as change.",
      analogy: "It's like paying with exact change at a store, but the cashier gives you brand new coins instead of putting your old ones in the register.",
      technicalDefinition: "Unspent Transaction Output (UTXO) is a blockchain accounting model where each transaction consumes previous outputs and creates new ones. It ensures parallel processing, better privacy, and easier verification compared to account-based systems.",
      icon: "🪙",
      category: "blockchain" as const,
      difficulty: "advanced" as const,
      examples: [
        "Bitcoin's transaction structure",
        "Ergo's box-based smart contracts",
        "Parallel transaction processing",
        "Enhanced privacy through output mixing"
      ]
    }
  ];

  return (
    <div style={{ 
      padding: '2rem', 
      background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #64b5f6, #42a5f5)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          margin: '0 0 1rem 0'
        }}>
          Blockchain Concept Cards
        </h1>
        <p style={{
          fontSize: '1.2rem',
          color: 'rgba(255, 255, 255, 0.8)',
          maxWidth: '600px',
          margin: '0 auto 2rem auto',
          lineHeight: 1.6
        }}>
          Learn blockchain and ErgoScript concepts through interactive, engaging cards designed for young learners! 
          Click "Learn More" to flip any card and dive deeper.
        </p>
        
        {interactionLog.length > 0 && (
          <div style={{
            background: 'rgba(100, 181, 246, 0.1)',
            border: '1px solid rgba(100, 181, 246, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            <h3 style={{ 
              color: '#64b5f6', 
              margin: '0 0 0.5rem 0',
              fontSize: '1rem'
            }}>
              Recent Interactions:
            </h3>
            {interactionLog.map((log, index) => (
              <div key={index} style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.9rem',
                padding: '0.25rem 0'
              }}>
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {sampleConcepts.map((concept, index) => (
          <ConceptCard
            key={index}
            {...concept}
            onInteraction={handleInteraction}
          />
        ))}
      </div>

      <div style={{ 
        textAlign: 'center', 
        marginTop: '4rem',
        padding: '2rem',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h2 style={{
          color: '#64b5f6',
          margin: '0 0 1rem 0',
          fontSize: '1.5rem'
        }}>
          Ready to Build? 🚀
        </h2>
        <p style={{
          color: 'rgba(255, 255, 255, 0.8)',
          margin: '0 0 1.5rem 0',
          fontSize: '1.1rem',
          lineHeight: 1.6
        }}>
          Now that you understand these concepts, you're ready to start building your own smart contracts! 
          Head over to the playground and start experimenting with real ErgoScript code.
        </p>
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button style={{
            padding: '1rem 2rem',
            background: 'linear-gradient(135deg, #4caf50, #66bb6a)',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}>
            Try the Playground
          </button>
          <button style={{
            padding: '1rem 2rem',
            background: 'rgba(100, 181, 246, 0.2)',
            border: '1px solid #64b5f6',
            borderRadius: '12px',
            color: '#64b5f6',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}>
            View Examples
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConceptCardDemo;