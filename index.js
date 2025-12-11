const express = require('express');
const sequelize = require('./database/db');
const loggingMiddleware = require('./middleware/logging');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(loggingMiddleware); 


app.get('/', (req, res) => {
    res.status(200).json({ message: 'API running!' });
});


app.use(errorHandler);

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Database connection successful.');
        
        await sequelize.sync(); 

        app.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
        });

    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}

startServer();