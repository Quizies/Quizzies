import express from 'express';
import mongoose from 'mongoose';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { generateMCQs } from './groq.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  googleId: String,
  displayName: String,
  profilePicture: String,
  createdAt: { type: Date, default: Date.now },
  examsTaken: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
});

const User = mongoose.model('User', userSchema);

// Passport Setup
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENTID,
  clientSecret: process.env.CLIENTSECRET,
  callbackURL: 'http://localhost:3000/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
      user = new User({
        googleId: profile.id,
        displayName: profile.displayName,
        profilePicture: profile.photos[0].value,
      });
      await user.save();
    }

    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Session middleware with MongoStore
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 1 day
}));

// Initialize Passport and session
app.use(passport.initialize());
app.use(passport.session());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Error logging out:', err);
      return res.status(500).json({ error: 'Error logging out' });
    }
    res.redirect('/');
  });
});

app.get('/user', (req, res) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.post('/generate-quiz', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { language, subject, paragraphs } = req.body;

  if (!language || !subject || !paragraphs) {
    return res.status(400).json({ error: 'Language, subject, and paragraphs are required.' });
  }

  const quiz = await generateMCQs(language, subject, paragraphs);

  // Update user stats
  req.user.examsTaken += 1;
  await req.user.save();

  res.json({ quiz });
});

// Update points after quiz completion
app.post('/update-points', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { answers } = req.body;

  // Calculate points: 2 points per correct answer
  const correctAnswers = answers.filter((answer) => answer === true).length;
  req.user.points += correctAnswers * 2; // 2 points per correct answer
  await req.user.save();

  res.json({ success: true, points: req.user.points });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});