import * as fs from "fs";
import * as path from "path";

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
}

const DB_PATH = path.join(__dirname, "..", "..", ".data", "users.json");

const ensureDbFile = () => {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify([]));
  }
};

const loadUsers = (): User[] => {
  ensureDbFile();
  try {
    const data = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load users:", error);
    return [];
  }
};

const saveUsers = (users: User[]) => {
  ensureDbFile();
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Failed to save users:", error);
  }
};

export const userDb = {
  findByUsername: (username: string): User | undefined => {
    const users = loadUsers();
    return users.find((user) => user.username === username);
  },

  findByEmail: (email: string): User | undefined => {
    const users = loadUsers();
    return users.find((user) => user.email === email);
  },

  create: (user: Omit<User, "id" | "createdAt">): User => {
    const users = loadUsers();
    const newUser: User = {
      ...user,
      id: Math.random().toString(36).substring(7),
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    saveUsers(users);
    return newUser;
  },

  getAll: (): User[] => {
    return loadUsers();
  },
};
