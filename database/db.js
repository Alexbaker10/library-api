const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database/library_mvp.sqlite',
    logging: false
});

module.exports = sequelize;