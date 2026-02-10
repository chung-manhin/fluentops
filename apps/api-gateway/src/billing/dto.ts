import { IsString } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  planId!: string;
}

export class MockPayDto {
  @IsString()
  orderId!: string;
}
