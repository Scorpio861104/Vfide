# Implementation Examples - Applying New Utilities

This document provides concrete examples of applying the new infrastructure utilities across the codebase.

## 1. API Route with Validation & Authentication

### Example: Protected User Profile Route

**File**: `app/api/users/profile/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateRequest, schemas } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';
import { apiLogger } from '@/lib/logger.service';

/**
 * User Profile API - Protected Endpoint
 * Demonstrates: validation + authentication + rate limiting
 */

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 60, windowMs: 60000 });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  // Authentication required
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return auth.errorResponse;
  }

  try {
    // Fetch user profile using authenticated address
    const profile = await fetchUserProfile(auth.address);
    
    return NextResponse.json({ profile });
  } catch (error) {
    apiLogger.error('Profile fetch failed', { 
      address: auth.address,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  // Authentication required
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return auth.errorResponse;
  }

  // Validate request body
  const validation = await validateRequest(request, schemas.userProfile);
  if (!validation.valid) {
    return validation.errorResponse;
  }

  try {
    const { username, displayName, bio } = validation.data;
    
    // Update profile
    await updateUserProfile(auth.address, { username, displayName, bio });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error('Profile update failed', { 
      address: auth.address,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// Helper functions
async function fetchUserProfile(address: string) {
  // Implementation
  return {};
}

async function updateUserProfile(address: string, data: unknown) {
  // Implementation
}
```

## 2. Component with Error Boundary & Memory Leak Prevention

### Example: Messaging Center Component

**File**: `components/social/MessagingCenterExample.tsx`

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { MessagingErrorBoundary } from '@/components/error/ApiErrorBoundary';
import { useSafeInterval, useSafeWebSocket } from '@/hooks/useMemoryLeak';

/**
 * Messaging Center with Error Boundary
 * Demonstrates: error boundary + memory leak prevention
 */

// Inner component that can throw errors
function MessagingCenterInner() {
  const [messages, setMessages] = useState([]);
  const safeInterval = useSafeInterval();
  const { connect, disconnect } = useSafeWebSocket();

  useEffect(() => {
    // Connect to WebSocket - auto cleanup on unmount
    const socket = connect('wss://api.vfide.com/ws');
    
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages((prev) => [...prev, message]);
    };

    // Poll for updates - auto cleanup on unmount
    safeInterval(() => {
      fetchNewMessages();
    }, 30000);

    return () => {
      disconnect();
    };
  }, [connect, disconnect, safeInterval]);

  async function fetchNewMessages() {
    // Fetch logic
  }

  return (
    <div className="messaging-center">
      <h2>Messages</h2>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}

// Exported component wrapped with error boundary
export function MessagingCenter() {
  return (
    <MessagingErrorBoundary>
      <MessagingCenterInner />
    </MessagingErrorBoundary>
  );
}
```

## 3. Optimized Component with React.memo

### Example: Social Feed Item

**File**: `components/social/FeedItemExample.tsx`

```typescript
'use client';

import React from 'react';
import { memoShallow, useMemoizedValue } from '@/lib/performance-optimization';

interface FeedItemProps {
  id: string;
  content: string;
  author: string;
  likes: number;
  timestamp: number;
  onLike: (id: string) => void;
}

/**
 * Feed Item Component - Optimized
 * Demonstrates: React.memo + useMemoizedValue
 */

function FeedItemInner({ id, content, author, likes, timestamp, onLike }: FeedItemProps) {
  // Memoize expensive calculation
  const formattedDate = useMemoizedValue(
    () => new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp)),
    [timestamp]
  );

  const handleLike = () => {
    onLike(id);
  };

  return (
    <div className="feed-item">
      <div className="author">{author}</div>
      <div className="content">{content}</div>
      <div className="meta">
        <span>{likes} likes</span>
        <span>{formattedDate}</span>
        <button onClick={handleLike}>Like</button>
      </div>
    </div>
  );
}

