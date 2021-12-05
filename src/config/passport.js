const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Google OAuth2 Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/oauth/google/callback',
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const userData = {
            provider: 'google',
            provider_id: profile.id,
            email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
            full_name: profile.displayName,
            avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
            access_token: accessToken,
            profile: profile._json,
          };
          done(null, userData);
        } catch (error) {
          done(error, null);
        }
      }
    )
  );
  console.log('Google OAuth strategy configured');
} else {
  console.log('Google OAuth: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

module.exports = passport;
