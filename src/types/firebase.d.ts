import 'firebase/auth';

// Extend Firebase User type with additional properties
declare module 'firebase/auth' {
  interface User {
    name?: string;
    profile?: {
      specialty?: string;
      experience?: string;
      bio?: string;
    };
  }
} 