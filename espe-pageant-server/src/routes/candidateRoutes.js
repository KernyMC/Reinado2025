import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { CandidateController } from '../controllers/candidateController.js';
import { AuthService } from '../services/authService.js';

const router = Router();

// Multer config for candidate photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join('uploads', 'candidates'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'candidate-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  }
});

// Public routes
router.get('/', CandidateController.getAllCandidates);
router.get('/with-votes/:eventId', CandidateController.getCandidatesWithVotes);
router.get('/:id', CandidateController.getCandidateById);

// Admin-only routes
router.post('/', 
  AuthService.requireAuth(['admin']), 
  upload.single('photo'),
  CandidateController.createCandidate
);

router.put('/:id', 
  AuthService.requireAuth(['admin']), 
  upload.single('photo'),
  CandidateController.updateCandidate
);

router.delete('/:id', 
  AuthService.requireAuth(['admin']), 
  CandidateController.deleteCandidate
);

export default router; 