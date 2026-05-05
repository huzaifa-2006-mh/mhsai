"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { RefreshCw, ShieldCheck, History, Clock, Activity, Loader2, AlertCircle } from 'lucide-react';

export default function AirWriting() {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement>(null);
  const [logs, setLogs] = useState<{timestamp: number, value: string}[]>([]);
  const lastPointRef = useRef<{x: number, y: number} | null>(null);
  const handsRef = useRef<any>(null);
  const requestRef = useRef<number>();
  const [status, setStatus] = useState<string>("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize MediaPipe Hands
  useEffect(() => {
    let hands: any;
    
    const initHands = async () => {
      try {
        setStatus("Loading Hand Tracker...");
        // @ts-ignore
        const mpHands = await import('@mediapipe/hands');
        
        const HandsClass = mpHands.Hands || (mpHands.default && mpHands.default.Hands);
        if (!HandsClass) throw new Error("MediaPipe Hands class not found");

        hands = new HandsClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7
        });

        hands.onResults(onResults);
        handsRef.current = hands;
        setIsLoaded(true);
        setStatus("System Ready");
        
        // Start the loop
        requestRef.current = requestAnimationFrame(detectionLoop);
      } catch (err: any) {
        console.error("Failed to init MediaPipe:", err);
        setError("Failed to load Hand Tracker. Please refresh.");
        setStatus("Error");
      }
    };

    initHands();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (hands) hands.close();
    };
  }, []);

  const detectionLoop = useCallback(async () => {
    if (webcamRef.current && webcamRef.current.video && handsRef.current) {
      const video = webcamRef.current.video;
      if (video.readyState >= 2) {
        try {
          await handsRef.current.send({ image: video });
        } catch (err) {
          console.error("MediaPipe Send Error:", err);
        }
      }
    }
    requestRef.current = requestAnimationFrame(detectionLoop);
  }, []);

  const onResults = useCallback(async (results: any) => {
    if (!canvasRef.current || !inkCanvasRef.current || !webcamRef.current?.video) return;
    
    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    const inkCanvas = inkCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const inkCtx = inkCanvas.getContext('2d');
    
    if (!ctx || !inkCtx) return;

    // Sync dimensions
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      inkCanvas.width = video.videoWidth;
      inkCanvas.height = video.videoHeight;
      // Re-setup ink styles
      inkCtx.strokeStyle = '#00f2fe';
      inkCtx.lineWidth = 10;
      inkCtx.lineCap = 'round';
      inkCtx.lineJoin = 'round';
      inkCtx.shadowBlur = 15;
      inkCtx.shadowColor = 'rgba(0, 242, 254, 0.8)';
    }

    // Clear main display canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw persistent ink
    ctx.drawImage(inkCanvas, 0, 0);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setStatus("Tracking Hand");
      const landmarks = results.multiHandLandmarks[0];
      
      // Index finger tip (8) and index finger base (5)
      const indexTip = landmarks[8];
      const indexDip = landmarks[7];
      const middleTip = landmarks[12];
      
      // Coordinate mapping (with mirroring)
      const x = (1 - indexTip.x) * canvas.width;
      const y = indexTip.y * canvas.height;

      // Gesture Logic: Index finger extended AND higher than other fingers
      // Simpler check: index tip is significantly above index dip
      const isWriting = indexTip.y < indexDip.y && indexTip.y < middleTip.y;

      if (isWriting) {
        if (!lastPointRef.current) {
          setLogs(prev => [{timestamp: Date.now(), value: "Started Writing"}, ...prev].slice(0, 10));
        } else {
          // Draw line segment on persistent ink canvas
          inkCtx.beginPath();
          inkCtx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
          inkCtx.lineTo(x, y);
          inkCtx.stroke();
        }
        lastPointRef.current = { x, y };

        // Draw "pen" cursor
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        if (lastPointRef.current) {
           setLogs(prev => [{timestamp: Date.now(), value: "Writing Paused"}, ...prev].slice(0, 10));
        }
        lastPointRef.current = null;
      }

      // Draw hand skeleton (optional but good for user confidence)
      try {
        const drawingUtils = await import('@mediapipe/drawing_utils');
        const mpHands = await import('@mediapipe/hands');
        const connections = mpHands.HAND_CONNECTIONS || (mpHands.default && mpHands.default.HAND_CONNECTIONS);
        
        if (drawingUtils && connections) {
          drawingUtils.drawConnectors(ctx, landmarks, connections, {color: 'rgba(125, 51, 255, 0.4)', lineWidth: 2});
          drawingUtils.drawLandmarks(ctx, landmarks, {color: '#00f2fe', lineWidth: 1, radius: 2});
        }
      } catch (e) {}
    } else {
      setStatus("Scanning for hand...");
      lastPointRef.current = null;
    }
  }, []);

  const resetCanvas = () => {
    if (inkCanvasRef.current) {
      const ctx = inkCanvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, inkCanvasRef.current.width, inkCanvasRef.current.height);
    }
    lastPointRef.current = null;
    setLogs(prev => [{timestamp: Date.now(), value: "Canvas Cleared"}, ...prev].slice(0, 10));
  };

  return (
    <div className="camera-view">
      <div className="camera-wrapper glass">
        <div className="badge-live">Live Feed</div>
        <Webcam
          ref={webcamRef}
          className="camera-feed"
          mirrored={true}
          videoConstraints={{
            width: 1280,
            height: 720,
            facingMode: "user"
          }}
        />
        <canvas 
          ref={canvasRef} 
          className="camera-canvas"
        />
        <canvas 
          ref={inkCanvasRef} 
          style={{display: 'none'}}
        />
        <div className="camera-overlay"></div>
        
        {(!isLoaded || error) && (
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
            <button onClick={resetCanvas} className="btn btn-primary w-full">
              <RefreshCw size={20} /> Clear Canvas
            </button>
            <div className="hint-box" style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-dim)', lineHeight: '1.4' }}>
              <p><strong>How to write:</strong></p>
              <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
                <li>Point your <strong>index finger</strong> up to draw.</li>
                <li>Fold your finger or show your palm to stop.</li>
                <li>Move slowly for best results.</li>
              </ul>
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
              <div className="no-logs" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                <Activity size={24} className="pulse" />
                <p style={{ marginTop: '1rem' }}>Waiting for gestures...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
