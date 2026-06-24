import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    // Add these fields to your existing User schema

    lastSeen: {
      type: Date,
      default: null,
    },
    fcmToken: {
      type: String,
      default: '',
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    number: {
      type: String,
    },
    address: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
<<<<<<< HEAD
      enum: ['BUYER', 'OWNER', 'BROKER', 'LENDER'],
      default: 'BUYER',
=======
      enum: ['buyer', 'owner', 'broker', 'lender', 'admin'],
      default: 'buyer',
>>>>>>> d091185a41545c89c55507b9d1289bb3faa39fb9
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
