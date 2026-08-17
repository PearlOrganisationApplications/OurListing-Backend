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
    planType: {
      type: String,
      enum: ["BASIC", "PRO", "PREMIUM", "FREE TRIAL"],
      default: "FREE TRIAL"
    },
    planPrice: {
      type: String,
      default: "$0"
    },
    role: {
      type: String,
      enum: ['buyer', 'OWNER', 'BROKER', 'LENDER', 'ADMIN'],
      default: 'buyer',
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
