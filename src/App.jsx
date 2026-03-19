import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Download,
  Play,
  Paperclip,
  User,
  Menu,
  MoreVertical,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

import './App.css';

const API_URL = 'http://localhost:3000/api/chat';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(API_URL, {
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: response.data.message }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
         ...prev,
        { role: 'assistant', content: 'Error: Could not reach the generator.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getCodeBlocks = (content) => {
    const codeBlocks = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
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

  const handleRun = (messageContent) => {
    const blocks = getCodeBlocks(messageContent);
    if (blocks.length === 0) return;

    const html = blocks.find(b => ['html', 'xml'].includes(b.lang))?.code || '';
    const css = blocks.find(b => b.lang === 'css')?.code || '';
    const js = blocks.find(b => ['javascript', 'js'].includes(b.lang))?.code || '';

    const combined = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${css}</style>
        </head>
        <body>
          ${html || (js || css ? '' : `<pre>${blocks[0].code}</pre>`)}
          <script>${js}</script>
        </body>
      </html>
    `;

    const blob = new Blob([combined], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const CodeResult = ({ content, messageIndex }) => {
    const blocks = getCodeBlocks(content);
    if (blocks.length === 0) return null;

    return (
      <div className="result-card">
        <div className="card-header">
          <span>{blocks[0].lang || 'code'}</span>
          <div className="card-actions">
            <button className="mini-action-btn" onClick={() => handleCopy(blocks[0].code, `${messageIndex}-copy`)}>
              {copiedId === `${messageIndex}-copy` ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedId === `${messageIndex}-copy` ? 'Copied' : 'Copy'}</span>
            </button>
            <button className="mini-action-btn" onClick={() => handleDownload(blocks[0].code, blocks[0].lang)}>
              <Download size={14} />
              <span>Download</span>
            </button>
            <button className="mini-action-btn success" onClick={() => handleRun(content)}>
              <Play size={14} fill="currentColor" />
              <span>Run</span>
            </button>
          </div>
        </div>
        <div className="code-viewport">
          <SyntaxHighlighter
            language={blocks[0].lang || 'javascript'}
            style={vscDarkPlus}
            showLineNumbers={true}
          >
            {blocks[0].code}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  };

  const isLanding = messages.length === 0;

  return (
    <div className="app-wrapper">
      <header className="top-bar">
        <Menu className="menu-icon" size={20} />
        <MoreVertical className="menu-icon" size={20} style={{marginLeft: 'auto'}} />
      </header>

      {isLanding ? (
        <main className="landing-view">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="logo-container"
          >
            <div className="logo-icon">
              <Sparkles size={36} fill="white" />
            </div>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="landing-title"
          >
            Your Copilot for work
          </motion.h1>

          <div className="prompt-container-outer">
            <form className="prompt-box" onSubmit={handleSubmit}>
              <textarea
                className="prompt-textarea"
                placeholder="A whole new way to work."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <div className="prompt-footer">
                <div className="footer-actions-left">
                   <button type="button" className="icon-btn"><Sparkles size={18} /></button>
                   <button type="button" className="icon-btn"><Paperclip size={18} /></button>
                </div>
                <button 
                  type="submit" 
                  className={`send-btn ${input.trim() ? 'active' : ''}`}
                  disabled={!input.trim() || isLoading}
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </div>
        </main>
      ) : (
        <main className="active-view">
          <div className="chat-container">
            {messages.map((m, i) => (
              <div key={i} className="message-row">
                <div className={`avatar-circle ${m.role === 'assistant' ? 'ai-avatar' : ''}`}>
                  {m.role === 'assistant' ? <Sparkles size={18} /> : <User size={18} />}
                </div>
                <div className="message-content">
                  <div className={m.role === 'user' ? 'user-message' : 'markdown-content'}>
                    {m.role === 'assistant' ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>
                    ) : (
                      m.content
                    )}
                  </div>
                  {m.role === 'assistant' && (
                    <CodeResult content={m.content} messageIndex={i} />
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="message-row">
                <div className="avatar-circle ai-avatar">
                   <Loader2 size={18} className="spin" />
                </div>
                <div className="loading-box">
                  <div className="shimmer-line" style={{width: '90%'}} />
                  <div className="shimmer-line" style={{width: '70%'}} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="floating-footer">
            <div className="prompt-container-outer">
              <form className="prompt-box" onSubmit={handleSubmit}>
                <textarea
                  className="prompt-textarea"
                  placeholder="Ask a follow up..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <div className="prompt-footer">
                  <div className="footer-actions-left">
                     <button type="button" className="icon-btn"><Sparkles size={18} /></button>
                     <button type="button" className="icon-btn"><Paperclip size={18} /></button>
                  </div>
                  <button 
                    type="submit" 
                    className={`send-btn ${input.trim() ? 'active' : ''}`}
                    disabled={!input.trim() || isLoading}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      )}

      <footer className="copyright">
        © 2024 SnowUI
      </footer>
    </div>
  );
}

export default App;