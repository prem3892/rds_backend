import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WidgetDocument = Widget & Document;

export enum ButtonLocation {
  TOP_LEFT = 'top_left',
  TOP_RIGHT = 'top_right',
  BOTTOM_LEFT = 'bottom_left',
  BOTTOM_RIGHT = 'bottom_right',
  CENTER_LEFT = 'center_left',
  CENTER_RIGHT = 'center_right',
}

export interface WidgetTheme {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  textColor?: string;
  backgroundColor?: string;
}

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
  secondaryColor?: string;

  @Prop({
    type: {
      name: { type: String, required: true },
      primaryColor: { type: String, required: true },
      secondaryColor: { type: String, required: true },
      accentColor: { type: String, required: false },
      textColor: { type: String, required: false },
      backgroundColor: { type: String, required: false },
    },
    required: false,
  })
  theme?: WidgetTheme;

  @Prop({ trim: true })
  welcomeMessage?: string;

  @Prop({ trim: true })
  headerText?: string;

  @Prop({ type: [String], default: [] })
  notification_emails: string[];

  @Prop({
    type: String,
    enum: Object.values(ButtonLocation),
    default: ButtonLocation.BOTTOM_RIGHT,
  })
  button_location: ButtonLocation;

  @Prop({ trim: true, default: 'Chat with us' })
  button_label: string;

  @Prop({ trim: true })
  widget_text_color?: string;

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
