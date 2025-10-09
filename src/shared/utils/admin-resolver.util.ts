import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserRole } from '../constants/enums';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Interface for services that need to resolve adminId for managers
 */
export interface IAdminResolver {
  findAgentProfileByUserId(
    userId: string,
  ): Promise<{ adminId?: Types.ObjectId } | null>;
}

/**
 * Utility class to resolve adminId from user context
 * Handles both ADMIN and MANAGER roles consistently
 */
@Injectable()
export class AdminResolverUtil {
  /**
   * Resolves the adminId from the authenticated user
   * - If user is ADMIN, returns user.sub as adminId
   * - If user is MANAGER, fetches their agent profile and returns the adminId
   *
   * @param user - The authenticated user from JWT
   * @param agentService - Service that can fetch agent profile (must implement IAdminResolver)
   * @returns The resolved adminId as string
   * @throws NotFoundException if manager's adminId cannot be found
   */
  static async resolveAdminId(
    user: JwtPayload,
    agentService: IAdminResolver,
  ): Promise<string> {
    if (user.role === UserRole.ADMIN) {
      return user.sub;
    }

    if (user.role === UserRole.MANAGER) {
      const managerProfile = await agentService.findAgentProfileByUserId(
        user.sub,
      );
      const adminId = managerProfile?.adminId;

      if (!adminId) {
        throw new NotFoundException('Admin not found for the manager');
      }

      return adminId.toString();
    }

    // For other roles (AGENT, etc.), return user.sub
    return user.sub;
  }

  /**
   * Resolves the adminId as Types.ObjectId
   * Same as resolveAdminId but returns Types.ObjectId instead of string
   */
  static async resolveAdminIdAsObjectId(
    user: JwtPayload,
    agentService: IAdminResolver,
  ): Promise<Types.ObjectId> {
    const adminId = await this.resolveAdminId(user, agentService);
    return new Types.ObjectId(adminId);
  }
}
