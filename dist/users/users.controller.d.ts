import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDocument } from 'src/schemas/user.schema';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(createUserDto: CreateUserDto): Promise<Omit<UserDocument, 'password'>>;
    findAll(): Promise<Omit<UserDocument, 'password'>[]>;
    findOne(userId: string): Promise<Omit<UserDocument, 'password'>>;
    update(userId: string, updateUserDto: UpdateUserDto): Promise<Omit<UserDocument, 'password'>>;
    remove(userId: string): Promise<Omit<UserDocument, 'password'>>;
}
