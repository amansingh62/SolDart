// config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const jwt = require("jsonwebtoken");

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findOne({ googleId: id }); // Find by googleId
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// In config/passport.js - Keep existing code but update the strategy callback

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log(profile); // Check Google user data

        // First check if user exists by Google ID
        let user = await User.findOne({ googleId: profile.id });

        // If no user found by Google ID, check if user exists by email
        if (!user) {
          const existingUser = await User.findOne({ email: profile.emails[0].value });
          
          if (existingUser) {
            // User exists with this email, update with Google ID
            existingUser.googleId = profile.id;
            user = await existingUser.save();
          } else {
            // Create a new user if no existing user found
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            
            user = await User.create({
              googleId: profile.id,
              name: profile.displayName, // Set name from profile display name
              username: profile.displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000), // Create a username
              email: profile.emails[0].value,
              password: randomPassword, // Set a random password for Google auth users
              // Initialize socialLinks object to match schema
              socialLinks: {
                website: "",
                telegram: "",
                twitter: "",
                discord: "",
                ethereum: ""
              }
            });
          }
        }

        // Generate JWT token
        const token = jwt.sign(
          { id: user._id, username: user.username },
          process.env.JWT_SECRET,
          { expiresIn: "1d" }
        );

        console.log({ id: user._id, username: user.username })
        // Attach token to user object
        user.token = token;

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);