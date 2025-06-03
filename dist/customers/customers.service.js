"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const customer_schema_1 = require("../schemas/customer.schema");
let CustomersService = class CustomersService {
    customerModel;
    constructor(customerModel) {
        this.customerModel = customerModel;
    }
    async findById(id) {
        return this.customerModel.findById(id).exec();
    }
    async findByIdOrFail(id) {
        const customer = await this.findById(id);
        if (!customer) {
            throw new common_1.NotFoundException(`Customer with ID ${id} not found.`);
        }
        return customer;
    }
    async findByFingerprintAndWidget(fingerprint, widgetId) {
        return this.customerModel.findOne({ fingerprint, widgetId }).exec();
    }
    async createOrUpdateCustomer(data) {
        if (data.customerId) {
            const existingCustomer = await this.findById(data.customerId);
            if (existingCustomer) {
                if (existingCustomer.fingerprint === data.fingerprint ||
                    data.name ||
                    data.email) {
                    if (data.name)
                        existingCustomer.name = data.name;
                    if (data.email)
                        existingCustomer.email = data.email;
                    if (data.metadata)
                        existingCustomer.metadata = {
                            ...existingCustomer.metadata,
                            ...data.metadata,
                        };
                    return existingCustomer.save();
                }
            }
        }
        let customer = await this.findByFingerprintAndWidget(data.fingerprint, data.widgetId);
        if (customer) {
            if (data.name && !customer.name)
                customer.name = data.name;
            if (data.email && !customer.email)
                customer.email = data.email;
            if (data.metadata)
                customer.metadata = { ...customer.metadata, ...data.metadata };
            return customer.save();
        }
        const newCustomer = new this.customerModel({
            widgetId: data.widgetId,
            fingerprint: data.fingerprint,
            name: data.name,
            email: data.email,
            metadata: data.metadata,
        });
        return newCustomer.save();
    }
    async updateCustomerDetails(customerId, details) {
        const customer = await this.findByIdOrFail(customerId);
        if (details.name)
            customer.name = details.name;
        if (details.email)
            customer.email = details.email;
        return customer.save();
    }
    async findCustomersByNameOrEmail(name, email) {
        const query = {};
        if (name)
            query.name = new RegExp(name, 'i');
        if (email)
            query.email = new RegExp(email, 'i');
        const customers = await this.customerModel.find(query).select('_id').exec();
        return customers.map((c) => c._id);
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(customer_schema_1.Customer.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], CustomersService);
//# sourceMappingURL=customers.service.js.map