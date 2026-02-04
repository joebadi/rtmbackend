import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import {
    authenticateAdmin,
    requireSuperAdmin,
    requireAdminOrAbove,
} from '../middleware/admin-auth.middleware';

const router = Router();

// ============================================
// AUTHENTICATION
// ============================================

/**
 * @route   POST /api/admin/login
 * @desc    Admin login
 * @access  Public
 */
router.post('/login', adminController.login);

// ============================================
// ADMIN MANAGEMENT (Super Admin Only)
// ============================================

/**
 * @route   POST /api/admin/admins/create
 * @desc    Create new admin
 * @access  Super Admin
 */
router.post('/admins/create', authenticateAdmin, requireSuperAdmin, adminController.createAdmin);

/**
 * @route   GET /api/admin/admins
 * @desc    Get all admins
 * @access  Super Admin
 */
router.get('/admins', authenticateAdmin, requireSuperAdmin, adminController.getAllAdmins);

/**
 * @route   PUT /api/admin/admins/:targetAdminId
 * @desc    Update admin
 * @access  Super Admin
 */
router.put('/admins/:targetAdminId', authenticateAdmin, requireSuperAdmin, adminController.updateAdmin);

/**
 * @route   DELETE /api/admin/admins/:targetAdminId
 * @desc    Delete admin
 * @access  Super Admin
 */
router.delete('/admins/:targetAdminId', authenticateAdmin, requireSuperAdmin, adminController.deleteAdmin);

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filters
 * @access  Admin+
 */
router.get('/users', authenticateAdmin, requireAdminOrAbove, adminController.getUsers);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Get user details
 * @access  Admin+
 */
router.get('/users/:userId', authenticateAdmin, requireAdminOrAbove, adminController.getUserDetails);

/**
 * @route   POST /api/admin/users/ban
 * @desc    Ban a user
 * @access  Admin+
 */
router.post('/users/ban', authenticateAdmin, requireAdminOrAbove, adminController.banUser);

/**
 * @route   POST /api/admin/users/:userId/unban
 * @desc    Unban a user
 * @access  Admin+
 */
router.post('/users/:userId/unban', authenticateAdmin, requireAdminOrAbove, adminController.unbanUser);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete user account
 * @access  Admin+
 */
router.delete('/users/:userId', authenticateAdmin, requireAdminOrAbove, adminController.deleteUser);

// ============================================
// REPORTS & MODERATION
// ============================================

/**
 * @route   GET /api/admin/reports
 * @desc    Get all reports
 * @access  Admin+
 */
router.get('/reports', authenticateAdmin, adminController.getReports);

/**
 * @route   POST /api/admin/reports/review
 * @desc    Review a report
 * @access  Admin+
 */
router.post('/reports/review', authenticateAdmin, requireAdminOrAbove, adminController.reviewReport);

// ============================================
// PHOTO VERIFICATION
// ============================================

/**
 * @route   GET /api/admin/photos/unverified
 * @desc    Get unverified photos
 * @access  Admin+
 */
router.get('/photos/unverified', authenticateAdmin, adminController.getUnverifiedPhotos);

/**
 * @route   POST /api/admin/photos/verify
 * @desc    Verify/reject a photo
 * @access  Admin+
 */
router.post('/photos/verify', authenticateAdmin, adminController.verifyPhoto);

// ============================================
// ANALYTICS & DASHBOARD
// ============================================

/**
 * @route   GET /api/admin/analytics/dashboard
 * @desc    Get dashboard analytics
 * @access  Admin+
 */
router.get('/analytics/dashboard', authenticateAdmin, adminController.getDashboardAnalytics);

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get audit logs
 * @access  Super Admin
 */
router.get('/audit-logs', authenticateAdmin, requireSuperAdmin, adminController.getAuditLogs);

export default router;
