import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CreateScheduleDto } from './create-schedule.dto';

@ValidatorConstraint({ name: 'EndTimeAfterStartTime', async: false })
class EndTimeAfterStartTimeConstraint implements ValidatorConstraintInterface {
  validate(endTime: string, args: ValidationArguments): boolean {
    const object = args.object as CreateScheduleDto;
    if (!object.startTime || !endTime) return true;
    return object.startTime < endTime;
  }

  defaultMessage(args: ValidationArguments): string {
    const object = args.object as CreateScheduleDto;
    return `endTime debe ser posterior a startTime (día: ${object.dayOfWeek ?? 'desconocido'})`;
  }
}

export function EndTimeAfterStartTime(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: EndTimeAfterStartTimeConstraint,
    });
  };
}
