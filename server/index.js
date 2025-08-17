import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { Groq } from 'groq-sdk';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
const PORT = process.env.PORT || 5000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
try {
  await fs.mkdir(uploadsDir, { recursive: true });
} catch (error) {
  console.log('Uploads directory already exists or error creating it:', error.message);
}

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Please upload text, Word document, or image files.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Security middleware
app.use(helmet());

// CORS configuration for both development and production
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000', // Development
      'http://localhost:5173',
      'http://192.168.162.67:3000', // Local network IP
      'https://ai-powered-notes-summary-sharer.vercel.app/', // Replace with your actual Vercel domain
      process.env.FRONTEND_URL, // Environment variable for production
    ].filter(Boolean);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Helper function to extract text from different file types
async function extractTextFromFile(filePath, mimetype) {
  try {
    switch (mimetype) {
      case 'text/plain':
        return await fs.readFile(filePath, 'utf8');
      
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        const docBuffer = await fs.readFile(filePath);
        const docResult = await mammoth.extractRawText({ buffer: docBuffer });
        return docResult.value;
      
      case 'image/jpeg':
      case 'image/png':
      case 'image/gif':
      case 'image/bmp':
      case 'image/tiff':
        console.log('Starting OCR processing for:', filePath);
        const { data: { text } } = await Tesseract.recognize(filePath, 'eng', {
          logger: m => console.log('OCR Progress:', m.status, m.progress)
        });
        console.log('OCR completed, extracted text length:', text?.length || 0);
        return text;
      
      default:
        throw new Error('Unsupported file type');
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error(`Failed to extract text from file: ${error.message}`);
  }
}

// Helper function to clean up uploaded files
async function cleanupFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error cleaning up file:', error);
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Notes Summarizer API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    supportedFileTypes: ['text/plain', 'Word documents', 'Images (JPG, PNG, GIF, BMP, TIFF)']
  });
});

// Upload and extract text endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const mimetype = req.file.mimetype;

    console.log('Processing file:', req.file.originalname, 'Type:', mimetype, 'Size:', req.file.size);

    const extractedText = await extractTextFromFile(filePath, mimetype);

    if (!extractedText || extractedText.trim().length === 0) {
      await cleanupFile(filePath);
      return res.status(400).json({ error: 'No text could be extracted from the uploaded file' });
    }

    // Clean up the uploaded file
    await cleanupFile(filePath);

    res.json({
      success: true,
      text: extractedText,
      filename: req.file.originalname,
      fileType: mimetype,
      message: 'Text extracted successfully',
      textLength: extractedText.length
    });

  } catch (error) {
    console.error('File upload/processing error:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      await cleanupFile(req.file.path);
    }

    res.status(500).json({
      error: 'Failed to process uploaded file',
      details: error.message,
    });
  }
});

// Summarize text endpoint (existing)
app.post('/api/summarize', async (req, res) => {
  try {
    const { text, customPrompt } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'Groq API key not configured' });
    }

    const prompt = customPrompt
      ? `${customPrompt}\n\nText to summarize:\n${text}`
      : `Please provide a clear and structured summary of the following text. Focus on key points, main ideas, and important details:\n\n${text}`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'You are a professional meeting notes summarizer. Provide clear, well-structured summaries that are easy to read and understand.',
        },
        { role: 'user', content: prompt },
      ],
      model: 'llama3-8b-8192',
      temperature: 0.3,
      max_tokens: 2048,
    });

    const summary = completion.choices[0]?.message?.content || 'No summary generated';

    res.json({
      summary,
      originalText: text,
      customPrompt: customPrompt || 'Default summarization',
    });
  } catch (error) {
    console.error('Summarization error:', error);
    res.status(500).json({
      error: 'Failed to generate summary',
      details: error.message,
    });
  }
});

// Share summary via email endpoint (existing)
app.post('/api/share', async (req, res) => {
  try {
    const { summary, recipients, subject, message } = req.body;

    if (!summary || !recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'Summary and recipients are required' });
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({ error: 'Email configuration not set up properly' });
    }

    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const emailContent = `
      <h2>Meeting Summary</h2>
      <p><strong>Subject:</strong> ${subject || 'Meeting Summary'}</p>
      <hr>
      <div style="white-space: pre-wrap;">${summary}</div>
      <hr>
      <p><em>This summary was generated using AI-powered meeting notes summarizer.</em></p>
    `;

    const emailPromises = recipients.map((recipient) => {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipient,
        subject: subject || 'Meeting Summary',
        html: emailContent,
        text: summary,
      };

      return transporter.sendMail(mailOptions);
    });

    await Promise.all(emailPromises);

    res.json({
      success: true,
      message: `Summary shared successfully with ${recipients.length} recipient(s)`,
      recipients,
    });
  } catch (error) {
    console.error('Email sharing error:', error);
    res.status(500).json({
      error: 'Failed to share summary via email',
      details: error.message,
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: error.message });
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log('Supported file types: Text files, Word documents, Images (JPG, PNG, GIF, BMP, TIFF)');
});

