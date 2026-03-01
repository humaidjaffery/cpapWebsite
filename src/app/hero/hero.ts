import { Component, CUSTOM_ELEMENTS_SCHEMA, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-hero',
  imports: [FormsModule],
  templateUrl: './hero.html',
  styleUrl: './hero.css'
  ,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Hero implements AfterViewInit, OnDestroy {
  emailOrPhone: string = '';
  showHeaderInput: boolean = false;
  private db;

  constructor(private router: Router) {
    // Initialize Firebase using environment config
    const app = initializeApp(environment.firebase);
    this.db = getFirestore(app);
  }

  @ViewChild('waitInput') waitInput!: ElementRef<HTMLInputElement>;

  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    // Load iconify script if not already loaded
    if (!document.querySelector('script[src*="iconify-icon"]')) {
      const script = document.createElement('script');
      script.src = 'https://code.iconify.design/iconify-icon/3.0.0/iconify-icon.min.js';
      script.async = true;
      document.head.appendChild(script);
    }

    // Observe the waitlist input and log when it scrolls out of view
    if (this.waitInput && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            console.log('User scrolled past the waitlist input field');
            this.showHeaderInput = true;
          } else {
            console.log('User scrolled back into view of the waitlist input field');
            this.showHeaderInput = false;
          }
        });
      }, { threshold: [0] });

      this.observer.observe(this.waitInput.nativeElement);
    } else if (this.waitInput) {
      // Fallback: simple scroll listener
      let wasVisible = true; // Track previous visibility state
      const onScroll = () => {
        const rect = this.waitInput.nativeElement.getBoundingClientRect();
        const isVisible = rect.bottom > 0 && rect.top < window.innerHeight;
        
        if (wasVisible && !isVisible) {
          console.log('User scrolled past the waitlist input field');
          this.showHeaderInput = true;
        } else if (!wasVisible && isVisible) {
          console.log('User scrolled back into view of the waitlist input field');
          this.showHeaderInput = false;
        }
        
        wasVisible = isVisible;
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      this.observer = {
        disconnect: () => window.removeEventListener('scroll', onScroll)
      } as unknown as IntersectionObserver;
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  async joinWaitlist() {
    // Validate email/phone input
    if (!this.emailOrPhone || this.emailOrPhone.trim() === '') {
      alert('Please enter your email or phone number');
      return;
    }

    try {
      // Save to Firebase Firestore
      const docRef = await addDoc(collection(this.db, 'waitlist'), {
        emailOrPhone: this.emailOrPhone.trim(),
        timestamp: Timestamp.now(),
        userAgent: navigator.userAgent
      });

      console.log('Document written with ID: ', docRef.id);
      
      // Navigate to thank you page
      this.router.navigate(['/thank-you']);
    } catch (error) {
      console.error('Error adding document: ', error);
      alert('There was an error joining the waitlist. Please try again.');
    }
  }

  scrollToContact() {
    const el = document.getElementById('contact-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
