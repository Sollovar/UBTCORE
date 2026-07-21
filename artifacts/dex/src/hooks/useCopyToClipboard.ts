import { useCallback } from 'react';
import { toast } from './use-toast';

export function useCopyToClipboard() {
  const copyToClipboard = useCallback(async (text: string, label: string = 'Copied!') => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      toast({
        title: label,
        description: `${text.slice(0, 6)}...${text.slice(-4)}`,
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'Failed to copy',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  }, []);

  return { copyToClipboard };
}
