import { Component, OnInit, AfterViewInit } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { environment } from '../../environments/environment';

interface SurveyAnswers {
  usedCpap?: string;
  cpapDuration?: string;
  masksUsed?: string;
  satisfaction?: string;
  improvements?: string;
  userName?: string;
  userAge?: string;
  userCity?: string;
  annualMaskCost?: string;
  insuranceCoverage?: string;
  maxOutOfPocket?: string;
  hearAboutUs?: string;
  otherSource?: string;
}

@Component({
  selector: 'app-thank-you',
  imports: [],
  templateUrl: './thank-you.html',
  styleUrl: './thank-you.css'
})
export class ThankYou implements OnInit, AfterViewInit {
  private db;
  private docId: string | null = null;
  
  constructor() {
    // Initialize Firebase using environment config
    const app = initializeApp(environment.firebase);
    this.db = getFirestore(app);
  }
  
  ngOnInit(): void {
    // Securely retrieve document ID from session storage
    this.docId = this.retrieveDocIdSecurely();
    
    if (this.docId) {
      console.log('Document ID retrieved securely');
    } else {
      console.warn('No valid document ID found in session storage');
    }
  }
  
  ngAfterViewInit(): void {
    // Initialize survey functionality after view is ready
    this.initSurveyForm();
  }
  
  private initSurveyForm(): void {
    const form = document.getElementById('surveyForm') as HTMLFormElement;
    
    if (!form) {
      console.error('Survey form not found');
      return;
    }
    
    this.setupFormSubmission(form);
    this.setupYesNoButtons();
    this.setupScaleOptions();
    this.setupSourceOptions();
  }
  
