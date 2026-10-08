import React, { useEffect, useRef, useState } from 'react';
import ScannerWorker from '../workers/scanner.worker?worker';
import { Camera } from '@capacitor/camera';

interface ScannerProps {
  onScan: (data: string) => void;
  paused?: boolean;
}

export const Scanner: React.FC<ScannerProps> = ({ onScan, paused = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const isWorkerBusy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const requestNativePermission = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const status = await Camera.requestPermissions();
        if (status.camera === 'granted' || status.camera === 'limited') {
          setError(null);
          setRetry(r => r + 1); // Trigger restart
        } else {
          setError('Permission denied by user.');
        }
      } else {
        // On web, just prompt again by trying to access
        setError(null);
        setRetry(r => r + 1);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to request permission');
    }
  };

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new ScannerWorker();
    
    workerRef.current.onmessage = (event) => {
      isWorkerBusy.current = false;
      if (event.data.type === 'success') {
        onScan(event.data.data);
      }
    };

    let stream: MediaStream | null = null;
    let animationFrameId: number;
    let frameQueue: ImageBitmap[] = [];
    let isProcessing = false;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { ideal: 'environment' }, 
            width: { ideal: 640 }, 
            height: { ideal: 480 }, 
            frameRate: { ideal: 60 } 
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err: any) {
        setError(err.message || 'Error accessing camera. Permission may be denied.');
      }
    };

    let barcodeDetector: any = null;
    if ('BarcodeDetector' in window) {
      try {
        barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        console.warn('BarcodeDetector initialization failed', e);
      }
    }

    const processQueue = async () => {
      if (isProcessing || paused || frameQueue.length === 0) return;
      isProcessing = true;
      
      const frame = frameQueue.shift();
      if (frame) {
        try {
          if (barcodeDetector) {
            const barcodes = await barcodeDetector.detect(frame);
            if (barcodes.length > 0) {
              onScan(barcodes[0].rawValue);
            }
          } else {
            // Fallback to jsQR Web Worker
            if (canvasRef.current) {
              const canvas = canvasRef.current;
              canvas.width = frame.width;
              canvas.height = frame.height;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(frame, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                isWorkerBusy.current = true;
                workerRef.current?.postMessage({
                  data: imageData.data,
                  width: imageData.width,
                  height: imageData.height
                });
                // Note: Worker response resets isWorkerBusy.
              }
            }
          }
        } catch (e) {
          console.warn("Frame processing error", e);
        }
        frame.close(); // Critical for memory management
      }
      
      isProcessing = false;
      if (frameQueue.length > 0) {
        processQueue(); // Process next immediately
      }
    };

    let lastCaptureTime = 0;

    const tick = (time: number) => {
      if (!videoRef.current) return;
      
      // Throttle capture to ~20 FPS (50ms) to match the Sender's 12 FPS.
      // This prevents the buffer from filling up with 5 identical frames of the same QR code!
      if (!paused && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && time - lastCaptureTime > 50) {
        lastCaptureTime = time;
        // Fast capture to buffer (async)
        window.createImageBitmap(videoRef.current).then(bitmap => {
          // Keep buffer manageable (e.g. max 180 frames = ~9 seconds of 20FPS backlog)
          if (frameQueue.length > 180) {
            const dropped = frameQueue.shift();
            dropped?.close();
          }
          frameQueue.push(bitmap);
          processQueue();
        }).catch(() => {});
      }
      
      animationFrameId = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      // Clear queue and free memory
      frameQueue.forEach(frame => frame.close());
      frameQueue = [];
    };
  }, [onScan, paused, retry]);

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
      {error && (
        <div className="absolute z-30 flex flex-col items-center justify-center bg-black/90 inset-0 p-4">
          <p className="text-red-400 font-bold mb-4 text-center">{error}</p>
          <button 
            onClick={requestNativePermission}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition-colors"
          >
            Grant Camera Permission
          </button>
        </div>
      )}
      <video ref={videoRef} className="absolute min-w-full min-h-full object-cover" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
        <div className="w-48 h-48 sm:w-64 sm:h-64 border-2 border-white/50 rounded-lg relative overflow-hidden scanner-overlay">
          {!paused && <div className="scan-line" />}
        </div>
      </div>
      {paused && (
        <div className="absolute inset-0 z-20 bg-black/60 flex items-center justify-center text-white/80 font-medium">
          Scanner Paused
        </div>
      )}
    </div>
  );
};
