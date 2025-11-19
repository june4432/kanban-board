import React, { useState, useRef, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Building2, ChevronDown, Plus, Check } from 'lucide-react';
import { useRouter } from 'next/router';

export default function OrganizationSwitcher() {
  const router = useRouter();
  const { currentOrganization, organizations, switchOrganization, loading } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitch = (orgId: string) => {
    switchOrganization(orgId);
    setIsOpen(false);
    // Reload the current page to reflect organization change
    router.reload();
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    router.push('/settings/organizations');
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-muted rounded-lg">
        <Building2 className="w-4 h-4 text-muted-foreground animate-pulse" />
        <span className="text-sm text-muted-foreground">로딩 중...</span>
      </div>
    );
  }

  if (!currentOrganization && organizations.length === 0) {
    return (
      <button
        onClick={handleCreateNew}
        className="flex items-center space-x-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
      >
        <Plus className="w-4 h-4" />
        <span>조직 만들기</span>
      </button>
    );
  }

  if (!currentOrganization) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors min-w-[150px]"
        title="조직 전환"
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground truncate">
            {currentOrganization.name}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-border">
            <p className="text-xs text-muted-foreground px-2 py-1">조직 전환</p>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className={`
                  w-full flex items-center justify-between px-3 py-2 hover:bg-accent transition-colors
                  ${org.id === currentOrganization.id ? 'bg-accent' : ''}
                `}
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {org.name}
                    </p>
                    {org.memberCount !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {org.memberCount}명
                      </p>
                    )}
                  </div>
                </div>
                {org.id === currentOrganization.id && (
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-border">
            <button
              onClick={handleCreateNew}
              className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-accent rounded transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>새 조직 만들기</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
