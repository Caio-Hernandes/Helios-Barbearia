import { Router } from 'express';
import { authenticate } from '../../shared/middlewares/authenticate';
import { validate } from '../../shared/middlewares/validate';
import { authController } from './auth.controller';
import { loginBodySchema, registerBodySchema } from './auth.schemas';

export const authRoutes = Router();

authRoutes.post('/register', validate({ body: registerBodySchema }), authController.register);
authRoutes.post('/login', validate({ body: loginBodySchema }), authController.login);
authRoutes.post('/refresh', authController.refresh);
authRoutes.post('/logout', authController.logout);
authRoutes.get('/me', authenticate, authController.me);
