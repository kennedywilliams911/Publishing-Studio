export const PUBLIC_CONTENT_CACHE_TAG = "public-content";

export const PUBLIC_CONTENT_FETCH_OPTIONS = {
  revalidate: 60,
  tags: [PUBLIC_CONTENT_CACHE_TAG],
  forwardCookies: false,
};
