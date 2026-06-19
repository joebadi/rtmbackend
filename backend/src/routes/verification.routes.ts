import { Router } from 'express';
import * as controller from '../controllers/verification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.get('/', authenticate, controller.get);

router.post(
    '/',
    authenticate,
    upload.fields([
        { name: 'selfie', maxCount: 1 },
        { name: 'idDocument', maxCount: 1 },
    ]),
    controller.submit
);

export default router;
