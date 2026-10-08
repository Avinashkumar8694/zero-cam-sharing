import React, { useState, useCallback, useRef } from 'react';
import { Scanner } from './Scanner';
import { CheckCircle2, File, ExternalLink, Clock } from 'lucide-react';
import { unzipSync } from 'fflate';
import { motion } from 'framer-motion';

interface ReceivedHistoryItem {
  name: string;
  path: string;
  time: Date;
}

export const Receiver: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [status, setStatus] = useState<'idle' | 'receiving' | 'processing' | 'completed'>('idle');
  const [fileInfo, setFileInfo] = useState<{ id: string; name: string; totalChunks: number } | null>(null);
  const [receivedChunksCount, setReceivedChunksCount] = useState(0);
  const [history, setHistory] = useState<ReceivedHistoryItem[]>([]);
  
  // Maps chunkIndex -> data string
  const receivedChunksRef = useRef<Map<number, string>>(new Map());
  const fileInfoRef = useRef<{ id: string; name: string; totalChunks: number } | null>(null);
  
  const addHistoryItem = (name: string, path: string) => {
    setHistory(prev => [{ name, path, time: new Date() }, ...prev]);
  };

  const openFile = async (path: string) => {
    if (window.electronAPI && window.electronAPI.openFile) {
      await window.electronAPI.openFile(path);
    } else {
      try {
        const { FileOpener } = await import('@capacitor-community/file-opener');
        await FileOpener.open({ filePath: path });
      } catch (err) {
        console.warn("FileOpener API failed", err);
        alert(`File saved at: ${path}`);
      }
    }
  };

  const onScan = useCallback(async (data: string) => {
    const parts = data.split('|');
    if (parts[0] !== 'DATA' || parts.length < 6) return;
    
    const fileId = parts[1];
    const chunkIndex = parseInt(parts[2], 10);
    const totalChunks = parseInt(parts[3], 10);
    const fileName = parts[4];
    const payload = parts[5];
    
    if (status === 'idle') {
      setStatus('receiving');
      const info = { id: fileId, name: fileName, totalChunks };
      setFileInfo(info);
      fileInfoRef.current = info;
    }
    
    if (fileInfoRef.current && fileInfoRef.current.id === fileId) {
      if (!receivedChunksRef.current.has(chunkIndex)) {
        receivedChunksRef.current.set(chunkIndex, payload);
        const newCount = receivedChunksRef.current.size;
        setReceivedChunksCount(newCount);
        
        if (newCount === fileInfoRef.current.totalChunks) {
          setStatus('processing');
          
          try {
            // Assemble base64 string
            let b64 = '';
            for (let i = 0; i < totalChunks; i++) {
              b64 += receivedChunksRef.current.get(i);
            }
            
            // Decode base64 to binary string then to Uint8Array
            const binaryString = window.atob(b64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            const isMultiFile = fileName === 'Shared_Files.zip';
            
            if (window.electronAPI) {
              // DESKTOP LOGIC
              let dataToSave = bytes;
              
              if (!isMultiFile) {
                // Extract single file
                const unzipped = unzipSync(bytes);
                dataToSave = unzipped[fileName];
              }
              
              let decompressedB64 = '';
              const chunkSize = 0xffff;
              for (let i = 0; i < dataToSave.length; i += chunkSize) {
                decompressedB64 += String.fromCharCode.apply(null, Array.from(dataToSave.subarray(i, i + chunkSize)));
              }
              decompressedB64 = window.btoa(decompressedB64);
              
              const result = await window.electronAPI.saveFile({ data: decompressedB64, name: fileName });
              if (result.success && result.filePath) {
                addHistoryItem(fileName, result.filePath);
                setStatus('completed');
              } else {
                console.error('Save failed', result.error);
                setStatus('receiving'); // fallback
              }
            } else {
              // MOBILE / WEB LOGIC
              const { Capacitor } = await import('@capacitor/core');
              if (Capacitor.isNativePlatform()) {
                const { Filesystem, Directory } = await import('@capacitor/filesystem');
                
                if (isMultiFile) {
                  const unzipped = unzipSync(bytes);
                  const fileNames = Object.keys(unzipped);
                  
                  for (const fName of fileNames) {
                    const dataToSave = unzipped[fName];
                    let decompressedB64 = '';
                    const chunkSize = 0xffff;
                    for (let i = 0; i < dataToSave.length; i += chunkSize) {
                      decompressedB64 += String.fromCharCode.apply(null, Array.from(dataToSave.subarray(i, i + chunkSize)));
                    }
                    decompressedB64 = window.btoa(decompressedB64);

                    try {
                      const saved = await Filesystem.writeFile({
                        path: fName,
                        data: decompressedB64,
                        directory: Directory.Documents
                      });
                      addHistoryItem(fName, saved.uri);
                    } catch (err) {
                      console.error("Failed saving file on mobile", err);
                    }
                  }
                } else {
                  // Single file - no unzipping required
                  let decompressedB64 = '';
                  const chunkSize = 0xffff;
                  for (let i = 0; i < bytes.length; i += chunkSize) {
                    decompressedB64 += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
                  }
                  decompressedB64 = window.btoa(decompressedB64);

                  try {
                    const saved = await Filesystem.writeFile({
                      path: fileName,
                      data: decompressedB64,
                      directory: Directory.Documents
                    });
                    addHistoryItem(fileName, saved.uri);
                  } catch (err) {
                    console.error("Failed saving file on mobile", err);
                  }
                }
                setStatus('completed');
              } else {
                // Standard Web fallback
                let dataToSave = bytes;
                
                if (isMultiFile) {
                   // Web browser receiving multi-file -> download raw zip directly
                } else {
                   // Web browser receiving single file -> download raw bytes directly
                }
                
                const blob = new Blob([dataToSave]);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
                addHistoryItem(fileName, 'Downloads Folder');
                setStatus('completed');
              }
            }
          } catch (e) {
            console.error("Failed to assemble/decompress:", e);
            setStatus('receiving'); // resume if failed
          }
        }
      }
    }
  }, [status]);
  
  const progressPercent = fileInfo ? Math.round((receivedChunksCount / fileInfo.totalChunks) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-slate-900 w-full overflow-hidden relative overflow-y-auto">
      <button onClick={onBack} className="absolute top-4 left-4 text-white/50 hover:text-white transition z-50">
        &larr; Back
      </button>

      {(status === 'idle' || status === 'receiving' || status === 'processing') && (
        <div className="w-full flex flex-col items-center justify-center max-w-2xl py-8">
          <div className="text-center mb-6 z-10">
            <h2 className="text-2xl font-bold text-white mb-2">
              {status === 'idle' ? 'Point camera at the Sender' : 
               status === 'processing' ? 'Processing File...' :
               `Receiving: ${fileInfo?.name}`}
            </h2>
            {status === 'receiving' && fileInfo && (
              <p className="text-blue-400 font-mono text-lg">
                {progressPercent}% Complete
              </p>
            )}
          </div>
          
          <div className="w-full max-w-md aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 relative">
            <Scanner onScan={onScan} paused={status === 'processing'} />
          </div>
          
          {status === 'receiving' && fileInfo && (
            <div className="w-full max-w-md mt-8 bg-white/10 rounded-full h-3 overflow-hidden relative shadow-inner">
              <div 
                className="bg-blue-500 h-full transition-all duration-200 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      )}

      {status === 'completed' && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 z-40 bg-slate-900 flex flex-col items-center justify-center">
          <CheckCircle2 size={80} className="text-green-500 mb-6 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
          <h2 className="text-3xl font-bold mb-2">File Received!</h2>
          <p className="text-white/60 mb-8">{fileInfo?.name} has been saved securely.</p>
          <button onClick={() => {
            setStatus('idle');
            setFileInfo(null);
            setReceivedChunksCount(0);
            receivedChunksRef.current.clear();
            fileInfoRef.current = null;
          }} className="btn-primary">Receive Another File</button>
        </motion.div>
      )}

      {history.length > 0 && (
        <div className={`w-full max-w-2xl mt-12 bg-white/5 rounded-xl p-6 border border-white/10 ${status === 'completed' ? 'z-50 relative' : ''}`}>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock size={20} className="text-blue-400" /> Transfer History
          </h3>
          <div className="flex flex-col gap-3">
            {history.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-lg transition group">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                    <File size={24} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-medium text-white truncate">{item.name}</span>
                    <span className="text-xs text-white/40 truncate">{item.time.toLocaleTimeString()} &bull; {item.path}</span>
                  </div>
                </div>
                <button 
                  onClick={() => openFile(item.path)}
                  className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition shrink-0"
                  title="Open File"
                >
                  <ExternalLink size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
