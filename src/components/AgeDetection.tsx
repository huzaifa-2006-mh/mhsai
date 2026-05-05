"use client";

import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';
import { ShieldCheck, History, Clock, Activity, Loader2 } from 'lucide-react';

const MODEL_URL = 'https://vladmandic.github.io/face-api/model/';

export default function AgeDetection() {
  const webcamRef = useRef<Webcam>(null);
  const [result, setResult] = useState<{age: number, gender: string, confidence: number} | null>(null);
  const [logs, setLogs] = useState<{timestamp: number, value: string}[]>([]);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log("Loading models...");
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelsLoaded(true);
        console.log("Models loaded successfully");
      } catch (error) {
        console.error("Error loading models:", error);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (!isModelsLoaded) return;

    const interval = setInterval(async () => {
      if (webcamRef.current && webcamRef.current.video) {
        const video = webcamRef.current.video;
        const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withAgeAndGender();

        if (detections) {
          const roundedAge = Math.round(detections.age);
          setResult({
            age: roundedAge,
            gender: detections.gender,
            confidence: detections.detection.score
          });
          
          // Log detection if it's new or stable
          if (logs.length === 0 || Math.abs(logs[0].timestamp - Date.now()) > 3000) {
             setLogs(prev => [{timestamp: Date.now(), value: `Detected ${detections.gender} (~${roundedAge}y)`}, ...prev].slice(0, 10));
          }
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isModelsLoaded, logs.length]);

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
        {!isModelsLoaded && (
          <div className="camera-placeholder" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', zIndex: 10 }}>
            <Loader2 className="pulse" size={48} />
            <p style={{ marginTop: '1rem' }}>Loading Neural Models...</p>
          </div>
        )}
      </div>

      <div className="analysis-panel">
        <div className="glass stat-card main-stat">
          <div className="stat-header">
            <ShieldCheck size={18} color="var(--secondary)" /> 
            <span>Detection Result</span>
          </div>
          <div className="stat-content">
            <div className="stat-val">
              {result?.age ? `${result.age}` : isModelsLoaded ? 'Scanning' : '--'} 
              {result?.age && <span style={{ fontSize: '1rem', color: 'var(--text-dim)', marginLeft: '10px' }}>Years</span>}
            </div>
            <div className="confidence-bar">
              <div className="confidence-fill" style={{ width: result?.confidence ? `${result.confidence * 100}%` : '0%' }}></div>
            </div>
            <p className="stat-desc" style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              AI Confidence: {result?.confidence ? `${(result.confidence * 100).toFixed(1)}%` : isModelsLoaded ? 'Calibrating...' : 'Offline'}
            </p>
            {result?.gender && (
              <p style={{ marginTop: '1rem', color: 'var(--secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Gender: {result.gender}
              </p>
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
