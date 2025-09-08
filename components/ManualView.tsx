import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useTheme } from '@/contexts/ThemeContext';

const ManualView: React.FC = () => {
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { actualTheme } = useTheme();

  useEffect(() => {
    // highlight.js 스타일을 다크 테마로 고정 로드
    const loadHighlightStyle = () => {
      // 기존 highlight.js 스타일 제거
      const existingLink = document.querySelector('link[href*="highlight.js"]');
      if (existingLink) {
        existingLink.remove();
      }

      // 다크 테마 스타일 추가 (코드블럭은 항상 어두운 배경)
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
      document.head.appendChild(link);
    };

    loadHighlightStyle();
  }, []); // actualTheme 의존성 제거 - 항상 다크 테마 사용

  useEffect(() => {
    const fetchMarkdown = async () => {
      try {
        const response = await fetch('/kanban.md');
        if (!response.ok) {
          throw new Error('마크다운 파일을 불러올 수 없습니다.');
        }
        const content = await response.text();
        setMarkdownContent(content);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchMarkdown();
  }, []);

  if (loading) {
    return (
      <div className="bg-background rounded-lg shadow p-6 h-full w-full flex flex-col border border-border">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">매뉴얼을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background rounded-lg shadow p-6 h-full w-full flex flex-col border border-border">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive mb-2">⚠️ 오류 발생</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-lg shadow h-full w-full flex flex-col border border-border">
      {/* Header */}
      <div className="p-6 border-b border-border flex-shrink-0">
        <h2 className="text-2xl font-bold text-foreground">📚 칸반보드 매뉴얼</h2>
        <p className="text-sm text-muted-foreground mt-1">
          칸반보드 사용법과 모범 사례를 확인하세요
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="prose prose-lg max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-3xl font-bold text-gray-900 dark:text-yellow-400 mb-6 pb-3 border-b-2 border-primary/20">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-yellow-300 mb-4 mt-8 pb-2 border-b border-border">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-semibold text-gray-700 dark:text-yellow-200 mb-3 mt-6">
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-lg font-medium text-gray-600 dark:text-yellow-100 mb-2 mt-4">
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p className="text-gray-900 dark:text-white mb-4 leading-relaxed">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside mb-4 space-y-2 text-gray-900 dark:text-white">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-900 dark:text-white">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="mb-1">{children}</li>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary pl-4 py-2 mb-4 bg-primary/10 italic text-gray-900 dark:text-white">
                  {children}
                </blockquote>
              ),
              code: ({ inline, children, ...props }: any) => 
                inline ? (
                  <code className="bg-gray-100 dark:bg-gray-800 text-primary px-2 py-1 rounded text-sm font-mono">
                    {children}
                  </code>
                ) : (
                  <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4 font-mono text-sm border border-gray-700">
                    {children}
                  </code>
                ),
              pre: ({ children }) => (
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4 border border-gray-700">
                  {children}
                </pre>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full border border-border bg-background">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-muted">
                  {children}
                </thead>
              ),
              tbody: ({ children }) => (
                <tbody className="divide-y divide-border">
                  {children}
                </tbody>
              ),
              tr: ({ children }) => (
                <tr>{children}</tr>
              ),
              th: ({ children }) => (
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-border">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border-b border-border">
                  {children}
                </td>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-blue-600 dark:text-yellow-400">
                  {children}
                </strong>
              ),
              em: ({ children }) => (
                <em className="italic text-muted-foreground">
                  {children}
                </em>
              ),
              a: ({ href, children }) => (
                <a 
                  href={href} 
                  className="text-primary hover:text-primary/80 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              hr: () => (
                <hr className="my-8 border-t-2 border-border" />
              )
            }}
          >
            {markdownContent}
          </ReactMarkdown>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-muted flex-shrink-0">
        <p className="text-xs text-muted-foreground text-center">
          💡 이 매뉴얼은 프로젝트와 함께 업데이트됩니다. 
          <span className="font-medium text-foreground">칸반보드를 효과적으로 활용해보세요!</span>
        </p>
      </div>
    </div>
  );
};

export default ManualView;