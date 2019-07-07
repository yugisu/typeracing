import '../styles/main.scss';

import { IndexView, LoginView, NotFoundView, RaceView, View } from './views';

const appRoot = document.getElementById('app-main') as HTMLElement;

window.onload = () => {
  const jwt = localStorage.getItem('jwt');
  if (!jwt) {
    location.pathname !== '/login' && location.replace('/login');
  } else {
    location.pathname === '/login' && location.replace('/');
  }

  let view: View;
  switch (location.pathname) {
    case '/':
      view = new IndexView();
      break;
    case '/login':
      view = new LoginView();
      break;
    case '/race':
      view = new RaceView();
      break;
    default:
      view = new NotFoundView();
  }

  view.render(appRoot);
};
