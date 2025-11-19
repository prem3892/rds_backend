import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ChatSession,
  ChatSessionDocument,
} from 'src/schemas/chat-session.schema';
import { Customer, CustomerDocument } from 'src/schemas/customer.schema';
import { AttributionService } from 'src/shared/services/attribution.service';

@Injectable()
export class BackfillChatSessionSourceMigration {
  private readonly logger = new Logger(BackfillChatSessionSourceMigration.name);

  constructor(
    @InjectModel(ChatSession.name)
    private chatSessionModel: Model<ChatSessionDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    private readonly attributionService: AttributionService,
  ) {}

  async run(): Promise<void> {
    this.logger.log('Starting backfill migration for chat session source...');

    try {
      const chatSessions = await this.chatSessionModel
        .find({
          $or: [
            { sourceUrl: { $exists: false } },
            { trafficSource: { $exists: false } },
          ],
        })
        .populate({
          path: 'customerId',
          model: Customer.name,
          select: 'metadata',
        });

      this.logger.log(
        `Found ${chatSessions.length} chat sessions to backfill`,
      );

      let updatedCount = 0;
      let errorCount = 0;

      for (const chatSession of chatSessions) {
        try {
          const customer = chatSession.customerId as CustomerDocument;
          const currentPageUrl =
            (customer?.metadata as Record<string, unknown>)?.currentPageUrl ||
            'unknown_page';
          const attribution = this.attributionService.parseUrl(
            currentPageUrl as string,
          );

          await this.chatSessionModel.updateOne(
            { _id: chatSession._id },
            {
              $set: {
                sourceUrl: currentPageUrl,
                trafficSource: attribution.source,
              },
            },
          );

          updatedCount++;

          if (updatedCount % 100 === 0) {
            this.logger.log(`Processed ${updatedCount} chat sessions...`);
          }
        } catch (error) {
          errorCount++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Error backfilling chat session ${chatSession._id.toString()}: ${errorMessage}`,
          );
        }
      }

      this.logger.log(
        `Backfill migration completed. Updated: ${updatedCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Backfill migration failed: ${errorMessage}`);
    }
  }
}
