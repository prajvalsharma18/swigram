const router = require('express').Router();
const { signupValidation , loginValidation } = require('../middlewares/auth.validation');
const { requireAuth } = require('../middlewares/auth.middleware');
const { signup , login , me } = require('../controllers/auth.controller.js');


router.post('/login' , loginValidation , login); 

router.post('/signup' , signupValidation , signup);

router.get('/me', requireAuth, me);




module.exports = router;