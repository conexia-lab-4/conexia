import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'ArrivalAfterDeparture', async: false })
class ArrivalAfterDepartureConstraint implements ValidatorConstraintInterface {
  validate(arrivalTime: string, args: ValidationArguments): boolean {
    const object = args.object as { departureTime?: string };
    if (!object.departureTime || !arrivalTime) return true;
    return new Date(arrivalTime) > new Date(object.departureTime);
  }

  defaultMessage(): string {
    return 'arrivalTime debe ser posterior a departureTime';
  }
}

export function ArrivalAfterDeparture(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: ArrivalAfterDepartureConstraint,
    });
  };
}
