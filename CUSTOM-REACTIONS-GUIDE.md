# Custom Image Reactions

VFIDE now supports **custom image reactions** in addition to standard emojis! This allows you to react to messages with custom images, brand emojis, or community-specific reactions.

## Features

- ✅ **Standard Emojis**: All Unicode emojis supported
- ✅ **Custom Images**: Upload and use custom reaction images
- ✅ **Multiple Reactions**: Users can add both emoji and custom image reactions
- ✅ **User Tracking**: See who reacted with what
- ✅ **Admin Control**: Admins can add/remove custom reaction images

## Usage

### In Message Components

```tsx
import { ReactionPicker, ReactionDisplay } from '@/components/messages/ReactionPicker';
import { apiClient } from '@/lib/api-client';
import { VFIDE_CUSTOM_REACTIONS } from '@/lib/customReactions';

function MessageComponent({ message, currentUserAddress }) {
  const [showPicker, setShowPicker] = useState(false);
  const [reactions, setReactions] = useState(message.reactions || {});

  const handleAddReaction = async (reaction) => {
    try {
      const result = await apiClient.addReaction(
        message.id,
        message.conversationId,
        reaction,
        currentUserAddress
      );
      setReactions(result.reactions);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  return (
    <div>
      <div>{message.content}</div>
      
      {/* Display existing reactions */}
      <ReactionDisplay
        reactions={reactions}
        currentUserAddress={currentUserAddress}
        onToggle={handleAddReaction}
      />

      {/* Add reaction button */}
      <button onClick={() => setShowPicker(!showPicker)}>
        Add Reaction
      </button>

      {/* Reaction picker */}
      {showPicker && (
        <ReactionPicker
          onSelect={handleAddReaction}
          onClose={() => setShowPicker(false)}
          customImages={VFIDE_CUSTOM_REACTIONS}
        />
      )}
    </div>
  );
}
```

### API Usage

#### Add Emoji Reaction

```typescript
await apiClient.addReaction(
  messageId,
  conversationId,
  { type: 'emoji', emoji: '👍' },
  userAddress
);
```

#### Add Custom Image Reaction

```typescript
await apiClient.addReaction(
  messageId,
  conversationId,
  { 
    type: 'custom_image', 
    imageUrl: '/images/reactions/vfide-rocket.png',
    imageName: 'VFIDE Rocket'
  },
  userAddress
);
```

#### Remove Reaction (DELETE endpoint)

```typescript
await fetch('/api/messages/reaction', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messageId,
    conversationId,
    reactionType: 'emoji', // or 'custom_image'
    emoji: '👍', // or imageUrl for custom images
    userAddress
  })
});
```

## Database Schema

The `message_reactions` table supports both types:

```sql
CREATE TABLE message_reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id),
    user_id INTEGER REFERENCES users(id),
    reaction_type VARCHAR(20) DEFAULT 'emoji', -- 'emoji' or 'custom_image'
    emoji VARCHAR(10),                          -- For emoji reactions
    image_url TEXT,                             -- For custom image reactions
    image_name VARCHAR(100),                    -- Name/description of custom image
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_reaction CHECK (
        (reaction_type = 'emoji' AND emoji IS NOT NULL) OR
        (reaction_type = 'custom_image' AND image_url IS NOT NULL)
    )
);
```

## Migration

Run the migration to add custom reaction support to existing databases:

```bash
psql -U your_user -d vfide_db -f database/migrations/002_add_custom_reactions.sql
```

## Adding Custom Reactions

### 1. Prepare Images

- Size: 64x64 to 128x128 pixels recommended
- Format: PNG with transparency preferred
- Location: Place in `/public/images/reactions/`

### 2. Register in Config

Edit `/frontend/lib/customReactions.ts`:

```typescript
export const VFIDE_CUSTOM_REACTIONS: CustomReaction[] = [
  {
    id: 'my_custom',
    name: 'My Custom Reaction',
    url: '/images/reactions/my-custom.png',
    category: 'custom',
    tags: ['fun', 'custom']
  },
  // ... more reactions
];
```

### 3. Use in Components

The reactions will automatically appear in the ReactionPicker's "Custom" tab.

## Response Format

When fetching reactions, the API returns:

```json
{
  "success": true,
  "messageId": "123",
  "reactions": {
    "👍": {
      "type": "emoji",
      "emoji": "👍",
      "imageUrl": null,
      "imageName": null,
      "users": [
        {
          "address": "0x123...",
          "username": "alice",
          "avatar": "https://..."
        }
      ]
    },
    "/images/reactions/vfide-rocket.png": {
      "type": "custom_image",
      "emoji": null,
      "imageUrl": "/images/reactions/vfide-rocket.png",
      "imageName": "VFIDE Rocket",
      "users": [...]
    }
  }
}
```

## Best Practices

1. **Image Optimization**: Use optimized images to reduce load times
2. **Consistent Sizing**: Keep all custom reactions at the same dimensions
3. **Clear Names**: Use descriptive names for custom reactions
4. **Categories**: Organize custom reactions by category for easier navigation
5. **Rate Limiting**: Consider rate limiting reaction additions to prevent spam
6. **Moderation**: Review and approve custom reactions before making them available

## Future Enhancements

- [ ] Animated GIF reactions
- [ ] User-uploaded custom reactions
- [ ] Reaction packs/themes
- [ ] Reaction usage analytics
- [ ] Reaction marketplace (buy/sell custom reaction packs)
- [ ] NFT-based exclusive reactions
