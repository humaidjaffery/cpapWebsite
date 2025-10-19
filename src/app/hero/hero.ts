import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-hero',
  imports: [FormsModule],
  templateUrl: './hero.html',
  styleUrl: './hero.css'
})
export class Hero {
  emailOrPhone: string = '';

  constructor(private router: Router) {}

  joinWaitlist() {
    // Navigate to thank you page
    this.router.navigate(['/thank-you']);
  }
}
