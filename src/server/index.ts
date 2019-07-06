import express from 'express';
import path from 'path';
import { createServer } from 'http';

import { indexRouter } from './routes/index.route';

const app = express();
const server = createServer(app);

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

// Routes
app.use(indexRouter);

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.info(`> Server working on localhost:${port}`);
});
