import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/app.config';
import { validationSchema } from './config/validation.schema';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('throttler.ttl') as number,
            limit: config.get<number>('throttler.limit') as number,
          },
        ],
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