// Export memoized version - only re-renders when props change
export const FeedItem = memoShallow(FeedItemInner, 'FeedItem');
```

## 4. Page with Multiple Protections

### Example: Protected Dashboard Page

**File**: `app/dashboard/protected-example/page.tsx`

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { ApiErrorBoundary } from '@/components/error/ApiErrorBoundary';
import { useSafeTimeout, useIsMounted } from '@/hooks/useMemoryLeak';
import { memoShallow } from '@/lib/performance-optimization';

/**
 * Protected Dashboard Page
 * Demonstrates: error boundary + memory leak prevention + optimization
 */

function DashboardInner() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const safeTimeout = useSafeTimeout();
  const isMounted = useIsMounted();

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/dashboard', {
          headers: {
            'Authorization': `Bearer ${getToken()}`
          }
        });
        
        const result = await response.json();
        
        // Only update state if component is still mounted
        if (isMounted()) {
          setData(result);
          setLoading(false);
        }
      } catch (error) {
        if (isMounted()) {
          console.error('Failed to load dashboard', error);
          setLoading(false);
        }
      }
    }

    // Delay initial load slightly - auto cleanup
    safeTimeout(() => {
      loadData();
    }, 100);
  }, [safeTimeout, isMounted]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      {data && <DashboardContent data={data} />}
    </div>
  );
}

// Memoized dashboard content
const DashboardContent = memoShallow(({ data }) => {
  return <div>{JSON.stringify(data)}</div>;
}, 'DashboardContent');

// Export with error boundary
export default function DashboardPage() {
  return (
    <ApiErrorBoundary>
      <DashboardInner />
    </ApiErrorBoundary>
  );
}

function getToken() {
  return localStorage.getItem('auth_token') || '';
}
```

## 5. Accessibility Improvements

### Example: Accessible Button Component

**File**: `components/ui/AccessibleButton.tsx`

```typescript
'use client';

import React from 'react';

interface AccessibleButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
}

/**
 * Accessible Button Component
 * Demonstrates: ARIA labels, keyboard navigation, loading states
 */

export function AccessibleButton({
  onClick,
  children,
  variant = 'primary',
  disabled = false,
  loading = false,
  ariaLabel
}: AccessibleButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled && !loading) {
        onClick();
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled || loading}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-busy={loading}
      aria-disabled={disabled}
      className={`btn btn-${variant} ${loading ? 'loading' : ''}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      {loading ? (
        <>
          <span className="spinner" aria-hidden="true" />
          <span className="sr-only">Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
```

## 6. Complete Feature with All Patterns

### Example: User Settings Feature

**File**: `app/settings/example/page.tsx`

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { ApiErrorBoundary } from '@/components/error/ApiErrorBoundary';
import { useSafeTimeout } from '@/hooks/useMemoryLeak';
import { memoShallow } from '@/lib/performance-optimization';
import { AccessibleButton } from '@/components/ui/AccessibleButton';

/**
 * User Settings Page - Complete Example
 * Combines: validation, auth, error boundaries, memory leak prevention, 
 * optimization, and accessibility
 */

function SettingsInner() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const safeTimeout = useSafeTimeout();

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const response = await fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load settings');
      }
      
      const data = await response.json();
      setSettings(data.profile);
    } catch (error) {
      console.error('Settings load error:', error);
    }
  }

  async function saveSettings(newSettings: unknown) {
    setSaving(true);
    
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(newSettings)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      // Show success message with delay - auto cleanup
      safeTimeout(() => {
        setSaving(false);
      }, 1000);
    } catch (error) {
      setSaving(false);
      console.error('Settings save error:', error);
    }
  }

  if (!settings) {
    return <div role="status" aria-live="polite">Loading settings...</div>;
  }

  return (
    <div className="settings-page">
      <h1>Settings</h1>
      <SettingsForm 
        settings={settings} 
        onSave={saveSettings}
        saving={saving}
      />
    </div>
  );
}

// Memoized form component
const SettingsForm = memoShallow(({ settings, onSave, saving }) => {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(settings); }}>
      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input 
          id="username"
          type="text" 
          value={settings.username}
          aria-required="true"
        />
      </div>
      <AccessibleButton
        onClick={() => onSave(settings)}
        variant="primary"
        loading={saving}
        ariaLabel="Save settings"
      >
        Save Changes
      </AccessibleButton>
    </form>
  );
}, 'SettingsForm');

// Export with error boundary
export default function SettingsPage() {
  return (
    <ApiErrorBoundary>
      <SettingsInner />
    </ApiErrorBoundary>
  );
}

function getToken() {
  return localStorage.getItem('auth_token') || '';
}
```

## Summary

These examples demonstrate how to apply all the new utilities:

1. **API Routes**: Validation + Authentication + Rate Limiting
2. **Components**: Error Boundaries + Memory Leak Prevention
3. **Performance**: React.memo + Memoized Calculations
4. **Accessibility**: ARIA Labels + Keyboard Navigation
5. **Complete Features**: All patterns combined

Use these as templates when refactoring existing code or creating new features.