  private setupFormSubmission(form: HTMLFormElement): void {
    form.addEventListener('submit', async (e: Event) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const answers: SurveyAnswers = {};
      
      // Collect all form data
      for (let [key, value] of formData.entries()) {
        answers[key as keyof SurveyAnswers] = value.toString();
      }
      
      // Console log all answers
      console.log('Survey Answers:', answers);
      
      // Save to Firebase if we have a document ID
      if (this.docId) {
        try {
          await this.saveSurveyToFirebase(answers);
          this.showCompletionMessage();
        } catch (error) {
          console.error('Error saving survey:', error);
          // Still show completion message even if Firebase fails
          this.showCompletionMessage();
        }
      } else {
        console.warn('No document ID available - survey data not saved to Firebase');
        this.showCompletionMessage();
      }
    });
  }
  
  private showCompletionMessage(): void {
    // Hide the form, intro text, and original header
    const form = document.getElementById('surveyForm');
    const introText = document.querySelector('.intro-text') as HTMLElement;
    const originalHeader = document.querySelector('.thank-you-header') as HTMLElement;
    const completionMessage = document.getElementById('completionMessage');
    
    if (form) {
      form.style.display = 'none';
    }
    
    if (introText) {
      introText.style.display = 'none';
    }
    
    if (originalHeader) {
      originalHeader.style.display = 'none';
    }
    
    if (completionMessage) {
      completionMessage.style.display = 'flex';
    }
  }
  
  private async saveSurveyToFirebase(answers: SurveyAnswers): Promise<void> {
    if (!this.docId) {
      throw new Error('No document ID available');
    }
    
    // Create update object with survey data and completion timestamp
    const updateData: any = {
      surveyCompletedAt: Timestamp.now(),
      ...answers
    };
    
    // Remove any undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === '') {
        delete updateData[key];
      }
    });
    
    // Update the existing document
    const docRef = doc(this.db, 'waitlist', this.docId);
    await updateDoc(docRef, updateData);
    
    console.log('Survey data successfully added to document:', this.docId);
  }
  
  /**
   * Securely retrieve document ID from session storage with validation
   * @returns string | null - The document ID if valid, null otherwise
   */
  private retrieveDocIdSecurely(): string | null {
    try {
      // Retrieve data from session storage
      const storedData = sessionStorage.getItem('_sdi');
      
      if (!storedData) {
        console.warn('No survey document ID found in session storage');
        return null;
      }

      // Parse stored data
      const secureData = JSON.parse(storedData);
      
      // Validate data structure
      if (!this.isValidStoredData(secureData)) {
        console.error('Invalid stored data structure');
        this.clearStoredData();
        return null;
      }

      // Check expiry
      if (Date.now() > secureData.expiry) {
        console.warn('Stored document ID has expired');
        this.clearStoredData();
        return null;
      }

      // Decode document ID
      const docId = this.decodeDocId(secureData.id);
      
      if (!docId) {
        console.error('Failed to decode document ID');
        this.clearStoredData();
        return null;
      }

      // Validate checksum for integrity
      const expectedChecksum = this.generateChecksum(docId);
      if (secureData.checksum !== expectedChecksum) {
        console.error('Data integrity check failed');
        this.clearStoredData();
        return null;
      }

      // Validate Firestore ID format
      if (!this.isValidFirestoreId(docId)) {
        console.error('Invalid document ID format');
        this.clearStoredData();
        return null;
      }

      // Clean up session storage after successful retrieval
      this.clearStoredData();
      
      return docId;
    } catch (error) {
      console.error('Error retrieving document ID:', error);
      this.clearStoredData();
      return null;
    }
  }

  /**
   * Validate stored data structure
   * @param data - Data object to validate
   * @returns boolean - Whether the data structure is valid
   */
  private isValidStoredData(data: any): boolean {
    return data &&
           typeof data.id === 'string' &&
           typeof data.timestamp === 'number' &&
           typeof data.expiry === 'number' &&
           typeof data.checksum === 'string' &&
           data.timestamp > 0 &&
           data.expiry > data.timestamp;
  }

  /**
   * Decode document ID from storage
   * @param encodedId - Encoded document ID
   * @returns string | null - Decoded document ID or null if invalid
   */
  private decodeDocId(encodedId: string): string | null {
    try {
      const decoded = atob(encodedId);
      const docId = decoded.split('_')[0]; // Remove timestamp suffix
      return docId || null;
    } catch (error) {
      console.error('Failed to decode document ID:', error);
      return null;
    }
  }

  /**
   * Generate checksum for integrity verification
   * @param data - Data to generate checksum for
   * @returns string - Generated checksum
   */
  private generateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Validate Firestore document ID format
   * @param docId - Document ID to validate
   * @returns boolean - Whether the ID is valid
   */
  private isValidFirestoreId(docId: string): boolean {
    const firestoreIdPattern = /^[a-zA-Z0-9]{20}$/;
    return firestoreIdPattern.test(docId) && docId.length === 20;
  }

  /**
   * Securely clear stored data from session storage
   */
  private clearStoredData(): void {
    try {
      sessionStorage.removeItem('_sdi');
    } catch (error) {
      console.error('Failed to clear stored data:', error);
    }
  }
  
  private setupYesNoButtons(): void {
    const radioOptions = document.querySelectorAll('.radio-group .radio-option');
    
    radioOptions.forEach(option => {
      option.addEventListener('click', () => {
        const element = option as HTMLElement;
        const group = element.closest('.radio-group');
        const hiddenInput = group?.parentElement?.querySelector('input[type="hidden"]') as HTMLInputElement;
        
        if (!group || !hiddenInput) return;
        
        // Remove active class from all options in this group
        group.querySelectorAll('.radio-option').forEach(opt => {
          opt.classList.remove('active');
        });
        
        // Add active class to clicked option - this will persist
        element.classList.add('active');
        
        // Set the hidden input value
        const value = element.getAttribute('data-value');
        if (value) {
          hiddenInput.value = value;
        }
      });
    });
  }
  
  private setupScaleOptions(): void {
    const scaleOptions = document.querySelectorAll('.scale-option');
    
    scaleOptions.forEach(option => {
      option.addEventListener('click', () => {
        const element = option as HTMLElement;
        const hiddenInput = element.querySelector('input[type="radio"]') as HTMLInputElement;
        
        if (!hiddenInput) return;
        
        // Remove active class from all scale options
        document.querySelectorAll('.scale-option').forEach(opt => {
          opt.classList.remove('active');
        });
        
        // Add active class to clicked option - this will persist
        element.classList.add('active');
        
        // Check the radio button
        hiddenInput.checked = true;
      });
    });
  }
  
  private setupSourceOptions(): void {
    const sourceOptions = document.querySelectorAll('.source-group .source-option');
    const otherInputContainer = document.getElementById('otherInputContainer');
    
    sourceOptions.forEach(option => {
      option.addEventListener('click', () => {
        const element = option as HTMLElement;
        const group = element.closest('.source-group');
        const hiddenInput = group?.parentElement?.querySelector('input[type="hidden"]') as HTMLInputElement;
        
        if (!group || !hiddenInput) return;
        
        // Remove active class from all options in this group
        group.querySelectorAll('.source-option').forEach(opt => {
          opt.classList.remove('active');
        });
        
        // Add active class to clicked option
        element.classList.add('active');
        
        // Set the hidden input value
        const value = element.getAttribute('data-value');
        if (value) {
          hiddenInput.value = value;
        }
        
        // Show/hide other input field
        if (value === 'other' && otherInputContainer) {
          otherInputContainer.style.display = 'block';
        } else if (otherInputContainer) {
          otherInputContainer.style.display = 'none';
          // Clear the other input field when hiding
          const otherInput = document.getElementById('otherSource') as HTMLInputElement;
          if (otherInput) {
            otherInput.value = '';
          }
        }
      });
    });
  }
}
