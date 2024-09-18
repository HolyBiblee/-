// middleware/authMiddleware.js
function ensureGuest(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect('/profile'); // или другая страница, куда вы хотите перенаправить авторизованных пользователей
    }
    next();
  }
  
  function ensureAuth(req, res, next) {
    if (!req.isAuthenticated()) {
      return res.redirect('/login'); // или другая страница для неавторизованных пользователей
    }
    next();
  }
  
  module.exports = { ensureGuest, ensureAuth };
  