import fs from 'fs';
import { promisify } from 'util';

import { User } from 'shared/types/user.type';

const STORAGE_PATH = __dirname + '/storage/users.json';

const readFile = promisify(fs.readFile);

const getAll = async (): Promise<User[]> => {
  try {
    const data = await readFile(STORAGE_PATH);
    const users = JSON.parse(data.toString()) as User[];

    return users;
  } catch (err) {
    console.error(err);

    return [];
  }
};

const getByLogin = async (login: string): Promise<User | null> => {
  const users = await getAll();
  const user = users.find((user) => user.login === login);

  return user === undefined ? null : user;
};

export const userRepository = {
  getAll,
  getByLogin,
};
