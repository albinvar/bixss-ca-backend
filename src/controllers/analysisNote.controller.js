const AnalysisNote = require('../models/AnalysisNote');
const Analysis = require('../models/Analysis');
const { AppError } = require('../middleware/errorHandler');

/**
 * Get all notes for an analysis
 */
exports.getNotesByAnalysis = async (req, res, next) => {
  try {
    const { analysisId } = req.params;

    // Verify analysis exists
    const analysis = await Analysis.findOne({ analysisId });
    if (!analysis) {
      return next(new AppError('Analysis not found', 404));
    }

    let query = { analysisId };

    // Companies can only see non-private notes
    if (req.user.role !== 'CA' && req.user.role !== 'SUPER_ADMIN') {
      query.isPrivate = false;
    }

    const notes = await AnalysisNote.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { notes }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all notes for a company
 */
exports.getNotesByCompany = async (req, res, next) => {
  try {
    const { companyId } = req.params;

    let query = { company: companyId };

    // Companies can only see non-private notes
    if (req.user.role !== 'CA' && req.user.role !== 'SUPER_ADMIN') {
      query.isPrivate = false;
    }

    const notes = await AnalysisNote.find(query)
      .populate('createdBy', 'name email')
      .populate('analysis', 'analysisId createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { notes }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new note (CA only)
 */
exports.createNote = async (req, res, next) => {
  try {
    const { analysisId, title, content, noteType, isPrivate, attachments } = req.body;

    // Verify analysis exists
    const analysis = await Analysis.findOne({ analysisId });
    if (!analysis) {
      return next(new AppError('Analysis not found', 404));
    }

    const note = await AnalysisNote.create({
      analysis: analysis._id,
      analysisId,
      company: analysis.company,
      createdBy: req.user._id,
      title,
      content,
      noteType: noteType || 'general',
      isPrivate: isPrivate || false,
      attachments: attachments || []
    });

    const populatedNote = await AnalysisNote.findById(note._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: { note: populatedNote }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update note (CA only, own notes)
 */
exports.updateNote = async (req, res, next) => {
  try {
    const { noteId } = req.params;
    const { title, content, noteType, isPrivate, attachments } = req.body;

    const note = await AnalysisNote.findById(noteId);

    if (!note) {
      return next(new AppError('Note not found', 404));
    }

    // Check permissions
    if (!note.createdBy.equals(req.user._id) && req.user.role !== 'SUPER_ADMIN') {
      return next(new AppError('You can only update your own notes', 403));
    }

    // Update fields
    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (noteType !== undefined) note.noteType = noteType;
    if (isPrivate !== undefined) note.isPrivate = isPrivate;
    if (attachments !== undefined) note.attachments = attachments;
    note.editedAt = new Date();

    await note.save();

    const populatedNote = await AnalysisNote.findById(note._id)
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Note updated successfully',
      data: { note: populatedNote }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete note (CA only, own notes)
 */
exports.deleteNote = async (req, res, next) => {
  try {
    const { noteId } = req.params;

    const note = await AnalysisNote.findById(noteId);

    if (!note) {
      return next(new AppError('Note not found', 404));
    }

    // Check permissions
    if (!note.createdBy.equals(req.user._id) && req.user.role !== 'SUPER_ADMIN') {
      return next(new AppError('You can only delete your own notes', 403));
    }

    await note.deleteOne();

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
