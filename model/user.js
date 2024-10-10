const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    verified: { type: Boolean, default: false },
    role: { type: String, default: 'user' },
    verificationCode: String,
    verificationCodeExpires: Date,
    createdAt: Date
}, { collection: 'user' });


userSchema.pre('save', function (next) {
    if (!this.createdAt) {
        const currentTime = new Date();
        this.createdAt = currentTime;
    }
    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
