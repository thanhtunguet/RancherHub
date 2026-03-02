import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AuthSeederService } from './modules/auth/auth-seeder.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CSRF defence: reject mutation requests whose Content-Type is not
  // application/json.  This prevents cross-origin HTML form submissions
  // from triggering state-changing endpoints, even if cookie-based auth is
  // introduced in the future.
  // DELETE is excluded because it is semantically bodyless; enforcing a
  // Content-Type on it would break standard REST clients and Swagger UI.
  app.use(
    (
      req: import('express').Request,
      res: import('express').Response,
      next: import('express').NextFunction,
    ) => {
      const mutationMethods = ['POST', 'PUT', 'PATCH'];
      if (mutationMethods.includes(req.method)) {
        const ct = req.headers['content-type'] ?? '';
        if (!ct.startsWith('application/json')) {
          res.status(415).json({
            statusCode: 415,
            message:
              'Unsupported Media Type: Content-Type must be application/json',
          });
          return;
        }
      }
      next();
    },
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Rancher Hub API')
    .setDescription('API for managing Rancher services across environments')
    .setVersion('1.0')
    .addTag('sites')
    .addTag('environments')
    .addTag('app-instances')
    .addTag('services')
    .addTag('sync')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app as any, config);
  SwaggerModule.setup('api/docs', app as any, document);

  // Initialize default admin user
  const authSeeder = app.get(AuthSeederService);
  await authSeeder.createDefaultAdmin();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Backend server running on http://localhost:${port}`);
  console.log(
    `📚 API Documentation available at http://localhost:${port}/api/docs`,
  );
}

bootstrap();
