import React from 'react';
import { 
  Sparkles, 
  Code, 
  Zap, 
  Shield, 
  ArrowRight,
  Globe,
  Terminal,
  Library
} from 'lucide-react';
import { motion } from 'framer-motion';

const GettingStarted = ({ onGetStarted }) => {
  const features = [
    {
      icon: <Code className="text-blue-500" />,
      title: "Clean Code Generation",
      description: "Generate production-ready code in Python, JS, C++, and more with just a prompt."
    },
    {
      icon: <Zap className="text-yellow-500" />,
      title: "Instant Results",
      description: "Get complex algorithms and UI layouts in seconds, saving hours of manual work."
    },
    {
      icon: <Shield className="text-green-500" />,
      title: "Secure & Reliable",
      description: "AlphaBot follows best practices to ensure your generated code is safe and efficient."
    }
  ];

  return (
    <div className="landing-page">
      {/* Background decoration */}
      <div className="bg-glow-top"></div>
      <div className="bg-glow-bottom"></div>

      <nav className="nav-simple">
        <div className="logo-section">
          <div className="logo-square">
            <Code size={20} />
          </div>
          <span className="logo-text">AI CodeGen</span>
        </div>
        <div className="nav-links">
          <span>Docs</span>
          <span>Community</span>
          <button className="btn-secondary">Login</button>
        </div>
      </nav>

      <main className="hero-container">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero-content"
        >
          <div className="badge">
            <Sparkles size={14} className="text-blue-400" />
            <span>Next Gen AI Coding</span>
          </div>
          <h1 className="hero-title">
            The Future of <span className="gradient-text">Coding</span> is Here.
          </h1>
          <p className="hero-subtitle">
            Generate complex apps, debug tricky bugs, and learn complex concepts 
            instantly with our state-of-the-art AI Code Generator.
          </p>
          <div className="cta-group">
            <button className="btn-primary-lg" onClick={onGetStarted}>
              Get Started for Free
              <ArrowRight size={18} />
            </button>
            <button className="btn-outline-lg">
              View Demo
            </button>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div className="feature-grid">
          {features.map((f, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (i + 1) }}
              className="feature-card"
            >
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-description">{f.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Language Support Section */}
        <section className="lang-section">
            <p className="lang-label">Supported Languages</p>
            <div className="lang-icons">
               <div className="lang-tag">Python</div>
               <div className="lang-tag">JavaScript</div>
               <div className="lang-tag">HTML/CSS</div>
            </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>© 2024 AI CodeGen. All rights reserved.</p>
        <div className="footer-links">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
        </div>
      </footer>
    </div>
  );
};

export default GettingStarted;
