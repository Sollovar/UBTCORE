import { useCallback } from 'react';
import { useToast } from '../components/common/Toast';

export function useCopyToClipboard() {
  const { showToast } = useToast();

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

      showToast({
        title: label,
        description: `${text.slice(0, 6)}...${text.slice(-4)}`,
        variant: 'success',
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      showToast({
        title: 'Failed to copy',
        description: 'Could not copy to clipboard',
        variant: 'error',
      });
    }
  }, [showToast]);

  return { copyToClipboard };
}
