import { mount } from 'svelte';
import App from './App.svelte';
import { refreshLibrary } from './assets/library';
import './app.css';

// Egne genstande indlæses før start, så et åbnet kort straks kan tegne dem (men et langsomt svar holder ikke appen tilbage)
const timeout = new Promise<void>((resolve) => setTimeout(resolve, 4000));
void Promise.race([refreshLibrary().catch(() => undefined), timeout]).then(() => {
  mount(App, { target: document.getElementById('app')! });
});
