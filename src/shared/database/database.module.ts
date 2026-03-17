/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Module, Global, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');
        const uri = configService.get<string>('database.uri');
        const dbName = configService.get<string>('database.dbName');

        logger.log(`Connecting to MongoDB: ${uri}/${dbName}`);

        return {
          uri,
          dbName,
          connectionFactory: (connection) => {
            // Add plugins

            connection.plugin(require('mongoose-autopopulate'));

            // Log connection events
            connection.on('connected', () => {
              logger.log('MongoDB connected successfully');
            });

            connection.on('error', (error) => {
              logger.error(`MongoDB connection error: ${error.message}`);
            });

            connection.on('disconnected', () => {
              logger.warn('MongoDB disconnected');
            });

            // Handle process termination
            process.on('SIGINT', async () => {
              await connection.close();
              logger.log('MongoDB connection closed through app termination');
              process.exit(0);
            });

            return connection;
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
