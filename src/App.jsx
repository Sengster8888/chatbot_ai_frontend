import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Download,
  Play,
  User,
  MoreVertical,
  Plus,
  Trash2,
  FileCode,
  Layout,
  Code2,
  Bug,
  Lightbulb,
  Moon,
  Sun,
  Code,
  Terminal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

import GettingStarted from './GettingStarted';
import chatbotIcon from './assets/chatbot.png';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/chat';

function App() {
  const [view, setView] = useState('landing'); // 'landing' or 'dashboard'
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse chat history", e);
      return [];
    }
  });
  
  const [input, setInput] = useState('');
  const [promptType, setPromptType] = useState('code');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [streamingMessage, setStreamingMessage] = useState('');
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(null);
  const [programmingLanguage, setProgrammingLanguage] = useState('Python');

  // Effect for theme
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Effect for saving history
  useEffect(() => {
    if (isLoading) return;
    try {
      localStorage.setItem('chat_history', JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save chat history", e);
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { 
      role: 'user', 
      content: input.trim(), 
      type: promptType, 
      lang: programmingLanguage,
      timestamp: new Date().toISOString()
    };
    
    const sessionMessages = [userMessage];
    setIsLoading(true);
    setStreamingMessage('');
    setSelectedHistoryIndex(null);

    const currentType = programmingLanguage === 'HTML/CSS' ? 'ui' : 'code';

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: sessionMessages.map((m) => ({ role: m.role, content: m.content })),
          type: currentType,
          lang: programmingLanguage,
        }),
      });

      if (!response.ok) throw new Error('Failed to connect to the server');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

          const dataStr = trimmedLine.replace(/^data: /, '').trim();
          if (dataStr === '[DONE]') break;

          try {
            const data = JSON.parse(dataStr);
            if (data.content) {
              assistantMessage += data.content;
              setStreamingMessage(assistantMessage);
            } else if (data.error) {
              throw new Error(data.details || data.error);
            }
          } catch (e) {
            console.error('SSE Parse Error:', e);
          }
        }
      }

      const finalAssistantMessage = { 
        role: 'assistant', 
        content: assistantMessage,
        type: currentType,
        timestamp: new Date().toISOString()
      };
      
      const newHistory = [...messages, userMessage, finalAssistantMessage];
      setMessages(newHistory);
      setSelectedHistoryIndex(newHistory.length - 1);
      setStreamingMessage('');
      setIsLoading(false);
      setInput('');

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = { role: 'assistant', content: `Error: ${error.message}` };
      setMessages(prev => [...prev, userMessage, errorMessage]);
      setIsLoading(false);
    }
  };

  const getCodeBlocks = (content) => {
    const codeBlocks = [];
    const regex = /```(\w+)?\s?\n?([\s\S]*?)```/g;
    let m;
    while ((m = regex.exec(content)) !== null) {
      codeBlocks.push({ lang: m[1]?.toLowerCase(), code: m[2] });
    }
    return codeBlocks;
  };

  const handleCopy = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (code, lang) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-code.${lang || 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRun = (code, lang) => {
    if (!code) return;
    const combined = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>body { font-family: sans-serif; padding: 20px; }</style>
        </head>
        <body>
          ${lang === 'html' ? code : `<pre>${code}</pre>`}
          ${lang === 'javascript' || lang === 'js' ? `<script>${code}</script>` : ''}
        </body>
      </html>
    `;
    const blob = new Blob([combined], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all history?')) {
      setMessages([]);
      setSelectedHistoryIndex(null);
      localStorage.removeItem('chat_history');
    }
  };

  const handleExplainCode = async (codeSnippet) => {
    const explainPromptText = `Explain this ${programmingLanguage} code:\n\n${codeSnippet}`;
    setPromptType('explain');
    setInput(explainPromptText);
  };

  const getDisplayContent = () => {
    if (isLoading && streamingMessage) return streamingMessage;
    if (selectedHistoryIndex !== null && messages[selectedHistoryIndex]) {
      return messages[selectedHistoryIndex].content;
    }
    return null;
  };

  const getExplanationOnly = (content) => {
    if (!content) return "";
    return content.replace(/```(\w+)?\s?\n?([\s\S]*?)```/g, "").trim();
  };

  const displayContent = getDisplayContent();
  const codeBlocks = displayContent ? getCodeBlocks(displayContent) : [];
  const hasCode = codeBlocks.length > 0;
  const historyRequests = messages.filter(m => m.role === 'user');

  if (view === 'landing') {
    return <GettingStarted onGetStarted={() => setView('dashboard')} />;
  }

  return (
    <div className="app-wrapper">
      <header className="top-bar">
        <div className="logo-section" style={{ cursor: 'pointer' }} onClick={() => setView('landing')}>
          <div className="logo-square">
            <Code size={20} />
          </div>
          <h1 className="logo-text">AI CodeGen</h1>
        </div>
        
        <div className="top-right-actions">
          <button className="theme-toggle-v2" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="user-profile">
            <div className="user-avatar-placeholder">
              <User size={20} />
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <aside className="panel-left">
          <div className="ui-card">
            <label className="card-label">Describe your function</label>
            <div className="prompt-input-container">
              <textarea
                className="prompt-textarea-v2"
                placeholder="Describe the function you want to create..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <div className="controls-row">
                <select 
                  className="lang-select-v2"
                  value={programmingLanguage}
                  onChange={(e) => setProgrammingLanguage(e.target.value)}
                >
                  <option>Python</option>
                  <option>JavaScript</option>
                  <option>HTML/CSS</option>
                </select>
                <button 
                  className="generate-btn" 
                  onClick={handleSubmit}
                  disabled={isLoading || !input.trim()}
                >
                  {isLoading ? <Loader2 size={18} className="spin-slow" /> : <Sparkles size={18} />}
                  <span>Generate Code</span>
                </button>
              </div>
            </div>
          </div>

          <div className="ui-card history-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label className="card-label" style={{ marginBottom: 0 }}>Your Request History</label>
              <button onClick={handleClearHistory} className="icon-btn" title="Clear All">
                <Trash2 size={16} />
              </button>
            </div>
            <div className="history-list">
              {historyRequests.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No requests yet. Try generating some code!
                </div>
              ) : (
                historyRequests.map((req, idx) => {
                  const fullIndex = messages.findIndex(m => m.timestamp === req.timestamp) + 1;
                  const isActive = selectedHistoryIndex === fullIndex;
                  
                  return (
                    <div 
                      key={idx} 
                      className={`history-item ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedHistoryIndex(fullIndex)}
                    >
                      <span className="history-text">{req.content}</span>
                      <MoreVertical size={14} style={{ opacity: 0.5 }} />
                    </div>
                  );
                }).reverse()
              )}
            </div>
          </div>
        </aside>

        <section className="panel-right">
          {!displayContent && !isLoading && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', gap: '16px' }}>
              <Code2 size={64} strokeWidth={1} style={{ opacity: 0.2 }} />
              <div>
                <h2 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>Ready to Code</h2>
                <p>Describe your needs on the left and I'll generate the solution here.</p>
              </div>
            </div>
          )}

          {(displayContent || isLoading) && (
            <>
              <div className="ui-card">
                <div className="output-header">
                  <h2 className="output-title">Generated Code</h2>
                </div>
                
                <div className="code-result-v2">
                  <div className="code-header-v2">
                    <span className="code-lang">{hasCode ? codeBlocks[0].lang : programmingLanguage}</span>
                    <div className="code-actions-top">
                      <button 
                        className="action-btn-v2" 
                        onClick={() => hasCode && handleCopy(codeBlocks[0].code, 'main-copy')}
                      >
                        {copiedId === 'main-copy' ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedId === 'main-copy' ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button 
                        className="action-btn-v2"
                        onClick={() => hasCode && handleDownload(codeBlocks[0].code, codeBlocks[0].lang)}
                      >
                        <Download size={14} />
                        <span>Download</span>
                      </button>
                      <button 
                        className="action-btn-v2 primary"
                        onClick={() => hasCode && handleRun(codeBlocks[0].code, codeBlocks[0].lang)}
                      >
                        <Play size={14} fill="currentColor" />
                        <span>Run Code</span>
                      </button>
                    </div>
                  </div>
                  <div className="code-body-v3">
                    {isLoading && !streamingMessage ? (
                      <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="shimmer-line" style={{ width: '80%' }} />
                        <div className="shimmer-line" style={{ width: '60%' }} />
                        <div className="shimmer-line" style={{ width: '70%' }} />
                      </div>
                    ) : (
                      <SyntaxHighlighter
                        language={hasCode ? codeBlocks[0].lang : 'javascript'}
                        style={vscDarkPlus}
                        showLineNumbers={true}
                        customStyle={{ margin: 0, padding: '20px', fontSize: '14px', background: 'transparent' }}
                      >
                        {hasCode ? codeBlocks[0].code : (streamingMessage || "Generating...")}
                      </SyntaxHighlighter>
                    )}
                  </div>
                </div>
              </div>

              <div className="ui-card explanation-card">
                <label className="card-label">Code Explanation</label>
                <div className="markdown-content-v2">
                   {isLoading && !streamingMessage ? (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                       <div className="shimmer-line" style={{ width: '100%' }} />
                       <div className="shimmer-line" style={{ width: '90%' }} />
                       <div className="shimmer-line" style={{ width: '95%' }} />
                     </div>
                   ) : (
                     <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {getExplanationOnly(displayContent)}
                      </ReactMarkdown>
                   )}
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="dashboard-footer" style={{ position: 'fixed', bottom: 0, width: '100%', padding: '12px 32px', display: 'flex', gap: '24px', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', backgroundColor: 'var(--panel-bg)', zIndex: 90 }}>
        <span>Documentation</span>
        <span>Pricing</span>
        <span>Support</span>
      </footer>
    </div>
  );
}

export default App;