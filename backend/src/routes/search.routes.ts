import { Router } from 'express';
import { basicSearch, fulltextSearch, knnSearch, booleanSearch, geoSearch } from '../controllers/search.controller';

const router = Router();

router.get('/basic', basicSearch);
router.get('/fulltext', fulltextSearch);
router.post('/knn', knnSearch);
router.post('/boolean', booleanSearch);
router.get('/geo', geoSearch);

export default router;
