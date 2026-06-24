import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      req.user = await User.findById(decoded.id).select('-password');
<<<<<<< HEAD
      return next();
    } catch (error) {
      console.error(error);
=======
      return next();  // ← return added
    } catch (error) {
>>>>>>> 97e0578f7fb3691377732259bb7aedd288649f68
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

<<<<<<< HEAD
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
=======
  return res.status(401).json({ message: 'Not authorized, no token' });
>>>>>>> 97e0578f7fb3691377732259bb7aedd288649f68
};

export const optionalProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(); // no token — proceed as guest
  }

try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = await User.findById(decoded.id).select('-password');
    console.log('optionalProtect — user found:', req.user?._id);
  } catch (error) {
    console.log('optionalProtect — token verify/lookup FAILED:', error.message);
  }
  next();
};
