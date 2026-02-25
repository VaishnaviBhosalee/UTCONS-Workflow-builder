const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [50, 'Name must be 50 characters or less'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: [254, 'Email must be 254 characters or less'],
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    passwordHash: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

// Never expose passwordHash in JSON responses
userSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.passwordHash;
        return ret;
    },
});

/**
 * Hash a plain-text password and store it.
 * Call before save when password changes.
 */
userSchema.methods.setPassword = async function (plainPassword) {
    this.passwordHash = await bcrypt.hash(plainPassword, 12);
};

/**
 * Compare a plain-text password against the stored hash.
 */
userSchema.methods.verifyPassword = async function (plainPassword) {
    return bcrypt.compare(plainPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
