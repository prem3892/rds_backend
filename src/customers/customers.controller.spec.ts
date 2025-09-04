import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { UserRole } from '../shared/constants/enums';
import { Types } from 'mongoose';
import { GetBlockedCustomersDto } from './dto/get-blocked-customers.dto';

describe('CustomersController', () => {
  let controller: CustomersController;
  let service: CustomersService;

  const mockCustomersService = {
    getBlockedCustomers: jest.fn(),
    blockCustomer: jest.fn(),
    unblockCustomer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: CustomersService,
          useValue: mockCustomersService,
        },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
    service = module.get<CustomersService>(CustomersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getBlockedCustomers', () => {
    it('should return paginated blocked customers', async () => {
      const mockUser: JwtPayload = {
        sub: '507f1f77bcf86cd799439011',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      };

      const mockQuery: GetBlockedCustomersDto = {
        page: 1,
        limit: 10,
        search: 'john',
        sortBy: 'blockedAt',
        sortOrder: 'desc',
      };

      const mockResult = {
        items: [
          {
            _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
            fingerprint: 'fp_test123',
            name: 'John Doe',
            email: 'john@example.com',
            widgetId: new Types.ObjectId('507f1f77bcf86cd799439013'),
            isBlocked: true,
            blockedBy: new Types.ObjectId('507f1f77bcf86cd799439011'),
            blockedAt: new Date('2024-01-15T10:30:00.000Z'),
            metadata: { browser: 'Chrome' },
            createdAt: new Date('2024-01-10T08:00:00.000Z'),
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockCustomersService.getBlockedCustomers.mockResolvedValue(mockResult);

      const result = await controller.getBlockedCustomers(mockUser, mockQuery);

      expect(service.getBlockedCustomers).toHaveBeenCalledWith(
        new Types.ObjectId(mockUser.sub),
        mockUser.role,
        mockQuery,
      );
      expect(result).toEqual({
        items: expect.arrayContaining([
          expect.objectContaining({
            _id: mockResult.items[0]._id,
            name: 'John Doe',
            email: 'john@example.com',
            isBlocked: true,
          }),
        ]),
        meta: mockResult.meta,
      });
    });
  });
});
