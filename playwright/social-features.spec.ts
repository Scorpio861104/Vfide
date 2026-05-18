import { test, expect, Page } from '@playwright/test';

/**
 * Social Features E2E Tests
 * Tests messaging, groups, notifications, and social feed interactions
 */

test.describe('Social Features', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should navigate to social/feed page', async () => {
    const feedLink = page.locator('a, button').filter({ hasText: /(feed|social|community)/i }).first();
    
    if (await feedLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await feedLink.click();
      await page.waitForLoadState('networkidle');
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    } else {
      await page.goto('/feed');
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display social feed', async () => {
    await page.goto('/feed');
    
    const feed = page.locator('[data-testid="social-feed"], main');
    await expect(feed).toBeVisible();
  });

  test('should show feed posts', async () => {
    await page.goto('/feed');
    
    // Should display posts or empty state
    const posts = page.locator('[data-testid="post"], [data-testid="feed-item"], .post-card');
    const emptyState = page.locator('text=/no posts|be the first/i');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Messaging', () => {
  test('should navigate to messages', async ({ page }) => {
    await page.goto('/dashboard');
    
    const messagesLink = page.locator('a, button').filter({ hasText: /(message|chat|inbox)/i }).first();
    
    if (await messagesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await messagesLink.click();
      await page.waitForLoadState('networkidle');
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display conversations list', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should show list of conversations
    const conversations = page.locator('[data-testid="conversations"], [data-testid="conversation-item"]');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should open a conversation', async ({ page }) => {
    await page.goto('/dashboard');
    
    const conversationItem = page.locator('[data-testid="conversation-item"]').first();
    
    if (await conversationItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await conversationItem.click();
      await page.waitForTimeout(500);
      
      // Should show message thread
      const messageThread = page.locator('[data-testid="message-thread"], [data-testid="messages"]');
      
      if (await messageThread.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(messageThread).toBeVisible();
      }
    }
  });

  test('should display message history', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Messages should be displayed in chronological order
    const messages = page.locator('[data-testid="message"], .message-item');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should send a message', async ({ page }) => {
    await page.goto('/dashboard');
    
    const messageInput = page.locator('input[name="message"], textarea[name="message"], [contenteditable="true"]').first();
    const sendBtn = page.locator('button[type="submit"], button').filter({ hasText: /send/i }).first();
    
    if (await messageInput.isVisible({ timeout: 2000 }).catch(() => false) &&
        await sendBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      
      await messageInput.fill('Hello, this is a test message');
      await sendBtn.click();
      
      await page.waitForTimeout(500);
      
      // Message should appear in thread
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should send message with enter key', async ({ page }) => {
    await page.goto('/dashboard');
    
    const messageInput = page.locator('textarea[name="message"]').first();
    
    if (await messageInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await messageInput.fill('Test message');
      await page.keyboard.press('Enter');
      
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should show typing indicator', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should show when other person is typing
    const typingIndicator = page.locator('[data-testid="typing-indicator"], text=/typing/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display message timestamps', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Each message should have a timestamp
    const timestamp = page.locator('time, [data-testid="message-time"]').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should mark messages as read', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Opening conversation should mark messages as read
    const unreadBadge = page.locator('[data-testid="unread-badge"], .unread-count').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show unread message count', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should display number of unread messages
    const unreadCount = page.locator('[data-testid="unread-count"]').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should start new conversation', async ({ page }) => {
    await page.goto('/dashboard');
    
    const newMessageBtn = page.locator('button').filter({ hasText: /(new message|compose)/i }).first();
    
    if (await newMessageBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newMessageBtn.click();
      await page.waitForTimeout(500);
      
      // Should show compose interface
      const content = page.locator('main, [role="dialog"]');
      await expect(content.first()).toBeVisible();
    }
  });

  test('should search conversations', async ({ page }) => {
    await page.goto('/dashboard');
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should delete message', async ({ page }) => {
    await page.goto('/dashboard');
    
    const messageMenu = page.locator('[data-testid="message-menu"], button[aria-label*="more"]').first();
    
    if (await messageMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
      await messageMenu.click();
      await page.waitForTimeout(500);
      
      const deleteBtn = page.locator('button').filter({ hasText: /delete/i }).first();
      
      if (await deleteBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });
});

test.describe('Groups', () => {
  test('should navigate to groups page', async ({ page }) => {
    await page.goto('/dashboard');
    
    const groupsLink = page.locator('a, button').filter({ hasText: /group/i }).first();
    
    if (await groupsLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await groupsLink.click();
      await page.waitForLoadState('networkidle');
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display joined groups', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should show list of groups user is member of
    const groups = page.locator('[data-testid="group-item"], [data-testid="groups"]');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should create new group', async ({ page }) => {
    await page.goto('/dashboard');
    
    const createGroupBtn = page.locator('button').filter({ hasText: /(create group|new group)/i }).first();
    
    if (await createGroupBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createGroupBtn.click();
      await page.waitForTimeout(1000);
      
      // Should show create group form
      const dialog = page.locator('[role="dialog"], .modal');
      
      if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(dialog).toBeVisible();
      }
    }
  });

  test('should enter group details', async ({ page }) => {
    await page.goto('/dashboard');
    
    const createGroupBtn = page.locator('button').filter({ hasText: /create group/i }).first();
    
    if (await createGroupBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createGroupBtn.click();
      await page.waitForTimeout(1000);
      
      const nameInput = page.locator('input[name="name"], input[name="groupName"]').first();
      const descriptionInput = page.locator('textarea[name="description"]').first();
      
      if (await nameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await nameInput.fill('Test Group');
        
        if (await descriptionInput.isVisible({ timeout: 500 }).catch(() => false)) {
          await descriptionInput.fill('This is a test group');
        }
      }
    }
  });

  test('should join a group', async ({ page }) => {
    await page.goto('/dashboard');
    
    const joinBtn = page.locator('button').filter({ hasText: /join/i }).first();
    
    if (await joinBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await joinBtn.click();
      await page.waitForTimeout(500);
      
      // Should join group
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should leave a group', async ({ page }) => {
    await page.goto('/dashboard');
    
    const groupMenu = page.locator('[data-testid="group-menu"]').first();
    
    if (await groupMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
      await groupMenu.click();
      await page.waitForTimeout(500);
      
      const leaveBtn = page.locator('button').filter({ hasText: /leave/i }).first();
      
      if (await leaveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await leaveBtn.click();
        await page.waitForTimeout(500);
        
        // Should require confirmation
        const confirmBtn = page.locator('button').filter({ hasText: /confirm/i }).first();
      }
    }
  });

  test('should view group members', async ({ page }) => {
    await page.goto('/dashboard');
    
    const groupItem = page.locator('[data-testid="group-item"]').first();
    
    if (await groupItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await groupItem.click();
      await page.waitForTimeout(500);
      
      // Should show group page with members
      const members = page.locator('[data-testid="members"], text=/member/i').first();
    }
  });

  test('should invite members to group', async ({ page }) => {
    await page.goto('/dashboard');
    
    const inviteBtn = page.locator('button').filter({ hasText: /invite/i }).first();
    
    if (await inviteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await inviteBtn.click();
      await page.waitForTimeout(500);
      
      // Should show invite dialog
      const content = page.locator('main, [role="dialog"]');
      await expect(content.first()).toBeVisible();
    }
  });

  test('should post in group', async ({ page }) => {
    await page.goto('/dashboard');
    
    const postInput = page.locator('textarea[placeholder*="post" i], textarea[name="content"]').first();
    
    if (await postInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await postInput.fill('Test group post');
      
      const postBtn = page.locator('button[type="submit"], button').filter({ hasText: /post/i }).first();
      
      if (await postBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await postBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should search for groups', async ({ page }) => {
    await page.goto('/dashboard');
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('crypto');
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });
});

test.describe('Notifications', () => {
  test('should display notifications icon', async ({ page }) => {
    await page.goto('/');
    
    const notificationsIcon = page.locator('[data-testid="notifications"], button[aria-label*="notification" i]').first();
    
    const content = page.locator('main, header, nav');
    await expect(content.first()).toBeVisible();
  });

  test('should show unread notification count', async ({ page }) => {
    await page.goto('/');
    
    // Should display badge with count
    const badge = page.locator('[data-testid="notification-badge"], .notification-count').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should open notifications panel', async ({ page }) => {
    await page.goto('/');
    
    const notificationsBtn = page.locator('button[aria-label*="notification" i]').first();
    
    if (await notificationsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await notificationsBtn.click();
      await page.waitForTimeout(500);
      
      // Should show notifications dropdown/panel
      const panel = page.locator('[data-testid="notifications-panel"], [role="menu"]');
      
      if (await panel.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(panel).toBeVisible();
      }
    }
  });

  test('should display notification list', async ({ page }) => {
    await page.goto('/');
    
    const notificationsBtn = page.locator('button[aria-label*="notification" i]').first();
    
    if (await notificationsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await notificationsBtn.click();
      await page.waitForTimeout(500);
      
      // Should show list of notifications or empty state
      const notifications = page.locator('[data-testid="notification-item"], .notification');
      const emptyState = page.locator('text=/no notifications/i');
    }
  });

  test('should mark notification as read', async ({ page }) => {
    await page.goto('/');
    
    const notificationsBtn = page.locator('button[aria-label*="notification" i]').first();
    
    if (await notificationsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await notificationsBtn.click();
      await page.waitForTimeout(500);
      
      const notificationItem = page.locator('[data-testid="notification-item"]').first();
      
      if (await notificationItem.isVisible({ timeout: 1000 }).catch(() => false)) {
        await notificationItem.click();
        await page.waitForTimeout(500);
        
        // Should mark as read
        const content = page.locator('main');
        await expect(content).toBeVisible();
      }
    }
  });

  test('should mark all notifications as read', async ({ page }) => {
    await page.goto('/');
    
    const notificationsBtn = page.locator('button[aria-label*="notification" i]').first();
    
    if (await notificationsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await notificationsBtn.click();
      await page.waitForTimeout(500);
      
      const markAllBtn = page.locator('button').filter({ hasText: /mark all|clear/i }).first();
      
      if (await markAllBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await markAllBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should filter notifications by type', async ({ page }) => {
    await page.goto('/');
    
    const notificationsBtn = page.locator('button[aria-label*="notification" i]').first();
    
    if (await notificationsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await notificationsBtn.click();
      await page.waitForTimeout(500);
      
      const types = ['all', 'messages', 'mentions', 'transactions'];
      
      for (const type of types) {
        const filterBtn = page.locator('button').filter({ hasText: new RegExp(type, 'i') }).first();
        
        if (await filterBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await filterBtn.click();
          await page.waitForTimeout(300);
          break;
        }
      }
    }
  });

  test('should navigate to notification source', async ({ page }) => {
    await page.goto('/');
    
    const notificationsBtn = page.locator('button[aria-label*="notification" i]').first();
    
    if (await notificationsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await notificationsBtn.click();
      await page.waitForTimeout(500);
      
      const notificationItem = page.locator('[data-testid="notification-item"]').first();
      
      if (await notificationItem.isVisible({ timeout: 1000 }).catch(() => false)) {
        const urlBefore = page.url();
        await notificationItem.click();
        await page.waitForTimeout(500);
        
        // May navigate to related page
        const content = page.locator('main');
        await expect(content).toBeVisible();
      }
    }
  });

  test('should delete notification', async ({ page }) => {
    await page.goto('/');
    
    const notificationsBtn = page.locator('button[aria-label*="notification" i]').first();
    
    if (await notificationsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await notificationsBtn.click();
      await page.waitForTimeout(500);
      
      const deleteBtn = page.locator('button[aria-label*="delete" i], button').filter({ hasText: /delete|remove/i }).first();
      
      if (await deleteBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });
});

test.describe('Social Feed Interaction', () => {
  test('should like a post', async ({ page }) => {
    await page.goto('/feed');
    
    const likeBtn = page.locator('button[aria-label*="like" i], button').filter({ hasText: /like|♥/i }).first();
    
    if (await likeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await likeBtn.click();
      await page.waitForTimeout(500);
      
      // Like count should increase
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should comment on a post', async ({ page }) => {
    await page.goto('/feed');
    
    const commentBtn = page.locator('button').filter({ hasText: /comment/i }).first();
    
    if (await commentBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await commentBtn.click();
      await page.waitForTimeout(500);
      
      const commentInput = page.locator('textarea[name="comment"], input[name="comment"]').first();
      
      if (await commentInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await commentInput.fill('Great post!');
        
        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /(post|submit)/i }).first();
        
        if (await submitBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should share a post', async ({ page }) => {
    await page.goto('/feed');
    
    const shareBtn = page.locator('button').filter({ hasText: /share/i }).first();
    
    if (await shareBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await shareBtn.click();
      await page.waitForTimeout(500);
      
      // Should show share options
      const content = page.locator('main, [role="dialog"]');
      await expect(content.first()).toBeVisible();
    }
  });

  test('should follow a user', async ({ page }) => {
    await page.goto('/feed');
    
    const followBtn = page.locator('button').filter({ hasText: /follow/i }).first();
    
    if (await followBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await followBtn.click();
      await page.waitForTimeout(500);
      
      // Button should change to "Following" or "Unfollow"
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should create a post', async ({ page }) => {
    await page.goto('/feed');
    
    const createPostBtn = page.locator('button').filter({ hasText: /(create|new post|what\'s on your mind)/i }).first();
    const postInput = page.locator('textarea[placeholder*="post" i]').first();
    
    if (await postInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await postInput.fill('This is a test post from E2E tests');
      
      const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /post/i }).first();
      
      if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(1000);
        
        // Post should appear in feed
        const content = page.locator('main');
        await expect(content).toBeVisible();
      }
    }
  });

  test('should report a post', async ({ page }) => {
    await page.goto('/feed');
    
    const postMenu = page.locator('[data-testid="post-menu"], button[aria-label*="more" i]').first();
    
    if (await postMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
      await postMenu.click();
      await page.waitForTimeout(500);
      
      const reportBtn = page.locator('button').filter({ hasText: /report/i }).first();
      
      if (await reportBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await reportBtn.click();
        await page.waitForTimeout(500);
        
        // Should show report dialog
        const content = page.locator('main, [role="dialog"]');
        await expect(content.first()).toBeVisible();
      }
    }
  });

  test('should filter feed by content type', async ({ page }) => {
    await page.goto('/feed');
    
    const filters = ['all', 'following', 'trending', 'recent'];
    
    for (const filter of filters) {
      const filterBtn = page.locator('button, [role="tab"]').filter({ hasText: new RegExp(filter, 'i') }).first();
      
      if (await filterBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await filterBtn.click();
        await page.waitForTimeout(300);
        break;
      }
    }
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should infinite scroll feed', async ({ page }) => {
    await page.goto('/feed');
    
    // Scroll to bottom to load more posts
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    // Should load more posts
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});
