import { AfterViewInit, Component } from '@angular/core';

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (options: { url: string; parentElement: HTMLElement }) => void;
    };
  }
}

@Component({
  selector: 'app-thank-you',
  imports: [],
  templateUrl: './thank-you.html',
  styleUrl: './thank-you.css'
})
export class ThankYou implements AfterViewInit {
  private readonly calendlyUrl = 'https://calendly.com/humaidjaffery/dreamseal-custom-cpap-meeting';

  ngAfterViewInit(): void {
    this.loadCalendlyWidget();
  }

  private loadCalendlyWidget(): void {
    const parentElement = document.querySelector('.calendly-inline-widget') as HTMLElement | null;

    if (!parentElement) {
      return;
    }

    if (window.Calendly) {
      window.Calendly.initInlineWidget({
        url: this.calendlyUrl,
        parentElement
      });
      return;
    }

    if (!document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }
}
