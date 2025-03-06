'use client';

import { KanbanBoard } from '@/components/KanbanBoard';
import { NoteEditor } from '@/components/NoteEditor';
import { CategoryEditor } from '@/components/CategoryEditor';
import { useState } from 'react';
import { ICategory, INote } from '@/types/models';
import { ViewSwitcher } from '@/components/ViewSwitcher';
import { AIChatBox } from '@/components/AIChatBox';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus } from 'lucide-react';

export default function NotesPage() {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [notes, setNotes] = useState<INote[]>([]);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [isCategoryEditorOpen, setIsCategoryEditorOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Partial<INote> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Partial<ICategory> | null>(null);
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [showAIChat, setShowAIChat] = useState(false);

  const handleUpdateCategory = async (categoryId: string, updates: Partial<ICategory>) => {
    try {
      const response = await fetch(`/api/categories`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: categoryId, ...updates }),
      });

      if (!response.ok) throw new Error('Failed to update category');

      const updatedCategory = await response.json();
      setCategories(categories.map(cat => 
        cat._id === categoryId ? updatedCategory : cat
      ));
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleUpdateNote = async (noteId: string, updates: Partial<INote>) => {
    try {
      const response = await fetch(`/api/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId, ...updates }),
      });

      if (!response.ok) throw new Error('Failed to update note');

      const updatedNote = await response.json();
      setNotes(notes.map(note => 
        note._id === noteId ? updatedNote : note
      ));
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleCreateCategory = async (category: Partial<ICategory>) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category),
      });

      if (!response.ok) throw new Error('Failed to create category');

      const newCategory = await response.json();
      setCategories([...categories, newCategory]);
      setIsCategoryEditorOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleCreateNote = async (note: Partial<INote>) => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note),
      });

      if (!response.ok) throw new Error('Failed to create note');

      const newNote = await response.json();
      setNotes([...notes, newNote]);
      setIsNoteEditorOpen(false);
      setSelectedNote(null);
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/categories?id=${categoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete category');

      setCategories(categories.filter(cat => cat._id !== categoryId));
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes?id=${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete note');

      setNotes(notes.filter(note => note._id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleSaveNote = async (note: Partial<INote>) => {
    if (selectedNote?._id) {
      await handleUpdateNote(selectedNote._id.toString(), note);
    } else {
      await handleCreateNote(note);
    }
  };

  const handleSaveCategory = async (category: Partial<ICategory>) => {
    if (selectedCategory?._id) {
      await handleUpdateCategory(selectedCategory._id.toString(), category);
    } else {
      await handleCreateCategory(category);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <ViewSwitcher currentView={view} onViewChange={setView} />
        <Button
          onClick={() => setShowAIChat(!showAIChat)}
          variant="outline"
          size="sm"
        >
          <MessageSquarePlus className="h-4 w-4 mr-1" />
          {showAIChat ? 'Hide AI Assistant' : 'Show AI Assistant'}
        </Button>
      </div>

      {view === 'kanban' ? (
        <KanbanBoard
          categories={categories}
          notes={notes}
          onUpdateCategory={handleUpdateCategory}
          onUpdateNote={handleUpdateNote}
          onCreateCategory={handleCreateCategory}
          onCreateNote={(note) => {
            setSelectedNote(note);
            setIsNoteEditorOpen(true);
          }}
        />
      ) : (
        <div className="grid gap-4">
          {/* List view implementation */}
          <p>List view coming soon...</p>
        </div>
      )}

      {isNoteEditorOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <NoteEditor
              note={selectedNote || undefined}
              onSave={handleSaveNote}
              onCancel={() => {
                setIsNoteEditorOpen(false);
                setSelectedNote(null);
              }}
            />
          </div>
        </div>
      )}

      {isCategoryEditorOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <CategoryEditor
              category={selectedCategory || undefined}
              onSave={handleSaveCategory}
              onCancel={() => {
                setIsCategoryEditorOpen(false);
                setSelectedCategory(null);
              }}
            />
          </div>
        </div>
      )}

      {showAIChat && (
        <AIChatBox onClose={() => setShowAIChat(false)} />
      )}
    </div>
  );
} 