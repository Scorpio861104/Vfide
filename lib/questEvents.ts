/**
 * Quest Event System
 * Automatically tracks user actions and marks quests as complete
 */

import { getClient } from './db';

export type QuestEventType =
  | 'wallet_connected'
  | 'profile_created'
  | 'first_transaction'
  | 'message_sent'
  | 'friend_added'
  | 'group_joined'
  | 'vault_created'
  | 'proposal_voted'
  | 'badge_earned'
  | 'endorsement_given'
  | 'quest_completed'
  | 'daily_login'
  | 'transaction_completed';

interface QuestEventData {
  userAddress: string;
  eventType: QuestEventType;
  metadata?: Record<string, any>;
}

/**
 * Check and update quest progress based on event
 */
export async function trackQuestEvent(data: QuestEventData): Promise<void> {
  const { userAddress, eventType, metadata } = data;

  try {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Get user ID
      const userResult = await client.query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [userAddress]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return; // User not found, skip quest tracking
      }

      const userId = userResult.rows[0].id;

      // Get all active daily quests matching this event
      const questsResult = await client.query(`
        SELECT dq.id, dq.quest_type, dq.target_count
        FROM daily_quests dq
        WHERE dq.quest_type = $1
          AND dq.is_active = true
      `, [eventType]);

      // Process each matching quest
      for (const quest of questsResult.rows) {
        // Check if progress exists for today
        const progressResult = await client.query(`
          SELECT id, progress, completed
          FROM user_quest_progress
          WHERE user_id = $1 
            AND quest_id = $2
            AND quest_date = CURRENT_DATE
        `, [userId, quest.id]);

        if (progressResult.rows.length === 0) {
          // Create new progress entry
          await client.query(`
            INSERT INTO user_quest_progress (
              user_id, 
              quest_id, 
              quest_date, 
              progress, 
              target, 
              completed, 
              claimed
            )
            VALUES ($1, $2, CURRENT_DATE, 1, $3, $3 <= 1, false)
          `, [userId, quest.id, quest.target_count]);
        } else {
          const progress = progressResult.rows[0];
          
          // Don't update if already completed
          if (progress.completed) continue;

          // Increment progress
          const newProgress = progress.progress + 1;
          const isComplete = newProgress >= quest.target_count;

          await client.query(`
            UPDATE user_quest_progress
            SET progress = $1,
                completed = $2,
                completed_at = CASE WHEN $2 THEN NOW() ELSE completed_at END,
                updated_at = NOW()
            WHERE id = $3
          `, [newProgress, isComplete, progress.id]);

          // If just completed, create notification
          if (isComplete) {
            await client.query(`
              INSERT INTO notifications (
                user_id,
                type,
                title,
                message,
                link,
                created_at
              )
              VALUES ($1, 'quest_complete', 'Quest Complete!', 'You completed a daily quest. Claim your reward!', '/gamification', NOW())
            `, [userId]);
          }
        }
      }

      // Also check weekly quests
      const weeklyQuestsResult = await client.query(`
        SELECT wq.id, wq.quest_type, wq.target_count
        FROM weekly_quests wq
        WHERE wq.quest_type = $1
          AND wq.is_active = true
      `, [eventType]);

      // Process each matching weekly quest
      for (const quest of weeklyQuestsResult.rows) {
        const progressResult = await client.query(`
          SELECT id, progress, completed
          FROM user_weekly_progress
          WHERE user_id = $1 
            AND quest_id = $2
            AND week_start = date_trunc('week', CURRENT_DATE)
        `, [userId, quest.id]);

        if (progressResult.rows.length === 0) {
          // Create new progress entry
          await client.query(`
            INSERT INTO user_weekly_progress (
              user_id, 
              quest_id, 
              week_start, 
              progress, 
              target, 
              completed, 
              claimed
            )
            VALUES ($1, $2, date_trunc('week', CURRENT_DATE), 1, $3, $3 <= 1, false)
          `, [userId, quest.id, quest.target_count]);
        } else {
          const progress = progressResult.rows[0];
          
          if (progress.completed) continue;

          const newProgress = progress.progress + 1;
          const isComplete = newProgress >= quest.target_count;

          await client.query(`
            UPDATE user_weekly_progress
            SET progress = $1,
                completed = $2,
                completed_at = CASE WHEN $2 THEN NOW() ELSE completed_at END,
                updated_at = NOW()
            WHERE id = $3
          `, [newProgress, isComplete, progress.id]);

          if (isComplete) {
            await client.query(`
              INSERT INTO notifications (
                user_id,
                type,
                title,
                message,
                link,
                created_at
              )
              VALUES ($1, 'quest_complete', 'Weekly Quest Complete!', 'You completed a weekly quest. Claim your reward!', '/gamification', NOW())
            `, [userId]);
          }
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to track quest event:', error);
    // Don't throw - quest tracking failures shouldn't break the main flow
  }
}

/**
 * Helper to track daily login streak
 */
export async function trackDailyLogin(userAddress: string): Promise<void> {
  try {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [userAddress]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return;
      }

      const userId = userResult.rows[0].id;

      // Check last login
      const streakResult = await client.query(`
        SELECT current_streak, last_login_date
        FROM user_gamification
        WHERE user_id = $1
      `, [userId]);

      if (streakResult.rows.length > 0) {
        const { current_streak, last_login_date } = streakResult.rows[0];
        const today = new Date().toISOString().split('T')[0];
        const lastLogin = last_login_date ? new Date(last_login_date).toISOString().split('T')[0] : null;

        let newStreak = current_streak || 0;

        if (lastLogin !== today) {
          // Check if consecutive day
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (lastLogin === yesterdayStr) {
            // Consecutive login
            newStreak += 1;
          } else {
            // Streak broken
            newStreak = 1;
          }

          // Update streak
          await client.query(`
            UPDATE user_gamification
            SET current_streak = $1,
                longest_streak = GREATEST(longest_streak, $1),
                last_login_date = CURRENT_DATE,
                updated_at = NOW()
            WHERE user_id = $2
          `, [newStreak, userId]);

          // Track as quest event
          await trackQuestEvent({
            userAddress,
            eventType: 'daily_login',
            metadata: { streak: newStreak },
          });
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to track daily login:', error);
  }
}
