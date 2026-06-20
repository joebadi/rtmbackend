import { Router } from 'express';
import * as controller from '../controllers/legal.controller';

const router = Router();

/**
 * @route   GET /api/legal/:slug
 * @desc    Fetch a legal document (privacy_policy | terms_of_use)
 * @access  Public
 */
router.get('/:slug', controller.get);

export default router;
