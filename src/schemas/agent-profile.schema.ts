import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AgentProfileDocument = AgentProfile & Document;

@Schema({ timestamps: false, _id: false }) // _id will be same as User._id
export class AgentProfile {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    unique: true,
    index: true,
    required: true,
  })
  userId: Types.ObjectId; // This also acts as the primary key for this collection

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Department' }],
    index: true,
    default: [],
  })
  departmentIds: Types.ObjectId[];

  @Prop({ type: [String], index: true, default: [] })
  domainAccess: string[]; // Can be "*"

  @Prop({ default: false, index: true })
  isOnline: boolean;

  @Prop({ default: 3 })
  maxConcurrentChats: number;

  @Prop()
  lastSeen?: Date;
}

export const AgentProfileSchema = SchemaFactory.createForClass(AgentProfile);
// Set userId as the _id
AgentProfileSchema.pre<AgentProfileDocument>('save', function (next) {
  if (this.isNew && this.userId) {
    // @ts-ignore
    this._id = this.userId;
  }
  next();
});
