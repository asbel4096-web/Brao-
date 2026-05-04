# Stories Firestore structure

## Collection: stories
Document fields:
- ownerId: string
- ownerName: string
- ownerPhotoURL?: string
- ownerRole: "trader" | "service_provider"
- type: "car" | "service" | "offer"
- coverUrl: string
- media: Array<{
  - id: string
  - kind: "image" | "video"
  - url: string
  - storagePath: string
  - mimeType: string
  - sizeBytes: number
  - durationSec?: number
  - width?: number
  - height?: number
  - thumbnailUrl?: string
}>
- payload: car | service | offer payload
- viewsCount: number
- createdAt: Timestamp
- expiresAt: Timestamp

## Subcollection: stories/{storyId}/viewers/{userId}
Document fields:
- userId: string
- storyId: string
- ownerId: string
- viewedAt: Timestamp

## Storage path
- stories/{userId}/{timestamp-index-filename}
