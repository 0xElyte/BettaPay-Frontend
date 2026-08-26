"use client";

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { truncateAddress } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotify } from '@/lib/hooks/useNotify';

interface CopyAddressProps {
  address: string;
  showIconOnly?: boolean;
  className?: string;
  truncate?: boolean;
}

export const CopyAddress = ({ 
  address, 
  showIconOnly = false, 
  className,
  truncate = true 
}: CopyAddressProps) => {
  const { success, error } = useNotify();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      let copiedSuccessfully = false;

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(address);
          copiedSuccessfully = true;
        } catch {
          copiedSuccessfully = false;
        }
      }

      if (!copiedSuccessfully) {
        const textArea = document.createElement('textarea');
        textArea.value = address;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        copiedSuccessfully = document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      if (!copiedSuccessfully) {
        throw new Error('Clipboard copy was not confirmed');
      }

      setCopied(true);
      success('Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      error('Failed to copy address');
    }
  };

  const displayAddress = truncate ? truncateAddress(address) : address;

  if (showIconOnly) {
    return (
      <Button 
        variant="ghost" 
        size="icon" 
        className={cn('h-8 w-8 text-muted-foreground hover:text-foreground', className)}
        onClick={handleCopy}
        title="Copy address"
      >
        {copied ? <Check className="h-4 w-4 text-brand-success" /> : <Copy className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <div 
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border/50 hover:bg-muted transition-colors cursor-pointer',
        className
      )}
      onClick={handleCopy}
      title="Click to copy full address"
    >
      <span className="font-mono text-sm">{displayAddress}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-brand-success" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </div>
  );
};
