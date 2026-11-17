import { Role } from '@prisma/client';
import { UnauthorizedError } from '../../shared/errors/app-error';
import { comparePassword } from '../../shared/security/password';
import { usersRepository, type PublicUser } from '../users/users.repository';
import { usersService } from '../users/users.service';
import type { LoginInput, RegisterInput } from './auth.schemas';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './token.service';

function issueTokens(user: PublicUser) {
  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user.id),
  };
}

export const authService = {
  /** Cadastro público: sempre cria um CLIENTE. Funcionários são criados pelo dono. */
  async register(input: RegisterInput) {
    const user = await usersService.create(input, Role.CLIENT);
    return issueTokens(user);
  },

  async login({ email, password }: LoginInput) {
    const user = await usersRepository.findByEmailWithPassword(email);
    // Mensagem genérica para não revelar se o e-mail existe
    if (!user || !(await comparePassword(password, user.passwordHash))) {
      throw new UnauthorizedError('E-mail ou senha inválidos.');
    }
    const { passwordHash: _ignored, updatedAt: _u, ...publicUser } = user;
    return issueTokens(publicUser);
  },

  /**
   * Valida o refresh token do cookie e emite um novo par (rotação).
   * O usuário é recarregado do banco para refletir papel atualizado ou conta removida.
   */
  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedError('Refresh token ausente.');

    const { userId } = verifyRefreshToken(refreshToken);
    const user = await usersRepository.findById(userId);
    if (!user) throw new UnauthorizedError('Usuário não encontrado.');

    return issueTokens(user);
  },
};
