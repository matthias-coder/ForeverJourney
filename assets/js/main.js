import { Book } from './book.js';
import { loadIndex, loadCharacter } from './data.js';

new Book(document.getElementById('app'), { loadIndex, loadCharacter }).start();
