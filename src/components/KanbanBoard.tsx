import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ICategory, INote } from '@/types/models';
import { Types } from 'mongoose';

interface KanbanBoardProps {
  categories: ICategory[];
  notes: INote[];
  onUpdateCategory: (categoryId: string, updates: Partial<ICategory>) => void;
  onUpdateNote: (noteId: string, updates: Partial<INote>) => void;
  onCreateCategory: (category: Partial<ICategory>) => void;
  onCreateNote: (note: Partial<INote>) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  categories,
  notes,
  onUpdateCategory,
  onUpdateNote,
  onCreateCategory,
  onCreateNote,
}) => {
  const [orderedCategories, setOrderedCategories] = useState<ICategory[]>(categories);
  const [groupedNotes, setGroupedNotes] = useState<Record<string, INote[]>>({});

  useEffect(() => {
    // Group notes by category
    const notesByCategory = notes.reduce((acc, note) => {
      const categoryId = note.categoryId.toString();
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      acc[categoryId].push(note);
      return acc;
    }, {} as Record<string, INote[]>);

    // Sort notes within each category by position
    Object.keys(notesByCategory).forEach((categoryId) => {
      notesByCategory[categoryId].sort((a, b) => (a.position || 0) - (b.position || 0));
    });

    setGroupedNotes(notesByCategory);
  }, [notes]);

  useEffect(() => {
    // Sort categories by order
    const sorted = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));
    setOrderedCategories(sorted);
  }, [categories]);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;

    if (!destination) return;

    // Handle category reordering
    if (type === 'CATEGORY') {
      const newCategories = Array.from(orderedCategories);
      const [movedCategory] = newCategories.splice(source.index, 1);
      newCategories.splice(destination.index, 0, movedCategory);

      // Update order for all affected categories
      newCategories.forEach((category, index) => {
        const categoryId = category._id?.toString();
        if (categoryId) {
          onUpdateCategory(categoryId, { order: index });
        }
      });

      setOrderedCategories(newCategories);
      return;
    }

    // Handle note reordering
    const sourceCategory = source.droppableId;
    const destCategory = destination.droppableId;
    const sourceNotes = Array.from(groupedNotes[sourceCategory] || []);
    const destNotes = sourceCategory === destCategory
      ? sourceNotes
      : Array.from(groupedNotes[destCategory] || []);

    const [movedNote] = sourceNotes.splice(source.index, 1);
    
    if (sourceCategory === destCategory) {
      sourceNotes.splice(destination.index, 0, movedNote);
      
      // Update positions for affected notes
      sourceNotes.forEach((note, index) => {
        const noteId = note._id?.toString();
        if (noteId) {
          onUpdateNote(noteId, { position: index });
        }
      });
    } else {
      destNotes.splice(destination.index, 0, movedNote);
      
      // Update category and positions
      const movedNoteId = movedNote._id?.toString();
      if (movedNoteId) {
        onUpdateNote(movedNoteId, {
          categoryId: destCategory,
          position: destination.index,
        });
      }

      // Update positions for both source and destination categories
      sourceNotes.forEach((note, index) => {
        const noteId = note._id?.toString();
        if (noteId) {
          onUpdateNote(noteId, { position: index });
        }
      });
      destNotes.forEach((note, index) => {
        const noteId = note._id?.toString();
        if (noteId) {
          onUpdateNote(noteId, { position: index });
        }
      });
    }

    // Update the local state
    setGroupedNotes({
      ...groupedNotes,
      [sourceCategory]: sourceNotes,
      [destCategory]: destNotes,
    });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="categories" type="CATEGORY" direction="horizontal">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex gap-4 p-4 overflow-x-auto min-h-[calc(100vh-200px)]"
          >
            {orderedCategories.map((category, index) => {
              const categoryId = category._id?.toString();
              if (!categoryId) return null;
              
              return (
                <Draggable
                  key={categoryId}
                  draggableId={`category-${categoryId}`}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="w-80 flex-shrink-0"
                    >
                      <div
                        className="bg-white rounded-lg shadow-md"
                        style={{ borderTop: `4px solid ${category.color}` }}
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="p-3 font-semibold border-b flex justify-between items-center"
                        >
                          <span>{category.name}</span>
                          <button
                            onClick={() => onCreateNote({ categoryId })}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            + Add Note
                          </button>
                        </div>
                        <Droppable droppableId={categoryId} type="NOTE">
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className="p-2 min-h-[200px]"
                            >
                              {(groupedNotes[categoryId] || []).map((note: INote, index) => {
                                const noteId = note._id?.toString();
                                if (!noteId) return null;
                                
                                return (
                                  <Draggable
                                    key={noteId}
                                    draggableId={noteId}
                                    index={index}
                                  >
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="bg-white p-3 rounded shadow-sm mb-2 border hover:shadow-md transition-shadow"
                                      >
                                        <h3 className="font-medium mb-1">{note.title}</h3>
                                        <p className="text-sm text-gray-600 line-clamp-2">
                                          {note.content}
                                        </p>
                                        {note.tags?.length > 0 && (
                                          <div className="flex gap-1 mt-2 flex-wrap">
                                            {note.tags.map((tag) => (
                                              <span
                                                key={tag}
                                                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                                              >
                                                {tag}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              })}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
            <button
              onClick={() => onCreateCategory({ name: 'New Category' })}
              className="w-80 h-20 flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
            >
              + Add Category
            </button>
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}; 