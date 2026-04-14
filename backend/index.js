require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { uploadBufferToImageBB } = require('./services/imagebb');
const { requireAuth } = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

app.get('/', (req, res) => {
  res.json({ ok: true, message: 'server is running' });
});

app.get('/api', (req, res) => {
  res.json({ ok: true, message: 'api is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Auth (SQL-backed Users)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/notifications', require('./routes/notificationsRoutes'));

// Schema-based endpoints
app.use('/api/users', require('./routes/usersRoutes'));
app.use('/api/news', require('./routes/newsRoutes'));
app.use('/api/partners', require('./routes/partnersRoutes'));
app.use('/api/team-members', require('./routes/teamMembersRoutes'));
app.use('/api/mission-vision', require('./routes/missionVisionRoutes'));
app.use('/api/our-story', require('./routes/ourStoryRoutes'));
app.use('/api/about-us-cards', require('./routes/aboutUsCardsRoutes'));
app.use('/api/chats', require('./routes/chatsRoutes'));
app.use('/api/stories', require('./routes/storiesRoutes'));

// Upload image (ImageBB)
app.post('/api/upload', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const imageUrl = await uploadBufferToImageBB(file.buffer, file.originalname);

    return res.json({ success: true, imageUrl });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`server running on http://${HOST}:${PORT}`);
});