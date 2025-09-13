import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsDateStringFlexible(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isDateStringFlexible',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }
          
          // Try to parse the date string
          const date = new Date(value);
          
          // Check if it's a valid date
          if (isNaN(date.getTime())) {
            return false;
          }
          
          // Check if it's a valid ISO string or common date formats
          const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
          const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
          const dateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
          
          return isoRegex.test(value) || dateOnlyRegex.test(value) || dateTimeRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid date string in ISO 8601 format (e.g., 2025-01-15T13:30:00Z or 2025-01-15T13:30:00)`;
        }
      }
    });
  };
}
