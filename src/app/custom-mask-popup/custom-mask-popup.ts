import { Component, HostListener, OnDestroy, OnInit, signal } from '@angular/core';

import { WaitlistSignup } from '../waitlist-signup/waitlist-signup';
import { randomCustomMaskImage } from '../custom-mask-image';

const AUTO_OPENED_KEY = 'dreamseal-custom-mask-popup-opened';

@Component({
  selector: 'app-custom-mask-popup',
  imports: [WaitlistSignup],
  templateUrl: './custom-mask-popup.html',
  styleUrl: './custom-mask-popup.css'
})
export class CustomMaskPopup implements OnInit, OnDestroy {
  protected readonly customMaskImage = randomCustomMaskImage();
  protected readonly open = signal(false);
  private autoOpenTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    if (sessionStorage.getItem(AUTO_OPENED_KEY)) {
      return;
    }

    this.autoOpenTimer = setTimeout(() => {
      sessionStorage.setItem(AUTO_OPENED_KEY, 'true');
      this.open.set(true);
    }, 5000);
  }

  ngOnDestroy(): void {
    clearTimeout(this.autoOpenTimer);
  }

  @HostListener('document:keydown.escape')
  protected close(): void {
    this.open.set(false);
  }
}
