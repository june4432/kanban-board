import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface GroupMember {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

interface Group {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  color: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  members: GroupMember[];
}

interface GroupContextType {
  groups: Group[];
  loading: boolean;
  error: string | null;
  createGroup: (data: { name: string; description?: string; color?: string }) => Promise<Group>;
  updateGroup: (id: string, data: { name?: string; description?: string; color?: string }) => Promise<Group>;
  deleteGroup: (id: string) => Promise<void>;
  addMember: (groupId: string, userId: string, role?: 'admin' | 'member') => Promise<void>;
  removeMember: (groupId: string, userId: string) => Promise<void>;
  updateMemberRole: (groupId: string, userId: string, role: 'admin' | 'member') => Promise<void>;
  refreshGroups: () => Promise<void>;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load groups
  const loadGroups = useCallback(async () => {
    if (!user?.companyId) {
      setGroups([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/v1/groups?companyId=${user.companyId}`, {
        headers: {
          'x-user-id': user.id
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load groups');
      }

      const result = await response.json();
      const groupData = result.data?.groups || [];
      setGroups(groupData);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Create group
  const createGroup = async (data: { name: string; description?: string; color?: string }): Promise<Group> => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch('/api/v1/groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id
      },
      body: JSON.stringify({
        ...data,
        companyId: user.companyId
      })
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || 'Failed to create group');
    }

    const result = await response.json();
    const newGroup = result.data?.group;

    setGroups(prev => [...prev, newGroup]);
    return newGroup;
  };

  // Update group
  const updateGroup = async (id: string, data: { name?: string; description?: string; color?: string }): Promise<Group> => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/v1/groups/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || 'Failed to update group');
    }

    const result = await response.json();
    const updatedGroup = result.data?.group;

    setGroups(prev => prev.map(g => g.id === id ? { ...g, ...updatedGroup } : g));
    return updatedGroup;
  };

  // Delete group
  const deleteGroup = async (id: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/v1/groups/${id}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': user.id
      }
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || 'Failed to delete group');
    }

    setGroups(prev => prev.filter(g => g.id !== id));
  };

  // Add member
  const addMember = async (groupId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/v1/groups/${groupId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id
      },
      body: JSON.stringify({ userId, role })
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || 'Failed to add member');
    }

    const result = await response.json();
    const members = result.data?.members || [];

    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, members } : g));
  };

  // Remove member
  const removeMember = async (groupId: string, userId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/v1/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': user.id
      }
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || 'Failed to remove member');
    }

    const result = await response.json();
    const members = result.data?.members || [];

    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, members } : g));
  };

  // Update member role
  const updateMemberRole = async (groupId: string, userId: string, role: 'admin' | 'member'): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(`/api/v1/groups/${groupId}/members/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id
      },
      body: JSON.stringify({ role })
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || 'Failed to update member role');
    }

    const result = await response.json();
    const members = result.data?.members || [];

    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, members } : g));
  };

  const refreshGroups = async () => {
    await loadGroups();
  };

  return (
    <GroupContext.Provider
      value={{
        groups,
        loading,
        error,
        createGroup,
        updateGroup,
        deleteGroup,
        addMember,
        removeMember,
        updateMemberRole,
        refreshGroups,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
}
