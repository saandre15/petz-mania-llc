import PhotoSwipe from "photoswipe";
import PhotoSwipeUI from "photoswipe/dist/photoswipe-ui-default";

const grooming_items = [
  {
    src:
      "https://res.cloudinary.com/petzmania/image/upload/c_fill,h_756,w_756/v1577903995/grooming/grooming1.jpg",
    w: 756,
    h: 756
  },
  {
    src:
      "https://res.cloudinary.com/petzmania/image/upload/c_fill,h_534,w_534/v1577903999/grooming/groomin2.jpg",
    w: 534,
    h: 534
  },
  {
    src:
      "https://res.cloudinary.com/petzmania/image/upload/c_fill,h_480,w_480/v1577904002/grooming/grooming3.jpg",
    w: 480,
    h: 480
  },
  {
    src:
      "https://res.cloudinary.com/petzmania/image/upload/c_fill,h_720,w_720/v1577904006/grooming/grooming4.jpg",
    w: 720,
    h: 720
  },
  {
    src:
      "https://res.cloudinary.com/petzmania/image/upload/c_fill,h_720,w_720/v1577904009/grooming/grooming5.jpg",
    w: 720,
    h: 720
  },
  {
    src:
      "https://res.cloudinary.com/petzmania/image/upload/c_fill,h_533,w_533/v1577904014/grooming/grooming6.jpg",
    w: 533,
    h: 533
  },
  {
    src:
      "https://res.cloudinary.com/petzmania/image/upload/c_fill,h_720,w_720/v1577904018/grooming/grooming7.jpg",
    w: 720,
    h: 720
  },
  {
    src:
      "https://res.cloudinary.com/petzmania/image/upload/c_fill,h_450,w_450/v1577904021/grooming/grooming8.jpg",
    w: 450,
    h: 450
  }
];
/**
 *
 * @param {"grooming"} gallery Gallery Type
 * @param {string} selector DOM name
 */
export default function GalleryController(gallery, selector) {
  const pictures = document.querySelector(selector);
  let items;
  if (gallery === "grooming") {
    items = grooming_items;
  }
  for (let i = 0; i < items.length; i++) {
    const div = document.createElement("a");
    div.href = "#";
    div.onclick = e => {
      e.preventDefault();
      photoswipe(items, i);
    };
    const image = document.createElement("img");
    image.src = items[i].src;
    image.className = "img-fluid";
    div.className = "col-md-3 col-6";
    div.append(image);
    pictures.append(div);
  }
}
/**
 *
 * @param {PhotoSwipe.Item[]} items
 * @param {number} index
 */
export function photoswipe(items, index) {
  const dom = document.querySelector(".pswp");
  if (dom) {
    const gallery = new PhotoSwipe(dom, PhotoSwipeUI, items, {
      index,
      fullscreenEl: true
    });
    gallery.init();
  }
}
