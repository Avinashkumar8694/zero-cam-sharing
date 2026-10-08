import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FileUp, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { zipSync } from 'fflate';

const CHUNK_SIZE = 800; // Denser QR codes = fewer chunks = much faster overall transfer
const LOOP_INTERVAL_MS = 83; // Approx 12 FPS - BarcodeDetector and modern LCD screens can handle this speed easily

export const Sender: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [fileId, setFileId] = useState<string>('');
  
  const [chunks, setChunks] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'preparing' | 'sending'>('idle');
  
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const loopTimerRef = useRef<number | null>(null);
  const [transmittedName, setTransmittedName] = useState('');
  
  // QR Code Rotation Loop
  useEffect(() => {
    if (status === 'sending' && chunks.length > 0) {
      loopTimerRef.current = window.setInterval(() => {
        setActiveChunkIndex(prev => (prev + 1) % chunks.length);
      }, LOOP_INTERVAL_MS);
    } else if (loopTimerRef.current) {
      clearInterval(loopTimerRef.current);
    }
    
    return () => {
      if (loopTimerRef.current) clearInterval(loopTimerRef.current);
    };
  }, [status, chunks.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setFiles(Array.from(e.target.files));
    setStatus('idle');
  };

  const startTransfer = async () => {
    if (files.length === 0) return;
    setStatus('preparing');
    
    let binary = '';
    
    if (files.length === 1) {
      // Single file - no zip overhead
      const buffer = await files[0].arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      const chunkSize = 0xffff;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(uint8Array.subarray(i, i + chunkSize)));
      }
    } else {
      // Multiple files - compress into zip
      const zipDataObj: Record<string, Uint8Array> = {};
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        zipDataObj[file.name] = new Uint8Array(buffer);
      }
      const zipped = zipSync(zipDataObj);
      
      const len = zipped.byteLength;
      for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(zipped[i]);
      }
    }
    
    const b64 = window.btoa(binary);
    
    const newFileId = Math.random().toString(36).substring(2, 8);
    setFileId(newFileId);
    
    const newChunks = [];
    for (let i = 0; i < b64.length; i += CHUNK_SIZE) {
      newChunks.push(b64.slice(i, i + CHUNK_SIZE));
    }
    
    const txName = files.length > 1 ? 'Shared_Files.zip' : files[0].name;
    setTransmittedName(txName);
    
    setChunks(newChunks);
    setActiveChunkIndex(0);
    setStatus('sending');
  };

  const getQRCodeData = () => {
    if (status === 'sending') {
      return `DATA|${fileId}|${activeChunkIndex}|${chunks.length}|${transmittedName}|${chunks[activeChunkIndex]}`;
    }
    return 'WAITING';
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 w-full overflow-hidden relative">
      <button onClick={onBack} className="absolute top-4 left-4 text-white/50 hover:text-white transition z-50">
        &larr; Back
      </button>

      {status === 'idle' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8 max-w-md w-full flex flex-col items-center">
          <FileUp size={48} className="text-blue-400 mb-4" />
          <h2 className="text-2xl font-bold mb-6">Select files to send</h2>
          <input type="file" id="file" multiple className="hidden" onChange={handleFileChange} />
          <label htmlFor="file" className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 w-full text-center transition truncate px-6">
            {files.length > 1 ? `${files.length} files selected` : files.length === 1 ? files[0].name : 'Click to browse'}
          </label>
          {files.length > 0 && (
            <button onClick={startTransfer} className="btn-primary w-full mt-6 flex items-center justify-center gap-2">
              <Play size={20} /> Start Transfer
            </button>
          )}
        </motion.div>
      )}
      
      {status === 'preparing' && (
        <div className="text-white/80 animate-pulse text-xl">Compressing File...</div>
      )}

      {status === 'sending' && (
        <div className="w-full max-w-3xl h-full flex flex-col items-center justify-center py-12">
          
          <div className="glass-panel flex flex-col p-8 items-center justify-center w-full max-w-lg">
            <h3 className="text-xl font-medium mb-6 text-white/80">
              Show this to Receiver
            </h3>
            
            <div className="bg-white p-6 rounded-xl shadow-2xl">
              <QRCodeSVG 
                value={getQRCodeData()} 
                size={Math.min(window.innerWidth * 0.7, 450)} 
                level="M" 
                includeMargin={false}
              />
            </div>
            
            <p className="mt-6 text-lg text-white font-mono text-center">
              Transmitting Chunk {activeChunkIndex + 1} / {chunks.length}
            </p>
            <p className="mt-2 text-sm text-white/40 text-center max-w-xs">
              The data is looping. The receiver can scan at any time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
