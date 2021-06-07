import { DOMstrings } from '../view/base';

export default {
  changeStream: (channel) => {
    const noStream = document.querySelector('#no_stream');
    if(noStream) {
      DOMstrings.streamContainer.removeChild(noStream);
    }
    const canvas = document.querySelector('#stream__canvas');
    if(canvas) {
      canvas.parentElement.removeChild(canvas);
    }
    const canvasHTML = 
    `<div id="stream__box">
      <canvas id="stream__canvas"></canvas>
      <img src="https://res.cloudinary.com/petzmania/image/upload/v1552796920/PetzManiaLogo.png" alt="Logo" id="stream__logo">
    </div>`;
    document.querySelector('#stream__container').insertAdjacentHTML('afterbegin', canvasHTML);
  }
}