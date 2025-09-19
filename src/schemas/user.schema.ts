import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UserRole } from 'src/shared/constants/enums';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  _id: Types.ObjectId;

  @Prop({
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({
    required: true,
    type: String,
    enum: UserRole,
    index: true,
  })
  role: UserRole;

  @Prop({ trim: true })
  phoneNo: string;

  @Prop({ trim: true })
  website: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  emailVerificationToken: string;

  @Prop()
  emailVerificationExpires: Date;

  @Prop()
  emailVerificationOtp: string;

  @Prop()
  emailVerificationOtpExpires: Date;

  @Prop({
    type: String,
    enum: ['token', 'otp'],
    default: 'token',
  })
  emailVerificationMethod: string;

  @Prop({ default: 0 })
  otpAttempts: number;

  @Prop()
  lastOtpRequestTime: Date;

  @Prop()
  passwordResetToken: string;

  @Prop()
  passwordResetExpires: Date;

  @Prop()
  refreshToken: string;

  @Prop()
  refreshTokenExpires: Date;

  @Prop({ default: 0 })
  tokenVersion: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  // Method signature for validatePassword
  validatePassword: (password: string) => Promise<boolean>;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre<UserDocument>('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

UserSchema.methods.validatePassword = async function (
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};
