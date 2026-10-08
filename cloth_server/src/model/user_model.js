// models/userModel.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    profile_img: {
        type: Object,
        default: null
    },
    first_name: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    last_name: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    gender: {
        type: String,
        required: [true, 'Gender is required'],
        enum: ['male', 'female', 'other']
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        select: false
    },
    is_active: {
        type: Boolean,
        default: true
    },
    is_deleted: {
        type: Boolean,
        default: false
    },
    verification: {
        otp: {
            code: {
                type: String,
                select: false
            },
            expires_at: {
                type: Date,
                select: false
            },
            attempts: {
                type: Number,
                default: 0
            },
            max_attempts: {
                type: Number,
                default: 3
            },
            lockout: {
                is_locked: {
                    type: Boolean,
                    default: false
                },
                locked_until: {
                    type: Date,
                    default: null
                },
                consecutive_failures: {
                    type: Number,
                    default: 0
                },
                lockout_durations: {
                    type: [Number],
                    default: [60, 300, 600, 1800, 3600] // 1m, 5m, 10m, 30m, 1h
                }
            }
        },
        is_verified: {
            type: Boolean,
            default: false
        },
        verified_at: {
            type: Date,
            default: null
        }
    },
    order_list: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }],
    cart_list: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cart'
    }],
    address_list: [{
        address_line1: String,
        address_line2: String,
        city: String,
        state: String,
        zip_code: String,
        country: String,
        phone: String,
        is_default: {
            type: Boolean,
            default: false
        }
    }],
    last_password_change: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ 'verification.is_verified': 1 });

export default mongoose.model('User', userSchema);