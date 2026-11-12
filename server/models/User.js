import mongoose from "mongoose";
import bcrypt from "bcrypt";

export const ROLES = ["student", "staff", "admin"];
const BCRYPT_ROUNDS = 12;

// Collection: users
// Stores every account (students, staff, admins). Passwords are stored as bcrypt hashes only.
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address"],
    },
    // select: false = the password hash is never returned unless we ask for it explicitly
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, default: "student" },
    studentId: { type: String, trim: true, maxlength: 30 },
    department: { type: String, trim: true, maxlength: 100 },
    contactNumber: { type: String, trim: true, maxlength: 20 },

    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // Account lockout after repeated failed logins
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },

    lastLoginAt: Date,
    passwordChangedAt: { type: Date, select: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        delete ret.passwordChangedAt;
        delete ret.__v;
        delete ret.id;
        return ret;
      },
    },
  }
);

// Student IDs must be unique, but staff/admins don't have one.
userSchema.index(
  { studentId: 1 },
  { unique: true, partialFilterExpression: { studentId: { $type: "string" } } }
);
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Hash the password automatically whenever it is created or changed.
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  if (!this.isNew) {
    // 1 second earlier so a token issued right after the change is still accepted
    this.passwordChangedAt = new Date(Date.now() - 1000);
  }
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isLocked = function () {
  return Boolean(this.lockUntil && this.lockUntil > Date.now());
};

export default mongoose.model("User", userSchema, "users");
