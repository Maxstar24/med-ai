'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDropzone } from 'react-dropzone';
import Markdown from '@/components/Markdown';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash, Image, Check, Loader2, Eye, Edit } from 'lucide-react';

interface Answer {
  question: string;
  answer: string;
  explanation: string;
  imageUrl?: string;
}

const CreateCasePage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([{ question: '', answer: '', explanation: '' }]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [plainTextMode, setPlainTextMode] = useState(true);
  
  // Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/cases/create');
    }
  }, [status, router]);
  
  // Handle image uploads
  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setUploadingImage(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', acceptedFiles[0]);
      
      console.log('Uploading file:', acceptedFiles[0].name, acceptedFiles[0].type, acceptedFiles[0].size);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include cookies for authentication
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Upload error response:', errorData);
        throw new Error(errorData.error || 'Failed to upload image');
      }
      
      const data = await response.json();
      console.log('Upload success:', data);
      
      // Add image URL to content or question based on context
      if (currentQuestionIndex !== null) {
        // Add to specific question
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex].imageUrl = data.url;
        setAnswers(newAnswers);
      } else {
        // Add to main content
        const imageMarkdown = plainTextMode 
          ? `\n\n[Image: ${acceptedFiles[0].name}]\n\n` 
          : `\n\n![${acceptedFiles[0].name}](${data.url})\n\n`;
        setContent(prev => prev + imageMarkdown);
      }
      
      // Add to uploaded images array
      setUploadedImages(prev => [...prev, data.url]);
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(`Error uploading image: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploadingImage(false);
      setCurrentQuestionIndex(null);
    }
  };
  
  const { getRootProps, getInputProps, isDragActive, isDragReject, fileRejections } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    onDropRejected: (rejections) => {
      console.log('Drop rejected:', rejections);
      if (rejections.length > 0) {
        const { errors } = rejections[0];
        if (errors.length > 0) {
          setError(`Image upload failed: ${errors[0].message}`);
        }
      }
    }
  });
  
  // Handle adding image to a specific question
  const handleAddQuestionImage = (index: number) => {
    setCurrentQuestionIndex(index);
    // Trigger the dropzone programmatically
    document.getElementById('dropzone-trigger')?.click();
  };
  
  // Convert plain text to markdown when switching modes
  const handleToggleTextMode = () => {
    setPlainTextMode(!plainTextMode);
  };
  
  // Handle tag input
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  // Handle specialty input
  const handleAddSpecialty = () => {
    if (specialtyInput.trim() && !specialties.includes(specialtyInput.trim())) {
      setSpecialties([...specialties, specialtyInput.trim()]);
      setSpecialtyInput('');
    }
  };
  
  const handleRemoveSpecialty = (specialtyToRemove: string) => {
    setSpecialties(specialties.filter(specialty => specialty !== specialtyToRemove));
  };
  
  // Handle answers
  const handleAnswerChange = (index: number, field: keyof Answer, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index][field] = value;
    setAnswers(newAnswers);
  };
  
  const handleAddAnswer = () => {
    setAnswers([...answers, { question: '', answer: '', explanation: '' }]);
  };
  
  const handleRemoveAnswer = (index: number) => {
    if (answers.length > 1) {
      const newAnswers = [...answers];
      newAnswers.splice(index, 1);
      setAnswers(newAnswers);
    }
  };
  
  const handleRemoveQuestionImage = (index: number) => {
    const newAnswers = [...answers];
    newAnswers[index].imageUrl = undefined;
    setAnswers(newAnswers);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (status !== 'authenticated') {
      setError('You must be logged in to create a case');
      return;
    }
    
    // Validate form
    if (!title.trim() || !description.trim() || !content.trim() || !category.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (answers.some(a => !a.question.trim() || !a.answer.trim())) {
      setError('All questions and answers are required');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // Convert content from plain text to markdown if needed
      const finalContent = plainTextMode 
        ? content.split('\n').map(line => line.trim() ? line : '').join('\n\n')
        : content;
      
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          content: finalContent,
          category,
          tags,
          difficulty,
          specialties,
          answers,
          mediaUrls: uploadedImages,
          isAIGenerated: false,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create case');
      }
      
      const data = await response.json();
      router.push(`/cases/${data.caseId}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Insert table template
  const insertTableTemplate = () => {
    const tableTemplate = `
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
`;
    setContent(prev => prev + tableTemplate);
  };
  
  if (status === 'loading') {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center">
          <button 
            onClick={() => router.back()}
            className="mr-4 p-2 rounded-full hover:bg-secondary/50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Create Medical Case</h1>
            <p className="text-muted-foreground mt-1">
              Share your medical knowledge by creating a detailed case study
            </p>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border-l-4 border-destructive text-destructive rounded-md">
            {error}
          </div>
        )}
        
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md flex items-center"
          >
            {previewMode ? (
              <>
                <Edit className="w-4 h-4 mr-2" />
                Edit Mode
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Preview Mode
              </>
            )}
          </button>
        </div>
        
        {!previewMode ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-lg shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
              <h2 className="text-xl font-semibold">Case Details</h2>
              <p className="text-muted-foreground mt-1">
                Fill in the details of your medical case
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2 font-medium">
                    Title <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-3 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>
                
                <div>
                  <label className="block mb-2 font-medium">
                    Category <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-3 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                    placeholder="e.g., Cardiology, Neurology"
                  />
                </div>
              </div>
              
              <div>
                <label className="block mb-2 font-medium">
                  Description <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 border border-input rounded-md bg-background min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                  placeholder="Brief description of the case"
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2 font-medium">Tags</label>
                  <div className="flex">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      className="flex-1 p-3 border border-input rounded-l-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Add a tag"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-r-md hover:bg-primary/90"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md flex items-center"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 text-sm hover:text-destructive"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block mb-2 font-medium">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full p-3 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block mb-2 font-medium">Specialties</label>
                <div className="flex">
                  <input
                    type="text"
                    value={specialtyInput}
                    onChange={(e) => setSpecialtyInput(e.target.value)}
                    className="flex-1 p-3 border border-input rounded-l-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Add a specialty"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSpecialty())}
                  />
                  <button
                    type="button"
                    onClick={handleAddSpecialty}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-r-md hover:bg-primary/90"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {specialties.map((specialty, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md flex items-center"
                    >
                      {specialty}
                      <button
                        type="button"
                        onClick={() => handleRemoveSpecialty(specialty)}
                        className="ml-2 text-sm hover:text-destructive"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-medium">
                    Case Content <span className="text-destructive">*</span>
                  </label>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={handleToggleTextMode}
                      className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md"
                    >
                      {plainTextMode ? 'Markdown Mode' : 'Plain Text Mode'}
                    </button>
                    {!plainTextMode && (
                      <button
                        type="button"
                        onClick={insertTableTemplate}
                        className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md"
                      >
                        Insert Table
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className={`w-full p-3 border border-input rounded-md bg-background min-h-[300px] focus:outline-none focus:ring-2 focus:ring-primary/50 ${!plainTextMode ? 'font-mono' : ''}`}
                  required
                  placeholder={plainTextMode ? "Write your case content in plain text..." : "Write your case content using Markdown..."}
                />
                {plainTextMode && (
                  <p className="text-sm text-muted-foreground mt-1">
                    You're in plain text mode. Your text will be automatically formatted.
                  </p>
                )}
              </div>
              
              <div>
                <label className="block mb-2 font-medium">Add Images</label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/5' : 
                    isDragReject ? 'border-destructive bg-destructive/5' : 
                    'border-input hover:bg-secondary/20'
                  }`}
                  id="dropzone-trigger"
                >
                  <input {...getInputProps()} />
                  {uploadingImage ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      <p>Uploading...</p>
                    </div>
                  ) : (
                    <div>
                      <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      {isDragActive ? (
                        <p>Drop the image here...</p>
                      ) : isDragReject ? (
                        <p className="text-destructive">File type not supported</p>
                      ) : (
                        <>
                          <p>Drag & drop an image here, or click to select one</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            PNG, JPG, GIF, or WebP up to 5MB
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {fileRejections.length > 0 && (
                  <p className="mt-2 text-sm text-destructive">
                    {fileRejections[0].errors[0].message}
                  </p>
                )}
                {uploadedImages.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-1">{uploadedImages.length} image(s) uploaded</p>
                  </div>
                )}
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="font-medium">
                    Questions and Answers <span className="text-destructive">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddAnswer}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Question
                  </button>
                </div>
                
                <div className="space-y-6">
                  {answers.map((answer, index) => (
                    <div key={index} className="border border-border rounded-md overflow-hidden">
                      <div className="bg-secondary/20 p-4 border-b border-border flex justify-between items-center">
                        <h3 className="font-medium">Question {index + 1}</h3>
                        {answers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAnswer(index)}
                            className="text-sm text-destructive hover:underline flex items-center"
                          >
                            <Trash className="w-4 h-4 mr-1" />
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="block mb-1 text-sm font-medium">
                            Question <span className="text-destructive">*</span>
                          </label>
                          <input
                            type="text"
                            value={answer.question}
                            onChange={(e) => handleAnswerChange(index, 'question', e.target.value)}
                            className="w-full p-3 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block mb-1 text-sm font-medium">
                            Answer <span className="text-destructive">*</span>
                          </label>
                          <input
                            type="text"
                            value={answer.answer}
                            onChange={(e) => handleAnswerChange(index, 'answer', e.target.value)}
                            className="w-full p-3 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block mb-1 text-sm font-medium">
                            Explanation
                          </label>
                          <textarea
                            value={answer.explanation}
                            onChange={(e) => handleAnswerChange(index, 'explanation', e.target.value)}
                            className="w-full p-3 border border-input rounded-md bg-background min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-sm font-medium">Question Image (Optional)</label>
                            {answer.imageUrl ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestionImage(index)}
                                className="text-sm text-destructive hover:underline flex items-center"
                              >
                                <Trash className="w-3 h-3 mr-1" />
                                Remove Image
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddQuestionImage(index)}
                                className="text-sm text-primary hover:underline flex items-center"
                              >
                                <Image className="w-3 h-3 mr-1" />
                                Add Image
                              </button>
                            )}
                          </div>
                          
                          {answer.imageUrl && (
                            <div className="mt-2 border border-input rounded-md p-2 bg-background/50">
                              <img 
                                src={answer.imageUrl} 
                                alt={`Question ${index + 1} image`} 
                                className="max-h-40 mx-auto rounded"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2 border border-input rounded-md hover:bg-secondary/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save Case
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card border border-border rounded-lg shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
              <h2 className="text-2xl font-bold">{title || 'Case Title'}</h2>
              <p className="text-muted-foreground mt-2">{description || 'Case description will appear here'}</p>
              
              <div className="flex flex-wrap gap-2 mt-4">
                {tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                    {tag}
                  </span>
                ))}
                {specialties.map((specialty, index) => (
                  <span key={index} className="px-2 py-1 bg-primary/20 text-primary rounded-md text-sm">
                    {specialty}
                  </span>
                ))}
                <span className={`px-2 py-1 rounded-md text-sm ${
                  difficulty === 'beginner' ? 'bg-green-500/20 text-green-700 dark:text-green-300' :
                  difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                  'bg-red-500/20 text-red-700 dark:text-red-300'
                }`}>
                  {difficulty}
                </span>
              </div>
            </div>
            
            <div className="p-6">
              <div className="prose max-w-none dark:prose-invert mb-8 border-b border-border pb-6">
                <Markdown text={plainTextMode 
                  ? content.split('\n').map(line => line.trim() ? line : '').join('\n\n')
                  : content || '*Case content will appear here*'} 
                />
              </div>
              
              <h3 className="text-xl font-semibold mb-4">Questions</h3>
              <div className="space-y-6">
                {answers.map((answer, index) => (
                  <div key={index} className="border border-border rounded-md overflow-hidden">
                    <div className="bg-secondary/20 p-4 border-b border-border">
                      <p className="font-medium">Q{index + 1}: {answer.question || 'Question will appear here'}</p>
                    </div>
                    <div className="p-4">
                      {answer.imageUrl && (
                        <div className="mb-4">
                          <img 
                            src={answer.imageUrl} 
                            alt={`Question ${index + 1} image`} 
                            className="max-h-60 rounded"
                          />
                        </div>
                      )}
                      <p className="mb-2"><strong>Answer:</strong> {answer.answer || 'Answer will appear here'}</p>
                      {answer.explanation && (
                        <p className="text-muted-foreground mt-2 pt-2 border-t border-border">
                          <strong>Explanation:</strong> {answer.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CreateCasePage; 