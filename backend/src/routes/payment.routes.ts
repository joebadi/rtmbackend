import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/payments/packages
 * @desc    List purchasable diamond packages
 * @access  Public
 */
router.get('/packages', paymentController.getPackages);

/**
 * @route   GET /api/payments/wallet
 * @desc    Get diamond balance + packages
 * @access  Private
 */
router.get('/wallet', authenticate, paymentController.getWallet);

/**
 * @route   GET /api/payments/transactions
 * @desc    Get the user's purchase history
 * @access  Private
 */
router.get('/transactions', authenticate, paymentController.getTransactions);

/**
 * @route   POST /api/payments/initialize
 * @desc    Start a diamond purchase (returns Paystack authorization URL)
 * @access  Private
 */
router.post('/initialize', authenticate, paymentController.initializePayment);

/**
 * @route   GET /api/payments/verify/:reference
 * @desc    Verify a payment and grant diamonds
 * @access  Private
 */
router.get('/verify/:reference', authenticate, paymentController.verifyPayment);
router.get('/verify', authenticate, paymentController.verifyPayment);

export default router;
