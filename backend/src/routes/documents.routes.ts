import { Router } from 'express';
import multer from 'multer';
import { uploadAndParse, indexDocument, cancelIndexing } from '../controllers/documents.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

const router = Router();

router.post('/upload', upload.single('pdf'), uploadAndParse);
router.post('/index', indexDocument);
router.delete('/cancel/:objectKey', cancelIndexing);

export default router;
