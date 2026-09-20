import crypto from "crypto";
import { createHash } from "crypto";

/**
 * Hash an IP address for privacy (GDPR compliance)
 */
export function hashIP(ip: string | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Generate a slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Sanitize HTML content (remove scripts, allow safe tags)
 */
export function sanitizeContent(content: string): string {
  // Remove script tags and their content
  let sanitized = content.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );

  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "");

  return sanitized;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Extract plain text from HTML
 */
export function extractPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ") // Remove HTML tags
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Get client IP from request
 */
export function getClientIP(req: any): string | undefined {
  return (
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req.headers["x-real-ip"]?.toString() ||
    req.socket?.remoteAddress
  );
}

/**
 * Rate limit checker (simple in-memory implementation)
 * For production, use Redis
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Parse pagination parameters
 */
export function parsePagination(
  limit?: string | number,
  offset?: string | number,
  defaultLimit: number = 12,
  maxLimit: number = 100,
) {
  let parsedLimit = defaultLimit;
  let parsedOffset = 0;

  if (limit) {
    parsedLimit = Math.min(
      Math.max(parseInt(String(limit), 10) || defaultLimit, 1),
      maxLimit,
    );
  }

  if (offset) {
    parsedOffset = Math.max(parseInt(String(offset), 10) || 0, 0);
  }

  return { limit: parsedLimit, offset: parsedOffset };
}

/**
 * Calculate series progress
 */
export function calculateSeriesProgress(
  position: number,
  total: number,
): string {
  return `${position} of ${total}`;
}

/**
 * Format date for API responses
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}
