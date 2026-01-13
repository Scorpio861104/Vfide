import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';

/**
 * GET /api/quests/achievements
 * Fetch achievement milestones with user progress
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    const client = await getClient();

    try {
      // Get user ID
      const userResult = await client.query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [userAddress]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const userId = userResult.rows[0].id;

      // Get milestones with user progress
      const milestonesResult = await client.query(`
        SELECT 
          am.id,
          am.milestone_key,
          am.title,
          am.description,
          am.category,
          am.requirement_type,
          am.requirement_value as target,
          am.reward_xp,
          am.reward_vfide,
          am.reward_badge,
          am.icon,
          am.rarity,
          COALESCE(uap.progress, 0) as progress,
          COALESCE(uap.unlocked, false) as unlocked,
          COALESCE(uap.claimed, false) as claimed
        FROM achievement_milestones am
        LEFT JOIN user_achievement_progress uap ON am.id = uap.milestone_id 
          AND uap.user_id = $1
        ORDER BY 
          CASE am.rarity
            WHEN 'legendary' THEN 4
            WHEN 'epic' THEN 3
            WHEN 'rare' THEN 2
            WHEN 'common' THEN 1
            ELSE 0
          END DESC,
          am.requirement_value
      `, [userId]);

      const achievements = milestonesResult.rows.map(row => ({
        id: row.id,
        milestoneKey: row.milestone_key,
        title: row.title,
        description: row.description,
        category: row.category,
        requirementType: row.requirement_type,
        target: row.target,
        progress: row.progress,
        rewardXp: row.reward_xp,
        rewardVfide: (BigInt(row.reward_vfide || '0') / BigInt(10 ** 18)).toString(),
        rewardBadge: row.reward_badge,
        icon: row.icon,
        rarity: row.rarity,
        unlocked: row.unlocked,
        claimed: row.claimed,
      }));

      return NextResponse.json({ achievements });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quests/achievements
 * Update achievement progress
 */
export async function POST(request: NextRequest) {
  try {
    const { milestoneKey, userAddress, progress } = await request.json();

    if (!milestoneKey || !userAddress || progress === undefined) {
      return NextResponse.json(
        { error: 'Milestone key, user address, and progress required' },
        { status: 400 }
      );
    }

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
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const userId = userResult.rows[0].id;

      // Get milestone
      const milestoneResult = await client.query(
        'SELECT id, requirement_value, reward_xp, reward_vfide, reward_badge, title FROM achievement_milestones WHERE milestone_key = $1',
        [milestoneKey]
      );

      if (milestoneResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
      }

      const milestone = milestoneResult.rows[0];
      const unlocked = progress >= milestone.requirement_value;

      // Update or insert progress
      await client.query(`
        INSERT INTO user_achievement_progress 
        (user_id, milestone_id, progress, target, unlocked, unlocked_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, milestone_id) 
        DO UPDATE SET 
          progress = $3,
          unlocked = $5,
          unlocked_at = CASE WHEN $5 = true AND user_achievement_progress.unlocked = false THEN NOW() ELSE user_achievement_progress.unlocked_at END,
          updated_at = NOW()
      `, [userId, milestone.id, progress, milestone.requirement_value, unlocked, unlocked ? new Date() : null]);

      // If newly unlocked, create notification
      if (unlocked) {
        await client.query(`
          INSERT INTO achievement_notifications 
          (user_id, notification_type, title, message, icon, reward_xp, reward_vfide)
          VALUES ($1, 'achievement_unlock', 'Achievement Unlocked!', $2, '🎖️', $3, $4)
          ON CONFLICT DO NOTHING
        `, [
          userId,
          `You've unlocked ${milestone.title}`,
          milestone.reward_xp,
          milestone.reward_vfide,
        ]);
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        unlocked,
        progress,
        target: milestone.requirement_value,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating achievement progress:', error);
    return NextResponse.json(
      { error: 'Failed to update achievement progress' },
      { status: 500 }
    );
  }
}
