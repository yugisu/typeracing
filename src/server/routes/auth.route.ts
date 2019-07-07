import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { userRepository } from 'server/repository/user.repository';

const router = Router();

router.post('/', async (req, res) => {
  const reqUser = req.body;
  const dbUser = await userRepository.getByLogin(reqUser.login);

  if (dbUser && reqUser.password === dbUser.password) {
    const token = jwt.sign(reqUser, 'secret', { expiresIn: '24h' });
    res.status(200).json({ auth: true, token });
  } else {
    res.status(401).json({ auth: false });
  }
});

export { router as authRouter };
