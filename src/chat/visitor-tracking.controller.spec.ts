import { Test, TestingModule } from '@nestjs/testing';
import { VisitorTrackingController } from './visitor-tracking.controller';
import { VisitorStateService } from './services/visitor-state/visitor-state.service';

describe('VisitorTrackingController', () => {
  let controller: VisitorTrackingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisitorTrackingController],
      providers: [
        {
          provide: VisitorStateService,
          useValue: {
            getVisitorsForAgent: jest.fn(),
            getVisitorChangesSince: jest.fn(),
            getVisitorStatistics: jest.fn(),
            cleanupExpiredVisitors: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<VisitorTrackingController>(
      VisitorTrackingController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
