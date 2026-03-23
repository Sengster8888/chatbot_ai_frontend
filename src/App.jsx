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
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

import documentIcon from './assets/document.png';
import chatbotIcon from './assets/chatbot.png';

import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/chat';

function App() {
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

  const messagesEndRef = useRef(null);

  const scrollToBottom = (instant = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: instant ? 'auto' : 'smooth',
        block: 'end'
      });
    }
  };

  useEffect(() => {
    scrollToBottom(isLoading); // Use instant scroll while loading for tighter lock
  }, [messages, isLoading, streamingMessage]);

  // Separate effect for saving history (optimization: don't save every chunk)
  useEffect(() => {
    if (isLoading) return; // Wait until loading is done to save full history
    try {
      localStorage.setItem('chat_history', JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save chat history", e);
    }
  }, [messages, isLoading]);

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          type: promptType,
        }),
      });

      if (!response.ok) throw new Error('Failed to connect to the server');

      // Setup for streaming
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let buffer = '';
      let queue = '';
      let isProcessing = false;

      const processQueue = () => {
        if (queue.length === 0) {
          isProcessing = false;
          return;
        }
        
        isProcessing = true;
        const charsToProcess = Math.min(queue.length, Math.ceil(queue.length / 5) + 1);
        const segment = queue.substring(0, charsToProcess);
        queue = queue.substring(charsToProcess);
        assistantMessage += segment;

        setStreamingMessage(assistantMessage);

        requestAnimationFrame(processQueue);
      };

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          const flushRemaining = setInterval(() => {
            if (queue.length === 0) {
              clearInterval(flushRemaining);
              setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
              setStreamingMessage('');
              setIsLoading(false);
              return;
            }
            if (!isProcessing) processQueue();
          }, 50);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

          const dataStr = trimmedLine.replace(/^data: /, '').trim();
          if (dataStr === '[DONE]') break;

          try {
            const data = JSON.parse(dataStr);
            if (data.content) {
              queue += data.content;
              if (!isProcessing) processQueue();
            } else if (data.error) {
              throw new Error(data.details || data.error);
            }
          } catch (e) {
            console.error('SSE Error:', e);
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${error.message}` },
      ]);
      setStreamingMessage('');
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
        <div className="top-left">
          <Menu className="menu-icon" size={20} />
          <button 
            className="new-chat-btn" 
            onClick={() => { if(confirm('Start a new chat?')) { setMessages([]); setInput(''); } }}
            title="Start fresh"
          >
            <Plus size={18} />
            <span>New Chat</span>
          </button>
        </div>
        <div className="top-actions">
           <button className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
             {isDarkMode ? <Sparkles size={20} fill="#fdd835" /> : <Sparkles size={20} />}
           </button>
           <button className="clear-chat" onClick={() => { if(confirm('Clear history?')) setMessages([]); }}>
             <img src={documentIcon} alt="Clear history" className="menu-icon-img" title="Clear history" />
           </button>
        </div>
      </header>

      {isLanding ? (
        <main className="landing-view">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="logo-container"
          >
            <div className="logo-icon">
              <img src={chatbotIcon} alt="Logo" className="msg-avatar-img" />
            </div>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="landing-title"
          >
            AlphaBot
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
                   <select 
                     className="prompt-type-select" 
                     value={promptType} 
                     onChange={(e) => setPromptType(e.target.value)}
                   >
                     <option value="ui">✨ Web UI</option>
                     <option value="code">💻 Code</option>
                     <option value="debug">🐞 Debug</option>
                     <option value="explain">💡 Explain</option>
                   </select>
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
                  {m.role === 'assistant' ? <img src={chatbotIcon} alt="AI" className="msg-avatar-img" /> : <User size={18} />}
                </div>
                <div className="message-content">
                  <div className={m.role === 'user' ? 'user-message' : 'markdown-content'}>
                    {m.role === 'assistant' ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          pre: ({ children }) => {
                            const codeText = React.Children.toArray(children).reduce((acc, child) => {
                              return acc + (child.props?.children || '');
                            }, '');
                            return (
                              <div className="markdown-pre-wrapper">
                                <button 
                                  className="markdown-copy-btn" 
                                  onClick={() => handleCopy(codeText, codeText)}
                                  title="Copy code"
                                >
                                  {copiedId === codeText ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                                <pre>{children}</pre>
                              </div>
                            );
                          }
                        }}
                      >
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

            {streamingMessage && (
              <div className="message-row">
                <div className="avatar-circle ai-avatar">
                   <img src={chatbotIcon} alt="AI" className="msg-avatar-img" />
                </div>
                <div className="message-content">
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamingMessage}
                    </ReactMarkdown>
                    <span className="typing-cursor" />
                  </div>
                  <CodeResult content={streamingMessage} messageIndex="streaming" />
                </div>
              </div>
            )}
            
            {isLoading && !streamingMessage && (
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
                     <select 
                       className="prompt-type-select" 
                       value={promptType} 
                       onChange={(e) => setPromptType(e.target.value)}
                     >
                       <option value="ui">✨ Web UI</option>
                       <option value="code">💻 Code</option>
                       <option value="debug">🐞 Debug</option>
                       <option value="explain">💡 Explain</option>
                     </select>
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