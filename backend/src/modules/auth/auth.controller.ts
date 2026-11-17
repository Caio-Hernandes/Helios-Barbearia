import type { Request, Response } from 'express';
import { getAuthUser } from '../../shared/middlewares/authenticate';
import { usersService } from '../users/users.service';
import { authService } from './auth.service';
import type { LoginInput, RegisterInput } from './auth.schemas';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE_NAME,
  clearRefreshCookieOptions,
  refreshCookieOptions,
} from './token.service';

type IssuedTokens = Awaited<ReturnType<typeof authService.login>>;

/** Refresh token vai no cookie httpOnly; access token vai no corpo da resposta. */
function sendTokens(res: Response, { user, accessToken, refreshToken }: IssuedTokens, status = 200) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  res.status(status).json({ user, accessToken, tokenType: 'Bearer', expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

export const authController = {
  async register(req: Request, res: Response) {
    sendTokens(res, await authService.register(req.body as RegisterInput), 201);
  },

  async login(req: Request, res: Response) {
    sendTokens(res, await authService.login(req.body as LoginInput));
  },

  async refresh(req: Request, res: Response) {
    try {
      sendTokens(res, await authService.refresh(req.cookies?.[REFRESH_COOKIE_NAME]));
    } catch (error) {
      // Cookie inválido/expirado: limpa para o cliente não ficar reenviando
      res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions);
      throw error;
    }
  },

  logout(_req: Request, res: Response) {
    res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions);
    res.status(204).end();
  },

  async me(req: Request, res: Response) {
    res.json(await usersService.getById(getAuthUser(req).id));
  },
};
