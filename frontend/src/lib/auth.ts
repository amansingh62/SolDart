import CredentialsProvider from 'next-auth/providers/credentials';

// Define the auth options for NextAuth
export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials: any) {
        // This is a placeholder for your actual authentication logic
        // You would typically validate credentials against your database here
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Return a user object if authentication is successful
        // This is just a placeholder - replace with your actual user data
        return {
          id: 'user-id',
          email: credentials.email,
          name: 'User Name',
        };
      }
    })
  ],
  session: {
    strategy: 'jwt' as const,
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
};