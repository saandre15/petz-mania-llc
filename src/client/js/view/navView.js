import {DOMstrings} from './base';


export const open = (e) => {
  const target = e.target.dataset['toggle'];
  Array.from(DOMstrings.navList).forEach(cur => {
    if(cur.id === target) {
      cur.style.display = 'block';
    }
  });
}

export const close = () => {
  Array.from(DOMstrings.navList).forEach(cur => cur.style.display = 'none');
}
