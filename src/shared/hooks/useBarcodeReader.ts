import { useState, useEffect, useRef, useCallback } from 'react';

interface BarcodeReaderOptions {
  minLength?: number;
  timeout?: number;
  onBarcode?: (barcode: string) => void;
}

export function useBarcodeReader(options: BarcodeReaderOptions = {}) {
  const { minLength = 4, timeout = 120, onBarcode } = options;
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;

      const now = Date.now();
      if (now - lastKeyTimeRef.current > timeout) {
        bufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          const barcode = bufferRef.current;
          bufferRef.current = '';
          setLastBarcode(barcode);
          onBarcode?.(barcode);
        }
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    },
    [minLength, timeout, onBarcode],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { lastBarcode };
}
