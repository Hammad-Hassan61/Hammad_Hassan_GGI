import { Request, Response, NextFunction } from 'express';

// Sanitize input to prevent XSS attacks
export const sanitizeInput = (data: any): any => {
  if (typeof data === 'string') {
    return data
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeInput(item));
  }

  if (data !== null && typeof data === 'object') {
    const sanitized: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sanitized[key] = sanitizeInput(data[key]);
      }
    }
    return sanitized;
  }

  return data;
};

export const xssSanitizer = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }

  next();
};
