import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Note } from '@/models/Note';
import { connectToDatabase } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const query = searchParams.get('query');

    await connectToDatabase();
    let notesQuery = Note.find({ userId: session.user.id });

    if (categoryId) {
      notesQuery = notesQuery.where('categoryId').equals(categoryId);
    }

    if (query) {
      notesQuery = notesQuery.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { content: { $regex: query, $options: 'i' } },
          { tags: { $regex: query, $options: 'i' } },
        ],
      });
    }

    const notes = await notesQuery
      .sort({ position: 1, createdAt: -1 })
      .populate('categoryId', 'name color');

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Failed to fetch notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    await connectToDatabase();

    // Get the highest position value in the category
    const lastNote = await Note.findOne({
      userId: session.user.id,
      categoryId: data.categoryId,
    }).sort({ position: -1 });
    const position = lastNote ? lastNote.position + 1 : 0;

    const note = await Note.create({
      ...data,
      userId: session.user.id,
      position,
    });

    await note.populate('categoryId', 'name color');
    return NextResponse.json(note);
  } catch (error) {
    console.error('Failed to create note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { id, ...updates } = data;

    await connectToDatabase();
    const note = await Note.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      updates,
      { new: true }
    ).populate('categoryId', 'name color');

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error('Failed to update note:', error);
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const note = await Note.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Reorder remaining notes in the same category
    await Note.updateMany(
      {
        userId: session.user.id,
        categoryId: note.categoryId,
        position: { $gt: note.position },
      },
      { $inc: { position: -1 } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
} 