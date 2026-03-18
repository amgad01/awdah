export const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Permitted-Cross-Domain-Policies': 'none',
  // Restrict fetch and framing — defence in depth even for a JSON API
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  // Prevent browsers and CDNs from caching responses that contain personal religious data
  'Cache-Control': 'no-store',
};
