const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Book = sequelize.define('Book', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    author: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    isbn: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    available: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
    },
    publication_year: {
        type: DataTypes.INTEGER,
        validate: {
            isNumeric: true,
            max: new Date().getFullYear(),
        }
    }
}, {
    timestamps: true,
    tableName: 'Books'
});

module.exports = Book;