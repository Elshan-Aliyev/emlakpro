const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const imageRoutes = require('./routes/imageRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const messageRoutes = require('./routes/messageRoutes');
const verificationRoutes = require('./routes/verificationRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/users', userRoutes);

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/verification', verificationRoutes);

app.get('/', (req, res) => res.send('Temsilcim API running'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Temsilcim server listening on port ${PORT}`));
