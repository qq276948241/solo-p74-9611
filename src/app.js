const express = require('express');
const path = require('path');
const { initDatabase } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const userRoutes = require('./routes/userRoutes');
const petRoutes = require('./routes/petRoutes');
const fosterHomeRoutes = require('./routes/fosterHomeRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const orderRoutes = require('./routes/orderRoutes');
const dailyFeedbackRoutes = require('./routes/dailyFeedbackRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/users', userRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/foster-homes', fosterHomeRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/orders/:orderId/feedbacks', dailyFeedbackRoutes);
app.use('/api/reviews', reviewRoutes);

app.use(errorHandler);

initDatabase();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Pet Foster Platform running on port ${PORT}`);
});

module.exports = app;
