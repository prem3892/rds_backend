import { Model, Types } from 'mongoose';
import { UserDocument } from 'src/schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AgentsService } from 'src/agents/agents.service';
export declare class UsersService {
    private userModel;
    private readonly agentsService;
    constructor(userModel: Model<UserDocument>, agentsService: AgentsService);
    create(createUserDto: CreateUserDto): Promise<UserDocument>;
    findAll(): Promise<UserDocument[]>;
    findById(id: string | Types.ObjectId): Promise<UserDocument | null>;
    findByIdOrFail(id: string | Types.ObjectId): Promise<UserDocument>;
    findByEmail(email: string): Promise<UserDocument | null>;
    findManyByIds(ids: (string | Types.ObjectId)[]): Promise<UserDocument[]>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<UserDocument>;
    remove(id: string): Promise<UserDocument>;
}
