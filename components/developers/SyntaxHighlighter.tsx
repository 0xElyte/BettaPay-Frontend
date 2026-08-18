'use client';

import { useEffect, useState } from 'react';
import { type Language } from './codeSnippets';
import { createHighlighter, type Highlighter } from 'shiki';

interface SyntaxHighlighterProps {
  code: string;
  language: Language;
}

const languageMap: Record<Language, string> = {
  javascript: 'js',
  python: 'py',
  php: 'php',
  go: 'go',
};

export function SyntaxHighlighter({ code, language }: SyntaxHighlighterProps) {
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const [highlighted, setHighlighted] = useState<string>('');

  useEffect(() => {
    const initHighlighter = async () => {
      try {
        const hl = await createHighlighter({
          themes: ['github-light', 'github-dark'],
          langs: ['js', 'py', 'php', 'go'],
        });
        setHighlighter(hl);
      } catch (error) {
        console.error('Failed to initialize syntax highlighter:', error);
        setHighlighter(null);
      }
    };

    initHighlighter();
  }, []);

  useEffect(() => {
    if (!highlighter) {
      setHighlighted(code);
      return;
    }

    try {
      const html = highlighter.codeToHtml(code, {
        lang: languageMap[language],
        theme: 'github-light',
      });
      setHighlighted(html);
    } catch (error) {
      console.error('Failed to highlight code:', error);
      setHighlighted(code);
    }
  }, [code, language, highlighter]);

  return (
    <div className="rounded-xl overflow-x-auto bg-white dark:bg-slate-950">
      <div
        className="text-sm font-mono leading-relaxed p-5"
        dangerouslySetInnerHTML={{ __html: highlighted || `<pre>${code}</pre>` }}
        style={{
          colorScheme: 'light',
        }}
      />
    </div>
  );
}
