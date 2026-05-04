# Firestore Data Structure

## users/{uid}
```ts
{
  uid: string,
  name: string,
  businessName?: string,
  email: string,
  phone: string,
  city?: string,
  bio?: string,
  photoURL?: string,
  followersCount?: number,
  followingCount?: number,
  averageRating?: number,
  ratingsCount?: number,
  listingsCount?: number,
  servicesCount?: number,
  isOnline?: boolean,
  isAdmin?: boolean,
  createdAt?: Timestamp,
  updatedAt?: Timestamp,
  lastLoginAt?: Timestamp,
  lastSeenAt?: Timestamp,
}
```

## users/{uid}/followers/{followerUid}
```ts
{
  followerId: string,
  followerName: string,
  followerPhoto?: string,
  createdAt?: Timestamp,
}
```

## users/{uid}/following/{traderUid}
```ts
{
  traderId: string,
  createdAt?: Timestamp,
}
```

## users/{uid}/reviews/{reviewId}
```ts
{
  traderId: string,
  authorId: string,
  authorName: string,
  authorPhoto?: string,
  rating: number,
  text?: string,
  createdAt?: Timestamp,
}
```

## listings/{listingId}
```ts
{
  title: string,
  category: string,
  entityType?: 'listing' | 'service',
  city: string,
  price: number,
  description: string,
  images: string[],
  sellerName: string,
  phone: string,
  ownerId: string,
  status: 'pending' | 'approved' | 'rejected' | 'draft',
  likesCount?: number,
  favoritesCount?: number,
  commentsCount?: number,
  commentsEnabled?: boolean,
  views?: number,
  createdAt?: Timestamp,
  updatedAt?: Timestamp,
}
```

## listings/{listingId}/likes/{userUid}
```ts
{
  userId: string,
  listingId: string,
  ownerId: string,
  title: string,
  image?: string,
  createdAt?: Timestamp,
}
```

## listings/{listingId}/comments/{commentId}
```ts
{
  text: string,
  userId: string,
  userName: string,
  userPhoto?: string,
  ownerId?: string,
  createdAt?: Timestamp,
}
```

## commentReports/{commentId_userUid}
```ts
{
  commentId: string,
  listingId: string,
  commentOwnerId: string,
  reportedBy: string,
  reportedAt?: Timestamp,
  text: string,
}
```

## users/{uid}/likedListings/{listingId}
```ts
{
  listingId: string,
  ownerId: string,
  createdAt?: Timestamp,
}
```

# Files created or modified
- /app/(public)/traders/[uid]/page.tsx
- /app/(public)/listings/[id]/page.tsx
- /components/listing-card.tsx
- /components/listing-comments.tsx
- /components/share-button.tsx
- /components/like-button.tsx
- /components/listing-actions-bar.tsx
- /components/trader/trader-profile-header.tsx
- /components/trader/trader-tabs.tsx
- /hooks/useListingEngagement.ts
- /hooks/useTraderProfile.ts
- /lib/types.ts
- /lib/utils.ts
