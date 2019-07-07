import path from 'path';
import express from 'express';
import passport from 'passport';
import socketIO from 'socket.io';
import { createServer } from 'http';

import { viewRouter } from './routes/view.route';
import { initializePassport } from './security/init-passport';
import { authRouter } from './routes/auth.route';
import { initializeSocket } from './socket/init.socket';

const app = express();
const server = createServer(app);
const io = socketIO(server);

// Initialize Passport
const jwtMiddleware = initializePassport(app);

// Middlewares
app
  .use(express.urlencoded({ extended: false }))
  .use(express.json())
  .use(passport.initialize())
  .use(express.static(path.join(__dirname, '../client/dist')));

// Routes
app.use('/login', authRouter).use('*', viewRouter);

initializeSocket(io);

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.info(`> Server working on localhost:${port}`);
});
