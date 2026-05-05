"use client";

import { useState } from 'react';
import { 
  MousePointer2, 
  UserCheck, 
  ChevronLeft, 
  Activity, 
  Cpu, 
} from 'lucide-react';
import AirWriting from './AirWriting';
import AgeDetection from './AgeDetection';

export default function AIContainer() {
  const [mode, setMode] = useState<'hero' | 'writing' | 'age'>('hero');

  return (
    <div className="container">
      <nav className="nav-container animate-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="logo-box">
            <Cpu size={24} color="white" />
          </div>
          <div>
            <h2 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>MHS AI</h2>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '1px', textTransform: 'uppercase' }}>Vision Intelligence</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className={`glass status-pill open`}>
            <div className={`status-dot open`}></div>
            System Online
          </div>
        </div>
      </nav>

      {mode === 'hero' && (
        <section className="hero animate-in">
          <div className="badge-premium">
            <Activity size={16} /> Neural Engine v3.0 Online
          </div>
          <h1 className="gradient-text hero-title">Future of Vision AI</h1>
          <p className="hero-subtitle">
            Experience the next generation of human-computer interaction. 
            Write in the air or analyze facial biometrics with millisecond precision, all powered by client-side neural networks.
          </p>
          
          <div className="feature-grid">
            <div className="feature-card glass glass-hover" onClick={() => setMode('writing')}>
              <div className="icon-box">
                <MousePointer2 size={32} />
              </div>
              <h3>Air Writing</h3>
              <p>Spatial tracking turns your index finger into a digital brush. Draw in mid-air with zero-latency browser processing.</p>
              <div className="card-footer">Launch Module →</div>
            </div>
            
            <div className="feature-card glass glass-hover" onClick={() => setMode('age')}>
              <div className="icon-box" style={{ background: 'rgba(0, 242, 254, 0.1)', color: 'var(--secondary)' }}>
                <UserCheck size={32} />
              </div>
              <h3>Age Detection</h3>
              <p>Deep neural networks analyze facial landmarks to estimate age and biological attributes instantly in your browser.</p>
              <div className="card-footer">Launch Module →</div>
            </div>
          </div>
        </section>
      )}

      {mode !== 'hero' && (
        <div className="animate-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', marginTop: '2rem' }}>
            <button 
              onClick={() => setMode('hero')} 
              className="btn btn-glass"
            >
              <ChevronLeft size={20} /> Exit Module
            </button>
            <div className="module-title" style={{ fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>
              {mode === 'writing' ? 'Air Writing Recognition' : 'Facial Attribute Analysis'}
            </div>
          </div>
          
          {mode === 'writing' ? <AirWriting /> : <AgeDetection />}
        </div>
      )}
    </div>
  );
}
