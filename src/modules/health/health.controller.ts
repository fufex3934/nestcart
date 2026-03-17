/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(
    private configService: ConfigService,
    @InjectConnection() private readonly dbConnection: Connection,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async check() {
    // Check database connection
    let dbStatus = 'disconnected';
    // Properly type dbDetails as a union type
    let dbDetails: {
      version: string;
      host: string;
      name: string;
    } | null = null;

    try {
      const state = this.dbConnection.readyState;

      // Use enum for better type safety
      dbStatus = this.getConnectionStatus(state);

      // Only try to get details if connected AND db object exists
      if (state === ConnectionStates.connected && this.dbConnection.db) {
        try {
          // Get database stats if connected
          const admin = this.dbConnection.db.admin();
          const serverInfo = await admin.serverInfo();

          dbDetails = {
            version: serverInfo.version as string,
            host: this.dbConnection.host,
            name: this.dbConnection.name,
          };
        } catch (dbError) {
          // If we can't get server info, still return basic connection info
          dbDetails = {
            version: 'unknown',
            host: this.dbConnection.host || 'unknown',
            name: this.dbConnection.name || 'unknown',
          };
        }
      }
    } catch (error) {
      dbStatus = 'error';
      dbDetails = null;
      // Log the error but don't fail the health check
      console.error('Health check database error:', error);
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('app.env'),
      app: this.configService.get<string>('app.name'),
      database: {
        status: dbStatus,
        details: dbDetails,
      },
      uptime: process.uptime(),
      memory: {
        rss: process.memoryUsage().rss,
        heapTotal: process.memoryUsage().heapTotal,
        heapUsed: process.memoryUsage().heapUsed,
        external: process.memoryUsage().external,
      },
    };
  }

  private getConnectionStatus(state: ConnectionStates): string {
    switch (state) {
      case ConnectionStates.connected:
        return 'connected';
      case ConnectionStates.connecting:
        return 'connecting';
      case ConnectionStates.disconnecting:
        return 'disconnecting';
      case ConnectionStates.disconnected:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }
}
