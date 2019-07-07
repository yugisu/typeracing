import { View } from './base.view';

export class IndexView extends View {
  constructor() {
    super('Welcome!');
  }

  addContents() {
    const text = this.create<HTMLLinkElement>('a', {
      innerHTML: '<h3>Show me tracks already!</h3>',
      href: '/race',
    });

    this.root.append(text);
  }
}
