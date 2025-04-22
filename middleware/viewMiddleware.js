module.exports = (req, res, next) => {
    // Add common variables to all views
    res.locals.path = req.path;
    res.locals.user = req.session.user || null;
    res.locals.messages = req.flash();
    res.locals.isAuthenticated = req.session.isAuthenticated || false;
    
    // Add active class helper
    res.locals.isActive = (currentPath) => {
        return currentPath === req.path ? 'active' : '';
    };

    next();
}; 