"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { ShieldCheck, History, Clock, Activity, Loader2, AlertCircle } from 'lucide-react';

const MODEL_URL = 'https://vladmandic.github.io/face-api/model/';

// Smoothing configuration
const BUFFER_SIZE = 15; // Number of frames to average

export default function AgeDetection() {
  const webcamRef = useRef<Webcam>(null);
  const [result, setResult] = useState<{age: number, gender: string, confidence: number} | null>(null);
  const [logs, setLogs] = useState<{timestamp: number, value: string}[]>([]);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [status, setStatus] = useState<string>("Initializing...");
  const [error, setError] = useState<string | null>(null);
  
  // Buffers for smoothing
  const ageBufferRef = useRef<number[]>([]);
  const genderBufferRef = useRef<string[]>([]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        setStatus("Loading High-Accuracy Models...");
        const faceapi = await import('@vladmandic/face-api');
        
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);
        
        setIsModelsLoaded(true);
        setStatus("AI System Online");
      } catch (err: any) {
        console.error("Error loading models:", err);
        setError("Failed to load AI models. Please check your internet connection.");
        setStatus("Error");
      }
    };
    loadModels();
  }, []);

  const getSmoothedAge = (newAge: number) => {
    ageBufferRef.current.push(newAge);
    if (ageBufferRef.current.length > BUFFER_SIZE) ageBufferRef.current.shift();
    const sum = ageBufferRef.current.reduce((a, b) => a + b, 0);
    return Math.round(sum / ageBufferRef.current.length);
  };

  const getSmoothedGender = (newGender: string) => {
    genderBufferRef.current.push(newGender);
    if (genderBufferRef.current.length > BUFFER_SIZE) genderBufferRef.current.shift();
    
    const counts: Record<string, number> = {};
    genderBufferRef.current.forEach(g => counts[g] = (counts[g] || 0) + 1);
    
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  };

  useEffect(() => {
    if (!isModelsLoaded) return;

    const interval = setInterval(async () => {
      try {
        if (webcamRef.current && webcamRef.current.video) {
          const video = webcamRef.current.video;
          if (video.readyState >= 2) {
            const faceapi = await import('@vladmandic/face-api');
            // Using SsdMobilenetv1 for much better accuracy than TinyFaceDetector
            const detections = await faceapi.detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
              .withFaceLandmarks()
              .withAgeAndGender();

            if (detections) {
              setStatus("Face Locked");
              
              const smoothedAge = getSmoothedAge(detections.age);
              const smoothedGender = getSmoothedGender(detections.gender);
              
              setResult({
                age: smoothedAge,
                gender: smoothedGender,
                confidence: detections.detection.score
              });
              
              // Only log if it's a "significant" update or first time
              const logMsg = `Detected ${smoothedGender} (~${smoothedAge}y)`;
              if (logs.length === 0 || logs[0].value !== logMsg) {
                 // Throttle logging to every 5 seconds for the same result
                 if (logs.length === 0 || Math.abs(logs[0].timestamp - Date.now()) > 5000) {
                    setLogs(prev => [{timestamp: Date.now(), value: logMsg}, ...prev].slice(0, 10));
                 }
              }
            } else {
              setStatus("Scanning for face...");
              // Clear buffers if no face for a while? Maybe not to keep stability
            }
          } else {
            setStatus("Waiting for camera...");
          }
        }
      } catch (err: any) {
        console.error("Age detection error:", err);
      }
    }, 300); // Slightly faster interval but smoothed

    return () => clearInterval(interval);
  }, [isModelsLoaded, logs]);

  return (
    <div className="camera-view">
      <div className="camera-wrapper glass">
        <div className="badge-live">Live Feed</div>
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          className="camera-feed"
          mirrored={true}
        />
        <div className="camera-overlay"></div>
        
        {(!isModelsLoaded || error) && (
          <div className="camera-placeholder" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', zIndex: 10, padding: '2rem', textAlign: 'center' }}>
            {error ? <AlertCircle size={48} color="var(--accent)" /> : <Loader2 className="pulse" size={48} />}
            <p style={{ marginTop: '1rem' }}>{error || status}</p>
          </div>
        )}
      </div>

      <div className="analysis-panel">
        <div className="glass stat-card main-stat">
          <div className="stat-header">
            <ShieldCheck size={18} color="var(--secondary)" /> 
            <span>System Status: <span style={{color: error ? 'var(--accent)' : 'var(--secondary)'}}>{status}</span></span>
          </div>
          <div className="stat-content">
            <div className="stat-val">
              {result?.age ? `${result.age}` : isModelsLoaded ? '--' : '--'} 
              {result?.age && <span style={{ fontSize: '1rem', color: 'var(--text-dim)', marginLeft: '10px' }}>Years</span>}
            </div>
            <div className="confidence-bar">
              <div className="confidence-fill" style={{ width: result?.confidence ? `${result.confidence * 100}%` : '0%' }}></div>
            </div>
            <p className="stat-desc" style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              AI Accuracy: {result?.confidence ? `${(result.confidence * 100).toFixed(1)}%` : isModelsLoaded ? 'Calibrating...' : 'Offline'}
            </p>
            {result?.gender && (
              <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Gender:</span>
                <span style={{ color: 'var(--secondary)', fontWeight: 800, textTransform: 'uppercase', fontSize: '1.2rem', letterSpacing: '2px' }}>
                  {result.gender}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="glass stat-card history-card">
          <div className="stat-header">
            <History size={18} color="var(--primary)" />
            <span>Biometric Log</span>
          </div>
          <div className="logs-container">
            {logs.length > 0 ? logs.map((log, i) => (
              <div key={i} className="log-entry animate-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="log-time">
                  <Clock size={12} />
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="log-val">{log.value}</div>
              </div>
            )) : (
              <div className="no-logs" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                <Activity size={24} className="pulse" />
                <p style={{ marginTop: '1rem' }}>Waiting for faces...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
