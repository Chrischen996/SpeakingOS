import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller.js';

@Module({ controllers: [ReviewController] })
export class ReviewModule {}
