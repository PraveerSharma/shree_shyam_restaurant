import { getSweetsItems, deleteItem } from './src/services/admin.js';
console.log("Before:", getSweetsItems().length);
deleteItem('sweets', 'bhujia');
console.log("After:", getSweetsItems().length);
