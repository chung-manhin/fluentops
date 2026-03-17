import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export type AssessmentRealtimeEvent = {
  assessmentId: string;
  userId: string;
  seq: number;
  type: 'progress' | 'final' | 'error';
  data: unknown;
};

@Injectable()
export class AssessmentRealtimeService {
  private readonly stream = new Subject<AssessmentRealtimeEvent>();
  readonly events$ = this.stream.asObservable();

  publish(event: AssessmentRealtimeEvent) {
    this.stream.next(event);
  }
}
