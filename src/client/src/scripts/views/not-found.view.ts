import { View } from './base.view';

export class NotFoundView extends View {
  constructor() {
    super('Not found');
  }

  addContents() {
    const goHomeButton = this.create('button', {
      innerText: 'Go home',
      onclick: () => {
        location.replace('/');
      },
    });

    this.root.append(goHomeButton);
  }
}
