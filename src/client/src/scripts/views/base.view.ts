export class View {
  root: HTMLElement;

  constructor(title?: string) {
    this.root = document.createElement('main');
    this.root.classList.add('main');
    this.root.id = 'app-main';

    title && this.addTitle(title);
    this.addContents();
  }

  addTitle(text: string) {
    const title = this.create('h1', { innerText: text });

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
