import { useCallback } from 'react';

interface FileSystemResult {
  saveFile: (content: string, fileName: string, mimeType?: string) => Promise<boolean>;
  readFile: () => Promise<string | null>;
}

export function useFileSystem(): FileSystemResult {
  const saveFile = useCallback(async (content: string, fileName: string, mimeType = 'text/plain'): Promise<boolean> => {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      console.error('[FileSystem] Error saving file:', err);
      return false;
    }
  }, []);

  const readFile = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const text = await file.text();
        resolve(text);
      };
      input.click();
    });
  }, []);

  return { saveFile, readFile };
}
