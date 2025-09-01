import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VisitorStateService } from './visitor-state.service';
import { RedisService } from 'src/shared/redis/redis.service';
import { AgentsService } from 'src/agents/agents.service';

describe('VisitorStateService', () => {
  let service: VisitorStateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitorStateService,
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn(),
          },
        },
        {
          provide: AgentsService,
          useValue: {
            findByUserId: jest.fn(),
            getAgentAccessibleWidgets: jest.fn(),
            getEligibleOnlineAgents: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const config = {
                'visitorTracking.redisTtlSeconds': 1800,
                'visitorTracking.cleanupIntervalMs': 120000,
                'visitorTracking.gracePeroidMs': 300000,
                'visitorTracking.maxVisitorsPerAgent': 1000,
                'visitorTracking.deltaUpdateEnabled': false,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<VisitorStateService>(VisitorStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
