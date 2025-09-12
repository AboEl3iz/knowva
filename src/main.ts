import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
  });
  app.setGlobalPrefix('api/v1');
  //swagger
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('The API documentation for your application.')
    .setVersion('1.0')
    .addBearerAuth(
      
    )
    .addTag('Auth') // Example tag for your authentication endpoints
    .addTag('Users') // Example tag for user-related endpoints
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);


  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false, // Try setting this to false
    transformOptions: {
        enableImplicitConversion: true,
    },
  }));

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();

