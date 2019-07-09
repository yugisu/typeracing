export class View {
  root: HTMLElement;

  constructor(title?: string, showContents = true) {
    this.root = document.createElement('main');
    this.root.classList.add('main');
    this.root.id = 'app-main';

    this.addTitle(title);
    showContents && this.addContents();
  }

  addTitle(text?: string) {
    const topBar = this.create('div', {
      className: 'top-bar',
      id: 'top-bar',
    });

    if (text) {
      const title = this.create('h1', {
        innerText: text,
        className: 'top-bar__title',
        id: 'app-title',
      });
      topBar.prepend(title);
    }

    this.root.prepend(topBar);
  }

  addContents() {}
  private onRender() {}

  create<T extends HTMLElement>(tagName: string, opts?: Partial<T>): T {
    const elem = document.createElement(tagName);

    Object.assign(elem, opts);

    return elem as T;
  }

  render(rootNode: HTMLElement) {
    rootNode.replaceWith(this.root);
    this.onRender();
  }
}

interface Stateful<T extends object> {
  state: T | {};
  setState: (changes: Partial<T>) => void;
}

export class StatefulView<T extends object> extends View implements Stateful<T> {
  state = {};

  setState = (changes: Partial<T>) => {
    this.state = { ...this.state, ...changes };
  };
}
