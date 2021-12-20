const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

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

// GitHub OAuth2 Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || '/api/oauth/github/callback',
        scope: ['user:email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          const userData = {
            provider: 'github',
            provider_id: profile.id,
            email,
            full_name: profile.displayName || profile.username,
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
  console.log('GitHub OAuth strategy configured');
} else {
  console.log('GitHub OAuth: Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET');
}

module.exports = passport;
