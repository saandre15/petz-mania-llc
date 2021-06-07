import "../scss/main.scss";

const pug = require.context("../../common/view", true, /\.pug$/)
pug.keys().forEach(pug)

import { DOMstrings } from "./view/base";
import navController from "./controller/navController";
import * as carouselController from "./controller/carouselController";
import * as copyController from "./controller/copyController";
import * as cameraController from "./controller/cameraController";
import * as JSMpeg from "@lixuc/jsmpeg";
import GalleryController from "./controller/GalleryController";

let state = {};

(function() {
  $('[data-toggle="tooltip"]').tooltip();
  $("#date").prepend(`${new Date().getFullYear()}`);
})();

window.onload = function() {
  GalleryController("grooming", "#gallery__grooming");
};

if (DOMstrings.showcaseList) {
  let observer = carouselController.scrollSlider();
  observer.observe(DOMstrings.showcaseList);
}

if (DOMstrings.navDropdown) {
  Array.from(DOMstrings.navDropdown).forEach(cur =>
    cur.addEventListener("click", e => {
      e.preventDefault();
      navController(e);
    })
  );
}
if (DOMstrings.UUIDCopyBtn) {
  DOMstrings.UUIDCopyBtn.addEventListener("click", e => {
    e.preventDefault();
    copyController.copyInputBox(e);
    alert("The IP Address has been copied!");
  });
}

if (DOMstrings.changeStreamBtn) {
  Array.from(DOMstrings.changeStreamBtn).forEach(cur =>
    cur.addEventListener("click", e => {
      const channel = e.target.children[0].dataset.channel;
      const url = cameraController.createUrl(channel);
      cameraController.changeStream();
      const newCanvas = document.querySelector("#stream__canvas");
      state.player = null;
      state.player = new JSMpeg.Player(url, { canvas: newCanvas });
    })
  );
}
