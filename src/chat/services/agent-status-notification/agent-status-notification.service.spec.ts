import { Test, TestingModule } from '@nestjs/testing';
import { AgentStatusNotificationService } from './agent-status-notification.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { ChatNotificationService } from '../chat-notification/chat-notification.service';

describe('AgentStatusNotificationService', () => {
  let service: AgentStatusNotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentStatusNotificationService,
        {
          provide: RedisService,
          useValue: {
            getAllSocketsForAgent: jest.fn(),
          },
        },
        {
          provide: ChatNotificationService,
          useValue: {
            notifyCustomersOfAgentStatusChange: jest.fn(),
            notifyWidgetCustomersOfAgentStatusChange: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AgentStatusNotificationService>(
      AgentStatusNotificationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
