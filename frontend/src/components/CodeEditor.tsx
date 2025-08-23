import React, { useRef, useEffect } from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import scala from 'react-syntax-highlighter/dist/esm/languages/prism/scala';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import { ergoScriptLanguage } from '../utils/ergoScriptLanguage';
import './CodeEditor.css';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, language }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Register only the languages we need
    SyntaxHighlighter.registerLanguage('scala', scala);
    SyntaxHighlighter.registerLanguage('typescript', typescript);
    
    // Register custom ErgoScript language
    if (language === 'ergoscript') {
      try {
        (SyntaxHighlighter as typeof SyntaxHighlighter & { registerLanguage: (name: string, fn: () => object) => void }).registerLanguage('ergoscript', () => ergoScriptLanguage);
      } catch (error) {
        console.warn('Could not register ErgoScript language:', error);
      }
    }
  }, [language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
  };

  const handleFormat = () => {
    // Basic formatting for ErgoScript
    const formatted = value
      .replace(/;/g, ';\n')
      .replace(/{/g, '{\n  ')
      .replace(/}/g, '\n}')
      .replace(/\n\s*\n/g, '\n');
    onChange(formatted);
  };

  return (
    <div className="code-editor">
      <div className="editor-header">
        <div className="language-badge">{language}</div>
        <div className="editor-actions">
          <button className="action-button" title="Format Code" onClick={handleFormat}>
            ⚡ Format
          </button>
          <button className="action-button" title="Copy Code" onClick={handleCopy}>
            📋 Copy
          </button>
        </div>
      </div>
      
      <div className="editor-container">
        <div className="editor-content">
          {/* Syntax highlighted background */}
          <SyntaxHighlighter
            language={language === 'ergoscript' ? 'scala' : language} // Fallback to Scala for similar syntax
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: '12px',
              background: 'transparent',
              fontSize: '14px',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              lineHeight: '1.4',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              overflow: 'hidden'
            }}
            showLineNumbers={false}
            wrapLines={true}
          >
            {value || ' '}
          </SyntaxHighlighter>
          
          {/* Invisible textarea for editing */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="code-textarea-overlay"
            spellCheck={false}
            placeholder="Enter your ErgoScript contract code here..."
          />
        </div>
        
        <div className="line-numbers">
          {value.split('\n').map((_, index) => (
            <div key={index} className="line-number">
              {index + 1}
            </div>
          ))}
        </div>
      </div>
      
      <div className="editor-footer">
        <div className="status-info">
          <span>Lines: {value.split('\n').length}</span>
          <span>Characters: {value.length}</span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;