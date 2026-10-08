import jsQR from 'jsqr';

self.onmessage = (event) => {
  const { data, width, height } = event.data;
  
  try {
    const code = jsQR(data, width, height, {
      inversionAttempts: 'dontInvert',
    });
    
    if (code) {
      self.postMessage({ type: 'success', data: code.data });
    } else {
      self.postMessage({ type: 'not_found' });
    }
  } catch (error) {
    self.postMessage({ type: 'error', error: 'Scanner error' });
  }
};
