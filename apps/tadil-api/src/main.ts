/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use((request: any, response: any, next: () => void) => {
    response.setHeader('Cache-Control', 'no-store');
    const cookies: Record<string, string> = {};
    for (const part of String(request.headers.cookie ?? '').split(';')) {
      const separator = part.indexOf('=');
      if (separator > 0) {
        const key = part.slice(0, separator).trim();
        try {
          cookies[key] = decodeURIComponent(part.slice(separator + 1).trim());
        } catch {
          response.status(400).json({ message: 'Malformed cookie' });
          return;
        }
      }
    }
    request.cookies = cookies;
    next();
  });
  app.enableCors({
    origin: (process.env.STAFF_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = environment.apiPort;

  const swaggerConfig = new DocumentBuilder()
    .setTitle('tadil-api')
    .setDescription('tadil-api')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    deepScanRoutes: true,
  });

  // Inject custom CSS for dark mode
  const customCss = fs.readFileSync(
    path.join(__dirname, 'assets/swagger-dark.css'),
    { encoding: 'utf8' }
  );
  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('api', app, document, { customCss });
  }

  await app.listen(port, '0.0.0.0');
  Logger.log(
    `🚀 Application is running on: http://0.0.0.0:${port}/${globalPrefix}`
  );
}

bootstrap();
