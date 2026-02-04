import { Router } from 'express';
import * as preferencesController from '../controllers/preferences.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/preferences
 * @desc    Save or update match preferences
 * @access  Private
 */
router.post('/', authenticate, preferencesController.savePreferences);

/**
 * @route   GET /api/preferences
 * @desc    Get match preferences
 * @access  Private
 */
router.get('/', authenticate, preferencesController.getPreferences);

/**
 * @route   DELETE /api/preferences
 * @desc    Delete match preferences
 * @access  Private
 */
router.delete('/', authenticate, preferencesController.deletePreferences);

export default router;
