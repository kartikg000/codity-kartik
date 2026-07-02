import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import queueRoutes from './routes/queueRoutes';
import jobRoutes from './routes/jobRoutes';


const app = express();

app.use(cors());
app.use(express.json());
app.use(pinoHttp());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/jobs', jobRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));