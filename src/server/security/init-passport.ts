import { Express } from 'express';
import passport from 'passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { userRepository } from 'server/repository/user.repository';

if (!process.env.SECRET_KEY) console.warn('> You should specify SECRET_KEY in .env file');

const jwtStrategy = new Strategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.SECRET_KEY || 'secret',
  },
  async ({ id: login }, done) => {
    try {
      const user = await userRepository.getByLogin(login);

      return user ? done(null, user) : done({ status: 401, message: 'Invalid token' });
    } catch (err) {
      done(err);
    }
  }
);

passport.use('jwt', jwtStrategy);

export const initializePassport = (app: Express) => {
  app.use(passport.initialize());

  return passport.authenticate('jwt', { session: false });
};
