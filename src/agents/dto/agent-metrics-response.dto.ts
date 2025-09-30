import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../../shared/dto/common-responses.dto';

export class AgentMetricItemDto {
  @ApiProperty({
    description: 'Domain name',
    example: 'allureesthetic.com',
  })
  domain: string;

  @ApiProperty({
    description: 'Number of chats accepted by the agent',
    example: 45,
  })
  acceptedChats: number;

  @ApiProperty({
    description: 'Number of chats where agent responded',
    example: 42,
  })
  respondedChats: number;

  @ApiProperty({
    description: 'Average response time in H:MM:SS format',
    example: '0:01:30',
  })
  avgResponseTime: string;

  @ApiProperty({
    description: 'Number of proactive chats initiated by agent',
    example: 3,
  })
  proactiveChats: number;
}

export class AgentMetricsResponseDto extends PaginatedResponseDto<AgentMetricItemDto> {
  // items property is inherited from PaginatedResponseDto
}
