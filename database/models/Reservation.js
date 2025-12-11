const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');
const Book = require('./Book');

const Reservation = sequelize.define('Reservation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    reservation_date: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW,
        allowNull: false,
    },
    due_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
}, {
    timestamps: true,
    tableName: 'Reservations'
});

User.hasMany(Reservation, {
    foreignKey: 'user_id',
    onDelete: 'CASCADE',
});
Reservation.belongsTo(User, { foreignKey: 'user_id' });

Book.hasMany(Reservation, {
    foreignKey: 'book_id',
    onDelete: 'CASCADE',
});
Reservation.belongsTo(Book, { foreignKey: 'book_id' });

module.exports = Reservation;