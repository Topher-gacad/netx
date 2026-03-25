export interface UserRow {
  id: number;
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface UserDataRow {
  id: number;
  user_id: number;
  topology: string;
  plugin_data: string;
  preferences: string;
  saved_at: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
}

export interface JwtPayload {
  id: number;
  username: string;
  role: 'user' | 'admin';
}
