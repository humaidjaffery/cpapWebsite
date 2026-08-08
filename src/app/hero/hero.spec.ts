import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Timestamp } from 'firebase/firestore';

import { createWaitlistRecord, Hero } from './hero';

describe('Hero', () => {
  let component: Hero;
  let fixture: ComponentFixture<Hero>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Hero]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Hero);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('initializes email lifecycle metadata when joining the waitlist', () => {
    const timestamp = Timestamp.fromMillis(1234);

    expect(createWaitlistRecord('  PERSON@example.com  ', timestamp, 'test-agent')).toEqual({
      emailOrPhone: 'PERSON@example.com',
      emailStatus: 'pending',
      emailAttemptCount: 0,
      timestamp,
      userAgent: 'test-agent'
    });
  });
});
