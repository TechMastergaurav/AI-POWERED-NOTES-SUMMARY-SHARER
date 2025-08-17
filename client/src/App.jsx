import React, { useState, useRef } from 'react';

// Get API URL from environment or use default
const API_URL = 'http://localhost:5000';

function App() {
  const [text, setText] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [emailSubject, setEmailSubject] = useState('Meeting Summary');
  const [isSharing, setIsSharing] = useState(false);
  const [summaryLength, setSummaryLength] = useState(50); // 0-100 scale
  const [activeTab, setActiveTab] = useState('paste'); // 'paste', 'url', 'upload'
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  
  const fileInputRef = useRef(null);

  const generateSummary = async () => {
    if (!text.trim()) {
      setAlert({ type: 'error', message: 'Please enter some text to summarize.' });
      return;
    }

    setIsLoading(true);
    setAlert(null);

    try {
      const response = await fetch(`${API_URL}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          customPrompt: customPrompt.trim() || undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate summary');
      }

      setSummary(data.summary);
      setAlert({ type: 'success', message: 'Summary generated successfully!' });
      setShowShare(true);
    } catch (error) {
      console.error('Error generating summary:', error);
      setAlert({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to generate summary. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setAlert({ type: 'error', message: 'File size must be less than 10MB.' });
      return;
    }

    // Check file type
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

    if (!allowedTypes.includes(file.type)) {
      setAlert({ 
        type: 'error', 
        message: 'Unsupported file type. Please upload text, Word document, or image files.' 
      });
      return;
    }

    setIsUploading(true);
    setAlert(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload file');
      }

      setText(data.text);
      setUploadedFileName(data.filename);
      setAlert({ 
        type: 'success', 
        message: `Text extracted successfully from ${data.filename}!` 
      });
      setActiveTab('paste');
    } catch (error) {
      console.error('Error uploading file:', error);
      setAlert({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to upload file. Please try again.' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRecipientInput = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const email = recipientInput.trim();
      if (email && isValidEmail(email) && !recipients.includes(email)) {
        setRecipients([...recipients, email]);
        setRecipientInput('');
      }
    }
  };

  const removeRecipient = (emailToRemove) => {
    setRecipients(recipients.filter(email => email !== emailToRemove));
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const shareSummary = async () => {
    if (!summary.trim()) {
      setAlert({ type: 'error', message: 'No summary to share.' });
      return;
    }

    if (recipients.length === 0) {
      setAlert({ type: 'error', message: 'Please add at least one recipient.' });
      return;
    }

    setIsSharing(true);
    setAlert(null);

    try {
      const response = await fetch(`${API_URL}/api/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: summary.trim(),
          recipients,
          subject: emailSubject.trim() || 'Meeting Summary'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to share summary');
      }

      setAlert({ type: 'success', message: data.message });
      setRecipients([]);
      setRecipientInput('');
      setEmailSubject('Meeting Summary');
    } catch (error) {
      console.error('Error sharing summary:', error);
      setAlert({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to share summary. Please try again.' 
      });
    } finally {
      setIsSharing(false);
    }
  };

  const clearAll = () => {
    setText('');
    setCustomPrompt('');
    setSummary('');
    setRecipients([]);
    setRecipientInput('');
    setEmailSubject('Meeting Summary');
    setShowShare(false);
    setAlert(null);
    setUploadedFileName('');
  };

  const handleSampleText = () => {
    setText("This is a sample meeting transcript. We discussed project timelines, budget allocations, and team responsibilities. John will handle the frontend development, Sarah will manage the backend, and Mike will oversee testing. The deadline is set for next Friday.");
    setActiveTab('paste');
    setUploadedFileName('');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept=".txt,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.tiff"
          style={{ display: 'none' }}
        />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-6 mb-6 flex-wrap">
            <button className="bg-blue-600 text-white px-12 py-4 rounded-full shadow-lg flex items-center gap-3 font-bold text-xl hover:bg-blue-700 transition-all">
              <span className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-lg">🤖</span>
              AI Summarizer
            </button>
          </div>
          
          {/* Length Slider */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <span className="text-gray-700 font-semibold text-lg">Short</span>
            <div className="relative">
              <input
                type="range"
                min="0"
                max="100"
                value={summaryLength}
                onChange={(e) => setSummaryLength(e.target.value)}
                className="w-64 h-3 bg-gray-300 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-gray-700 font-semibold text-lg">Long</span>
          </div>
        </div>

        {/* Alert */}
        {alert && (
          <div className={`mb-6 p-4 rounded-lg ${
            alert.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            alert.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {alert.message}
          </div>
        )}

        {/* Main Input Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          {/* File Upload Status */}
          {uploadedFileName && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <span className="text-green-600">📄</span>
              <span className="text-green-800 font-medium">File uploaded: {uploadedFileName}</span>
            </div>
          )}

          {/* Textarea */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter or paste your text here, upload a file, or drag and drop a file below..."
            className="w-full h-48 p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading || isUploading}
          />

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4 my-8">
            <button
              onClick={handleSampleText}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
                activeTab === 'sample' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
              disabled={isUploading}
            >
              <span className="text-2xl">📄</span>
              <span className="text-sm font-medium">Sample Text</span>
            </button>
            
            <button
              onClick={() => setActiveTab('url')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
                activeTab === 'url' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
              disabled={isUploading}
            >
              <span className="text-2xl">🔗</span>
              <span className="text-sm font-medium">Add URL</span>
            </button>
            
            <button
              onClick={() => setActiveTab('paste')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
                activeTab === 'paste' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
              disabled={isUploading}
            >
              <span className="text-2xl">📋</span>
              <span className="text-sm font-medium">Paste Text</span>
            </button>

            <button
              onClick={triggerFileInput}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
                activeTab === 'upload' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
              disabled={isUploading}
            >
              <span className="text-2xl">📁</span>
              <span className="text-sm font-medium">Upload File</span>
            </button>
          </div>

          {/* Custom Instructions */}
          <div className="mb-6">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Custom instructions (optional): e.g., 'Summarize in bullet points for executives'"
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading || isUploading}
            />
          </div>

          {/* Drag & Drop Area */}
          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50 text-blue-600' 
                : isUploading 
                  ? 'border-gray-200 bg-gray-50 text-gray-400'
                  : 'border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={!isUploading ? triggerFileInput : undefined}
          >
            {isUploading ? (
              <>
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-lg font-medium">Processing file...</p>
                <p className="text-sm">Please wait while we extract text from your file</p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">📁</div>
                <p className="text-lg font-medium mb-2">
                  {isDragOver ? 'Drop your file here' : 'Drag & Drop File/Image'}
                </p>
                <p className="text-sm text-gray-400">
                  Supports: TXT, DOC, DOCX, JPG, PNG, GIF, BMP, TIFF (max 10MB)
                </p>
              </>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="flex justify-between items-center mt-6">
            <div className="flex items-center gap-2 text-gray-600">
              <div className="flex items-center gap-1">
                <div className="w-6 h-4 bg-red-500 rounded-sm"></div>
                <span className="text-sm font-medium">EN</span>
                <span className="text-xs">▲</span>
              </div>
              <button 
                onClick={triggerFileInput}
                className="flex items-center gap-2 text-sm hover:text-gray-800 transition-colors"
                disabled={isUploading}
              >
                <span className="text-lg">📁</span>
                {isUploading ? 'Processing...' : 'Browse File/Image'}
              </button>
            </div>
            
            <button
              onClick={generateSummary}
              disabled={isLoading || isUploading || !text.trim()}
              className="bg-gray-800 text-white px-8 py-3 rounded-full font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? 'Summarizing...' : 'Summarize'}
            </button>
          </div>
        </div>

        {/* Summary Section */}
        {summary && (
          <div className="bg-white rounded-2xl shadow-xl p-10 mb-8">
            <h2 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-3">
              <span>📋</span>
              Generated Summary
            </h2>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full h-48 p-6 border-2 border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-blue-500 text-base leading-relaxed"
              placeholder="Summary will appear here..."
            />
          </div>
        )}

        {/* Share Section */}
        {showShare && summary && (
          <div className="bg-white rounded-2xl shadow-xl p-10">
            <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
              <span>📧</span>
              Share Summary
            </h2>
            
            <div className="space-y-6 mb-8">
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email Subject"
                className="w-full p-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
              
              <div>
                <div className="flex flex-wrap gap-3 mb-4">
                  {recipients.map((email) => (
                    <span key={email} className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-sm">
                      {email}
                      <button 
                        onClick={() => removeRecipient(email)}
                        className="hover:bg-blue-200 rounded-full w-5 h-5 flex items-center justify-center font-bold transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="email"
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  onKeyDown={handleRecipientInput}
                  placeholder="Enter email addresses (press Enter or comma to add)"
                  className="w-full p-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-blue-500 text-base"
                />
                <p className="text-sm text-gray-600 mt-3 font-medium">Press Enter or comma to add each email address</p>
              </div>
            </div>

            <div className="flex gap-6 flex-wrap">
              <button 
                onClick={shareSummary}
                disabled={isSharing || recipients.length === 0}
                className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {isSharing ? 'Sharing...' : 'Share via Email'}
              </button>
              
              <button 
                onClick={clearAll}
                disabled={isSharing}
                className="bg-gray-300 text-gray-800 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-400 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
