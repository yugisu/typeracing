import { View } from './base.view';

export class IndexView extends View {
  constructor() {
    super('🔥 Ready to burn? 🔥');
  }

  addContents() {
    const text = this.create<HTMLLinkElement>('a', {
      className: 'to-race',
      innerHTML: '<h3>Get me into the race!</h3>',
      href: '/race',
    });

    this.root.append(text);
  }
}
