import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { addDoc, collection, getFirestore, Timestamp } from 'firebase/firestore';

import { environment } from '../../environments/environment';

@Component({
  selector: 'app-waitlist-signup',
  imports: [FormsModule, RouterLink],
  templateUrl: './waitlist-signup.html',
  styleUrl: './waitlist-signup.css'
})
export class WaitlistSignup {
  @Input() compact = false;
  @Input() header = false;
  @Input() inlinePerks = false;

  protected email = '';
  protected submitting = false;
  protected errorMessage = '';
  private readonly db = getFirestore(
    getApps().length ? getApp() : initializeApp(environment.firebase)
  );

  constructor(private readonly router: Router) {}

  protected async submit(): Promise<void> {
    const email = this.email.trim();
    if (!email || this.submitting) return;

    this.submitting = true;
    this.errorMessage = '';

    try {
      const document = await addDoc(collection(this.db, 'waitlist'), {
        emailOrPhone: email,
        emailStatus: 'pending',
        emailAttemptCount: 0,
        timestamp: Timestamp.now(),
        userAgent: navigator.userAgent
      });
      this.storeSurveyDocument(document.id);
      await this.router.navigate(['/survey']);
    } catch (error) {
      console.error('Error joining the waitlist:', error);
      this.errorMessage = 'We could not add you right now. Please try again.';
      this.submitting = false;
    }
  }

  private storeSurveyDocument(documentId: string): void {
    const timestamp = Date.now();
    sessionStorage.setItem(
      '_sdi',
      JSON.stringify({
        id: btoa(`${documentId}_${timestamp.toString().slice(-6)}`),
        timestamp,
        expiry: timestamp + 10 * 60 * 1000,
        checksum: this.checksum(documentId)
      })
    );
  }

  private checksum(value: string): string {
    let hash = 0;
    for (const character of value) {
      hash = (hash << 5) - hash + character.charCodeAt(0);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }
}
