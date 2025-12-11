const errorHandler = (err, req, res, next) => {
    let statusCode = err.status || 500; 
    let message = err.message || 'Internal Server Error';

    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
        statusCode = 400;
        message = err.errors.map(e => e.message).join(', ');
    } 
    
    if (statusCode === 404) {
        message = 'Resource not found.';
    }

    console.error(`Error ${statusCode}: ${message}`); 

    res.status(statusCode).json({
        success: false,
        error: message
    });
};

module.exports = errorHandler;