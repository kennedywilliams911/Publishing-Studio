# Integration Guide - How to Use the New Components

Quick reference for integrating the 10 new features into your existing pages.

## 1. Add Search Bar to Header

**File**: `src/components/public/Header.tsx`

```tsx
import SearchBar from "@/components/public/SearchBar";

// Inside header JSX:
<SearchBar />;
```

## 2. Add Tag Filtering to Articles List Page

**File**: `src/app/articles/page.tsx`

```tsx
import TagFilter from "@/components/public/TagFilter";

// Get tags from API and pass to component:
const tags = await apiFetchSafe<{ tags: ArticleTag[] }>("/api/public/tags");

<TagFilter tags={tags?.tags || []} />;
```

## 3. Add View Counter to Article Display

**File**: `src/components/public/ArticleReader.tsx`

```tsx
import ViewCounter from "@/components/public/ViewCounter";

// Inside article render:
<ViewCounter articleId={article.id} viewCount={article.viewCount || 0} />;
```

## 4. Add Newsletter Form to Homepage/Sidebar

**File**: `src/app/page.tsx` or `src/components/public/Footer.tsx`

```tsx
import NewsletterForm from "@/components/public/NewsletterForm";

<NewsletterForm churchName={profile?.churchName} />;
```

## 5. Add Series Navigation to Article Page

**File**: `src/app/articles/[slug]/page.tsx`

```tsx
import SeriesNavigation from "@/components/public/SeriesNavigation";

// If article has series:
{
  article.series && (
    <SeriesNavigation
      series={article.series}
      articles={seriesArticles}
      currentSlug={article.slug}
    />
  );
}
```

## 6. Add Audio Player to Article

**File**: `src/components/public/ArticleReader.tsx`

```tsx
import AudioPlayer from "@/components/public/AudioPlayer";

// If article has audio:
{
  article.audioUrl && (
    <AudioPlayer audioUrl={article.audioUrl} title={article.title} />
  );
}
```

## 7. Add Comments Section to Article

**File**: `src/app/articles/[slug]/page.tsx`

```tsx
import CommentsSection from "@/components/public/CommentsSection";

<CommentsSection
  articleId={article.id}
  comments={article.comments}
  enableComments={profile?.enableComments}
/>;
```

## 8. Add Components to Article Editor

**File**: `src/components/admin/ArticleEditorForm.tsx`

Already set up with dynamic imports! Components to integrate:

```tsx
import TagsManager from "@/components/admin/TagsManager";
import SeriesForm from "@/components/admin/SeriesForm";
import SchedulePublishForm from "@/components/admin/SchedulePublishForm";
import AudioUploadField from "@/components/admin/AudioUploadField";

// In form:
<TagsManager
  tags={article.tags}
  onChange={setTags}
  availableTags={allTags}
/>

<SeriesForm
  articleId={article.id}
  currentSeriesId={article.seriesId}
  onSeriesChange={setSeriesId}
/>

<SchedulePublishForm
  value={article.scheduledPublishAt}
  onChange={setScheduledPublishAt}
/>

<AudioUploadField
  value={article.audioUrl}
  onChange={setAudioUrl}
/>
```

## 9. Add Version History to Editor

**File**: `src/components/admin/ArticleEditorForm.tsx`

```tsx
import VersionHistory from "@/components/admin/VersionHistory";

<VersionHistory versions={article.versions} />;
```

## 10. Add Navigation Links to Sidebar

**File**: `src/components/admin/AdminSidebar.tsx`

Add these links to the admin navigation:

```tsx
<NavLink href="/admin/analytics">
  <BarChart3 size={20} />
  Analytics
</NavLink>

<NavLink href="/admin/comments">
  <MessageCircle size={20} />
  Comments
</NavLink>

<NavLink href="/admin/newsletter">
  <Mail size={20} />
  Newsletter
</NavLink>
```

## 11. Add RSS Feed Link to Footer/Header

**File**: `src/components/public/Footer.tsx` or `src/components/public/Header.tsx`

```tsx
<a href="/feed.xml" className="...">
  <Rss size={16} />
  Subscribe to RSS
</a>

// Or link to landing page:
<Link href="/feed">
  RSS Feed
</Link>
```

## API Integration Checklist

Before using components, ensure your backend has these endpoints:

### For Public Features

- [ ] `POST /api/public/articles/:id/views` - Track views
- [ ] `POST /api/newsletter/subscribe` - Newsletter signup
- [ ] `POST /api/articles/:id/comments` - Submit comments
- [ ] `GET /api/public/articles?q=...&tag=...` - Search & filter
- [ ] `POST /api/upload/audio` - Upload audio (admin)

### For Admin Features

- [ ] `GET /api/public/tags` - List tags
- [ ] `POST /api/admin/articles/:id/tags` - Save tags
- [ ] `POST /api/admin/articles/:id/series` - Save series info
- [ ] `GET /api/admin/articles/analytics` - Analytics data
- [ ] `GET /api/admin/comments` - Comment moderation
- [ ] `GET /api/admin/newsletter/subscribers` - Subscriber list

## Environment Variables

Add to `.env.local` if needed:

```env
# Already set
NEXT_PUBLIC_API_URL=http://localhost:4000

# Optional
NEXT_PUBLIC_ENABLE_NEWSLETTER=true
NEXT_PUBLIC_ENABLE_COMMENTS=true
NEXT_PUBLIC_ENABLE_AUDIO=true
```

## Styling Notes

All components use your existing design system:

- Colors: `ink-*`, `parchment-*`, `gold-*`
- Fonts: `font-display` (headers), `font-serif-body` (content)
- Spacing: Tailwind scale
- Dark mode: Fully supported with `dark:` prefix

No additional CSS libraries needed!

## Performance Tips

1. **Search Bar** - Debounce input with `useTransition`
2. **Comments** - Lazy load with `Suspense`
3. **Audio** - Lazy load player on demand
4. **Newsletter** - Use fire-and-forget approach
5. **Analytics** - Cache for 5+ minutes

## Common Issues & Fixes

**Issue**: Components show "not found" error

- **Fix**: Ensure API endpoints are implemented in backend

**Issue**: Newsletter form not submitting

- **Fix**: Check `NEXT_PUBLIC_API_URL` and CORS headers

**Issue**: Audio player not showing

- **Fix**: Verify audio URL is accessible from browser (CORS)

**Issue**: Comments not appearing

- **Fix**: Check that comment moderation is enabled in profile

**Issue**: Search not working

- **Fix**: Ensure full-text search is implemented on backend

## Testing the Features Locally

```bash
# 1. Start backend
cd ../backend
npm run dev

# 2. Start frontend
npm run dev

# 3. Test each feature:
# - Go to /articles and try search
# - Try tag filtering
# - Submit comment on article
# - Subscribe to newsletter
# - Check /feed for RSS
# - Go to admin pages to test moderation
```

---

For more details, see:

- **API_SPECIFICATIONS.md** - Backend API details
- **FEATURES_IMPLEMENTATION.md** - Implementation summary
- Component source files for code examples
