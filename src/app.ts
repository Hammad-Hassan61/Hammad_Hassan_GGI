import express, { Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimiterMiddleware, authRateLimiter, chatRateLimiter, subRateLimiter } from './middleware/rateLimiter';
import { authenticate, authorize } from './middleware/auth';
import { ChatController } from './modules/chat/controllers/ChatController';
import { SubscriptionController } from './modules/subscriptions/controllers/SubscriptionController';
import morgan from 'morgan';
import { AppDataSource } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import logger from './shared/logger';
import { v4 as uuidv4 } from 'uuid';
import { xssSanitizer } from './middleware/xssSanitizer';

import { AuthController } from './modules/auth/controllers/AuthController';

const app = express();

// To remove Timezone conversion confusion
process.env.TZ = 'UTC';

app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  next();
});

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS }));
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(xssSanitizer);


app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: {
    write: (message) => {
      logger.info(message.trim());
    }
  }
}));

const authController = new AuthController();
const chatController = new ChatController();
const subscriptionController = new SubscriptionController();

app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

app.post('/api/auth/signup', rateLimiterMiddleware(authRateLimiter), (req, res, next) => authController.signUp(req, res, next));
app.post('/api/auth/login', rateLimiterMiddleware(authRateLimiter), (req, res, next) => authController.login(req, res, next));
app.post('/api/auth/google', rateLimiterMiddleware(authRateLimiter), (req, res, next) => authController.loginWithGoogle(req, res, next));
app.get('/api/users/me', authenticate, (req, res, next) => authController.getMe(req, res, next));

app.post(
  '/api/chat',
  authenticate,
  rateLimiterMiddleware(chatRateLimiter),
  authorize(),
  (req: any, res: Response, next: any) => chatController.askQuestion(req, res).catch(next)
);

app.get(
  '/api/chat/my',
  authenticate,
  rateLimiterMiddleware(chatRateLimiter),
  authorize(),
  (req: any, res: Response, next: any) => chatController.getMyChats(req, res).catch(next)
);

app.get(
  '/api/chat/:id',
  authenticate,
  rateLimiterMiddleware(chatRateLimiter),
  authorize(),
  (req: any, res: Response, next: any) => chatController.getChatInfo(req, res).catch(next)
);

app.post(
  '/api/subscriptions',
  authenticate,
  rateLimiterMiddleware(subRateLimiter),
  authorize(),
  (req: any, res: Response, next: any) => subscriptionController.create(req, res).catch(next)
);

app.get(
  '/api/subscriptions/my',
  authenticate,
  rateLimiterMiddleware(subRateLimiter),
  authorize(),
  (req: any, res: Response, next: any) => subscriptionController.getMySubscriptions(req, res).catch(next)
);

app.post(
  '/api/subscriptions/:id/cancel',
  authenticate,
  rateLimiterMiddleware(subRateLimiter),
  authorize(),
  (req: any, res: Response, next: any) => subscriptionController.cancel(req, res).catch(next)
);


app.get(
  '/api/admin/metrics',
  authenticate,
  rateLimiterMiddleware(subRateLimiter),
  authorize(),
  (req, res) => res.json({ 
    message: 'System-wide metrics',
    timestamp: new Date().toISOString()
  })
);

app.use(errorHandler);

const PORT = process.env.PORT;

AppDataSource.initialize()
  .then(() => {
    console.log('Data Source has been initialized!');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error during Data Source initialization', err);
  });

export default app;
