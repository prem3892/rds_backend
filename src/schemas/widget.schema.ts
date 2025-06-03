import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WidgetDocument = Widget & Document;

@Schema({ timestamps: true })
export class Widget {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: [String], index: true, default: [] })
  domains: string[];

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Department' }],
    index: true,
    default: [],
  })
  departmentIds: Types.ObjectId[];

  @Prop()
  injectableScriptUrl: string; // Derived

  @Prop({ default: true })
  isEnabled: boolean;

  @Prop({ trim: true })
  primaryColor?: string;

  @Prop({ trim: true })
  welcomeMessage?: string;

  @Prop({ trim: true })
  headerText?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId; // Admin

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const WidgetSchema = SchemaFactory.createForClass(Widget);

// Virtual for injectableScriptUrl (example, adjust domain as needed)
WidgetSchema.virtual('derivedInjectableScriptUrl').get(function () {
  // This will be set by the service based on config.appDomain
  return this.injectableScriptUrl;
});
