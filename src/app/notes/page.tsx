'use client';

import { KanbanBoard } from '@/components/KanbanBoard';
import { NoteEditor } from '@/components/NoteEditor';
import { CategoryEditor } from '@/components/CategoryEditor';
import { useState } from 'react';
import { ICategory, INote } from '@/types/models';

export default function NotesPage() {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [notes, setNotes] = useState<INote[]>([]);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [isCategoryEditorOpen, setIsCategoryEditorOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Partial<INote> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Partial<ICategory> | null>(null);

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
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Notes</h1>
          <button
            onClick={() => setIsCategoryEditorOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Category
          </button>
        </div>

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
      </div>
    </div>
  );
} 