import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Patch,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { UpdateAgentProfileDto } from './dto/update-agent-profile.dto';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../shared/constants/enums';
import { AuthenticatedUser } from '../shared/decorators/user.decorator';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { UsersService } from '../users/users.service'; // For password updates
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
import { Types } from 'mongoose';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly usersService: UsersService,
  ) {}

  // Admin: List all agents with profiles
  @Get()
  @Roles(UserRole.ADMIN)
  async getAllAgentsWithProfiles() {
    return this.agentsService.getAllAgentProfilesWithUserDetails();
  }

  // Agent: Get their own profile
  @Get('me/profile')
  @Roles(UserRole.AGENT)
  async getMyProfile(@AuthenticatedUser() user: JwtPayload) {
    const agentProfile = await this.agentsService.findAgentProfileByUserId(
      user.sub,
    );
    if (!agentProfile) {
      throw new NotFoundException('Agent profile not found.');
    }
    const userDetails = await this.usersService.findById(user.sub);
    return {
      ...agentProfile.toObject(),
      user: userDetails
        ? {
            email: userDetails.email,
            firstName: userDetails.firstName,
            lastName: userDetails.lastName,
          }
        : null,
    };
  }

  // Agent: Update their own profile (limited fields + password via usersService)
  @Put('me/profile')
  @Roles(UserRole.AGENT)
  async updateMyProfile(
    @AuthenticatedUser() user: JwtPayload,
    @Body() updateDto: UpdateAgentProfileDto & { password?: string }, // Allow password here
  ) {
    // Password update
    if (updateDto.password) {
      await this.usersService.update(user.sub, {
        password: updateDto.password,
      });
    }

    // Profile fields (Agent can update a limited set for themselves)
    const allowedProfileUpdates: Partial<UpdateAgentProfileDto> = {};
    if (updateDto.maxConcurrentChats)
      allowedProfileUpdates.maxConcurrentChats = updateDto.maxConcurrentChats;
    // Agents typically shouldn't change their own departments or domainAccess; admins do that.
    // If they can, add them here:
    // if (updateDto.departmentIds) allowedProfileUpdates.departmentIds = updateDto.departmentIds;
    // if (updateDto.domainAccess) allowedProfileUpdates.domainAccess = updateDto.domainAccess;

    const updatedProfile = await this.agentsService.updateAgentProfile(
      user.sub,
      allowedProfileUpdates,
    );
    const userDetails = await this.usersService.findById(user.sub);
    return {
      ...updatedProfile.toObject(),
      user: userDetails
        ? {
            email: userDetails.email,
            firstName: userDetails.firstName,
            lastName: userDetails.lastName,
          }
        : null,
    };
  }

  // Admin: Update any agent's profile
  @Put(':agentId/profile')
  @Roles(UserRole.ADMIN)
  async updateAgentProfileByAdmin(
    @Param('agentId') agentId: string,
    @Body()
    updateDto: UpdateAgentProfileDto & {
      password?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    },
  ) {
    if (!Types.ObjectId.isValid(agentId)) {
      throw new BadRequestException('Invalid agent ID format');
    }
    const userToUpdate = await this.usersService.findByIdOrFail(agentId);
    if (userToUpdate.role !== UserRole.AGENT) {
      throw new BadRequestException('This user is not an agent.');
    }

    // Update user-specific fields (firstName, lastName, email, password)
    const userUpdatePayload: UpdateUserDto = {};
    if (updateDto.password) userUpdatePayload.password = updateDto.password;
    if (updateDto.firstName) userUpdatePayload.firstName = updateDto.firstName;
    if (updateDto.lastName) userUpdatePayload.lastName = updateDto.lastName;
    if (updateDto.email) userUpdatePayload.email = updateDto.email;

    if (Object.keys(userUpdatePayload).length > 0) {
      await this.usersService.update(agentId, userUpdatePayload);
    }

    // Update agent-profile specific fields
    const agentProfileUpdatePayload: UpdateAgentProfileDto = { ...updateDto };
    delete agentProfileUpdatePayload['password']; // remove user fields
    delete agentProfileUpdatePayload['firstName'];
    delete agentProfileUpdatePayload['lastName'];
    delete agentProfileUpdatePayload['email'];

    const updatedProfile = await this.agentsService.updateAgentProfile(
      agentId,
      agentProfileUpdatePayload,
      true,
    );
    const userDetails = await this.usersService.findById(agentId); // Get updated user details
    return {
      ...updatedProfile.toObject(),
      user: userDetails
        ? {
            email: userDetails.email,
            firstName: userDetails.firstName,
            lastName: userDetails.lastName,
          }
        : null,
    };
  }

  // For REST-based status updates (though primary is WebSocket)
  @Patch('status') // Or use /me/status for agent's own
  @Roles(UserRole.AGENT) // Or ADMIN if admin can set status
  async setOnlineStatus(
    @AuthenticatedUser() user: JwtPayload,
    @Body() body: { isOnline: boolean },
  ) {
    // This endpoint is mostly for fallback or specific scenarios.
    // The `agent:set_online_status` WebSocket event is primary.
    if (typeof body.isOnline !== 'boolean') {
      throw new BadRequestException('isOnline must be a boolean.');
    }
    // This will also be handled by the ChatGateway, but providing a REST endpoint.
    return this.agentsService.setOnlineStatus(user.sub, body.isOnline);
  }
}
