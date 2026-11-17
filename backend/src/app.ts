import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './shared/middlewares/error-handler';
import { authRoutes } from './modules/auth/auth.routes';
import { usersRoutes } from './modules/users/users.routes';
import { catalogRoutes } from './modules/catalog/catalog.routes';
import { barbersRoutes } from './modules/barbers/barbers.routes';
import { appointmentsRoutes } from './modules/appointments/appointments.routes';

// Mensagens de validação do Zod em português
z.config(z.locales.pt());

export const app = express();

app.use(helmet());
// credentials: true para o navegador enviar o cookie do refresh token
app.use(cors({ origin: env.CORS_ORIGIN.split(','), credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/catalog', catalogRoutes);
app.use('/barbers', barbersRoutes);
app.use('/appointments', appointmentsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
