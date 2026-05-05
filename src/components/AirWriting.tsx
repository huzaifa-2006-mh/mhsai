"use client";

import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { RefreshCw, ShieldCheck, History, Clock, Activity } from 'lucide-react';

export default function AirWriting() {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement>(null);
  const [logs, setLogs] = useState<{timestamp: number, value: string}[]>([]);
  const pointsRef = useRef<{x: number, y: number}[]>([]);
  const handsRef = useRef<any>(null);

  useEffect(() => {
    let hands: any;
    
    const initHands = async () => {
      // @ts-ignore
      const mpHands = await import('@mediapipe/hands');
      hands = new mpHands.Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      const interval = setInterval(() => {
        if (webcamRef.current && webcamRef.current.video && handsRef.current) {
          handsRef.current.send({ image: webcamRef.current.video });
        }
      }, 50);

      return interval;
    };

    let intervalId: any;
    initHands().then(id => intervalId = id);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (hands) hands.close();
    };
  }, []);

  const onResults = async (results: any) => {
    if (!canvasRef.current || !offscreenCanvasRef.current) return;
    const canvasCtx = canvasRef.current.getContext('2d');
    const offscreenCtx = offscreenCanvasRef.current.getContext('2d');
    if (!canvasCtx || !offscreenCtx) return;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    // Clear main canvas
    canvasCtx.clearRect(0, 0, width, height);
    
    // Draw drawing on offscreen canvas
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const indexTip = landmarks[8];
      const indexDip = landmarks[6];

      const x = (1 - indexTip.x) * width; // Mirrored
      const y = indexTip.y * height;

      if (indexTip.y < indexDip.y) {
        // Finger is extended - Drawing
        pointsRef.current.push({ x, y });
        if (pointsRef.current.length === 1) {
          setLogs(prev => [{timestamp: Date.now(), value: "Started Writing"}, ...prev].slice(0, 10));
        }
      } else {
        // Finger is down - Breaking line
        pointsRef.current.push({ x: -1, y: -1 });
      }
    } else {
      pointsRef.current.push({ x: -1, y: -1 });
    }

    // Draw lines on offscreen canvas
    offscreenCtx.strokeStyle = '#00f2fe';
    offscreenCtx.lineWidth = 8;
    offscreenCtx.lineCap = 'round';
    offscreenCtx.lineJoin = 'round';

    for (let i = 1; i < pointsRef.current.length; i++) {
      const p1 = pointsRef.current[i - 1];
      const p2 = pointsRef.current[i];
      if (p1.x !== -1 && p2.x !== -1) {
        offscreenCtx.beginPath();
        offscreenCtx.moveTo(p1.x, p1.y);
        offscreenCtx.lineTo(p2.x, p2.y);
        offscreenCtx.stroke();
      }
    }

    // Copy offscreen to main
    canvasCtx.drawImage(offscreenCanvasRef.current, 0, 0);
    
    // Optional: Draw landmarks for feedback
    if (results.multiHandLandmarks) {
      const drawingUtils = await import('@mediapipe/drawing_utils');
      const mpHands = await import('@mediapipe/hands');
      for (const landmarks of results.multiHandLandmarks) {
        drawingUtils.drawConnectors(canvasCtx, landmarks, mpHands.HAND_CONNECTIONS, {color: '#7d33ff', lineWidth: 2});
        drawingUtils.drawLandmarks(canvasCtx, landmarks, {color: '#00f2fe', lineWidth: 1, radius: 2});
      }
    }
  };


  const resetCanvas = () => {
    if (offscreenCanvasRef.current) {
      const ctx = offscreenCanvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
    }
    pointsRef.current = [];
    setLogs(prev => [{timestamp: Date.now(), value: "Canvas Cleared"}, ...prev].slice(0, 10));
  };

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
        <canvas 
          ref={canvasRef} 
          className="camera-canvas"
          width={1280}
          height={720}
        />
        <canvas 
          ref={offscreenCanvasRef} 
          style={{display: 'none'}}
          width={1280}
          height={720}
        />
        <div className="camera-overlay"></div>
      </div>

      <div className="analysis-panel">
        <div className="glass stat-card main-stat">
          <div className="stat-header">
            <ShieldCheck size={18} color="var(--secondary)" /> 
            <span>Recognition Status</span>
          </div>
          <div className="stat-content">
            <button onClick={resetCanvas} className="btn btn-primary w-full">
              <RefreshCw size={20} /> Clear Canvas
            </button>
            <div className="hint-box" style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-dim)', lineHeight: '1.4' }}>
              <strong>Tip:</strong> Raise your index finger and keep it extended to start writing. Fold it to stop.
            </div>
          </div>
        </div>

        <div className="glass stat-card history-card">
          <div className="stat-header">
            <History size={18} color="var(--primary)" />
            <span>Real-time Log</span>
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
              <div className="no-logs">
                <Activity size={24} className="pulse" />
                <p>Waiting for gestures...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
