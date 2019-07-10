import { View } from './base.view';

export class LoginView extends View {
  constructor() {
    super('Login');
  }

  addContents() {
    const form = this.create<HTMLFormElement>('form', {
      className: 'login-form',
    });
    const loginInput = this.create<HTMLInputElement>('input', {
      name: 'login',
      placeholder: 'Enter login',
    });
    const passwordInput = this.create<HTMLInputElement>('input', {
      name: 'password',
      placeholder: 'Password',
      type: 'password',
    });
    const submitButton = this.create<HTMLButtonElement>('button', {
      type: 'submit',
      innerText: 'Login',
    });
    form.append(loginInput, passwordInput, submitButton);

    form.onsubmit = (e) => {
      e.preventDefault();

      fetch('/login', {
        method: 'POST',
        body: JSON.stringify({
          login: loginInput.value,
          password: passwordInput.value,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then((res) => res.json())
        .then((body) => {
          if (body.auth) {
            localStorage.setItem('jwt', body.token);
            location.assign('/');
          } else {
            form.style.backgroundColor = 'tomato';
          }
        })
        .catch((err) => console.warn(err));
    };

    this.root.append(form);
  }
}
