export class View {
  root: HTMLElement;

  constructor(title?: string, showContents = true) {
    this.root = document.createElement('main');
    this.root.classList.add('main');
    this.root.id = 'app-main';

    title && this.addTitle(title);
    showContents && this.addContents();
  }

  addTitle(text: string) {
    const title = this.create('h1', { innerText: text, id: 'app-title' });

    this.root.prepend(title);
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
