import { Test, TestingModule } from '@nestjs/testing';
import { ChatTranscriptService } from './chat-transcript.service';

describe('ChatTranscriptService', () => {
  let service: ChatTranscriptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatTranscriptService],
    }).compile();

    service = module.get<ChatTranscriptService>(ChatTranscriptService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
