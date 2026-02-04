import { Router } from 'express';
import * as profileController from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

/**
 * @route   POST /api/profile/create
 * @desc    Create user profile
 * @access  Private
 */
router.post('/create', authenticate, profileController.createProfile);

/**
 * @route   GET /api/profile/me
 * @desc    Get own profile
 * @access  Private
 */
router.get('/me', authenticate, profileController.getMyProfile);

/**
 * @route   GET /api/profile/stats
 * @desc    Get profile statistics
 * @access  Private
 */
router.get('/stats', authenticate, profileController.getProfileStats);

/**
 * @route   GET /api/profile/:userId
 * @desc    Get user profile by ID
 * @access  Private
 */
router.get('/:userId', authenticate, profileController.getProfileById);

/**
 * @route   PUT /api/profile/update
 * @desc    Update profile
 * @access  Private
 */
router.put('/update', authenticate, profileController.updateProfile);

/**
 * @route   POST /api/profile/upload-photo
 * @desc    Upload profile photo
 * @access  Private
 */
router.post(
    '/upload-photo',
    authenticate,
    upload.single('photo'),
    profileController.uploadPhoto
);

/**
 * @route   DELETE /api/profile/photo/:photoId
 * @desc    Delete photo
 * @access  Private
 */
router.delete('/photo/:photoId', authenticate, profileController.deletePhoto);

/**
 * @route   PUT /api/profile/photo/:photoId/set-primary
 * @desc    Set primary photo
 * @access  Private
 */
router.put('/photo/:photoId/set-primary', authenticate, profileController.setPrimaryPhoto);

/**
 * @route   PUT /api/profile/privacy-settings
 * @desc    Update privacy settings
 * @access  Private
 */
router.put('/privacy-settings', authenticate, profileController.updatePrivacySettings);

/**
 * @route   GET /api/profile/stats
 * @desc    Get profile statistics
 * @access  Private
 */
router.get('/stats', authenticate, profileController.getProfileStats);

/**
 * @route   DELETE /api/profile/delete-account
 * @desc    Delete account
 * @access  Private
 */
router.delete('/delete-account', authenticate, profileController.deleteAccount);

export default router;
