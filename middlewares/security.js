/**
 * @module middlewares/security
 * @description Strict security headers middleware for Express applications.
 * Implements defenses against clickjacking, XSS, and unauthorized framing.
 */

/**
 * Applies security-focused HTTP headers to every incoming request.
 * @param {import('express').Request} req - Express Request
 * @param {import('express').Response} res - Express Response
 * @param {import('express').NextFunction} next - Express Next Function
 */
export function setSecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
  
  // Strict Content-Security-Policy with upgraded capabilities
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://www.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.ggpht.com",
      "connect-src 'self' https://*.googleapis.com https://*.google.com https://firestore.googleapis.com https://www.google-analytics.com https://identitytoolkit.googleapis.com",
      "frame-src https://www.google.com https://maps.google.com https://*.firebaseapp.com",
      "worker-src 'self' blob:",
    ].join('; ')
  );
  
  // HSTS (HTTP Strict Transport Security) to force HTTPS over 1 year
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Download-Options', 'noopen');

  next();
}
