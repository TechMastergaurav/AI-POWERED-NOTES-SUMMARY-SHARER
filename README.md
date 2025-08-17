# AI-Powered Meeting Notes Summarizer & Sharer

[![Frontend](https://img.shields.io/badge/Frontend-React-blue)](https://reactjs.org/) 
[![Backend](https://img.shields.io/badge/Backend-Node.js-green)](https://nodejs.org/) 
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## **Project Overview**
A web application that transforms lengthy meeting notes, transcripts, or documents into clear, structured summaries. Users can input custom prompts for personalized summaries and share them via email with multiple recipients.

---

## **Live Demo**
- Frontend: [https://ai-powered-notes-summary-sharer.vercel.app](https://ai-powered-notes-summary-sharer.vercel.app)  
- Backend: [https://ai-powered-notes-summary-sharer-1.onrender.com](https://ai-powered-notes-summary-sharer-1.onrender.com)

---

## **Features**
- Upload files or paste text directly.  
- Extract text from `.txt`, `.doc`, `.docx`, `.jpg`, `.png`, `.gif`, `.bmp`, `.tiff`.  
- AI-generated summaries with optional custom prompts.  
- Share summaries via email with multiple recipients.  
- Drag-and-drop file upload and responsive UI.  
- Error handling, CORS protection, and rate limiting for security.  

---

## **Tech Stack**
- **Frontend:** React, Vite, TailwindCSS  
- **Backend:** Node.js, Express  
- **File Handling:** Multer  
- **Document Processing:** Mammoth.js  
- **OCR:** Tesseract.js  
- **AI Summarization:** Groq API  
- **Email Sending:** Nodemailer  
- **Security:** Helmet, express-rate-limit, CORS  
- **Deployment:** Render (Backend), Vercel (Frontend)  

---

## **Getting Started**

### **Prerequisites**
- Node.js v18+  
- npm or yarn  
- Groq API Key  
- Gmail account (for sending emails)  

### **Backend Setup**
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ai-powered-notes-summary-sharer.git
   cd ai-powered-notes-summary-sharer/server
